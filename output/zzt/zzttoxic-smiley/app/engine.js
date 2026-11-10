/* ZZT game layer, built on the shared LegacyRuntime (modern/runtime/runtime.js).
 *
 * - Boards are IR screens; each board's live state (cells + entities) is created on first visit and kept.
 * - The player moves with the arrow keys; Shift+arrow (or Space) shoots. Items, doors, keys, passages and
 *   board-edge exits work. A sidebar to the right of the 480x350 board shows the counters.
 * - Every scripted object runs its translated program (scripts.js, made by modern/zzt/translator.py) as a
 *   cooperative coroutine: one "update" every `cycle` ticks, ~9.5 ticks per second.
 * - Messages between objects go through rt.send(label, objectId) -- the runtime's message hierarchy.
 *   Engine-triggered labels: `touch` (player bumps the object), `shot` (hit by a bullet), `thud` (blocked).
 *
 * Simplifications (see MIGRATION.md): creatures stand still (they hurt when touched), dark boards are
 * drawn lit, time limits, energizers, bombs, duplicators, transporters and conveyors do nothing.
 */
(function () {
  'use strict';

  const COLS = 60, ROWS = 25, SIDE = 20;
  const TICK_MS = 105;                     // ~9.5 ticks per second
  const END = 'end', GOTO = 'goto', RESTART = 'restart', DIE = 'die';
  const ABORT = { abort: true };           // thrown out of a waiting coroutine when a message arrives
  const DEAD = { dead: true };

  // Element numbers -> behaviour. Numbers 0, 4, 10, 11, 19-23, 31, 36, 47-53 are from SPEC 3.1; the rest
  // (item kinds, creature names, glyphs) are engine assumptions labelled G(uess) in the spec.
  const EL = {
    0: { name: 'empty', ch: 32, walk: true },
    4: { name: 'player', ch: 2 },
    5: { name: 'ammo', ch: 132, fg: 3 },
    6: { name: 'torch', ch: 157, fg: 6 },
    7: { name: 'gem', ch: 4 },
    8: { name: 'key', ch: 12 },
    9: { name: 'door', ch: 10 },
    10: { name: 'scroll', ch: 232, fg: 15 },
    11: { name: 'passage', ch: 240 },
    12: { name: 'duplicator', ch: 250 },
    13: { name: 'bomb', ch: 11 },
    14: { name: 'energizer', ch: 127, fg: 5 },
    15: { name: 'star', ch: 47, shot: true },
    16: { name: 'clockwise', ch: 47 },
    17: { name: 'counter', ch: 92 },
    18: { name: 'bullet', ch: 248, shot: true },
    19: { name: 'water', ch: 176, fg: 15, bg: 9 },
    20: { name: 'forest', ch: 176, fg: 0, bg: 2 },
    21: { name: 'solid', ch: 219 },
    22: { name: 'normal', ch: 178 },
    23: { name: 'breakable', ch: 177 },
    24: { name: 'boulder', ch: 254, push: 'any' },
    25: { name: 'sliderns', ch: 18, push: 'ns' },
    26: { name: 'sliderew', ch: 29, push: 'ew' },
    27: { name: 'fake', ch: 178, walk: true },
    28: { name: 'invisible', ch: 32 },
    29: { name: 'blinkwall', ch: 206 },
    30: { name: 'transporter', ch: 62 },
    31: { name: 'line', ch: 206 },
    32: { name: 'ricochet', ch: 42 },
    33: { name: 'blinkray', ch: 205 },
    34: { name: 'bear', ch: 153, enemy: true },
    35: { name: 'ruffian', ch: 5, enemy: true },
    36: { name: 'object', ch: 2 },
    37: { name: 'slime', ch: 42, enemy: true },
    38: { name: 'shark', ch: 94, enemy: true },
    39: { name: 'spinninggun', ch: 24 },
    40: { name: 'pusher', ch: 16 },
    41: { name: 'lion', ch: 234, enemy: true },
    42: { name: 'tiger', ch: 227, enemy: true },
    43: { name: 'blinkray', ch: 186 },
    44: { name: 'head', ch: 233, enemy: true },
    45: { name: 'segment', ch: 79, enemy: true },
  };
  const ELNUM = {};
  for (const [n, e] of Object.entries(EL)) if (!(e.name in ELNUM)) ELNUM[e.name] = +n;
  Object.assign(ELNUM, { wall: 22, torch: 6, centipede: 44, transporter: 30, monitor: 0, edge: 22 });
  const COLOR = { blue: 9, green: 10, cyan: 11, red: 12, purple: 13, yellow: 14, white: 15 };
  const KEY_NAME = ['', 'Blue', 'Green', 'Cyan', 'Red', 'Purple', 'Yellow', 'White'];
  const DIRS = { n: [0, -1], north: [0, -1], s: [0, 1], south: [0, 1], e: [1, 0], east: [1, 0], w: [-1, 0], west: [-1, 0], i: [0, 0], idle: [0, 0] };

  class ZztEngine {
    constructor(rt, programs) {
      this.rt = rt;
      this.programs = programs.programs;        // translated modules (array)
      this.byObject = programs.byObject;        // object id -> program index
      this.END = END; this.GOTO = GOTO; this.RESTART = RESTART; this.DIE = DIE;
      this.boards = new Map();                  // screen id -> live board state
      this.board = null;
      this.state = 'title';                     // 'title' | 'play' | 'over'
      this.tickN = 0;
      this.keys = new Set(); this.queued = [];
      this.player = { x: 0, y: 0, dir: [0, 1] };
      this.sound = true;
      this.startBoard = this._startBoard();
      rt.addListener('enterScreen', s => this._enter(s));
    }

    // ---- setup ---------------------------------------------------------------------------------
    _startBoard() {
      const p = this.rt.params.get('board');
      if (p != null) return 'board-' + p;
      for (const n of this.rt.ir.notes || []) {
        const m = /current board.*= (\d+)/.exec(n);
        if (m && this.rt.screen('board-' + m[1])) return 'board-' + m[1];
      }
      return this.rt.screen('board-1') ? 'board-1' : 'board-0';
    }

    mount(wrap) {
      this.wrap = wrap;
      const canvas = document.createElement('canvas');
      wrap.appendChild(canvas);
      this.canvas = canvas;
      const grid0 = this.rt.ir.grids[this.rt.ir.screens[0].grid.cells];
      this.r = this.rt.createRenderer(canvas, { cols: this.rt.shot ? COLS : COLS + SIDE, rows: ROWS, palette: grid0.palette });
      if (this.rt.shot) {   // ?shot=1 (optionally &board=N): one static board, no scripts, no player
        this._initBoards();
        this.board = this._boardState(this.rt.params.get('board') != null ? this.startBoard : this.rt.ir.start_screen);
        this.draw(); return;
      }
      this._initBoards();
      window.addEventListener('keydown', e => this._keydown(e));
      window.addEventListener('keyup', e => this.keys.delete(e.key));
      window.addEventListener('blur', () => this.keys.clear());
      if (this.rt.params.get('board') != null) this.startGame();
      else this.rt.go(this.rt.ir.start_screen);
      this._timer = setInterval(() => this._tickGuard(), TICK_MS);
    }

    _initBoards() {
      for (const b of this.boards.values()) for (const o of b.entities) o.dead = true;
      this.boards = new Map();
    }

    _boardState(id) {
      if (this.boards.has(id)) return this.boards.get(id);
      const scr = this.rt.screen(id);
      const g = this.rt.ir.grids[scr.grid.cells];
      const n = COLS * ROWS;
      const b = { id, scr, el: new Uint8Array(n), fg: new Uint8Array(n), bg: new Uint8Array(n), ch: new Int16Array(n),
        entities: [], at: new Map(), extra: scr.extra || {}, playerStart: null };
      g.cells.forEach(([c, f, bg, e], i) => { b.el[i] = e; b.fg[i] = f; b.bg[i] = bg; b.ch[i] = c == null ? -1 : c; });
      const seen = new Set();
      for (const ob of scr.objects) {
        const x = ob.extra.x - 1, y = ob.extra.y - 1, i = y * COLS + x;
        if (ob.number === 0) {               // the player record: remember position, clear the cell
          b.playerStart = [x, y];
          const [ue, uc] = ob.extra.under || [0, 0];
          this._setCell(b, i, ue, uc & 15, uc >> 4, null);
          continue;
        }
        if (!ob.visible || seen.has(i) || x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
        seen.add(i);
        const el = b.el[i];
        const name = (ob.name || '').toLowerCase();
        // targets match the whole @name or its first word (`@HINTS & SOLUTIONS` answers to `hints`)
        const o = { id: ob.id, name, title: (ob.name || '').trim(), word: (/^[a-z0-9_]*/.exec(name) || [''])[0], x, y, el, cycle: Math.max(1, ob.extra.cycle || 3),
          num: ob.number, p3: ob.extra.p3, dest: ob.extra.destination, locked: false, zapped: new Set(),
          jumpTo: null, walkDir: null, dead: false, script: ob.script, ops: 0,
          under: { el: (ob.extra.under || [0])[0], fg: (ob.extra.under || [0, 0])[1] & 15, bg: (ob.extra.under || [0, 0])[1] >> 4, ch: null } };
        const pi = this.byObject[ob.id];
        o.prog = pi != null ? this.programs[pi] : null;
        o.ip = ob.extra.ip;
        b.entities.push(o);
        b.at.set(i, o);
      }
      for (const o of b.entities) if (o.prog && o.prog.bind) {   // `#bind name` programs: share at load
        const t = b.entities.find(t => (t.name === o.prog.bind || t.word === o.prog.bind) && t.prog && !t.prog.bind);
        if (t) { o.prog = t.prog; o.ip = 0; }
      }
      if (!this.rt.shot) for (const o of b.entities) if (o.prog) this._startObject(b, o);
      this.boards.set(id, b);
      return b;
    }

    _setCell(b, i, el, fg, bg, ch) { b.el[i] = el; b.fg[i] = fg; b.bg[i] = bg; b.ch[i] = ch == null ? -1 : ch; }

    elementCell(word, color) {
      const el = ELNUM[word];
      if (el == null) return null;
      const d = EL[el];
      const fg = color ? COLOR[color] : (d.fg != null ? d.fg : (el === 0 ? 0 : 15));
      const bg = d.bg != null && !color ? d.bg : 0;
      return { el, fg, bg, ch: el === 0 ? 32 : null };
    }

    // ---- navigation ----------------------------------------------------------------------------
    startGame() {
      this._initBoards();
      for (const k of ['health']) this.rt.set(k, 100);
      for (const k of ['ammo', 'gems', 'torches', 'score']) this.rt.set(k, 0);
      for (let k = 1; k <= 7; k++) this.rt.set('key' + k, 0);
      this.rt.flags.clear();
      this.state = 'play';
      const b = this._boardState(this.startBoard);
      if (b.playerStart) [this.player.x, this.player.y] = b.playerStart;
      this.rt.go(this.startBoard);
    }

    _enter(screen) {
      this.board = this._boardState(screen.id);
      for (const o of this.board.entities) this.rt.objectOwner.set(o.id, screen.id);
      this.draw();
    }

    async _travel(boardId, how) {
      const b = this._boardState(boardId);
      const p = this.player;
      if (how.passage) {
        const src = how.passage;
        const match = b.entities.find(o => o.el === 11 && b.fg[o.y * COLS + o.x] === src.fg && b.bg[o.y * COLS + o.x] === src.bg)
          || b.entities.find(o => o.el === 11);
        const pos = match ? [match.x, match.y] : (b.playerStart || [p.x, p.y]);
        [p.x, p.y] = pos;
      } else {
        let { x, y } = how;
        const i = y * COLS + x;
        if (!this._walkable(b, i) || b.at.has(i)) return false;
        p.x = x; p.y = y;
      }
      await this.rt.go(boardId);
      return true;
    }

    // ---- input ---------------------------------------------------------------------------------
    _keydown(e) {
      if (this.rt.dialogOpen) return;
      this._audio();
      const k = e.key;
      if (k.startsWith('Arrow') || k === ' ') e.preventDefault();
      if (this.state !== 'play') {
        if (k === 'p' || k === 'P' || k === 'Enter') this.startGame();
        return;
      }
      if (k === 's' || k === 'S') { this.sound = !this.sound; this.rt.flash('Sound ' + (this.sound ? 'on' : 'off')); return; }
      if (k === 'Escape' || k === 'q' || k === 'Q') { this.state = 'title'; this.rt.go(this.rt.ir.start_screen); return; }
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k];
      if (d) {
        if (!e.repeat) this.queued.push({ d, shoot: e.shiftKey });
        this.keys.add(k);
        this._shift = e.shiftKey;
      } else if (k === ' ') this.queued.push({ d: this.player.dir, shoot: true });
    }

    _heldDir() {
      for (const [k, d] of [['ArrowUp', [0, -1]], ['ArrowDown', [0, 1]], ['ArrowLeft', [-1, 0]], ['ArrowRight', [1, 0]]])
        if (this.keys.has(k)) return d;
      return null;
    }

    // ---- main loop -----------------------------------------------------------------------------
    async _tickGuard() {
      if (this.busy || this.rt.dialogOpen) return;
      this.busy = true;
      try { await this.tick(); } catch (e) { console.error(e); } finally { this.busy = false; }
    }

    async tick() {
      this.tickN++;
      const b = this.board;
      if (!b) return;
      if (this.state === 'play') await this._playerTurn();
      if (this.board !== b) { this.draw(); return; }
      const list = b.entities.slice();
      for (let idx = 0; idx < list.length; idx++) {
        const o = list[idx];
        if (o.dead || this.board !== b) continue;
        if (o.bullet) { await this._moveBullet(b, o); continue; }
        if (!o.prog) continue;
        if (this.tickN % o.cycle !== idx % o.cycle) continue;
        if (o.walkDir) {
          const d = this.dir(o, o.walkDir);
          if ((d[0] || d[1]) && !this._moveEntity(b, o, d)) this.jumpLabel(o, 'thud');
        }
        await this._update(o);
      }
      if (this.board === b) b.entities = b.entities.filter(o => !o.dead);
      this.draw();
    }

    async _playerTurn() {
      const q = this.queued.shift();
      let d = q ? q.d : this._heldDir();
      if (!d) return;
      const shoot = q ? q.shoot : this._shift && this.keys.size;
      this.player.dir = d;
      if (shoot) return this._playerShoot(d);
      await this._playerMove(d);
    }

    async _playerMove([dx, dy]) {
      const b = this.board, p = this.player;
      const nx = p.x + dx, ny = p.y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
        const ex = b.extra.exits || {};
        const target = dy < 0 ? ex.north : dy > 0 ? ex.south : dx < 0 ? ex.west : ex.east;
        if (target) await this._travel(target, { x: (nx + COLS) % COLS, y: (ny + ROWS) % ROWS });
        return;
      }
      const i = ny * COLS + nx;
      const o = b.at.get(i);
      const el = b.el[i];
      if (o && !o.dead) {
        if (el === 11 && o.dest) { this.play('t c e g'); await this._travel(o.dest, { passage: { fg: b.fg[i], bg: b.bg[i] } }); return; }
        if (el === 10) { await this._readScroll(b, o); return; }
        if (EL[el] && EL[el].enemy) { this._hurt(10); this._kill(b, o); return; }
        if (el === 36) { await this.rt.send('touch', o.id, { from: 'player' }); return; }
        return;
      }
      const msg = t => this.rt.flash(t, 2000, this.wrap);
      switch (el) {
        case 5: this.give('ammo', 5); msg('Ammunition - 5 shots per container.'); break;
        case 6: this.give('torches', 1); msg('Torch - used for lighting in the underground.'); break;
        case 7: this.give('gems', 1); this.give('health', 1); this.give('score', 10); msg('Gems give you Health!'); break;
        case 14: msg('Energizer - you are invincible (not implemented).'); break;
        case 8: {
          const k = b.fg[i] & 7 || 7;
          if (this.rt.get('key' + k)) { msg(`You already have a ${KEY_NAME[k]} key!`); return; }
          this.rt.set('key' + k, 1); msg(`You now have the ${KEY_NAME[k]} key.`); break;
        }
        case 9: {
          const k = b.bg[i] & 7 || 7;
          if (!this.rt.get('key' + k)) { msg(`The ${KEY_NAME[k]} door is locked!`); return; }
          this.rt.set('key' + k, 0); msg(`The ${KEY_NAME[k]} door is now open.`); break;
        }
        case 20: break;                              // forest: cleared as you walk through
        case 19: msg('Your way is blocked by water.'); return;
        case 28: this._setCell(b, i, 22, b.fg[i], b.bg[i], null); msg('You are blocked by an invisible wall.'); return;
        case 24: case 25: case 26:
          if (!this._push(b, nx, ny, dx, dy)) return;
          break;
        default:
          if (EL[el] && EL[el].enemy) { this._hurt(10); this._setCell(b, i, 0, 0, 0, 32); return; }
          if (!this._walkable(b, i)) return;
      }
      if ([5, 6, 7, 8, 9, 14, 20].includes(el)) this._setCell(b, i, 0, 0, 0, 32);
      p.x = nx; p.y = ny;
    }

    _push(b, x, y, dx, dy) {           // push a row of boulders/sliders if there is room at the end
      const chain = [];
      let cx = x, cy = y;
      for (;;) {
        if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return false;
        const i = cy * COLS + cx, e = EL[b.el[i]];
        if (b.at.has(i)) return false;
        if (e && e.push) {
          if ((e.push === 'ns' && dx) || (e.push === 'ew' && dy)) return false;
          chain.push(i); cx += dx; cy += dy; continue;
        }
        if (b.el[i] !== 0) return false;
        break;
      }
      for (let k = chain.length - 1; k >= 0; k--) {
        const i = chain[k], j = i + dy * COLS + dx;
        this._setCell(b, j, b.el[i], b.fg[i], b.bg[i], b.ch[i] < 0 ? null : b.ch[i]);
        this._setCell(b, i, 0, 0, 0, 32);
      }
      return true;
    }

    async _readScroll(b, o) {
      const lines = (o.script ? o.script.text.split('\r') : []).filter((l, i, a) => i < a.length - 1 || l);
      const items = lines.filter(l => !l.startsWith('@')).map(l => (l.startsWith('$') ? { text: this._txt(l.slice(1)), align: 'center' } : this._txt(l)));
      this.play('c-c+d-d+e-e+f-f+g-g');
      await this.rt.showText(items, [], { host: this.wrap, title: 'Scroll' });
      this._kill(b, o);
    }

    _hurt(n) {
      this.rt.set('health', Math.max(0, this.rt.get('health') - n));
      this.play('--c');
      this.rt.flash('Ouch!', 1000, this.wrap);
      if (this.rt.get('health') <= 0) this.gameOver();
    }

    gameOver() {
      this.state = 'over';
      this.rt.flash('Game over - press P to play again', 6000, this.wrap);
    }

    // ---- shooting ------------------------------------------------------------------------------
    _playerShoot(d) {
      const b = this.board;
      const max = b.extra.max_shots == null ? 255 : b.extra.max_shots;
      if (max === 0) { this.rt.flash("Can't shoot in this place!", 2000, this.wrap); return; }
      if (this.rt.get('ammo') <= 0) { this.rt.flash("You don't have any ammo!", 2000, this.wrap); return; }
      if (b.entities.filter(o => o.bullet && o.owner === 'player' && !o.dead).length >= max) return;
      this.rt.set('ammo', this.rt.get('ammo') - 1);
      this.play('t+c-c-c');
      this._spawnBullet(b, this.player.x, this.player.y, d, 'player', 248);
    }

    _spawnBullet(b, x, y, d, owner, ch) {
      const o = { id: `bullet-${this.tickN}-${Math.random()}`, bullet: true, owner, x, y, d, ch, el: 18, dead: false, fresh: true };
      b.entities.push(o);
      this._moveBullet(b, o);
    }

    async _moveBullet(b, o) {
      const nx = o.x + o.d[0], ny = o.y + o.d[1];
      const leave = () => { if (!o.fresh) { const i = o.y * COLS + o.x; if (b.at.get(i) === o) { b.at.delete(i); this._setCell(b, i, 0, 0, 0, 32); } } };  // bullets only fly over empty cells
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) { leave(); o.dead = true; return; }
      const i = ny * COLS + nx;
      if (nx === this.player.x && ny === this.player.y && this.state === 'play') {
        if (o.owner !== 'player') this._hurt(10);
        leave(); o.dead = true; return;
      }
      const t = b.at.get(i);
      if (t && !t.dead) {
        leave(); o.dead = true;
        if (t.el === 36 && o.owner === 'player') await this.rt.send('shot', t.id, { from: 'player' });
        else if (EL[t.el] && EL[t.el].enemy && o.owner === 'player') { this._kill(b, t); this.give('score', 1); }
        return;
      }
      const el = b.el[i];
      if (el === 0) {
        leave(); o.fresh = false;
        o.x = nx; o.y = ny; b.at.set(i, o);
        this._setCell(b, i, 18, 15, 0, o.ch);
        return;
      }
      if (el === 23) this._setCell(b, i, 0, 0, 0, 32);
      else if (EL[el] && EL[el].enemy) { this._setCell(b, i, 0, 0, 0, 32); if (o.owner === 'player') this.give('score', 1); }
      leave(); o.dead = true;
    }

    // ---- object coroutines ---------------------------------------------------------------------
    _startObject(b, o) {
      const prog = o.prog;
      let seg = 0;
      if (o.ip === -1) seg = null;
      else if (o.ip > 0) { seg = 0; prog.offsets.forEach((off, k) => { if (off <= o.ip) seg = k; }); }
      o.parked = () => {};
      this.rt.on(o.id, '*', (rt, msg, info = {}) => {
        if (o.dead) return LegacyRuntime.PASS;
        if (o.locked && info.from !== o) return true;     // locked objects swallow messages
        return this.jumpLabel(o, msg) ? true : LegacyRuntime.PASS;
      });
      this._run(o, seg);
    }

    /** Park until this object's next update; throws ABORT if a message re-targeted it meanwhile. */
    yieldTick(o) {
      o.ops = 0;
      return new Promise(res => { o.wake = res; const p = o.parked; o.parked = null; if (p) p(); })
        .then(() => { if (o.dead) throw DEAD; if (o.jumpTo != null) throw ABORT; });
    }

    async _update(o) {
      if (!o.wake) return;
      const w = o.wake; o.wake = null;
      const back = new Promise(r => { o.parked = r; });
      w();
      await back;
    }

    async _run(o, seg) {
      let first = true;          // nothing runs before the object's first update
      for (;;) {
        try {
          if (first) { first = false; await this.yieldTick(o); }
          if (seg == null) { await this.yieldTick(o); continue; }
          const fn = o.prog.segments[seg];
          const r = await fn(o, this);
          if (r === DIE || o.dead) break;
          if (r === END) seg = null;
          else if (r === GOTO) { seg = o.jumpTo; o.jumpTo = null; }
          else if (r === RESTART) seg = 0;
          else seg = seg + 1 < o.prog.segments.length ? seg + 1 : null;
          if (++o.ops > 32) await this.yieldTick(o);   // runaway loop guard: one slice per update
        } catch (e) {
          if (e === DEAD) break;
          if (e !== ABORT) { console.error(`object ${o.id} (${o.name})`, e); seg = null; continue; }
          seg = o.jumpTo; o.jumpTo = null;
        }
      }
      o.dead = true;
      this.rt.off(o.id);
      if (o.parked) { const p = o.parked; o.parked = null; p(); }
    }

    /** Point `o` at the first enabled `:label`. Returns false if there is none. */
    jumpLabel(o, label) {
      if (!o.prog) return false;
      label = String(label).toLowerCase();
      if (label === 'restart') { o.jumpTo = 0; return true; }
      const segs = o.prog.labels[label];
      if (!segs) return false;
      const s = segs.find(k => !o.zapped.has(k));
      if (s == null) return false;
      o.jumpTo = s;
      return true;
    }

    // ---- API used by translated scripts ---------------------------------------------------------
    /** #send / #target:label. Returns true when `o` itself must jump (caller returns z.GOTO). */
    async send(o, target, label) {
      const b = this.board;
      const list = target === 'self' ? [o]
        : target === 'all' ? b.entities.filter(t => t.prog)
          : target === 'others' ? b.entities.filter(t => t.prog && t !== o)
            : b.entities.filter(t => t.name === target || t.word === target);
      let self = false;
      for (const t of list) {
        if (t.dead) continue;
        if (t === o) { if (this.jumpLabel(o, label)) self = true; }
        else await this.rt.send(label, t.id, { from: o });
      }
      return self;
    }

    zap(o, spec) { this._zapRestore(o, spec, true); }
    restore(o, spec) { this._zapRestore(o, spec, false); }
    _zapRestore(o, spec, zap) {
      let targets = [o], label = spec.toLowerCase();
      if (label.includes(':')) {
        const [t, l] = label.split(':'); label = l;
        targets = t === 'self' ? [o] : this.board.entities.filter(e => e.prog && (t === 'all' || e.name === t || e.word === t));
      }
      for (const t of targets) {
        const segs = (t.prog && t.prog.labels[label]) || [];
        if (zap) { const s = segs.find(k => !t.zapped.has(k)); if (s != null) t.zapped.add(s); }
        else for (const s of segs) t.zapped.delete(s);   // restore re-enables every zapped copy
      }
    }

    async say(o, items) {
      items = items.map(x => (typeof x === 'string' ? this._txt(x) : { ...x, text: this._txt(x.text) }));
      const choices = items.filter(x => typeof x === 'object' && x.choice != null);
      if (items.length === 1 && !choices.length) {
        const t = typeof items[0] === 'string' ? items[0] : items[0].text;
        this.rt.flash(t, 2500, this.wrap);
        return false;
      }
      const id = await this.rt.showText(items, [], { host: this.wrap, title: o.title || 'Interaction' });
      if (id == null) return false;
      return this.send(o, 'self', id);
    }
    _txt(s) { return [...s].map(c => { const n = c.charCodeAt(0); return n < 32 || n === 127 ? LegacyRuntime.cp437.unicode[n] : c; }).join(''); }

    give(counter, n) { const k = counter === 'points' ? 'score' : counter; this.rt.set(k, this.rt.get(k) + n); }
    take(counter, n) {
      const k = counter === 'points' ? 'score' : counter;
      const v = this.rt.get(k);
      if (v < n) return false;
      this.rt.set(k, v - n);
      if (k === 'health' && v - n <= 0) this.gameOver();
      return true;
    }
    endgame() { this.rt.set('health', 0); this.gameOver(); }

    setChar(o, n) { o.ch = n; const i = o.y * COLS + o.x; if (this.board.at.get(i) === o) this.board.ch[i] = n; }

    async bind(o, name) {
      const t = this.board.entities.find(e => (e.name === name.toLowerCase() || e.word === name.toLowerCase()) && e.prog && e !== o);
      if (!t) { this.rt.unsupported('#bind', `#bind ${name} (no such object)`); return END; }
      o.prog = t.prog; o.zapped = new Set();
      return RESTART;
    }

    die(o) {
      this._kill(this.board, o);
      return DIE;
    }
    _kill(b, o) {
      o.dead = true;
      const i = o.y * COLS + o.x;
      if (b.at.get(i) === o) { b.at.delete(i); const u = o.under || { el: 0, fg: 0, bg: 0 }; this._setCell(b, i, u.el, u.fg, u.bg, u.ch); }
      this.rt.off(o.id);
    }

    become(o, color, word) {
      const b = this.board, i = o.y * COLS + o.x;
      const c = this.elementCell(word, color);
      this._kill(b, o);
      if (c) this._setCell(b, i, c.el, color ? c.fg : (b.fg[i] || c.fg), c.bg, c.ch);
      else this.rt.unsupported('#become', `#become ${color || ''} ${word}`);
      return DIE;
    }

    put(o, dirExpr, color, word) {
      const b = this.board, [dx, dy] = this.dir(o, dirExpr);
      const x = o.x + dx, y = o.y + dy, i = y * COLS + x;
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS || (dx === 0 && dy === 0)) return;
      if (x === this.player.x && y === this.player.y) return;
      const c = this.elementCell(word, color);
      if (!c) { this.rt.unsupported('#put', `#put ${dirExpr} ${color || ''} ${word}`); return; }
      const t = b.at.get(i);
      if (t) { if (c.el !== 0) return; this._kill(b, t); }
      this._setCell(b, i, c.el, c.fg, c.bg, c.ch);
    }

    change(c1, w1, c2, w2) {
      const b = this.board, from = ELNUM[w1], to = this.elementCell(w2, c2);
      if (from == null || !to) { this.rt.unsupported('#change', `#change ${c1 || ''} ${w1} ${c2 || ''} ${w2}`); return; }
      for (let i = 0; i < COLS * ROWS; i++) {
        if (b.el[i] !== from || (c1 && b.fg[i] !== COLOR[c1])) continue;
        const t = b.at.get(i);
        if (t) { if (t.el === 36) continue; this._kill(b, t); }
        this._setCell(b, i, to.el, c2 ? to.fg : (to.el === 0 ? 0 : b.fg[i]), to.el === 0 ? 0 : b.bg[i], to.ch);
      }
    }

    any(color, word) {
      const b = this.board, el = ELNUM[word];
      if (el == null) return false;
      for (let i = 0; i < COLS * ROWS; i++) if (b.el[i] === el && (!color || b.fg[i] === COLOR[color])) return true;
      return false;
    }

    test(o, what) {
      const p = this.player;
      if (this.state !== 'play') return false;
      if (what === 'contact') return Math.abs(p.x - o.x) + Math.abs(p.y - o.y) === 1;
      if (what === 'aligned') return p.x === o.x || p.y === o.y;
      return false;   // energized: energizers are not implemented
    }

    blocked(o, expr) {
      const [dx, dy] = this.dir(o, expr);
      return !this._free(this.board, o.x + dx, o.y + dy);
    }

    walk(o, expr) {
      const d = this.dir(o, expr);
      o.walkDir = d[0] || d[1] ? expr === 'flow' ? o.walkDir : `${d[0]},${d[1]}` : null;
    }

    shoot(o, expr, star) {
      const [dx, dy] = this.dir(o, expr);
      if (!dx && !dy) return;
      const b = this.board;
      if (!this._free(b, o.x + dx, o.y + dy) && !(o.x + dx === this.player.x && o.y + dy === this.player.y)) return;
      this.play('c-f#');
      this._spawnBullet(b, o.x, o.y, [dx, dy], o.id, star ? 47 : 248);
    }

    async idle(o) { await this.yieldTick(o); }

    /** `/dir` and `#go dir`: move one step; if blocked, wait (and send :thud if the object has one). */
    async step(o, expr) {
      for (let tries = 0; ; tries++) {
        const d = this.dir(o, expr);
        if (!d[0] && !d[1]) { await this.yieldTick(o); return; }
        if (this._moveEntity(this.board, o, d)) { await this.yieldTick(o); return; }
        if (this.jumpLabel(o, 'thud')) { await this.yieldTick(o); return; }   // yield throws ABORT -> :thud
        await this.yieldTick(o);
        if (tries > 50) return;    // give up after ~5 s instead of hanging forever
      }
    }

    /** `?dir` and `#try dir`: try one step; returns true if it moved. */
    async tryStep(o, expr) {
      const d = this.dir(o, expr);
      const moved = (d[0] || d[1]) ? this._moveEntity(this.board, o, d) : false;
      await this.yieldTick(o);
      return moved;
    }

    /** Resolve a direction expression ("n", "seek", "opp seek", "cw rndns", "rndp n", "flow"). */
    dir(o, expr) {
      if (/^-?\d,-?\d$/.test(expr)) return expr.split(',').map(Number);
      const w = expr.trim().split(/\s+/);
      const rec = k => {
        const t = w[k];
        if (t === 'opp') { const [d, n] = rec(k + 1); return [[-d[0], -d[1]], n]; }
        if (t === 'cw') { const [d, n] = rec(k + 1); return [[-d[1], d[0]], n]; }
        if (t === 'ccw') { const [d, n] = rec(k + 1); return [[d[1], -d[0]], n]; }
        if (t === 'rndp') { const [d, n] = rec(k + 1); return [Math.random() < 0.5 ? [-d[1], d[0]] : [d[1], -d[0]], n]; }
        if (DIRS[t]) return [DIRS[t], k + 1];
        if (t === 'seek') {
          if (this.state !== 'play') return [[0, 0], k + 1];
          const dx = Math.sign(this.player.x - o.x), dy = Math.sign(this.player.y - o.y);
          if (dx && dy) return [Math.random() < 0.5 ? [dx, 0] : [0, dy], k + 1];
          return [[dx, dy], k + 1];
        }
        if (t === 'flow') return [o.walkDir ? o.walkDir.split(',').map(Number) : [0, 0], k + 1];
        if (t === 'rndns') return [Math.random() < 0.5 ? [0, -1] : [0, 1], k + 1];
        if (t === 'rndne') return [Math.random() < 0.5 ? [0, -1] : [1, 0], k + 1];
        if (t === 'rnd') return [[[0, -1], [0, 1], [1, 0], [-1, 0]][Math.random() * 4 | 0], k + 1];
        return [[0, 0], k + 1];
      };
      return rec(0)[0];
    }

    _walkable(b, i) { const e = EL[b.el[i]]; return !!(e && e.walk); }
    _free(b, x, y) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
      if (this.state === 'play' && x === this.player.x && y === this.player.y) return false;
      const i = y * COLS + x;
      return !b.at.has(i) && this._walkable(b, i);
    }

    _moveEntity(b, o, [dx, dy]) {
      const nx = o.x + dx, ny = o.y + dy;
      if (!this._free(b, nx, ny)) return false;
      const i = o.y * COLS + o.x, j = ny * COLS + nx;
      const cur = { el: b.el[i], fg: b.fg[i], bg: b.bg[i], ch: b.ch[i] };
      const u = o.under || { el: 0, fg: 0, bg: 0, ch: 32 };
      this._setCell(b, i, u.el, u.fg, u.bg, u.ch == null || u.ch < 0 ? (u.el === 0 ? 32 : null) : u.ch);
      b.at.delete(i);
      o.under = { el: b.el[j], fg: b.fg[j], bg: b.bg[j], ch: b.ch[j] };
      this._setCell(b, j, cur.el, cur.fg, cur.bg, cur.ch < 0 ? null : cur.ch);
      o.x = nx; o.y = ny; b.at.set(j, o);
      return true;
    }

    // ---- sound ---------------------------------------------------------------------------------
    _audio() {
      if (this.ac || !window.AudioContext) return;
      try { this.ac = new AudioContext(); this.soundAt = 0; } catch (e) { this.ac = null; }
    }
    /** #play: a-g notes, # sharp, ! flat, + - octave, t s i q h w durations, . dotted, 3 triplet,
     *  x rest, digits 0-9 percussion. Square wave through WebAudio; silent if audio is unavailable. */
    play(str) {
      const ac = this.ac;
      if (!ac || !this.sound || this.rt.shot) return;
      const unit = 0.055;   // seconds per 32nd note
      let t = Math.max(ac.currentTime, this.soundAt || 0), oct = 0, dur = 1;
      const s = str.toLowerCase();
      const NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
      const DUR = { t: 1, s: 2, i: 4, q: 8, h: 16, w: 32 };
      const tone = (freq, len, type = 'square') => {
        const osc = ac.createOscillator(), g = ac.createGain();
        osc.type = type; osc.frequency.value = freq;
        g.gain.setValueAtTime(0.04, t); g.gain.setValueAtTime(0, t + len * 0.95);
        osc.connect(g).connect(ac.destination); osc.start(t); osc.stop(t + len);
      };
      for (let k = 0; k < s.length; k++) {
        const c = s[k];
        if (DUR[c]) dur = DUR[c];
        else if (c === '.') dur *= 1.5;
        else if (c === '3') dur /= 3;
        else if (c === '+') oct++;
        else if (c === '-') oct--;
        else if (c === 'x') t += dur * unit;
        else if (NOTE[c] != null) {
          let n = NOTE[c];
          if (s[k + 1] === '#') { n++; k++; } else if (s[k + 1] === '!') { n--; k++; }
          tone(261.63 * Math.pow(2, (n + 12 * oct) / 12), dur * unit);
          t += dur * unit;
        } else if (c >= '0' && c <= '9') {
          for (let j = 0; j < 4; j++) { const t0 = t; tone(200 + (+c) * 120 + (j % 2) * 300, unit / 4, 'square'); t = t0 + unit / 4; }
        }
      }
      this.soundAt = t;
    }

    // ---- drawing -------------------------------------------------------------------------------
    draw() {
      const b = this.board, r = this.r;
      if (!b) return;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        let e = b.el[i], ch = b.ch[i], fg = b.fg[i], bg = b.bg[i];
        if (e === 0) { r.cell(x, y, 32, 0, 0); continue; }
        if (e === 31) ch = r.LINE_CHAR[this._lineKey(b, x, y)];
        else if (e === 28) ch = 32;
        else if (ch < 0) ch = EL[e] ? EL[e].ch : null;
        r.cell(x, y, ch, fg, bg);
      }
      if (this.state === 'play') r.cell(this.player.x, this.player.y, 2, 15, 1);
      if (!this.rt.shot) this._sidebar();
      r.flush();
    }

    _lineKey(b, x, y) {
      let k = '';
      if (y > 0 && b.el[(y - 1) * COLS + x] === 31) k += 'N';
      if (y < ROWS - 1 && b.el[(y + 1) * COLS + x] === 31) k += 'S';
      if (x < COLS - 1 && b.el[y * COLS + x + 1] === 31) k += 'E';
      if (x > 0 && b.el[y * COLS + x - 1] === 31) k += 'W';
      return k;
    }

    _sidebar() {
      const r = this.r, X = COLS, rt = this.rt;
      r.fill(X, 0, SIDE, ROWS, 1);
      const put = (row, s, fg = 15, bg = 1, col = 1) => r.text(X + col, row, s.slice(0, SIDE - col), fg, bg);
      put(1, '- - - - - - - - -', 15);
      put(2, (rt.ir.name || 'ZZT').slice(0, 17), 14);
      put(3, '- - - - - - - - -', 15);
      put(4, (this.board.scr.name || '').slice(0, 18), 11);
      if (this.state !== 'play') {
        put(7, this.state === 'over' ? 'GAME OVER' : 'Title screen', 14);
        put(9, ' P ', 0, 7); put(9, 'Play', 14, 1, 5);
        put(11, 'Arrows  Move', 11);
        put(12, 'Shift   Shoot', 11);
        put(13, 'S       Sound', 11);
        put(14, 'Q / Esc Title', 11);
      } else {
        const row = (y, icon, fg, label, v) => { r.cell(X + 2, y, icon, fg, 1); put(y, label, 14, 1, 4); put(y, String(v), 14, 1, 13); };
        row(7, 2, 15, 'Health:', rt.get('health'));
        row(8, 132, 11, 'Ammo:', rt.get('ammo'));
        row(9, 157, 6, 'Torches:', rt.get('torches'));
        row(10, 4, 11, 'Gems:', rt.get('gems'));
        row(11, 32, 15, 'Score:', rt.get('score'));
        r.cell(X + 2, 12, 12, 15, 1); put(12, 'Keys:', 14, 1, 4);
        for (let k = 1; k <= 7; k++) if (rt.get('key' + k)) r.cell(X + 9 + k, 12, 12, 8 + k, 1);
        put(15, 'Arrows  Move', 11);
        put(16, 'Shift   Shoot', 11);
        put(17, 'S       Sound', 11);
        put(18, 'Q       Title', 11);
      }
    }
  }

  window.ZztEngine = ZztEngine;
})();
