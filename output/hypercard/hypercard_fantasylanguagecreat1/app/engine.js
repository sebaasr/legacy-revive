/* HyperCard layer for the Legacy Revive runtime.
 *
 * HyperCardEngine owns the stack state (cards, backgrounds, buttons, fields, globals), runs the
 * HyperTalk handlers translated by modern/hypercard/translator.py (scripts.js), and draws through the
 * shared pixel renderer (runtime/render-pixels.js).
 *
 * Translated scripts only talk to the API object `H` (built in _api()). The main pieces:
 *   H.on(owner, "mouseUp", async fn($, ...params))   register a message handler on an owner id
 *   H.fn(owner, "getRow", async fn($, ...params))     register a function handler
 *   H.call($, name, args, kind)                       call a user handler/function up the message path
 *   H.send($, "keyDown S", objectHandle)              send a message to an object
 *   H.part($, layer, kind, key, card)                 resolve `card field "x"`, `bg btn 3`, `fld id 5`
 *   H.card($, desc) / H.bg($, desc) / H.me($) / H.target($) / H.msgBox()
 *   H.value(h) / H.putInto(h, v, mode, chunks)        read / write containers
 *   H.chunk(v, chunks) / H.put(v, x, mode, chunks)    chunk expressions on plain values
 *   H.prop(h, name) / H.setProp(h, name, v)           object properties
 *   H.go($, desc), H.answer(...), H.ask(...), H.play(...), H.wait(ticks), H.visual(effect) ...
 *   H.f.<name>(...)                                   HyperTalk built-in functions
 *
 * `$` is the handler context: { me: owner id, target: id of the object that got the message,
 * params: [...], message }.
 *
 * Message path (HyperCard order): part -> card -> background -> stack -> built-in default.
 * The stack's own id is LegacyRuntime.DOCUMENT ("@document").
 */
