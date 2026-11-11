/* Legacy Revive shared browser runtime (target-agnostic core).
 *
 * Loads one Legacy IR object (docs/legacy-ir.md), keeps the current screen, dispatches messages up a
 * hierarchy, stores global variables/flags, and offers dialog, timing and stub-reporting services.
 * Renderers ("cells" for character-grid programs, "pixels" for bitmap programs) and game layers
 * (e.g. modern/zzt/engine.js, later a HyperCard layer) plug into it.
 *
 * Plain browser JS, no modules, no build step: every file adds itself to `window`.
 *
 *   const rt = new LegacyRuntime(ir, { root: document.getElementById('app') });
 *   rt.on('board-3-stat-7', 'touch', async (rt, msg, ...args) => { ... });   // register a handler
 *   await rt.send('touch', 'board-3-stat-7');      // object -> screen -> layers -> document
 *   await rt.go('board-4');
 *   const choice = await rt.showText(['Hello', {text: 'Title', align: 'center'}], [{id: 'a', text: 'Yes'}]);
 */
(function () {
  'use strict';

  const PASS = Symbol('pass');          // a handler returns this to let the message continue upward
  const DOCUMENT = '@document';         // id of the top of the message hierarchy

  class LegacyRuntime {
    constructor(ir, opts = {}) {
      this.ir = ir;
      this.opts = opts;
      this.root = opts.root || document.body;
      const params = new URLSearchParams(location.search);
      /** `?shot=1`: draw the start screen only, at (0,0), native size, no chrome, no waiting scripts. */
      this.shot = params.get('shot') === '1';
      this.params = params;
      this.screens = new Map(ir.screens.map(s => [s.id, s]));
      this.layers = new Map((ir.layers || []).map(l => [l.id, l]));
      this.objectOwner = new Map();     // object id -> screen or layer id that contains it
      for (const s of ir.screens) for (const o of s.objects || []) this.objectOwner.set(o.id, s.id);
      for (const l of ir.layers || []) for (const o of l.objects || []) this.objectOwner.set(o.id, l.id);
      this.current = null;              // current screen object
      this.handlers = new Map();        // owner id -> Map(lowercase message -> handler)
      this.vars = new Map();            // global variables (HyperTalk globals, ZZT counters)
      this.flags = new Set();           // global boolean flags (ZZT #set/#clear)
      this.ticks = 0;                   // runtime clock, 60 ticks per second (HyperCard convention)
      this.stubs = new Map();           // "cmd\u0000line" -> count
      this.listeners = new Map();       // event name -> [fn]
      this.dialogOpen = false;
      this.renderer = null;
      this._startClock();
    }

    // ---- plugins -------------------------------------------------------------------------------
    /** Create the renderer registered for this IR's units ("cells" or "px"). */
    createRenderer(canvas, opts = {}) {
      const kind = this.ir.units === 'cells' ? 'cells' : 'pixels';
      const factory = LegacyRuntime.renderers[kind];
      if (!factory) throw new Error(`No renderer registered for units "${this.ir.units}"`);
      this.renderer = factory(this, canvas, opts);
      return this.renderer;
    }

    // ---- tiny event bus (for game layers: 'enterScreen', 'leaveScreen', 'tick') -----------------
    addListener(event, fn) {
      if (!this.listeners.has(event)) this.listeners.set(event, []);
      this.listeners.get(event).push(fn);
    }
    async emit(event, ...args) {
      for (const fn of this.listeners.get(event) || []) await fn(...args);
    }

    // ---- navigation ----------------------------------------------------------------------------
    screen(id) { return this.screens.get(id) || null; }

    async go(screenId, ...args) {
      const next = this.screens.get(screenId);
      if (!next) { console.warn('go: no screen', screenId); return false; }
      const prev = this.current;
      if (prev) await this.emit('leaveScreen', prev, next, ...args);
      this.current = next;
      await this.emit('enterScreen', next, prev, ...args);
      return true;
    }

    // ---- message hierarchy ---------------------------------------------------------------------
    /** Register `fn(rt, message, ...args)` for `message` on an owner (object, screen, layer id or
     *  DOCUMENT). Message '*' catches any message; return LegacyRuntime.PASS to keep it travelling. */
    on(ownerId, message, fn) {
      if (!this.handlers.has(ownerId)) this.handlers.set(ownerId, new Map());
      this.handlers.get(ownerId).set(message.toLowerCase(), fn);
    }
    off(ownerId) { this.handlers.delete(ownerId); }

    /** The chain a message walks: object -> its screen -> that screen's layers -> document. */
    chain(targetId) {
      const ids = [];
      if (targetId == null) targetId = this.current && this.current.id;
      let screenId = null;
      if (this.screens.has(targetId)) screenId = targetId;
      else if (targetId != null) {
        ids.push(targetId);
        const owner = this.objectOwner.get(targetId);
        if (owner && this.layers.has(owner)) {
          ids.push(owner);
          screenId = this.current && this.current.id;
        } else screenId = owner || (this.current && this.current.id);
      }
      if (screenId) {
        ids.push(screenId);
        const s = this.screens.get(screenId);
        for (const l of (s && s.layers) || []) if (!ids.includes(l)) ids.push(l);
      }
      ids.push(DOCUMENT);
      return ids;
    }

    /** Send `message` to `targetId`. Returns true if some handler took it (did not return PASS). */
    async send(message, targetId, ...args) {
      const m = String(message).toLowerCase();
      for (const id of this.chain(targetId)) {
        const hs = this.handlers.get(id);
        if (!hs) continue;
        const fn = hs.get(m) || hs.get('*');
        if (!fn) continue;
        const r = await fn(this, m, ...args);
        if (r !== PASS) return true;
      }
      return false;
    }

    // ---- globals -------------------------------------------------------------------------------
    get(name, dflt = 0) { const k = String(name).toLowerCase(); return this.vars.has(k) ? this.vars.get(k) : dflt; }
    set(name, value) { this.vars.set(String(name).toLowerCase(), value); this.emit('varsChanged'); }
    setFlag(name) { this.flags.add(String(name).toLowerCase()); }
    clearFlag(name) { this.flags.delete(String(name).toLowerCase()); }
    hasFlag(name) { return this.flags.has(String(name).toLowerCase()); }

    // ---- timing --------------------------------------------------------------------------------
    _startClock() {
      this._waiters = [];
      const t0 = performance.now();
      const loop = () => {
        this.ticks = Math.floor((performance.now() - t0) * 60 / 1000);
        this._waiters = this._waiters.filter(w => (this.ticks >= w.at ? (w.res(), false) : true));
        if (this._waiters.length) this._raf = requestAnimationFrame(loop); else this._raf = null;
      };
      this._clockLoop = loop;
    }
    /** Resolve after `ticks` sixtieths of a second. */
    wait(ticks) {
      return new Promise(res => {
        this._waiters.push({ at: this.ticks + Math.max(0, ticks | 0), res });
        if (!this._raf) this._raf = requestAnimationFrame(this._clockLoop);
      });
    }

    // ---- stubs ---------------------------------------------------------------------------------
    /** Called by translated code for anything that could not be translated. Counted and logged once. */
    unsupported(cmd, line) {
      const k = cmd + '\u0000' + line;
      const n = (this.stubs.get(k) || 0) + 1;
      this.stubs.set(k, n);
      if (n === 1) console.warn(`[unsupported] ${cmd}: ${line}`);
      return undefined;
    }
    stubReport() { return [...this.stubs].map(([k, n]) => { const [cmd, line] = k.split('\u0000'); return { cmd, line, n }; }); }

    // ---- dialogs -------------------------------------------------------------------------------
    /** Show a modal text window. `lines`: strings or {text, align:'center'|'left', choice:id}.
     *  `choices`: [{id, text}] appended after the lines. Resolves with the chosen id, or null. */
    showText(lines, choices = [], opts = {}) {
      return new Promise(resolve => {
        this.dialogOpen = true;
        const host = opts.host || this.root;
        const box = document.createElement('div');
        box.className = 'lr-dialog' + (opts.className ? ' ' + opts.className : '');
        const buttons = opts.layout === 'buttons';   // choices as a row of push buttons (Mac alert style)
        if (opts.title) { const t = document.createElement('div'); t.className = 'lr-dialog-title'; t.textContent = opts.title; box.appendChild(t); }
        const body = document.createElement('div');
        body.className = 'lr-dialog-body';
        box.appendChild(body);
        const items = [];
        const all = lines.map(l => (typeof l === 'string' ? { text: l } : l))
          .concat(buttons ? [] : choices.map(c => ({ text: c.text, choice: c.id })));
        let row0 = null;
        if (buttons) {
          row0 = document.createElement('div');
          row0.className = 'lr-buttons';
          choices.forEach((c, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'lr-button' + (i === (opts.defaultChoice != null ? opts.defaultChoice : choices.length - 1) ? ' lr-default' : '');
            b.textContent = c.text;
            b.addEventListener('click', () => finish(c.id));
            items.push({ el: b, id: c.id });
            row0.appendChild(b);
          });
        }
        for (const l of all) {
          const row = document.createElement('div');
          row.className = 'lr-line' + (l.align === 'center' ? ' lr-center' : '') + (l.choice != null ? ' lr-choice' : '');
          row.textContent = l.text === '' ? ' ' : l.text;
          if (l.choice != null) {
            row.dataset.idx = items.length;
            items.push({ el: row, id: l.choice });
            row.addEventListener('click', () => finish(l.choice));
          }
          body.appendChild(row);
        }
        if (row0) box.appendChild(row0);
        const hint = document.createElement('div');
        hint.className = 'lr-dialog-hint';
        hint.textContent = buttons ? 'Enter: default button, Esc: cancel' : items.length ? '↑↓ choose, Enter select, Esc close' : 'Enter or Esc to close';
        box.appendChild(hint);
        let sel = buttons ? (opts.defaultChoice != null ? opts.defaultChoice : Math.max(0, items.length - 1)) : 0;
        const mark = () => items.forEach((it, i) => it.el.classList.toggle('lr-selected', i === sel));
        mark();
        const key = e => {
          if (buttons && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Tab') && items.length) {
            sel = (sel + (e.key === 'ArrowLeft' ? items.length - 1 : 1)) % items.length; mark();
          } else if (e.key === 'ArrowDown' && items.length) { sel = (sel + 1) % items.length; mark(); items[sel].el.scrollIntoView({ block: 'nearest' }); }
          else if (e.key === 'ArrowUp' && items.length) { sel = (sel + items.length - 1) % items.length; mark(); items[sel].el.scrollIntoView({ block: 'nearest' }); }
          else if (e.key === 'Enter' || e.key === ' ') finish(items.length ? items[sel].id : null);
          else if (e.key === 'Escape') finish(null);
          else return;
          e.preventDefault(); e.stopPropagation();
        };
        const finish = id => {
          window.removeEventListener('keydown', key, true);
          box.remove();
          this.dialogOpen = false;
          resolve(id);
        };
        window.addEventListener('keydown', key, true);
        host.appendChild(box);
      });
    }

    /** Modal text prompt. Resolves with the typed text, or null when cancelled. */
    askText(prompt, dflt = '', opts = {}) {
      return new Promise(resolve => {
        this.dialogOpen = true;
        const host = opts.host || this.root;
        const box = document.createElement('div');
        box.className = 'lr-dialog lr-ask' + (opts.className ? ' ' + opts.className : '');
        const body = document.createElement('div');
        body.className = 'lr-dialog-body';
        body.textContent = prompt;
        const input = document.createElement('input');
        input.type = opts.password ? 'password' : 'text';
        input.className = 'lr-input';
        input.value = dflt;
        const row = document.createElement('div');
        row.className = 'lr-buttons';
        const mk = (text, val, def) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'lr-button' + (def ? ' lr-default' : ''); b.textContent = text;
          b.addEventListener('click', () => finish(val === null ? null : input.value));
          return b;
        };
        row.append(mk('Cancel', null, false), mk('OK', 1, true));
        box.append(body, input, row);
        const key = e => {
          if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish(input.value); }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(null); }
        };
        const finish = v => {
          window.removeEventListener('keydown', key, true);
          box.remove();
          this.dialogOpen = false;
          resolve(v);
        };
        window.addEventListener('keydown', key, true);
        host.appendChild(box);
        input.focus();
        input.select();
      });
    }

    /** Short non-blocking message (one line) over the bottom of the screen. */
    flash(text, ms = 2500, host = null) {
      host = host || this.root;
      let el = host.querySelector('.lr-flash');
      if (!el) { el = document.createElement('div'); el.className = 'lr-flash'; host.appendChild(el); }
      el.textContent = text;
      el.style.display = 'block';
      clearTimeout(this._flashT);
      this._flashT = setTimeout(() => { el.style.display = 'none'; }, ms);
    }
  }

  LegacyRuntime.PASS = PASS;
  LegacyRuntime.DOCUMENT = DOCUMENT;
  /** Renderer plugins: name -> factory(runtime, canvas, opts). See render-cells.js, render-pixels.js. */
  LegacyRuntime.renderers = {};
  LegacyRuntime.registerRenderer = (name, factory) => { LegacyRuntime.renderers[name] = factory; };

  window.LegacyRuntime = LegacyRuntime;
})();