(function () {
  'use strict';

  const STACK = LegacyRuntime.DOCUMENT;
  const PASS = LegacyRuntime.PASS;
  const ABORT = Symbol('exit to HyperCard');

  class HTError extends Error {}

  // ---- value helpers (HyperTalk values are strings; numbers and booleans are kept as JS values) ----
  function str(v) {
    if (v === undefined || v === null) return '';
    if (typeof v === 'number') {
      if (!isFinite(v)) return v > 0 ? 'INF' : (v < 0 ? '-INF' : 'NAN');
      if (Number.isInteger(v)) return String(v);
      let s = v.toFixed(6);
      s = s.replace(/0+$/, '').replace(/\.$/, '');
      return s === '-0' ? '0' : s;
    }
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return String(v);
  }
  const NUM_RE = /^\s*[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?\s*$/i;
  function isNum(v) { return typeof v === 'number' || (typeof v === 'string' && NUM_RE.test(v)); }
  function num(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    const s = str(v).trim();
    if (s === '') return 0;
    const n = Number(s);
    if (Number.isNaN(n)) {
      console.warn(`[HyperTalk] expected a number, got "${s}"`);
      return 0;
    }
    return n;
  }
  function bool(v) { return v === true || str(v).trim().toLowerCase() === 'true'; }

  // ---- chunks ---------------------------------------------------------------------------------
  /** Ranges [start, end) of every chunk of `type` in s. */
  function pieces(s, type) {
    const out = [];
    if (type === 'char') { for (let i = 0; i < s.length; i++) out.push([i, i + 1]); return out; }
    if (type === 'word') {
      const re = /[^\s]+/g; let m;
      while ((m = re.exec(s))) out.push([m.index, m.index + m[0].length]);
      return out;
    }
    const d = type === 'line' ? '\n' : ',';
    if (s === '') return out;
    let st = 0;
    for (let i = 0; i <= s.length; i++) {
      if (i === s.length || s[i] === d) {
        if (!(i === s.length && st === s.length && type === 'line' && out.length)) out.push([st, i]);
        st = i + 1;
      }
    }
    return out;
  }
  function ordIndex(v, n) {
    if (v === 'last') return n;
    if (v === 'any') return n ? 1 + Math.floor(Math.random() * n) : 1;
    if (v === 'middle') return Math.floor(n / 2) + 1;
    return Math.trunc(num(v));
  }
  /** Absolute [start, end) of one chunk spec inside s (may lie beyond the end: then pad info). */
  function rangeOf(s, spec) {
    const [type, a, b] = spec;
    const ps = pieces(s, type);
    let i = ordIndex(a, ps.length), j = b === undefined ? i : ordIndex(b, ps.length);
    if (i < 1) i = 1;
    if (j < i) j = i;
    if (i > ps.length) return { start: s.length, end: s.length, missing: i - ps.length, type };
    const last = Math.min(j, ps.length);
    return { start: ps[i - 1][0], end: ps[last - 1][1], missing: 0, type };
  }
  function chunkGet(v, specs) {
    let s = str(v);
    for (const spec of specs) {
      const r = rangeOf(s, spec);
      s = r.missing ? '' : s.slice(r.start, r.end);
    }
    return s;
  }
  /** Replace/insert into a chunk; pads with delimiters when the line/item does not exist yet. */
  function chunkPut(v, x, mode, specs) {
    let s = str(v);
    x = str(x);
    if (!specs || !specs.length) {
      return mode === 'after' ? s + x : mode === 'before' ? x + s : x;
    }
    let off = 0, sub = s;
    let abs = null;
    for (let k = 0; k < specs.length; k++) {
      let r = rangeOf(sub, specs[k]);
      if (r.missing) {
        // HyperCard pads only lines and items; a missing word or char is appended with no delimiter
        // (`put "x" into word 3 of "ab"` gives "abx"); stacks rely on it to build words letter by letter.
        const d = r.type === 'line' ? '\n' : ',';
        let pad = '';
        if (r.type === 'line' || r.type === 'item') pad = d.repeat(sub === '' ? r.missing - 1 : r.missing);
        const insertAt = off + sub.length;
        s = s.slice(0, insertAt) + pad + s.slice(insertAt);
        sub = sub + pad;
        r = { start: sub.length, end: sub.length };
      }
      abs = { start: off + r.start, end: off + r.end };
      off = abs.start;
      sub = s.slice(abs.start, abs.end);
    }
    if (mode === 'after') return s.slice(0, abs.end) + x + s.slice(abs.end);
    if (mode === 'before') return s.slice(0, abs.start) + x + s.slice(abs.start);
    return s.slice(0, abs.start) + x + s.slice(abs.end);
  }
  function chunkDelete(v, specs) {
    let s = str(v);
    let off = 0, sub = s, abs = null, last = null;
    for (const spec of specs) {
      const r = rangeOf(sub, spec);
      if (r.missing) return s;
      abs = { start: off + r.start, end: off + r.end };
      last = spec[0];
      off = abs.start;
      sub = s.slice(abs.start, abs.end);
    }
    let { start, end } = abs;
    // deleting a line or item also removes its delimiter
    if (last === 'line' || last === 'item') {
      const d = last === 'line' ? '\n' : ',';
      if (s[end] === d) end++;
      else if (start > 0 && s[start - 1] === d) start--;
    }
    return s.slice(0, start) + s.slice(end);
  }

  // ---- notes (play) ---------------------------------------------------------------------------
  const NOTE_SEMI = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const DUR = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25, t: 0.125, x: 0.0625 };

  class HyperCardEngine {
    constructor(rt, installScripts, opts = {}) {
      this.rt = rt;
      this.ir = rt.ir;
      this.opts = opts;
      this.shot = rt.shot;
      this.cards = this.ir.screens;
      this.cardIndex = new Map(this.cards.map((c, i) => [c.id, i]));
      this.bgs = this.ir.layers || [];
      this.objects = new Map();          // id -> IR object
      this.state = new Map();            // id -> mutable properties
      this.bgText = new Map();           // "cardId|fieldId" -> text of a background field on that card
      this.partsOf = new Map();          // owner id -> [object]
      for (const l of this.bgs) this._addParts(l.id, l.objects || []);
      for (const c of this.cards) this._addParts(c.id, c.objects || []);
      for (const c of this.cards) for (const [k, t] of Object.entries(c.layer_text || {})) this.bgText.set(c.id + '|' + k, this._norm(t));
      this.cardNames = new Map(this.cards.map(c => [c.id, c.name || '']));
      this.bgNames = new Map(this.bgs.map(b => [b.id, b.name || '']));
      this.globals = {};                 // HyperTalk globals (H.g)
      this.gprops = { cursor: 'hand', lockScreen: false, lockMessages: false, userLevel: 5, editBkgnd: false,
                      textFont: 'Geneva', textSize: 12, textHeight: 16, textAlign: 'left', textStyle: 'plain',
                      lineSize: 1, pattern: 12, filled: false, numberFormat: '0.######', language: 'English' };
      this.bars = { menubar: true, titlebar: true };
      this.pictures = new Map();         // cardId|layer -> visible
      this.lockCount = 0;
      this.dirty = false;
      this.pendingEffect = null;
      this.recent = [];                  // card ids visited (go back)
      this.pushed = [];                  // push card / pop card
      this.result = '';
      this.mouse = { down: false, x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
      this.keys = { shift: false, alt: false, ctrl: false, meta: false };
      this.click = { chunk: '', line: '', text: '' };
      this.found = { chunk: '', text: '', line: '', field: '' };
      this.sound = { playing: null, until: 0 };
      this.msgText = '';
      this.msgVisible = false;
      this.errors = [];
      this.queue = Promise.resolve();
      this.started = performance.now();
      this.fast = this.shot;             // shot mode: no waiting, no dialogs, no effects
      this.current = null;
      this.paint = new Map();            // card id -> paint operations drawn by scripts (line/rectangle/text tools)
      this.clearedPictures = new Set();  // cards whose picture was cleared (doMenu "Clear Picture")
      this.menus = [];                   // menus made by scripts: {name, items: [{text, msg}], enabled}
      this.files = new Map();            // open files (open file / read / write / close file)
      this.printJob = null;              // texts collected between open printing and close printing
      this.using = [];                   // library stacks in use (`start using`), as owner ids '@library:<name>'
      this.H = this._api();
      if (installScripts) installScripts(this.H);
      this._installShims();
    }

    /** Compatibility shims (modern/hypercard/shims/*.js) for library stacks missing from the corpus: their
     *  functions/handlers are registered on an owner '@library:<name>' that `start using` puts on the path. */
    _installShims() {
      const shims = (typeof window !== 'undefined' && window.HC_SHIMS) || {};
      for (const [name, shim] of Object.entries(shims)) {
        const owner = '@library:' + name.toLowerCase();
        for (const [fname, f] of Object.entries(shim.functions || {})) {
          this.rt.on(owner, 'function:' + fname, async ($, ...args) => f(...args));
        }
        for (const [hname, f] of Object.entries(shim.handlers || {})) {
          this.rt.on(owner, hname, async ($, ...args) => { await f(this, $, ...args); });
        }
      }
    }
    static libName(name) {
      return str(name).trim().replace(/^stack\s+/i, '').replace(/^"(.*)"$/, '$1').toLowerCase();
    }
    startUsing(name) {
      const n = HyperCardEngine.libName(name);
      if (!((typeof window !== 'undefined' && window.HC_SHIMS) || {})[n]) {
        this.rt.unsupported('start using', `stack "${n}" is not available (no shim in modern/hypercard/shims/)`);
        return;
      }
      const id = '@library:' + n;
      if (!this.using.includes(id)) this.using.push(id);
    }
    stopUsing(name) {
      const n = HyperCardEngine.libName(name);
      this.using = this.using.filter(x => x !== '@library:' + n);
    }

    _norm(t) { return String(t == null ? '' : t).replace(/\r\n?/g, '\n'); }

    _addParts(ownerId, objs) {
      this.partsOf.set(ownerId, objs);
      for (const o of objs) {
        this.objects.set(o.id, o);
        const ex = o.extra || {};
        const fb = ex.flags_b || 0;
        this.state.set(o.id, {
          owner: ownerId,
          visible: o.visible !== false,
          hilite: !!(o.style && o.style.highlight),
          enabled: ex.enabled !== false,
          name: o.name || '',
          shape: HyperCardEngine.shapeName(o),
          lockText: !!(o.style && o.style.locked),
          rect: (o.rect || [0, 0, 0, 0]).slice(),
          icon: o.icon || null,
          iconId: ex.icon_id || 0,
          showName: !!(o.style && o.style.show_name),
          textStyle: ex.text_style || 0,
          textFont: (o.style && o.style.font) || null,
          textSize: (o.style && o.style.size) || 12,
          textHeight: ex.line_height || 16,
          textAlign: (o.style && o.style.align) || 'left',
          text: o.kind === 'field' ? this._norm(o.text) : '',
          runs: ex.runs || [],
          // flags_b high byte: 0x2000 autoHilite (assumed), low nibble of the high byte = button family
          autoHilite: !!(fb & 0x2000),
          family: o.kind === 'button' ? (fb >> 8) & 0x0F : 0,
          scroll: 0,
        });
      }
    }

    // =========================================================================================
    // Object model
    // =========================================================================================
    cardById(id) { return this.cards[this.cardIndex.get(id)] || null; }
    bgOf(card) { return card && card.layers && card.layers.length ? card.layers[0] : null; }
    partsByKind(ownerId, kind) { return (this.partsOf.get(ownerId) || []).filter(o => o.kind === kind); }

    /** Text of a field as shown on `cardId`. */
    fieldText(id, cardId) {
      const st = this.state.get(id);
      if (!st) return '';
      if (st.owner.startsWith('card-') || st.owner === cardId) return st.text;
      const k = (cardId || this.current.id) + '|' + id;
      return this.bgText.has(k) ? this.bgText.get(k) : st.text;   // GAPS #3: fall back to the BKGD text
    }
    setFieldText(id, cardId, text) {
      const st = this.state.get(id);
      if (!st) return;
      text = this._norm(str(text));
      if (st.owner.startsWith('card-')) st.text = text;
      else this.bgText.set((cardId || this.current.id) + '|' + id, text);
      st.runs = [];
      this.changed();
    }

    // ---- handles ------------------------------------------------------------------------------
    handleFor(id) {
      if (id === STACK) return { t: 'stack' };
      if (this.cardIndex.has(id)) return { t: 'card', id };
      if (this.bgNames.has(id)) return { t: 'bg', id };
      if (this.objects.has(id)) return { t: 'part', id, card: this.current && this.current.id };
      return { t: 'stack' };
    }
    handleId(h) {
      if (!h) return null;
      if (h.t === 'stack') return STACK;
      return h.id || null;
    }

    resolvePart(layer, kind, key, cardH) {
      const card = cardH ? this.cardById(cardH.id) : this.current;
      if (!card) throw new HTError('No such card');
      const bg = this.bgOf(card);
      const lists = [];
      const cardList = this.partsByKind(card.id, kind), bgList = bg ? this.partsByKind(bg, kind) : [];
      if (layer === 'card') lists.push(cardList);
      else if (layer === 'bg') lists.push(bgList);
      else if (kind === 'field') lists.push(bgList, cardList);   // bare `field` = background field first
      else lists.push(cardList, bgList);                         // bare `button` = card button first
      const pick = list => {
        if (key && typeof key === 'object') {
          if ('id' in key) return list.find(o => o.extra && o.extra.part_id === Math.trunc(num(key.id)));
          if ('ord' in key) return list[ordIndex(key.ord, list.length) - 1];
        }
        if (typeof key === 'number' || (isNum(key) && !list.some(o => this.state.get(o.id).name.toLowerCase() === str(key).toLowerCase()))) {
          return list[Math.trunc(num(key)) - 1];
        }
        const k = str(key).toLowerCase();
        return list.find(o => this.state.get(o.id).name.toLowerCase() === k);
      };
      const tryLists = (layer === null && !(typeof key === 'number' || isNum(key)) && !(key && typeof key === 'object')) ? lists : [lists[0]];
      for (const list of tryLists) {
        const o = pick(list);
        if (o) return { t: 'part', id: o.id, card: card.id };
      }
      throw new HTError(`No such ${layer === 'bg' ? 'background ' : layer === 'card' ? 'card ' : ''}${kind} ${typeof key === 'object' ? JSON.stringify(key) : '"' + str(key) + '"'}`);
    }

    /** Find a card for a descriptor {rel|id|key, bg}. Returns the IR screen or null. */
    findCard(desc) {
      if (!desc) return this.current;
      if (desc.t === 'card') return this.cardById(desc.id);
      let pool = this.cards;
      if (desc.bg) {
        const bg = this.findBg(desc.bg);
        if (!bg) return null;
        pool = this.cards.filter(c => this.bgOf(c) === bg);
      }
      if (!pool.length) return null;
      const cur = this.current;
      if ('id' in desc) return this.cardById('card-' + Math.trunc(num(desc.id)));
      if (desc.rel) {
        const ci = pool.indexOf(cur);
        switch (desc.rel) {
          case 'this': return cur;
          case 'first': return pool[0];
          case 'last': return pool[pool.length - 1];
          case 'middle': return pool[Math.floor(pool.length / 2)];
          case 'any': return pool[Math.floor(Math.random() * pool.length)];
          case 'next': {
            if (ci >= 0) return pool[(ci + 1) % pool.length];
            const gi = this.cardIndex.get(cur.id);
            return pool.find(c => this.cardIndex.get(c.id) > gi) || pool[0];
          }
          case 'prev': {
            if (ci >= 0) return pool[(ci - 1 + pool.length) % pool.length];
            const gi = this.cardIndex.get(cur.id);
            return [...pool].reverse().find(c => this.cardIndex.get(c.id) < gi) || pool[pool.length - 1];
          }
        }
      }
      if ('key' in desc) {
        const k = desc.key;
        if (k && typeof k === 'object' && k.t === 'card') return this.cardById(k.id);
        const s = str(k).trim();
        const byName = pool.find(c => (this.cardNames.get(c.id) || '').toLowerCase() === s.toLowerCase());
        if (byName) return byName;
        if (typeof k === 'number' || NUM_RE.test(s)) return pool[Math.trunc(num(s)) - 1] || null;
        let m = /^(?:card|cd)\s+id\s+(\d+)$/i.exec(s);
        if (m) return this.cardById('card-' + m[1]);
        m = /^(?:card|cd)\s+"?(.*?)"?$/i.exec(s);
        if (m) return pool.find(c => (this.cardNames.get(c.id) || '').toLowerCase() === m[1].toLowerCase()) || null;
        return null;
      }
      return null;
    }
    findBg(desc) {
      if (!desc) return this.bgOf(this.current);
      if (desc.t === 'bg') return desc.id;
      if (desc.rel === 'this') return this.bgOf(this.current);
      if (desc.rel === 'next' || desc.rel === 'prev') {
        const i = this.bgs.findIndex(b => b.id === this.bgOf(this.current));
        const n = this.bgs.length;
        return this.bgs[(i + (desc.rel === 'next' ? 1 : n - 1)) % n].id;
      }
      if ('id' in desc) { const id = 'bkgnd-' + Math.trunc(num(desc.id)); return this.bgNames.has(id) ? id : null; }
      if ('key' in desc) {
        const s = str(desc.key).trim();
        const b = this.bgs.find(x => (x.name || '').toLowerCase() === s.toLowerCase());
        if (b) return b.id;
        if (NUM_RE.test(s)) { const x = this.bgs[Math.trunc(num(s)) - 1]; return x ? x.id : null; }
        return null;
      }
      return null;
    }

    // ---- names and properties -------------------------------------------------------------------
    partNumber(id) {
      const st = this.state.get(id), o = this.objects.get(id);
      return this.partsByKind(st.owner, o.kind).indexOf(o) + 1;
    }
    nameOf(h, mod) {
      mod = mod || '';
      if (h.t === 'stack') {
        const n = this.ir.name;
        return mod === 'short' ? n : mod === 'long' ? `stack "Macintosh HD:${n}"` : `stack "${n}"`;
      }
      if (h.t === 'card' || h.t === 'bg') {
        const n = h.t === 'card' ? this.cardNames.get(h.id) : this.bgNames.get(h.id);
        const word = h.t === 'card' ? 'card' : 'bkgnd';
        const num_ = h.id.split('-')[1];
        if (mod === 'short') return n || `${word} id ${num_}`;
        const base = n ? `${word} "${n}"` : `${word} id ${num_}`;
        return mod === 'long' ? `${base} of ${this.nameOf({ t: 'stack' }, 'long')}` : base;
      }
      if (h.t === 'part') {
        const st = this.state.get(h.id), o = this.objects.get(h.id);
        const layer = st.owner.startsWith('card-') ? 'card' : 'bkgnd';
        const n = st.name;
        if (mod === 'short') return n || `${layer} ${o.kind} id ${o.extra.part_id}`;
        const base = n ? `${layer} ${o.kind} "${n}"` : `${layer} ${o.kind} id ${o.extra.part_id}`;
        return mod === 'long' ? `${base} of ${this.nameOf({ t: 'card', id: h.card || this.current.id }, 'long')}` : base;
      }
      if (h.t === 'msg') return 'message box';
      if (h.t === 'window') return 'card window';
      return '';
    }

    getProp(h, name) {
      const p = String(name).toLowerCase();
      const m = /^(long|short|abbreviated|abbrev|abbr|english)\s+(\w+)$/.exec(p);
      const mod = m ? m[1].replace(/^abbr.*/, 'short') : '';
      const prop = m ? m[2] : p;
      const W = this.ir.size.width, Hh = this.ir.size.height;
      if (prop === 'name') return this.nameOf(h, mod);
      if (h.t === 'stack') {
        if (prop === 'freesize') return 0;
        if (prop === 'size') return (this.ir.source && this.ir.source.bytes) || 0;
        if (prop === 'id') return 0;
        if (prop === 'script') return (this.ir.script && this.ir.script.text) || '';
        return this._unknownProp(prop, h);
      }
      if (h.t === 'card' || h.t === 'bg') {
        if (prop === 'id') return Number(h.id.split('-')[1]);
        if (prop === 'number') return h.t === 'card' ? this.cardIndex.get(h.id) + 1 : this.bgs.findIndex(b => b.id === h.id) + 1;
        if (prop === 'rect' || prop === 'rectangle') return `0,0,${W},${Hh}`;
        if (prop === 'width') return W;
        if (prop === 'height') return Hh;
        if (prop === 'script') { const o = h.t === 'card' ? this.cardById(h.id) : this.bgs.find(b => b.id === h.id); return (o && o.script && o.script.text) || ''; }
        return this._unknownProp(prop, h);
      }
      if (h.t === 'window') {
        if (prop === 'width') return W;
        if (prop === 'height') return Hh;
        if (prop === 'rect' || prop === 'rectangle') return `0,0,${W},${Hh}`;
        if (prop === 'loc' || prop === 'location') return `0,0`;
        return this._unknownProp(prop, h);
      }
      if (h.t === 'msg') {
        if (prop === 'visible') return this.msgVisible;
        if (prop === 'loc' || prop === 'location') return this.msgLoc || '0,300';
        return this._unknownProp(prop, h);
      }
      if (h.t !== 'part') return this._unknownProp(prop, h);
      const st = this.state.get(h.id), o = this.objects.get(h.id);
      const [l, t, r, b] = st.rect;
      switch (prop) {
        case 'id': return o.extra.part_id;
        case 'number': return this.partNumber(h.id);
        case 'visible': return st.visible;
        case 'hilite': case 'highlight': case 'hilight': return st.hilite;
        case 'enabled': return st.enabled;
        case 'rect': case 'rectangle': return `${l},${t},${r},${b}`;
        case 'loc': case 'location': return `${Math.round((l + r) / 2)},${Math.round((t + b) / 2)}`;
        case 'left': return l; case 'top': return t; case 'right': return r; case 'bottom': return b;
        case 'width': return r - l; case 'height': return b - t;
        case 'topleft': return `${l},${t}`;
        case 'botright': case 'bottomright': return `${r},${b}`;
        case 'style': return st.shape;
        case 'locktext': return st.lockText;
        case 'textstyle': return HyperCardEngine.styleNames(st.textStyle).join(',') || 'plain';
        case 'textfont': return st.textFont || 'Geneva';
        case 'textsize': return st.textSize;
        case 'textheight': return st.textHeight;
        case 'textalign': return st.textAlign;
        case 'icon': return st.iconId;
        case 'showname': return st.showName;
        case 'autohilite': return st.autoHilite;
        case 'scroll': return st.scroll;
        case 'family': return st.family;
        case 'script': return (o.script && o.script.text) || '';
        case 'sharedtext': case 'dontwrap': case 'showlines': case 'widemargins': case 'autotab': return false;
      }
      return this._unknownProp(prop, h);
    }
    _unknownProp(prop, h) { this.rt.unsupported('property', `the ${prop} of ${this.nameOf(h)}`); return ''; }

    /** IR style.shape, with the style numbers the spec left open mapped to HyperCard's own numbering
     *  (buttons 1 opaque, 2 rectangle, 4 shadow, 5 checkBox, 6 radioButton, 8 standard, 9 default,
     *  10 oval; field 1 opaque). This numbering is an assumption, recorded in MIGRATION.md. */
    static shapeName(o) {
      const s = String((o.style && o.style.shape) || 'transparent');
      const m = /^style-(\d+)$/.exec(s);
      if (!m) return s;
      const n = Number(m[1]);
      const btn = { 1: 'opaque', 2: 'rectangle', 3: 'roundrect', 4: 'shadow', 5: 'checkbox', 6: 'radiobutton', 8: 'standard', 9: 'default', 10: 'oval' };
      const fld = { 1: 'opaque', 2: 'rectangle', 4: 'shadow', 7: 'scrolling' };
      return (o.kind === 'button' ? btn : fld)[n] || 'rectangle';
    }

    static styleNames(bits) {
      const b = (bits || 0) >> 8;
      const names = ['bold', 'italic', 'underline', 'outline', 'shadow', 'condense', 'extend', 'group'];
      return names.filter((_, i) => b & (1 << i));
    }
    static styleBits(v) {
      const names = ['bold', 'italic', 'underline', 'outline', 'shadow', 'condense', 'extend', 'group'];
      let b = 0;
      for (const w of str(v).toLowerCase().split(/[\s,]+/)) { const i = names.indexOf(w); if (i >= 0) b |= 1 << i; }
      return b << 8;
    }

    setProp(h, name, value) {
      const prop = String(name).toLowerCase();
      if (h.t === 'card' || h.t === 'bg') {
        if (prop === 'name') { (h.t === 'card' ? this.cardNames : this.bgNames).set(h.id, str(value)); return; }
        this.rt.unsupported('set property', `set ${prop} of ${this.nameOf(h)}`);
        return;
      }
      if (h.t === 'msg') {
        if (prop === 'visible') { this.msgVisible = bool(value); this.changed(); return; }
        if (prop === 'loc' || prop === 'location') { this.msgLoc = str(value); return; }
        this.rt.unsupported('set property', `set ${prop} of msg`);
        return;
      }
      if (h.t !== 'part') { this.rt.unsupported('set property', `set ${prop} of ${this.nameOf(h)}`); return; }
      const st = this.state.get(h.id);
      const pts = () => str(value).split(',').map(x => Math.round(num(x)));
      switch (prop) {
        case 'visible': st.visible = bool(value); break;
        case 'hilite': case 'highlight': case 'hilight': this.setHilite(h.id, bool(value)); break;
        case 'enabled': st.enabled = bool(value); break;
        case 'name': st.name = str(value); break;
        case 'style': st.shape = str(value).toLowerCase().replace(/\s+/g, ''); break;
        case 'locktext': st.lockText = bool(value); break;
        case 'textstyle': st.textStyle = HyperCardEngine.styleBits(value); st.runs = []; break;
        case 'textfont': st.textFont = str(value); st.runs = []; break;
        case 'textsize': st.textSize = num(value); st.runs = []; break;
        case 'textheight': st.textHeight = num(value); break;
        case 'textalign': st.textAlign = str(value).toLowerCase(); break;
        case 'showname': st.showName = bool(value); break;
        case 'autohilite': st.autoHilite = bool(value); break;
        case 'scroll': st.scroll = num(value); break;
        case 'rect': case 'rectangle': { const p = pts(); if (p.length === 4) st.rect = p; break; }
        case 'loc': case 'location': {
          const [x, y] = pts(); const [l, t, r, b] = st.rect; const w = r - l, hh = b - t;
          const nl = Math.round(x - w / 2), nt = Math.round(y - hh / 2);
          st.rect = [nl, nt, nl + w, nt + hh]; break;
        }
        case 'topleft': { const [x, y] = pts(); const [l, t, r, b] = st.rect; st.rect = [x, y, x + r - l, y + b - t]; break; }
        case 'botright': case 'bottomright': { const [x, y] = pts(); st.rect = [st.rect[0], st.rect[1], x, y]; break; }
        case 'left': case 'top': case 'right': case 'bottom': {
          const [l, t, r, b] = st.rect; const v = Math.round(num(value));
          if (prop === 'left') st.rect = [v, t, v + r - l, b];
          if (prop === 'top') st.rect = [l, v, r, v + b - t];
          if (prop === 'right') st.rect = [v - (r - l), t, v, b];
          if (prop === 'bottom') st.rect = [l, v - (b - t), r, v];
          break;
        }
        case 'width': { const [l, t, r, b] = st.rect; const w = Math.round(num(value)); const c = (l + r) / 2; st.rect = [Math.round(c - w / 2), t, Math.round(c - w / 2) + w, b]; break; }
        case 'height': { const [l, t, r, b] = st.rect; const hh = Math.round(num(value)); const c = (t + b) / 2; st.rect = [l, Math.round(c - hh / 2), r, Math.round(c - hh / 2) + hh]; break; }
        case 'icon': {
          const v = str(value);
          const id = NUM_RE.test(v) ? Math.trunc(num(v)) : 0;
          const asset = id ? (this.ir.assets || []).find(a => a.id === 'icon-' + id) : null;
          st.iconId = id || v;
          st.icon = asset ? asset.file : null;
          if (!asset && v && v !== '0') this.rt.unsupported('icon', `icon "${v}" is a HyperCard application icon (not available)`);
          break;
        }
        default: this.rt.unsupported('set property', `set ${prop} of ${this.nameOf(h)}`); return;
      }
      this.changed();
    }

    setHilite(id, on) {
      const st = this.state.get(id);
      st.hilite = on;
      if (on && st.family) {
        for (const o of this.partsOf.get(st.owner) || []) {
          const s2 = this.state.get(o.id);
          if (o.id !== id && s2.family === st.family) s2.hilite = false;
        }
      }
      this.changed();
    }

    // =========================================================================================
    // Messages
    // =========================================================================================
    /** HyperCard message path for an object id: part -> card -> background -> stack. */
    chain(id) {
      const ids = [];
      const cur = this.current;
      if (this.objects.has(id)) {
        ids.push(id);
        const owner = this.state.get(id).owner;
        if (this.bgNames.has(owner)) { if (cur) ids.push(cur.id); ids.push(owner); }
        else { ids.push(owner); const bg = this.bgOf(this.cardById(owner)); if (bg) ids.push(bg); }
      } else if (this.cardIndex.has(id)) {
        ids.push(id);
        const bg = this.bgOf(this.cardById(id));
        if (bg) ids.push(bg);
      } else if (this.bgNames.has(id)) {
        ids.push(id);
      }
      ids.push(STACK);
      ids.push(...this.using);           // libraries (`start using`) come after the stack
      return ids;
    }

    handlerFor(ownerId, key) {
      const hs = this.rt.handlers.get(ownerId);
      return hs ? hs.get(key) : null;
    }

    hasHandler(targetId, msg) {
      const key = String(msg).toLowerCase();
      return this.chain(targetId).some(id => this.handlerFor(id, key));
    }

    /** Send a message along the path. Returns {handled, value}. */
    async dispatch(msg, targetId, args = [], kind = 'message') {
      const key = (kind === 'function' ? 'function:' : '') + String(msg).toLowerCase();
      if (kind === 'message' && this.gprops.lockMessages && /^(open|close|resume|suspend)/i.test(msg) && !this._forced) {
        return { handled: true, value: undefined };
      }
      for (const id of this.chain(targetId)) {
        const fn = this.handlerFor(id, key);
        if (!fn) continue;
        const $ = { me: id, target: targetId, params: args, message: msg };
        const r = await fn($, ...args);
        if (r === PASS) continue;
        if (kind === 'message' && r !== undefined) this.result = r;
        return { handled: true, value: r };
      }
      return { handled: false, value: undefined };
    }

    /** A message from the user interface: queued so handlers never interleave. */
    post(msg, targetId, args = []) {
      const run = async () => {
        try {
          const r = await this.dispatch(msg, targetId, args);
          if (!r.handled) await this.defaultAction(msg, targetId, args);
        } catch (e) {
          this.reportError(e, msg);
        } finally {
          // HyperCard unlocks the screen when all handlers have finished
          if (this.lockCount) { this.lockCount = 0; this.gprops.lockScreen = false; }
          this.gprops.lockMessages = false;
          this.render();
        }
      };
      this.queue = this.queue.then(run, run);
      return this.queue;
    }

    reportError(e, where) {
      if (e === ABORT) return;
      console.error(`[HyperTalk] ${where}:`, e);
      this.errors.push(`${where}: ${e && e.message}`);
      if (!this.fast && e instanceof HTError) this.rt.flash(`Script error: ${e.message}`, 3000, this.flashHost);
    }

    /** What HyperCard does when no handler takes a system message. */
    async defaultAction(msg, targetId, args) {
      const m = String(msg).toLowerCase();
      switch (m) {
        case 'arrowkey': {
          const k = str(args[0]).toLowerCase();
          if (k === 'left') await this.goCard({ rel: 'prev' });
          else if (k === 'right') await this.goCard({ rel: 'next' });
          else if (k === 'down') await this.goBack();
          return;
        }
        case 'keydown': {
          if (this.focusedField()) this.typeText(str(args[0]));
          return;
        }
        case 'returninfield': this.typeText('\n'); return;
        case 'enterinfield': if (document.activeElement) document.activeElement.blur(); return;
        case 'tabkey': this.renderer.focusNextField(); return;
        case 'domenu': await this.menuCommand(str(args[0])); return;
        case 'help': case 'returnkey': case 'enterkey': return;
      }
    }

    // =========================================================================================
    // Navigation
    // =========================================================================================
    async goCard(desc, opts = {}) {
      const card = this.findCard(desc);
      if (!card) { this.result = 'No such card.'; return false; }
      await this.changeCard(card, opts);
      this.result = '';
      return true;
    }

    async changeCard(card, opts = {}) {
      const prev = this.current;
      if (prev && !opts.noRecent) this.recent.push(prev.id);
      if (this.recent.length > 100) this.recent.shift();
      const prevBg = prev ? this.bgOf(prev) : null;
      const nextBg = this.bgOf(card);
      if (prev && prev !== card && !opts.deleted) {
        this.closing = prev;
        try { await this.dispatch('closeCard', prev.id); } finally { if (this.closing === prev) this.closing = null; }
        if (prevBg !== nextBg) await this.dispatch('closeBackground', prev.id);
      }
      if (this.renderer) this.renderer.commitFields();
      this.current = card;
      this.rt.current = card;
      this.cardChanged = true;
      await this.render(true);
      if (opts.created) await this.dispatch('newCard', card.id);
      if (prev !== card) {
        if (prevBg !== nextBg) await this.dispatch('openBackground', card.id);
        await this.dispatch('openCard', card.id);
      }
    }

    /** doMenu "New Card": an empty card of the current background, inserted after this one (HyperCard
     *  copies no card parts; background fields start empty). Sends newCard before openCard. */
    async newCard() {
      const cur = this.current;
      const bg = this.bgOf(cur);
      let max = 0;
      for (const c of this.cards) max = Math.max(max, Number(String(c.id).split('-')[1]) || 0);
      const id = 'card-' + (max + 1);
      const card = { id, name: '', number: 0, layers: bg ? [bg] : [], image: null, script: null, objects: [], layer_text: {} };
      this.cards.splice(this.cardIndex.get(cur.id) + 1, 0, card);
      this._reindex();
      this.cardNames.set(id, '');
      this.partsOf.set(id, []);
      if (this.rt.screens) this.rt.screens.set(id, card);
      // background fields start empty, except sharedText ones (part flags byte A, bit 0x08)
      for (const o of bg ? this.partsByKind(bg, 'field') : []) if (!((o.extra && o.extra.flags_a) & 0x08)) this.bgText.set(id + '|' + o.id, '');
      await this.changeCard(card, { created: true });
      return card;
    }

    /** doMenu "Delete Card": sends deleteCard, removes the card and shows the next one. When a card deletes
     *  itself from its own closeCard (Patients' incomplete-patient check), the pending card change continues. */
    async deleteCard() {
      const cur = this.closing || this.current;
      if (this.cards.length <= 1) { this.result = "Can't delete the last card."; return; }
      await this.dispatch('deleteCard', cur.id);
      const i = this.cardIndex.get(cur.id);
      this.cards.splice(i, 1);
      this._reindex();
      this.recent = this.recent.filter(x => x !== cur.id);
      this.pushed = this.pushed.filter(x => x !== cur.id);
      if (this.rt.screens) this.rt.screens.delete(cur.id);
      if (this.closing === cur) { this.closing = null; return; }
      const next = this.cards[Math.min(i, this.cards.length - 1)];
      await this.changeCard(next, { noRecent: true, deleted: true });
    }
    // ---- painting by scripts (choose line/rectangle/text/eraser tool, drag, click at + type) ----------
    /** Record one paint operation on the current card's picture and draw it now. Patterns: 12 = black,
     *  1 = white, any other number = 50% gray (a checkerboard); HyperCard's 40 patterns are not modelled. */
    paintOp(op) {
      const id = this.current.id;
      if (!this.paint.has(id)) this.paint.set(id, []);
      this.paint.get(id).push(op);
      if (this.renderer && this.renderer.cctx) this.drawPaintOp(this.renderer.cctx, op);
    }
    clearPicture() {
      const id = this.current.id;
      this.paint.delete(id);
      this.clearedPictures.add(id);
      this.cardChanged = true;
      this.changed();
    }
    /** Replays the paint operations of a card after the renderer drew its picture (app.js). */
    drawPaint(cardId) {
      const ops = this.paint.get(cardId);
      if (!ops || !this.renderer || !this.renderer.cctx) return;
      for (const op of ops) this.drawPaintOp(this.renderer.cctx, op);
    }
    drawPaintOp(c, op) {
      c.save();
      c.imageSmoothingEnabled = false;
      const fill = pat => {
        if (pat === 12 || !pat) return '#000';
        if (pat === 1) return '#fff';
        const t = document.createElement('canvas'); t.width = t.height = 2;
        const tc = t.getContext('2d'); tc.fillStyle = '#000'; tc.fillRect(0, 0, 1, 1); tc.fillRect(1, 1, 1, 1);
        return c.createPattern(t, 'repeat');
      };
      if (op.t === 'line') {
        // QuickDraw lines: a pen of size n x n dragged from point to point
        const n = op.size, steps = Math.max(Math.abs(op.x2 - op.x1), Math.abs(op.y2 - op.y1), 1);
        c.fillStyle = '#000';
        for (let i = 0; i <= steps; i++) {
          c.fillRect(Math.round(op.x1 + (op.x2 - op.x1) * i / steps), Math.round(op.y1 + (op.y2 - op.y1) * i / steps), n, n);
        }
      } else if (op.t === 'rect') {
        const l = Math.min(op.x1, op.x2), t = Math.min(op.y1, op.y2), w = Math.abs(op.x2 - op.x1), h = Math.abs(op.y2 - op.y1);
        if (op.filled) { c.fillStyle = fill(op.pattern); c.fillRect(l, t, w, h); }
        c.fillStyle = '#000';
        const n = op.size;
        c.fillRect(l, t, w, n); c.fillRect(l, t + h - n, w, n); c.fillRect(l, t, n, h); c.fillRect(l + w - n, t, n, h);
      } else if (op.t === 'erase') {
        // the eraser is a 16 x 16 square dragged along the path
        const steps = Math.max(Math.abs(op.x2 - op.x1), Math.abs(op.y2 - op.y1), 1);
        c.fillStyle = '#fff';
        for (let i = 0; i <= steps; i += 4) {
          c.fillRect(Math.round(op.x1 + (op.x2 - op.x1) * i / steps) - 8, Math.round(op.y1 + (op.y2 - op.y1) * i / steps) - 8, 16, 16);
        }
      } else if (op.t === 'text') {
        const fam = HyperCardEngine.cssFont(op.font);
        const bold = /bold/.test(op.style) || /^chicago/i.test(op.font) ? 'bold ' : '';
        const ital = /italic/.test(op.style) ? 'italic ' : '';
        c.font = `${ital}${bold}${op.size}px ${fam}`;
        c.fillStyle = '#000';
        c.textBaseline = 'alphabetic';
        c.textAlign = op.align === 'center' ? 'center' : op.align === 'right' ? 'right' : 'left';
        c.fillText(op.text, op.x, op.y);
      }
      c.restore();
    }
    static cssFont(name) {
      const n = String(name || 'geneva').toLowerCase();
      if (n.startsWith('chicago')) return '"Chicago", "Segoe UI", Tahoma, Arial, sans-serif';
      if (n.startsWith('geneva')) return 'Geneva, Tahoma, Verdana, sans-serif';
      if (n.startsWith('helvetica')) return 'Helvetica, Arial, sans-serif';
      if (n.startsWith('times')) return '"Times New Roman", Times, serif';
      if (n.startsWith('courier')) return '"Courier New", Courier, monospace';
      if (n.startsWith('monaco')) return 'Monaco, "Lucida Console", Consolas, monospace';
      return `"${name}", Geneva, Verdana, sans-serif`;
    }

    // ---- menus created by scripts ---------------------------------------------------------------
    findMenu(name) {
      const n = str(name).trim().toLowerCase();
      return this.menus.find(m => m.name.toLowerCase() === n) || null;
    }
    /** Script-made menus as a menu bar above the card window (not drawn in ?shot=1 screenshots). A menu item
     *  with a menuMsg sends that message to the current card; one without sends doMenu <item>. */
    drawMenubar() {
      if (typeof document === 'undefined' || this.shot || !this.dialogHost) return;
      let bar = this._menubar;
      if (!bar) {
        bar = this._menubar = document.createElement('div');
        bar.className = 'hc-menubar';
        bar.setAttribute('role', 'menubar');
        this.dialogHost.parentElement.insertBefore(bar, this.dialogHost);
      }
      bar.textContent = '';
      bar.style.display = this.menus.length ? '' : 'none';
      for (const m of this.menus) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'hc-menu-title';
        b.textContent = m.name;
        b.disabled = !m.enabled;
        b.addEventListener('click', async () => {
          if (this.rt.dialogOpen) return;
          const cardBox = this.renderer.root.getBoundingClientRect(), bb = b.getBoundingClientRect();
          const n = await this.popupMenu(Math.round(bb.left - cardBox.left), 0, m.items.map(i => i.text));
          const it = n ? m.items[n - 1] : null;
          if (!it) return;
          if (it.msg) this.post(it.msg, this.current.id);
          else this.post('doMenu', this.current.id, [it.text]);
        });
        bar.appendChild(b);
      }
    }

    // ---- virtual disk (localStorage, per stack) and downloads --------------------------------------
    _diskKey(name) { return 'hypercard-file:' + this.ir.name + ':' + str(name).toLowerCase(); }
    diskRead(name) { try { return localStorage.getItem(this._diskKey(name)) || ''; } catch (e) { return ''; } }
    diskWrite(name, text) { try { localStorage.setItem(this._diskKey(name), text); } catch (e) { /* storage unavailable */ } }
    download(name, text) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text.replace(/\n/g, '\r\n')], { type: 'text/plain' }));
      a.download = (str(name).split(':').pop() || 'export') + (/\.\w+$/.test(name) ? '' : '.txt');
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    printNow(texts) {
      if (this.fast || typeof window === 'undefined') return;
      const w = window.open('', '_blank');
      if (!w) return;
      const pre = w.document.createElement('pre');
      pre.style.font = '12px Geneva, Verdana, sans-serif';
      pre.textContent = texts.join('\n\n');
      w.document.title = this.ir.name;
      w.document.body.appendChild(pre);
      w.print();
    }

    _reindex() {
      this.cardIndex = new Map(this.cards.map((c, i) => [c.id, i]));
      this.cards.forEach((c, i) => { c.number = i + 1; });
    }

    /** A small pop-up menu (used by the reconstructed PopMenu/popUp XCMDs). Resolves to the 1-based item
     *  number, or 0 when dismissed. Items "(-" or "-" are dividers, "(" starts a disabled item.
     *  In shot mode it returns 0 at once. */
    popupMenu(x, y, items, checked = 0) {
      if (this.fast || typeof document === 'undefined') return Promise.resolve(0);
      return new Promise(resolve => {
        const host = this.renderer && this.renderer.root ? this.renderer.root : document.body;
        const menu = document.createElement('div');
        menu.className = 'hc-popup';
        menu.setAttribute('role', 'menu');
        let done = null;
        items.forEach((t, i) => {
          const it = document.createElement('div');
          const label = String(t).trim();
          const sep = /^\(?-$/.test(label);
          it.className = sep ? 'hc-popup-sep' : 'hc-popup-item';
          if (!sep) {
            it.setAttribute('role', 'menuitem');
            it.textContent = (i + 1 === checked ? '\u2713 ' : '') + label.replace(/^\(/, '');
            if (label.startsWith('(')) it.classList.add('hc-disabled');
            else it.addEventListener('pointerup', e => { e.stopPropagation(); done(i + 1); });
          }
          menu.appendChild(it);
        });
        menu.style.left = Math.max(0, Math.min(x, this.ir.size.width - 60)) + 'px';
        menu.style.top = Math.max(0, Math.min(y, this.ir.size.height - 20)) + 'px';
        const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); done(0); } };
        const onDown = e => { if (!menu.contains(e.target)) done(0); };
        done = n => {
          menu.remove();
          removeEventListener('keydown', onKey, true);
          removeEventListener('pointerdown', onDown, true);
          this.rt.dialogOpen = false;
          resolve(n);
        };
        host.appendChild(menu);
        this.rt.dialogOpen = true;
        addEventListener('keydown', onKey, true);
        setTimeout(() => addEventListener('pointerdown', onDown, true), 0);
      });
    }

    async goBack() {
      const id = this.recent.pop();
      if (id) await this.changeCard(this.cardById(id), { noRecent: true });
    }

    // =========================================================================================
    // Rendering
    // =========================================================================================
    changed() { this.dirty = true; if (!this.lockCount) this._scheduleRender(); }
    _scheduleRender() {
      if (this._renderQueued) return;
      this._renderQueued = true;
      Promise.resolve().then(() => { this._renderQueued = false; if (!this.lockCount) this.render(); });
    }
    async render(cardChange = false) {
      if (!this.renderer || !this.current) return;
      if (this.lockCount) { this.dirty = true; if (cardChange) this.cardChanged = true; return; }
      if (this.cardChanged) {
        this.cardChanged = false;
        const eff = this.fast ? null : this.pendingEffect;
        this.pendingEffect = null;
        if (eff) await this.renderer.transition(() => this.renderer.drawScreen(this.current), eff);
        else this.renderer.drawScreen(this.current);
      } else {
        this.renderer.refresh();
      }
      this.dirty = false;
      this.updateMsgBox();
    }

    /** Classic Mac font scaling. The System had Chicago only in 12 points; asked for Chicago 24, the Font
     *  Manager doubled the 12-point bitmap. Fields in Chicago at an exact multiple of 12 are therefore drawn
     *  here as 12-point text, thresholded to 1 bit and scaled up with whole pixels (on a canvas over the
     *  field; the DOM text stays for selection and editing and shows while the field has the focus).
     *  Called after every renderer refresh (app.js). Other sizes keep the browser's font. */
    scaleBitmapFonts() {
      const R = this.renderer;
      if (!R || !R.els || typeof document === 'undefined' || this.rt.params.get('aa') === '1') return;
      for (const rec of R.els.values()) {
        const v = rec.v;
        if (!v || v.kind !== 'field' || !rec.text) continue;
        const k = HyperCardEngine.bitmapScale(v);
        const runsOk = !(v.runs && v.runs.length > 1);
        if (!k || !runsOk) { if (rec.bmp) { rec.bmp.remove(); rec.bmp = null; rec.el.classList.remove('hc-bitmap-field'); } continue; }
        const [l, t, r, b] = v.rect;
        const key = [v.text, l, t, r, b, v.align, v.lineHeight, v.shape, (v.style || []).join()].join('\u0001');
        if (rec.bmp && rec.bmpKey === key) continue;
        rec.bmpKey = key;
        if (!rec.bmp) {
          rec.bmp = document.createElement('canvas');
          rec.bmp.className = 'hc-bitmap';
          rec.el.appendChild(rec.bmp);
          rec.el.classList.add('hc-bitmap-field');
        }
        this._drawScaledText(rec, v, k);
      }
    }
    static bitmapScale(v) {
      if (!/^chicago/i.test(String(v.font || ''))) return 0;
      const size = Number(v.size) || 12;
      return size > 12 && size % 12 === 0 ? size / 12 : 0;
    }
    _drawScaledText(rec, v, k) {
      const [l, t, r, b] = v.rect;
      const cs = getComputedStyle(rec.el);
      const bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
      const br = parseFloat(cs.borderRightWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
      const W = Math.max(1, r - l - bl - br), Hh = Math.max(1, b - t - bt - bb);
      const cv = rec.bmp;
      cv.width = W; cv.height = Hh;
      Object.assign(cv.style, { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: Hh + 'px', pointerEvents: 'none' });
      const w1 = Math.ceil(W / k), h1 = Math.ceil(Hh / k);
      const small = document.createElement('canvas');
      small.width = w1; small.height = h1;
      const sc = small.getContext('2d');
      sc.font = `${cs.fontWeight} 12px ${cs.fontFamily}`;
      // fitted on Wordle's reference title (ink F1 0.934 -> 0.941): the substitute font is a little narrower
      // than Chicago, so glyphs get 0.5 px extra advance and the line starts 1 px further left (12-pt units)
      const SPACING = 0.5, DX = -1;
      sc.letterSpacing = SPACING + 'px';
      sc.fillStyle = '#000';
      sc.textBaseline = 'alphabetic';
      // layout in 12-point units: same insets as the DOM text (4 px left, 3 px right), word wrap at the width
      const padL = 4 / k, padR = 3 / k, avail = w1 - padL - padR;
      const lines = [];
      for (const para of String(v.text).split('\n')) {
        let cur = '';
        for (const word of para.split(/(?<= )/)) {
          if (cur && sc.measureText(cur + word).width > avail) { lines.push(cur); cur = word; } else cur += word;
        }
        lines.push(cur);
      }
      const lh = (v.lineHeight || 16) / k;
      const asc = (window.PixelRenderer && PixelRenderer.macAscent ? PixelRenderer.macAscent(v.font, 12, lh) : 12);
      lines.forEach((ln, i) => {
        const tw = sc.measureText(ln.replace(/ +$/, '')).width;
        let x = padL;
        if (v.align === 'center') x = padL + (avail - tw) / 2;
        else if (v.align === 'right') x = padL + avail - tw;
        sc.fillText(ln, Math.round(x) + DX, Math.round(i * lh + asc) - (v.scroll || 0) / k);
      });
      // 1-bit threshold at 12 points, then whole-pixel enlargement
      const img = sc.getImageData(0, 0, w1, h1), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const on = d[i + 3] >= 110; d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = on ? 255 : 0; }
      sc.putImageData(img, 0, 0);
      const c = cv.getContext('2d');
      c.clearRect(0, 0, W, Hh);
      c.imageSmoothingEnabled = false;
      c.drawImage(small, 0, 0, w1 * k, h1 * k);
    }

    /** View properties of one object on the current card (used by render-pixels.js). */
    partView(o) {
      const st = this.state.get(o.id);
      const text = o.kind === 'field' ? this.fieldText(o.id, this.current.id) : '';
      return {
        id: o.id, kind: o.kind, name: st.name, rect: st.rect, visible: st.visible, hilite: st.hilite,
        enabled: st.enabled, shape: st.shape, showName: st.showName, icon: st.icon, iconId: st.iconId,
        font: st.textFont, size: st.textSize, lineHeight: st.textHeight, align: st.textAlign,
        style: HyperCardEngine.styleNames(st.textStyle), lockText: st.lockText, text,
        runs: (o.kind === 'field' && st.owner.startsWith('card-') && text === this._norm(o.text)) ? st.runs :
          (o.kind === 'field' && !st.owner.startsWith('card-') && text === this._norm(o.text)) ? st.runs : [],
        scroll: st.scroll, autoHilite: st.autoHilite,
        iconTopOffset: (o.extra && o.extra.icon_top_offset != null) ? o.extra.icon_top_offset : null,
      };
    }
    pictureVisible(cardId, layer) {
      if (layer === cardId && this.clearedPictures.has(cardId)) return false;
      const k = cardId + '|' + layer;
      return this.pictures.has(k) ? this.pictures.get(k) : true;
    }

    // =========================================================================================
    // User interface events (from render-pixels.js and app.js)
    // =========================================================================================
    onPartEvent(type, id, ev) {
      if (type === 'mouseDown' || type === 'mouseUp') this.foundBox = null;
      if (type === 'fieldInput') { this.setFieldTextQuiet(id, ev.text); return; }
      if (type === 'fieldChanged') { this.post('closeField', id); return; }
      const st = this.state.get(id);
      if (!st || !st.visible) return;
      if (ev && ev.x != null) this.mouse.clickX = ev.x, this.mouse.clickY = ev.y;
      if (type === 'mouseUp' && this.objects.get(id).kind === 'button' && st.family && st.enabled) this.setHilite(id, true);
      if (ev && ev.chunk) this.click = ev.chunk;
      this.post(type, id);
    }
    setFieldTextQuiet(id, text) {
      const st = this.state.get(id);
      text = this._norm(text);
      if (st.owner.startsWith('card-')) st.text = text; else this.bgText.set(this.current.id + '|' + id, text);
      st.runs = [];
    }
    onCardEvent(type, ev) {
      if (ev && ev.x != null) this.mouse.clickX = ev.x, this.mouse.clickY = ev.y;
      this.post(type, this.current.id);
    }
    focusedField() { return this.renderer ? this.renderer.focusedFieldId() : null; }
    /** The focused field when text can be typed into it (a selected line of a locked list field does not count). */
    editingField() {
      const id = this.focusedField();
      // after `find`, HyperCard boxes the found text but keeps typing in the message box
      return id && !this.state.get(id).lockText && id !== this.foundBox ? id : null;
    }

    /** Keyboard: returns true when the key was taken over by a script (the page should not handle it). */
    onKey(e) {
      if (this.rt.dialogOpen) return false;
      const fid = this.focusedField();
      const target = fid || this.current.id;
      const named = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      if (named[e.key] && !fid) { this.post('arrowKey', target, [named[e.key]]); return true; }
      if (e.key === 'Tab') { this.post('tabKey', target); return true; }
      if (e.key === 'Enter' || e.key === 'Return') {
        const enter = e.location === 3 || e.code === 'NumpadEnter';
        if (fid) {
          if (this.hasHandler(fid, 'keyDown')) { this.post('keyDown', fid, [String.fromCharCode(enter ? 3 : 13)]); return true; }
          this.post(enter ? 'enterInField' : 'returnInField', fid);
          return true;
        }
        this.post('keyDown', target, [String.fromCharCode(enter ? 3 : 13)]);
        return true;
      }
      if (e.key === 'Backspace' && !fid) { this.post('keyDown', target, [String.fromCharCode(8)]); return true; }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        if (fid && !this.hasHandler(fid, 'keyDown')) return false;   // plain typing in a field
        this.post('keyDown', target, [e.key]);
        return true;
      }
      return false;
    }

    typeText(t) {
      if (!this.renderer.insertText(t)) {
        // no field has the focus: HyperCard would type into the message box
        this.msgText += t;
      }
    }

    updateMsgBox() { if (this.renderer) this.renderer.setMessageBox(this.msgVisible, this.msgText); }

    // =========================================================================================
    // Menus, sound, effects
    // =========================================================================================
    async menuCommand(item) {
      const it = item.toLowerCase().replace(/…|\.\.\.$/g, '').trim();
      switch (it) {
        case 'next': return this.goCard({ rel: 'next' });
        case 'prev': case 'previous': return this.goCard({ rel: 'prev' });
        case 'first': return this.goCard({ rel: 'first' });
        case 'last': return this.goCard({ rel: 'last' });
        case 'back': return this.goBack();
        case 'home': return this.H.goHome();
        case 'compact stack': return;
        case 'new card': await this.newCard(); return;
        case 'delete card': await this.deleteCard(); return;
        case 'clear picture': this.clearPicture(); return;
        case 'select all': this.renderer.selectAll(); return;
        case 'copy text': {
          const s = String(window.getSelection ? window.getSelection() : '');
          try { if (navigator.clipboard) await navigator.clipboard.writeText(s); } catch (e) { /* ignore */ }
          return;
        }
        case 'message': this.msgVisible = !this.msgVisible; this.updateMsgBox(); return;
        case 'quit hypercard':
          if (!this.fast) this.rt.flash('Quit HyperCard: close this browser tab to quit.', 3000, this.flashHost);
          return;
      }
      for (const m of this.menus) {
        const mi = m.items.find(i => i.text.toLowerCase() === it);
        if (mi) { if (mi.msg) await this.dispatch(mi.msg, this.current.id); return; }
      }
      this.rt.unsupported('doMenu', `doMenu "${item}"`);
    }

    audio() {
      if (this._ac === undefined) {
        try { this._ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this._ac = null; }
      }
      return this._ac;
    }
    tone(freq, start, dur, type = 'square', gain = 0.08, sweep = 0) {
      const ac = this.audio();
      if (!ac) return;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, start);
      if (sweep) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * sweep), start + dur);
      g.gain.setValueAtTime(gain, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(ac.destination);
      o.start(start);
      o.stop(start + dur + 0.02);
    }
    playNotes(instr, tempo, notes) {
      const ac = this.audio();
      const beat = 60 / (num(tempo) || 120);
      const type = { harpsichord: 'sawtooth', flute: 'sine', boing: 'triangle' }[instr] || 'square';
      let t = ac ? ac.currentTime + 0.02 : 0, octave = 4, dur = 1, total = 0;
      const list = str(notes).trim() ? str(notes).trim().split(/\s+/) : ['c'];
      for (const n of list) {
        const m = /^([a-gr])([#b]?)(\d?)([whqestx]?)(\.?)(3?)$/i.exec(n);
        if (!m) continue;
        if (m[3]) octave = +m[3];
        if (m[4]) dur = DUR[m[4].toLowerCase()];
        let d = dur * beat * (m[5] ? 1.5 : 1) * (m[6] ? 2 / 3 : 1);
        if (m[1].toLowerCase() !== 'r') {
          const semi = NOTE_SEMI[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
          const f = 440 * Math.pow(2, (semi - 9) / 12 + (octave - 4));
          if (ac) this.tone(f, t, d * 0.95, type, 0.06, instr === 'boing' ? 0.5 : 0);
        }
        t += d; total += d;
      }
      return total;
    }

    // =========================================================================================
    // Start-up
    // =========================================================================================
    async start() {
      const startId = this.rt.params.get('card') ? null : this.ir.start_screen;
      let first = this.cardById(startId) || this.cards[0];
      const pc = this.rt.params.get('card');
      if (pc) first = this.findCard({ key: pc }) || first;
      this.current = first;
      this.rt.current = first;
      this.cardChanged = true;
      if (this.renderer) await this.renderer.ready;
      const boot = async () => {
        await this.dispatch('openStack', first.id);
        await this.dispatch('openBackground', this.current.id);
        await this.dispatch('openCard', this.current.id);
      };
      if (this.fast) this.shotDeadline = performance.now() + 2000;
      const run = async () => {
        try { await boot(); } catch (e) { this.reportError(e, 'startup'); }
        finally {
          this.lockCount = 0; this.gprops.lockScreen = false; this.gprops.lockMessages = false;
          this.cardChanged = true;
          await this.render();
          this.booted = true;
          if (this.fast) this.fast = this.shot;    // stays fast in shot mode
          document.documentElement.dataset.ready = '1';
        }
      };
      this.queue = this.queue.then(run, run);
      await this.queue;
      if (!this.shot) this._startIdle();
    }

    _startIdle() {
      setInterval(() => {
        if (this._idleBusy || this.rt.dialogOpen || !this.current) return;
        if (!this.hasHandler(this.current.id, 'idle')) return;
        this._idleBusy = true;
        this.post('idle', this.current.id).then(() => { this._idleBusy = false; });
      }, 200);
    }

    // =========================================================================================
    // The API used by translated scripts
    // =========================================================================================
    _api() {
      const E = this;
      const rt = this.rt;
      const H = {
        PASS, ABORT, STACK, g: this.globals,
        // registration ------------------------------------------------------------------------
        on(owner, name, fn) { rt.on(owner, name, fn); },
        fn(owner, name, fn) { rt.on(owner, 'function:' + name, fn); },
        unsupported(cmd, line) { rt.unsupported(cmd, line); return undefined; },
        // values ------------------------------------------------------------------------------
        str, num, bool,
        eq(a, b) {
          if (typeof a === 'boolean' || typeof b === 'boolean') return str(a).toLowerCase() === str(b).toLowerCase();
          if (isNum(a) && isNum(b)) return num(a) === num(b);
          return str(a).toLowerCase() === str(b).toLowerCase();
        },
        lt(a, b) { return isNum(a) && isNum(b) ? num(a) < num(b) : str(a).toLowerCase() < str(b).toLowerCase(); },
        gt(a, b) { return isNum(a) && isNum(b) ? num(a) > num(b) : str(a).toLowerCase() > str(b).toLowerCase(); },
        le(a, b) { return !H.gt(a, b); },
        ge(a, b) { return !H.lt(a, b); },
        contains(a, b) { return str(a).toLowerCase().includes(str(b).toLowerCase()); },
        within(pt, rect) {
          const [x, y] = str(pt).split(',').map(num), [l, t, r, b] = str(rect).split(',').map(num);
          return x >= l && x < r && y >= t && y < b;
        },
        isA(v, type) {
          const s = str(v).trim();
          switch (type) {
            case 'number': return NUM_RE.test(s);
            case 'integer': return /^\s*[-+]?\d+\s*$/.test(s);
            case 'point': return /^\s*-?\d+\s*,\s*-?\d+\s*$/.test(s);
            case 'rect': case 'rectangle': return /^\s*-?\d+\s*(,\s*-?\d+\s*){3}$/.test(s);
            case 'logical': case 'boolean': return /^(true|false)$/i.test(s);
            case 'date': return s !== '' && !Number.isNaN(Date.parse(s.replace(/(\d+)\/(\d+)\/(\d\d)$/, '$1/$2/19$3')));
          }
          return false;
        },
        cat(...parts) { return parts.map(str).join(''); },
        div(a, b) { return Math.trunc(num(a) / num(b)); },
        mod(a, b) { return num(a) % num(b); },
        *range(a, b, step = 1) {
          a = num(a); b = num(b);
          if (step > 0) for (let i = a; i <= b; i++) yield i;
          else for (let i = a; i >= b; i--) yield i;
        },
        // chunks --------------------------------------------------------------------------------
        chunk(v, specs) { return chunkGet(v, specs); },
        put(v, x, mode = 'into', specs = null) { return chunkPut(v, x, mode, specs); },
        del(v, specs) { return chunkDelete(v, specs); },
        count(type, v) { return pieces(str(v), type).length; },
        sort(v, type, order, kind) {
          const d = type === 'item' ? ',' : '\n';
          let a = str(v).split(d);
          if (type === 'line' && a.length && a[a.length - 1] === '') a.pop();
          const key = kind === 'numeric' ? (x => num(x.trim() || 0)) : kind === 'datetime' ? (x => Date.parse(x) || 0) : (x => x.toLowerCase());
          a.sort((x, y) => { const p = key(x), q = key(y); return p < q ? -1 : p > q ? 1 : 0; });
          if (order === 'descending') a.reverse();
          return a.join(d);
        },
        // objects -------------------------------------------------------------------------------
        part($, layer, kind, key, card) { return E.resolvePart(layer, kind, key, card); },
        card($, desc) {
          const c = E.findCard(desc);
          if (!c) throw new HTError(`No such card ${JSON.stringify(desc)}`);
          return { t: 'card', id: c.id };
        },
        bg($, desc) {
          const b = E.findBg(desc);
          if (!b) throw new HTError(`No such background ${JSON.stringify(desc)}`);
          return { t: 'bg', id: b };
        },
        stack(name) {
          if (name !== undefined && str(name).toLowerCase() !== E.ir.name.toLowerCase()) {
            rt.unsupported('stack', `stack "${str(name)}" (other stacks are not available)`);
          }
          return { t: 'stack' };
        },
        me($) { return E.handleFor($.me); },
        target($) { return E.handleFor($.target); },
        msgBox() { return { t: 'msg' }; },
        cardWindow() { return { t: 'window' }; },
        selection() { return { t: 'selection' }; },
        exists(fn) { try { return !!fn(); } catch (e) { if (e instanceof HTError) return false; throw e; } },
        value(h) {
          if (!h || typeof h !== 'object') return str(h);
          if (h.t === 'part') return E.objects.get(h.id).kind === 'field' ? E.fieldText(h.id, h.card) : '';
          if (h.t === 'msg') return E.msgText;
          if (h.t === 'selection') return String(window.getSelection ? window.getSelection() : '');
          return E.nameOf(h);
        },
        putInto(h, v, mode = 'into', specs = null) {
          if (h.t === 'part') {
            if (E.objects.get(h.id).kind !== 'field') { rt.unsupported('put into button', E.nameOf(h)); return; }
            E.setFieldText(h.id, h.card, chunkPut(E.fieldText(h.id, h.card), v, mode, specs));
            return;
          }
          if (h.t === 'msg') { E.msgText = chunkPut(E.msgText, v, mode, specs); E.msgVisible = true; E.updateMsgBox(); return; }
          if (h.t === 'selection') { E.renderer.insertText(str(v)); return; }
          rt.unsupported('put', `put into ${E.nameOf(h)}`);
        },
        deleteIn(h, specs) {
          if (h.t === 'part') E.setFieldText(h.id, h.card, chunkDelete(E.fieldText(h.id, h.card), specs));
          else if (h.t === 'msg') { E.msgText = chunkDelete(E.msgText, specs); E.updateMsgBox(); }
        },
        prop(h, name) { return E.getProp(h, name); },
        setProp(h, name, v) { E.setProp(h, name, v); },
        getGlobal(name) {
          const k = Object.keys(E.gprops).find(x => x.toLowerCase() === name.toLowerCase()) || name;
          return E.gprops[k] !== undefined ? E.gprops[k] : '';
        },
        setGlobal(name, v) {
          const k = name.toLowerCase();
          if (k === 'lockscreen') { if (bool(v)) H.lockScreen(); else H.unlockScreen(); return; }
          if (k === 'cursor') {
            const c = str(v).toLowerCase();
            E.gprops.cursor = c;
            const css = { busy: 'progress', watch: 'wait', hand: 'pointer', arrow: 'default', none: 'none', cross: 'crosshair', plus: 'cell', ibeam: 'text', 'grab hand': 'grab' }[c] || 'default';
            if (E.renderer) E.renderer.setCursor(css);
            return;
          }
          const key = Object.keys(E.gprops).find(x => x.toLowerCase() === k) || name;
          E.gprops[key] = v;
        },
        countCards(bgH) {
          if (!bgH) return E.cards.length;
          return E.cards.filter(c => E.bgOf(c) === bgH.id).length;
        },
        countBackgrounds() { return E.bgs.length; },
        countParts($, layer, kind, cardH) {
          const card = cardH ? E.cardById(cardH.id) : E.current;
          const owner = layer === 'card' ? card.id : E.bgOf(card);
          return E.partsByKind(owner, kind).length;
        },
        show(h, loc) {
          if (h.t === 'msg') { E.msgVisible = true; E.updateMsgBox(); return; }
          if (h.t === 'window') return;
          if (h.t !== 'part') { rt.unsupported('show', E.nameOf(h)); return; }
          if (loc !== undefined) E.setProp(h, 'loc', loc);
          E.state.get(h.id).visible = true;
          E.changed();
        },
        hide(h) {
          if (h.t === 'msg') { E.msgVisible = false; E.updateMsgBox(); return; }
          if (h.t === 'window') { rt.unsupported('hide card window', ''); return; }
          if (h.t !== 'part') { rt.unsupported('hide', E.nameOf(h)); return; }
          E.state.get(h.id).visible = false;
          E.changed();
        },
        showBar(which) { E.bars[which] = true; },
        hideBar(which) { E.bars[which] = false; },
        setPicture(layer, on) {
          const owner = layer === 'card' ? E.current.id : E.bgOf(E.current);
          E.pictures.set(E.current.id + '|' + owner, on);
          E.cardChanged = true;
          E.changed();
        },
        // messages ------------------------------------------------------------------------------
        async call($, name, args = [], kind = 'message') {
          const r = await E.dispatch(name, $.me, args, kind);
          if (r.handled) return r.value;
          if (kind === 'function') {
            const b = H.f[Object.keys(H.f).find(k => k.toLowerCase() === name.toLowerCase())];
            if (b) return b(...args);
          } else {
            const known = ['arrowkey', 'domenu', 'keydown', 'tabkey', 'returninfield', 'enterinfield'];
            if (known.includes(name.toLowerCase())) { await E.defaultAction(name, $.me, args); return; }
          }
          // reconstructed XCMDs/XFCNs (modern/hypercard/shims/xcmds.js): HyperCard tries externals last
          const X = window.HC_XCMDS || {};
          const xk = Object.keys(X).find(k => k.toLowerCase() === String(name).toLowerCase());
          if (xk) {
            const v = await X[xk](E, $, ...args);
            if (kind === 'message' && v !== undefined && v !== '') E.result = v;
            return v;
          }
          rt.unsupported(kind === 'function' ? 'function' : 'handler', `${name}: not defined in this stack (XCMD/XFCN or another stack)`);
          // say it on screen once per name, so a missing external does not fail silently
          E._missing = E._missing || new Set();
          if (!E.fast && !E._missing.has(name.toLowerCase())) {
            E._missing.add(name.toLowerCase());
            rt.flash(`"${name}" is not available (an XCMD or another stack's handler)`, 2500, E.flashHost);
          }
          return '';
        },
        async send($, message, target) {
          let msg = str(message).trim(), args = [];
          const m = /^(\S+)\s*(.*)$/.exec(msg);
          if (m) { msg = m[1]; args = m[2] ? m[2].split(',').map(s => s.trim().replace(/^"(.*)"$/, '$1')) : []; }
          if (target === 'hypercard') {
            if (msg.toLowerCase() === 'domenu') { await E.menuCommand(args.join(',')); return; }
            rt.unsupported('send to HyperCard', str(message));
            return;
          }
          const tid = target ? E.handleId(target) : $.me;
          const r = await E.dispatch(msg, tid, args);
          if (!r.handled) await E.defaultAction(msg, tid, args);
        },
        async doScript($, text) {
          const s = str(text).trim();
          const m = /^(\w+)\s*(.*)$/.exec(s);
          if (m && (E.hasHandler($.me, m[1]) || ['domenu'].includes(m[1].toLowerCase()))) {
            const args = m[2] ? m[2].split(',').map(x => x.trim()) : [];
            const r = await E.dispatch(m[1], $.me, args);
            if (!r.handled) await E.defaultAction(m[1], $.me, args);
            return;
          }
          const f = /^find\s+(?:(whole|string|words?|chars?|normal)\s+)?("[^"]*"|\S+)$/i.exec(s);
          if (f) {
            const mode = (f[1] || 'normal').toLowerCase().replace(/^words?$/, 'word').replace(/^chars?$/, 'chars');
            await H.find($, f[2].replace(/^"(.*)"$/, '$1'), mode);
            return;
          }
          const g = /^go\s+(?:to\s+)?(.+)$/i.exec(s);
          if (g) {
            const w = g[1].trim().toLowerCase().replace(/\s+card$/, '');
            if (['next', 'prev', 'previous', 'first', 'last'].includes(w)) { await E.goCard({ rel: w === 'previous' ? 'prev' : w }); return; }
          }
          rt.unsupported('do', s);
        },
        startUsing(name) { E.startUsing(name); },
        stopUsing(name) { E.stopUsing(name); },
        // menus (create menu, put ... into menu ... with menuMsgs, enable/disable/delete menu, reset menubar) --
        hasMenu(name) { return !!E.findMenu(name) || HyperCardEngine.STD_MENUS.includes(str(name).trim().toLowerCase()); },
        createMenu(name) {
          if (E.findMenu(name)) return;
          E.menus.push({ name: str(name).trim(), items: [], enabled: true });
          E.drawMenubar();
        },
        deleteMenu(name) { E.menus = E.menus.filter(m => m !== E.findMenu(name)); E.drawMenubar(); },
        enableMenu(name, on) { const m = E.findMenu(name); if (m) { m.enabled = on; E.drawMenubar(); } },
        resetMenubar() { E.menus = []; E.drawMenubar(); },
        putIntoMenu(name, list, mode, msgs) {
          const m = E.findMenu(name);
          if (!m) throw new HTError(`No such menu "${str(name)}"`);
          // menu items are separated by returns or commas, like the menuMsgs that go with them
          const split = v => str(v).split(/[\n,]/).map(x => x.trim()).filter(x => x !== '');
          const ms = msgs == null ? [] : split(msgs);
          const items = split(list).map((t, i) => ({ text: t, msg: ms[i] || '', enabled: true }));
          if (mode === 'after') m.items.push(...items);
          else if (mode === 'before') m.items.unshift(...items);
          else m.items = items;
          E.drawMenubar();
        },
        // sort cards by an expression evaluated on every card ----------------------------------------
        async sortCards($, key, order, kind, bgDesc) {
          const bg = bgDesc ? E.findBg(bgDesc) : null;
          const pool = E.cards.filter(c => !bg || E.bgOf(c) === bg);
          const here = E.current;
          const keyed = [];
          try {
            for (const c of pool) {
              E.current = c; E.rt.current = c;
              // a card without the part the key names sorts as empty (Patients sorts the whole stack by
              // field "NAME", which its Title and list cards do not have)
              let v = '';
              try { v = await key(); } catch (e) { if (!(e instanceof HTError)) throw e; }
              keyed.push([c, v]);
            }
          } finally { E.current = here; E.rt.current = here; }
          const k = kind === 'numeric' ? (x => num(x)) : kind === 'datetime' ? (x => Date.parse(str(x)) || 0) : (x => str(x).toLowerCase());
          keyed.sort((a, b) => { const p = k(a[1]), q = k(b[1]); return p < q ? -1 : p > q ? 1 : 0; });   // stable, as HyperCard
          if (order === 'descending') keyed.reverse();
          const slots = E.cards.map((c, i) => (pool.includes(c) ? i : -1)).filter(i => i >= 0);
          slots.forEach((slot, j) => { E.cards[slot] = keyed[j][0]; });
          E._reindex();
          E.changed();
        },
        // files: a virtual disk in localStorage; closing a file that was written also downloads it ------
        openFile(name) {
          const n = str(name);
          E.files.set(n.toLowerCase(), { name: n, text: E.diskRead(n), pos: 0, written: false });
          E.result = '';
        },
        readFile(name, count, until) {
          const f = E.files.get(str(name).toLowerCase());
          if (!f) { E.result = 'File not open.'; return ''; }
          let end;
          if (count != null) end = f.pos + Math.max(0, Math.trunc(num(count)));
          else if (until != null) {
            const ch = str(until) === '' ? '\u0004' : str(until);
            const i = f.text.indexOf(ch, f.pos);
            end = i < 0 ? f.text.length : i + ch.length;
          } else end = f.text.length;
          const out = f.text.slice(f.pos, end);
          f.pos = Math.min(end, f.text.length);
          E.result = '';
          return out;
        },
        writeFile(name, v) {
          const f = E.files.get(str(name).toLowerCase());
          if (!f) { E.result = 'File not open.'; return; }
          const s = str(v);
          if (!f.written) { f.text = f.text.slice(0, f.pos); f.written = true; }   // writing replaces from here on
          f.text = f.text.slice(0, f.pos) + s + f.text.slice(f.pos + s.length);
          f.pos += s.length;
        },
        async closeFile(name) {
          const k = str(name).toLowerCase(), f = E.files.get(k);
          if (!f) return;
          E.files.delete(k);
          if (!f.written) return;
          E.diskWrite(f.name, f.text);
          if (!E.fast) E.download(f.name, f.text);
        },
        // printing: collected between open printing / close printing, then the browser's print dialog ---
        openPrinting() { E.printJob = []; },
        async printText(text) {
          if (E.printJob) { E.printJob.push(str(text)); return; }
          E.printNow([str(text)]);
        },
        async printCard() {
          if (E.fast) return;
          window.print();
        },
        async closePrinting() { const job = E.printJob; E.printJob = null; if (job && job.length) E.printNow(job); },
        // navigation ----------------------------------------------------------------------------
        async go($, desc) {
          if (desc && desc.stack !== undefined) {
            if (str(desc.stack).toLowerCase() === E.ir.name.toLowerCase()) return E.goCard({ rel: 'first' });
            rt.unsupported('go to stack', `go to stack "${str(desc.stack)}" (other stacks are not available)`);
            E.result = 'No such stack.';
            return false;
          }
          if (desc && 'key' in desc && !E.findCard(desc) && /^home$/i.test(str(desc.key))) return H.goHome($);
          return E.goCard(desc);
        },
        async goHome() {
          rt.unsupported('go home', 'the Home stack is not part of this app');
          if (!E.fast) rt.flash('Home stack: not available in this app', 2500, E.flashHost);
        },
        async goBack() { await E.goBack(); },
        pushCard() { E.pushed.push(E.current.id); },
        async popCard() { const id = E.pushed.pop(); if (id) await E.changeCard(E.cardById(id)); },
        visual(effect) { E.pendingEffect = str(effect).toLowerCase(); },
        lockScreen() { E.lockCount++; E.gprops.lockScreen = true; },
        async unlockScreen(effect) {
          if (effect) { E.pendingEffect = str(effect).toLowerCase(); E.cardChanged = true; }
          E.lockCount = Math.max(0, E.lockCount - 1);
          if (!E.lockCount) { E.gprops.lockScreen = false; await E.render(); }
        },
        // dialogs -------------------------------------------------------------------------------
        async answer(msg, buttons) {
          const btns = (buttons && buttons.length ? buttons : ['OK']).map(str);
          if (E.fast) return btns[btns.length - 1];
          await E.render();
          const lines = str(msg).split('\n');
          const choice = await rt.showText(lines, btns.map((b, i) => ({ id: i, text: b })),
            { className: 'hc-dialog', layout: 'buttons', defaultChoice: btns.length - 1, host: E.dialogHost });
          return choice == null ? btns[btns.length - 1] : btns[choice];
        },
        async ask(msg, dflt = '', password = false) {
          if (E.fast) return str(dflt);
          await E.render();
          const r = await rt.askText(str(msg), str(dflt), { className: 'hc-dialog', password, host: E.dialogHost });
          E.result = r == null ? 'Cancel' : '';
          return r == null ? '' : r;
        },
        // sound and time -------------------------------------------------------------------------
        play(name, tempo, notes) {
          const n = str(name).trim();
          const instruments = ['harpsichord', 'flute', 'boing'];
          if (E.fast) return;
          if (instruments.includes(n.toLowerCase()) || str(notes).trim()) {
            const secs = E.playNotes(n.toLowerCase(), tempo, notes);
            E.sound = { playing: n, until: performance.now() + secs * 1000 };
            return;
          }
          // the stack's own sampled `snd ` resources, decoded to WAV at build time (modern/hypercard/sounds.py)
          const S = window.HC_SOUNDS || {};
          const url = S[n.toLowerCase()];
          if (url) {
            if (E.audioEl) { try { E.audioEl.pause(); } catch (e) { /* ignore */ } }
            const a = new Audio(url);
            E.audioEl = a;
            E.sound = { playing: n, until: performance.now() + 60000 };
            a.addEventListener('loadedmetadata', () => { if (E.audioEl === a) E.sound.until = performance.now() + a.duration * 1000; });
            a.addEventListener('ended', () => { if (E.audioEl === a) E.sound = { playing: null, until: 0 }; });
            a.addEventListener('error', () => { if (E.audioEl === a) E.sound = { playing: null, until: 0 }; });
            const p = a.play();
            if (p && p.catch) p.catch(() => { if (E.audioEl === a) E.sound = { playing: null, until: 0 }; });
            return;
          }
          // sounds that are not in this stack's resource fork (HyperCard's own, or other files): placeholder blip
          rt.unsupported('play', `sound "${n}" is not in this stack (not available)`);
          const ac = E.audio();
          if (ac) E.tone(660, ac.currentTime + 0.01, 0.12, 'square', 0.04);
          E.sound = { playing: n, until: performance.now() + 150 };
        },
        playStop() {
          if (E.audioEl) { try { E.audioEl.pause(); } catch (e) { /* ignore */ } E.audioEl = null; }
          E.sound = { playing: null, until: 0 };
        },
        async wait(ticks) {
          if (E.fast) return;
          await rt.wait(num(ticks));
        },
        async waitUntil(cond) {
          let n = 0;
          while (!(await cond())) {
            if (E.fast && ++n > 10) return;
            await rt.wait(1);
          }
        },
        async tick() {
          // called once per loop iteration: lets the page breathe and stops runaway loops in shots
          E._loopN = (E._loopN || 0) + 1;
          if (E.fast && E.shotDeadline && performance.now() > E.shotDeadline) throw ABORT;
          if ((E._loopN & 255) === 0) await new Promise(r => setTimeout(r, 0));
        },
        beep(n = 1) {
          if (E.fast) return;
          const ac = E.audio();
          if (ac) for (let i = 0; i < num(n); i++) E.tone(880, ac.currentTime + i * 0.2, 0.15, 'square', 0.05);
        },
        async flash(n = 2) {
          if (E.fast) return;
          for (let i = 0; i < num(n) * 2; i++) { E.renderer.invert(i % 2 === 0); await rt.wait(4); }
          E.renderer.invert(false);
        },
        speak(text, voice) {
          if (E.fast || !window.speechSynthesis) return;
          const u = new SpeechSynthesisUtterance(str(text));
          if (/female/i.test(voice)) {
            const v = speechSynthesis.getVoices().find(x => /female|zira|samantha|victoria/i.test(x.name));
            if (v) u.voice = v;
          }
          speechSynthesis.speak(u);
          E.sound = { playing: 'speech', until: performance.now() + str(text).length * 70 };
        },
        choose(tool) {
          E.tool = str(tool).toLowerCase().replace(/\s*tool$/, '') || 'browse';
          E.paintPoint = null;
          if (!HyperCardEngine.PAINT_TOOLS.includes(E.tool)) rt.unsupported('choose tool', `choose ${E.tool} tool (only line, rectangle, text, eraser and select are drawn)`);
        },
        resetPaint() {
          Object.assign(E.gprops, { lineSize: 1, pattern: 12, filled: false, textFont: 'Geneva', textSize: 12, textHeight: 16, textAlign: 'left', textStyle: 'plain' });
          E.tool = 'browse'; E.paintPoint = null;
        },
        /** drag from a to b: with a paint tool, paints on the current card's picture (see paintOp). */
        async drag($, a, b) {
          const p = v => str(v).split(',').map(x => Math.round(num(x)));
          const [x1, y1] = p(a), [x2, y2] = p(b);
          const g = E.gprops;
          const lineSize = Math.max(1, num(g.lineSize) || 1);
          if (E.tool === 'line') E.paintOp({ t: 'line', x1, y1, x2, y2, size: lineSize });
          else if (E.tool === 'rectangle' || E.tool === 'rect') E.paintOp({ t: 'rect', x1, y1, x2, y2, size: lineSize, filled: bool(g.filled), pattern: num(g.pattern) });
          else if (E.tool === 'eraser') E.paintOp({ t: 'erase', x1, y1, x2, y2 });
          else if (E.tool === 'select') return;
          else rt.unsupported('drag', `drag with the ${E.tool || 'browse'} tool`);
        },
        async doMenu($, item) {
          const r = await E.dispatch('doMenu', E.current.id, [str(item)]);
          if (!r.handled) await E.menuCommand(str(item));
        },
        // mouse and keyboard ---------------------------------------------------------------------
        async clickAt($, x, y, keys = []) {
          if (y === null || y === undefined) [x, y] = str(x).split(',');
          x = Math.round(num(x)); y = Math.round(num(y));
          if (E.tool === 'text') { E.paintPoint = { x, y }; return; }      // paint text insertion point
          const id = E.renderer.hitTest(x, y);
          E.mouse.clickX = x; E.mouse.clickY = y;
          if (id) {
            const o = E.objects.get(id), st = E.state.get(id);
            if (o.kind === 'field' && !st.lockText) { E.renderer.placeCaret(id, x, y, keys.includes('shiftkey')); return; }
            if (o.kind === 'button' && !st.enabled) return;
            if (o.kind === 'field') E.click = E.renderer.chunkAt(id, x, y);
            const r1 = await E.dispatch('mouseDown', id); if (!r1.handled) await E.defaultAction('mouseDown', id, []);
            if (o.kind === 'button' && st.family) E.setHilite(id, true);
            await E.dispatch('mouseUp', id);
          } else {
            await E.dispatch('mouseDown', E.current.id);
            await E.dispatch('mouseUp', E.current.id);
          }
        },
        async type($, text) {
          const t = str(text);
          // typing Return with no text field active runs the message box, as in HyperCard
          // (Patients: put "Find" && quote & it & quote into msg; type return)
          if (E.tool === 'text' && E.paintPoint) {
            // paint text: drawn into the card picture at the text tool's insertion point (y = baseline)
            const g = E.gprops;
            for (const [i, ln] of t.split(/\r\n|[\r\n]/).entries()) {
              if (i) E.paintPoint = { x: E.paintPoint.x0 != null ? E.paintPoint.x0 : E.paintPoint.x, y: E.paintPoint.y + (num(g.textHeight) || 16) };
              if (ln) E.paintOp({ t: 'text', x: E.paintPoint.x, y: E.paintPoint.y, text: ln, font: str(g.textFont), size: num(g.textSize) || 12,
                style: str(g.textStyle).toLowerCase(), align: str(g.textAlign).toLowerCase() });
            }
            return;
          }
          if (/^[\r\n]$/.test(t) && !E.editingField() && E.msgText.trim()) { await H.doScript($, E.msgText); return; }
          E.typeText(t);
        },
        select(h, specs, where = 'on') {
          if (!h) { if (window.getSelection) window.getSelection().removeAllRanges(); return; }
          if (h.t !== 'part') return;
          const text = E.fieldText(h.id, h.card);
          let start = 0, end = text.length;
          if (specs) {
            let off = 0, sub = text;
            for (const s of specs) { const r = rangeOf(sub, s); start = off + Math.min(r.start, sub.length); end = off + Math.min(r.end, sub.length); off = start; sub = text.slice(start, end); }
          }
          if (where === 'before') end = start;
          if (where === 'after') start = end;
          E.renderer.selectRange(h.id, start, end);
        },
        selectChunk(desc) {
          const m = /^char (\d+) to (\d+) of (card|bkgnd) field (\d+)$/i.exec(str(desc));
          if (!m) return;
          const h = E.resolvePart(m[3].toLowerCase() === 'card' ? 'card' : 'bg', 'field', Number(m[4]));
          E.renderer.selectRange(h.id, Number(m[1]) - 1, Number(m[2]));
        },
        async find($, what, mode = 'normal', fieldH = null) {
          const q = str(what).trim();
          if (!q) { E.result = 'not found'; return; }
          const n = E.cards.length;
          const startIdx = E.cardIndex.get(E.current.id);
          const words = q.toLowerCase().split(/\s+/);
          const test = text => {
            const t = text.toLowerCase();
            if (mode === 'string' || mode === 'chars') return t.indexOf(q.toLowerCase());
            if (mode === 'whole') {
              const re = new RegExp('(^|[^\\w])' + q.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[^\\w])');
              const m = re.exec(t); return m ? m.index + m[1].length : -1;
            }
            // normal / word: every word must start a word of the field
            let first = -1;
            for (const w of words) {
              const re = new RegExp('(^|[^\\w])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (mode === 'word' ? '(?=$|[^\\w])' : ''));
              const m = re.exec(t); if (!m) return -1;
              if (first < 0) first = m.index + m[1].length;
            }
            return first;
          };
          for (let k = 0; k <= n; k++) {
            const card = E.cards[(startIdx + k) % n];
            const ids = [...(E.partsOf.get(E.bgOf(card)) || []), ...(E.partsOf.get(card.id) || [])]
              // part flags byte A, bit 0x10 = dontSearch (Patients' PATIENT LIST field is excluded from find)
              .filter(o => o.kind === 'field' && (!fieldH || o.id === fieldH.id) && !((o.extra && o.extra.flags_a) & 0x10));
            for (const o of ids) {
              const text = E.fieldText(o.id, card.id);
              const at = test(text);
              if (at < 0) continue;
              if (k === 0 && E.lastFind && E.lastFind.card === card.id && E.lastFind.field === o.id && E.lastFind.q === q) continue;
              E.lastFind = { card: card.id, field: o.id, q };
              E.foundBox = o.id;
              if (card !== E.current) await E.changeCard(card);
              const len = mode === 'whole' || mode === 'string' ? q.length : words[0].length;
              E.found = { chunk: `char ${at + 1} to ${at + len} of ${E.nameOf({ t: 'part', id: o.id })}`, text: text.substr(at, len),
                          line: `line ${text.slice(0, at).split('\n').length} of ${E.nameOf({ t: 'part', id: o.id })}`, field: E.nameOf({ t: 'part', id: o.id }) };
              await E.render();
              E.renderer.selectRange(o.id, at, at + len);
              E.result = '';
              return;
            }
          }
          E.result = 'not found';
        },
        // built-in functions -------------------------------------------------------------------
        f: null,
      };
      const pad2 = n => String(n).padStart(2, '0');
      const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const list = args => (args.length === 1 ? str(args[0]).split(',') : args).map(num);
      H.f = {
        abs: x => Math.abs(num(x)), atan: x => Math.atan(num(x)), cos: x => Math.cos(num(x)), sin: x => Math.sin(num(x)),
        tan: x => Math.tan(num(x)), exp: x => Math.exp(num(x)), exp1: x => Math.exp(num(x)) - 1, exp2: x => 2 ** num(x),
        ln: x => Math.log(num(x)), ln1: x => Math.log(1 + num(x)), log2: x => Math.log2(num(x)), sqrt: x => Math.sqrt(num(x)),
        trunc: x => Math.trunc(num(x)),
        round: x => { const v = num(x); return Math.sign(v) * Math.round(Math.abs(v)); },
        random: n => 1 + Math.floor(Math.random() * Math.max(1, Math.trunc(num(n)))),
        max: (...a) => Math.max(...list(a)), min: (...a) => Math.min(...list(a)),
        sum: (...a) => list(a).reduce((p, q) => p + q, 0),
        average: (...a) => { const l = list(a); return l.reduce((p, q) => p + q, 0) / (l.length || 1); },
        annuity: (r, n) => (1 - (1 + num(r)) ** -num(n)) / num(r),
        compound: (r, n) => (1 + num(r)) ** num(n),
        length: x => str(x).length,
        // offset of an empty string is 0 in HyperCard (Game Genie encode loops past the end of its position table)
        offset: (needle, hay) => (str(needle) === '' ? 0 : str(hay).toLowerCase().indexOf(str(needle).toLowerCase()) + 1),
        numToChar: n => String.fromCharCode(num(n)),
        charToNum: c => (str(c).length ? str(c).charCodeAt(0) : 0),
        value: x => {
          const s = str(x).trim();
          if (NUM_RE.test(s)) return num(s);
          if (/^[-+*/().\d\s]+$/.test(s)) { try { return Function(`"use strict";return (${s})`)(); } catch (e) { /* fall through */ } }
          if (/^".*"$/.test(s)) return s.slice(1, -1);
          return s;
        },
        param: ($, n) => { const i = Math.trunc(num(n)); return i === 0 ? $.message : str($.params[i - 1]); },
        paramCount: $ => $.params.length,
        params: $ => [$.message, ...$.params.map(p => `"${str(p)}"`)].join(' '),
        date: mod => {
          const d = new Date();
          if (mod === 'long') return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
          if (mod === 'abbreviated') return `${DAYS[d.getDay()].slice(0, 3)}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
          return `${d.getMonth() + 1}/${d.getDate()}/${pad2(d.getFullYear() % 100)}`;
        },
        time: mod => {
          const d = new Date(); const h = d.getHours() % 12 || 12;
          return `${h}:${pad2(d.getMinutes())}${mod === 'long' ? ':' + pad2(d.getSeconds()) : ''} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
        },
        seconds: () => Math.floor(Date.now() / 1000) + 2082844800, secs: () => H.f.seconds(),
        ticks: () => Math.floor((performance.now() - E.started) * 60 / 1000),
        clickLoc: () => `${E.mouse.clickX},${E.mouse.clickY}`, clickH: () => E.mouse.clickX, clickV: () => E.mouse.clickY,
        clickChunk: () => E.click.chunk || '', clickLine: () => E.click.line || '', clickText: () => E.click.text || '',
        mouse: () => (E.mouse.down ? 'down' : 'up'),
        mouseClick: () => { const c = E.mouse.clicked; E.mouse.clicked = false; return c; },
        mouseLoc: () => `${E.mouse.x},${E.mouse.y}`, mouseH: () => E.mouse.x, mouseV: () => E.mouse.y,
        optionKey: () => (E.keys.alt ? 'down' : 'up'), shiftKey: () => (E.keys.shift ? 'down' : 'up'),
        commandKey: () => (E.keys.ctrl || E.keys.meta ? 'down' : 'up'), cmdKey: () => H.f.commandKey(),
        capsLockKey: () => 'up',
        sound: () => (E.sound.playing && performance.now() < E.sound.until ? E.sound.playing : 'done'),
        result: () => E.result,
        version: () => '2.41',
        foundChunk: () => E.found.chunk, foundText: () => E.found.text, foundLine: () => E.found.line, foundField: () => E.found.field,
        selection: () => String(window.getSelection ? window.getSelection() : ''),
        selectedText: () => H.f.selection(),
        selectedLine: () => (E.renderer ? E.renderer.selectedLine() : ''),
        selectedChunk: () => '', selectedField: () => '',
        userLevel: () => E.gprops.userLevel,
        textHeight: () => E.gprops.textHeight, textFont: () => E.gprops.textFont, textSize: () => E.gprops.textSize,
        textStyle: () => E.gprops.textStyle, textAlign: () => E.gprops.textAlign,
        lockScreen: () => E.lockCount > 0, lockMessages: () => !!E.gprops.lockMessages,
        cursor: () => E.gprops.cursor, editBkgnd: () => !!E.gprops.editBkgnd,
        stacks: () => `Macintosh HD:${E.ir.name}`,
        environment: () => 'development',
        target: $ => E.nameOf(E.handleFor($.target)),
        screenRect: () => '0,0,512,342', systemVersion: () => '7.5.5', tool: () => `${E.tool || 'browse'} tool`,
        diskSpace: () => 100000000, heapSpace: () => 4000000, stackSpace: () => 100000,
        menus: () => ['Apple', 'File', 'Edit', 'Go', ...E.menus.map(m => m.name)].join('\n'), windows: () => 'card window\nmessage box',
        language: () => 'English', numberFormat: () => '0.######',
        unknown: name => { rt.unsupported('function', `the ${name}`); return ''; },
      };
      return H;
    }
  }

  HyperCardEngine.HTError = HTError;
  HyperCardEngine.PAINT_TOOLS = ['browse', 'line', 'rectangle', 'rect', 'text', 'eraser', 'select'];
  HyperCardEngine.STD_MENUS = ['apple', 'file', 'edit', 'go', 'tools', 'objects', 'font', 'style', 'home'];
  HyperCardEngine.helpers = { str, num, bool, isNum, chunkGet, chunkPut, chunkDelete, pieces };
  window.HyperCardEngine = HyperCardEngine;
})();
