/* ZZT game layer, built on the shared LegacyRuntime (modern/runtime/runtime.js).
 *
 * - Boards are IR screens; each board's live state (cells + entities) is created on first visit and kept.
 * - The player moves with the arrow keys; Shift+arrow (or Space) shoots, T lights a torch. Items, doors,
 *   keys, passages, transporters, energizers and board-edge exits work. A sidebar to the right of the
 *   480x350 board shows the counters.
 * - Every scripted object runs its translated program (scripts.js, made by modern/zzt/translator.py) as a
 *   cooperative coroutine: one "update" every `cycle` ticks, ~9.5 ticks per second.
 * - Every other entity (status record) with a built-in behaviour runs `ACT[element]` once every `cycle`
 *   ticks: creatures, bullets/stars, bombs, conveyors, duplicators, blink walls, pushers, spinning guns.
 *   The record's p1/p2/step fields are the parameters (see BUILT-IN ELEMENT BEHAVIOURS below).
 * - Messages between objects go through rt.send(label, objectId) -- the runtime's message hierarchy.
 *   Engine-triggered labels: `touch` (player bumps the object), `shot` (hit by a bullet), `thud` (blocked),
 *   `bombed` (caught in an explosion), `energize` (sent to all when the player takes an energizer).
 *
 * The element behaviours are RECONSTRUCTIONS of ZZT's design (the world files only store the parameters,
 * SPEC 3.1/7): they follow the documented gameplay of each element, not a measured trace. MIGRATION.md
 * lists them.
 */
(function () {
  'use strict';

  const COLS = 60, ROWS = 25, SIDE = 20;
  const TICK_MS = 105;                     // ~9.5 ticks per second
  const END = 'end', GOTO = 'goto', RESTART = 'restart', DIE = 'die';
  const ABORT = { abort: true };           // thrown out of a waiting coroutine when a message arrives
  const DEAD = { dead: true };
  const TORCH_TICKS = 200, ENERGY_TICKS = 75;
  const lit = (dx, dy) => dx * dx + dy * dy * 2 < 50;        // torch / explosion radius (an ellipse 8 x 5)
  const rnd = n => Math.floor(Math.random() * n);

  // Element numbers -> behaviour. Numbers 0, 4, 10, 11, 19-23, 31, 36, 47-53 are from SPEC 3.1; the rest
  // (item kinds, creature names, glyphs) are engine assumptions labelled G(uess) in the spec.
  //   walk: player and creatures can enter   push: boulder/slider axis   enemy: hurts the player on contact
  //   score: points for shooting it          stat: default record when a script creates one (#put/#change)
  const EL = {
    0: { name: 'empty', ch: 32, walk: true },
    4: { name: 'player', ch: 2 },
    5: { name: 'ammo', ch: 132, fg: 3, item: true },
    6: { name: 'torch', ch: 157, fg: 6, item: true },
    7: { name: 'gem', ch: 4, item: true },
    8: { name: 'key', ch: 12, item: true },
    9: { name: 'door', ch: 10 },
    10: { name: 'scroll', ch: 232, fg: 15 },
    11: { name: 'passage', ch: 240 },
    12: { name: 'duplicator', ch: 250, stat: { cycle: 2, p1: 0, p2: 4, step: [0, -1] } },
    13: { name: 'bomb', ch: 11, stat: { cycle: 6 } },
    14: { name: 'energizer', ch: 127, fg: 5, item: true },
    15: { name: 'star', ch: 47, shot: true },
    16: { name: 'clockwise', ch: 179, stat: { cycle: 3 } },
    17: { name: 'counter', ch: 92, stat: { cycle: 2 } },
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
    29: { name: 'blinkwall', ch: 206, stat: { cycle: 1, p1: 4, p2: 4, step: [1, 0] } },
    30: { name: 'transporter', ch: 62, stat: { cycle: 2, step: [0, -1] } },
    31: { name: 'line', ch: 206 },
    32: { name: 'ricochet', ch: 42 },
    33: { name: 'blinkray', ch: 205 },
    34: { name: 'bear', ch: 153, enemy: true, score: 1, stat: { cycle: 3, p1: 4 } },
    35: { name: 'ruffian', ch: 5, enemy: true, score: 2, stat: { cycle: 1, p1: 4, p2: 4 } },
    36: { name: 'object', ch: 2 },
    37: { name: 'slime', ch: 42, stat: { cycle: 3, p2: 4 } },
    38: { name: 'shark', ch: 94, enemy: true, stat: { cycle: 3, p1: 4 } },
    39: { name: 'spinninggun', ch: 24, stat: { cycle: 2, p1: 4, p2: 4 } },
    40: { name: 'pusher', ch: 16, stat: { cycle: 4, step: [0, -1] } },
    41: { name: 'lion', ch: 234, enemy: true, score: 1, stat: { cycle: 2, p1: 4 } },
    42: { name: 'tiger', ch: 227, enemy: true, score: 2, stat: { cycle: 2, p1: 4, p2: 4 } },
    43: { name: 'blinkray', ch: 186 },
    44: { name: 'head', ch: 233, enemy: true, score: 1, stat: { cycle: 2, p1: 4, p2: 4 } },
    45: { name: 'segment', ch: 79, enemy: true, score: 3, stat: { cycle: 2 } },
  };
  const ELNUM = {};
  for (const [n, e] of Object.entries(EL)) if (!(e.name in ELNUM)) ELNUM[e.name] = +n;
  Object.assign(ELNUM, { wall: 22, torch: 6, centipede: 44, transporter: 30, monitor: 0, edge: 22 });
  const COLOR = { blue: 9, green: 10, cyan: 11, red: 12, purple: 13, yellow: 14, white: 15 };
  const KEY_NAME = ['', 'Blue', 'Green', 'Cyan', 'Red', 'Purple', 'Yellow', 'White'];
  const DIRS = { n: [0, -1], north: [0, -1], s: [0, 1], south: [0, 1], e: [1, 0], east: [1, 0], w: [-1, 0], west: [-1, 0], i: [0, 0], idle: [0, 0] };
  const DIR4 = [[0, -1], [0, 1], [1, 0], [-1, 0]];
  const RING = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];   // clockwise on screen
  const LIT_IN_DARK = new Set([4, 6, 11]);            // player, torch, passage stay visible on dark boards
  const PUSH_TILE = new Set([5, 6, 7, 8, 14, 24]);    // tiles a pusher/conveyor/duplicator can move (+ sliders)
  const PUSH_STAT = new Set([13, 34, 35, 41, 42]);    // entities that can be pushed / carried by conveyors

  /** Built-in behaviours: element number -> method run on each update of that entity (see below). */
  const ACT = {
    12: '_actDuplicator', 13: '_actBomb', 16: '_actConveyorCW', 17: '_actConveyorCCW', 29: '_actBlinkWall',
    34: '_actBear', 35: '_actRuffian', 37: '_actSlime', 38: '_actShark', 39: '_actSpinningGun', 40: '_actPusher',
    41: '_actLion', 42: '_actTiger', 44: '_actHead', 45: '_actSegment',
  };

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
      this.serial = 0;                          // ids for entities created during play
      this.keys = new Set(); this.queued = [];
      this.player = { x: 0, y: 0, dir: [0, 1] };
      this.torch = 0;                           // ticks of torch light left
      this.energy = 0;                          // ticks of energizer left
      this.secMs = 0;                           // time-limit clock
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
        entities: [], at: new Map(), extra: scr.extra || {}, playerStart: null, fx: new Map(), entry: null };
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
        const [ue, uc] = ob.extra.under || [0, 0];
        // targets match the whole @name or its first word (`@HINTS & SOLUTIONS` answers to `hints`)
        const o = this._newEntity({ id: ob.id, name, title: (ob.name || '').trim(), x, y, el,
          cycle: el === 36 ? Math.max(1, ob.extra.cycle || 3) : ob.extra.cycle,
          num: ob.number, p1: ob.extra.p1 || 0, p2: ob.extra.p2 || 0, p3: ob.extra.p3 || 0,
          step: (ob.extra.step || [0, 0]).slice(), dest: ob.extra.destination, script: ob.script,
          under: { el: ue, fg: uc & 15, bg: uc >> 4, ch: null } });
        const pi = this.byObject[ob.id];
        o.prog = pi != null ? this.programs[pi] : null;
        o.ip = ob.extra.ip;
        this._initGlyph(b, o);
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

    /** One entity (status record). `cycle` 0 = never updated, as in the saved records. */
    _newEntity(f) {
      return Object.assign({ id: `stat-${++this.serial}`, name: '', title: '', x: 0, y: 0, el: 0, cycle: 3, num: -1,
        p1: 0, p2: 0, p3: 0, step: [0, 0], dest: null, locked: false, zapped: new Set(), jumpTo: null, walkDir: null,
        dead: false, script: null, ops: 0, prog: null, ip: 0, pending: null, under: { el: 0, fg: 0, bg: 0, ch: null } },
      f, { word: (/^[a-z0-9_]*/.exec(f.name || '') || [''])[0] });
    }

    /** Glyphs that depend on the record (direction arrows), set when the entity appears. */
    _initGlyph(b, o) {
      const i = o.y * COLS + o.x, [sx, sy] = o.step;
      if (o.el === 40) b.ch[i] = sx > 0 ? 16 : sx < 0 ? 17 : sy < 0 ? 30 : 31;
      if (o.el === 30) b.ch[i] = sx > 0 ? 62 : sx < 0 ? 60 : sy < 0 ? 94 : 118;
    }

    /** A script or a duplicator made an element that needs a record: give it ZZT's default one. */
    _addStat(b, x, y, el, params = {}) {
      const d = (EL[el] && EL[el].stat) || {};
      const o = this._newEntity({ x, y, el, cycle: d.cycle != null ? d.cycle : 3, p1: d.p1 || 0, p2: d.p2 || 0,
        step: (d.step || [0, 0]).slice(), ...params });
      if (o.step) o.step = o.step.slice();
      b.entities.push(o);
      b.at.set(y * COLS + x, o);
      this._initGlyph(b, o);
      return o;
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
      for (const k of ['ammo', 'gems', 'torches', 'score', 'time']) this.rt.set(k, 0);
      for (let k = 1; k <= 7; k++) this.rt.set('key' + k, 0);
      this.rt.flags.clear();
      this.torch = 0; this.energy = 0;
      this.state = 'play';
      const b = this._boardState(this.startBoard);
      if (b.playerStart) [this.player.x, this.player.y] = b.playerStart;
      this.rt.go(this.startBoard);
    }

    _enter(screen) {
      this.board = this._boardState(screen.id);
      for (const o of this.board.entities) this.rt.objectOwner.set(o.id, screen.id);
      const b = this.board;
      this.entryPause = false;
      if (this.state === 'play') {
        b.entry = [this.player.x, this.player.y];            // where "re-enter when zapped" puts the player back
        this.rt.set('time', b.extra.time_limit > 0 ? b.extra.time_limit : 0);
        this.secMs = 0;
        this.entryPause = true;                              // like ZZT, the board waits for a key (creatures only)
        if (b.extra.dark && !this.torch) this.rt.flash('Room is dark - you need to light a torch!', 2500, this.wrap);
      }
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
      if (k === 't' || k === 'T') { this.lightTorch(); return; }
      if (k === 'Escape' || k === 'q' || k === 'Q') { this.state = 'title'; this.rt.go(this.rt.ir.start_screen); return; }
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k];
      if (d) {
        if (!e.repeat) this.queued.push({ d, shoot: e.shiftKey });
        this.keys.add(k);
        this._shift = e.shiftKey;
      } else if (k === ' ') this.queued.push({ d: this.player.dir, shoot: true });
    }

    lightTorch() {
      const msg = t => this.rt.flash(t, 2000, this.wrap);
      if (!this.board.extra.dark) return msg("Don't need torch - room is not dark!");
      if (this.torch > 0) return;
      if (this.rt.get('torches') <= 0) return msg("You don't have any torches!");
      this.rt.set('torches', this.rt.get('torches') - 1);
      this.torch = TORCH_TICKS;
      this.draw();
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
      if (this.state === 'play') {
        await this._playerTurn();
        this._clocks(b);
      }
      if (this.board !== b) { this.draw(); return; }
      const list = b.entities.slice();
      for (let idx = 0; idx < list.length; idx++) {
        const o = list[idx];
        if (o.dead || this.board !== b) continue;
        if (o.bullet) { await this._moveBullet(b, o); continue; }
        if (!o.cycle || this.tickN % o.cycle !== idx % o.cycle) continue;
        if (!o.prog) { const act = ACT[o.el]; if (act && !this.entryPause) this[act](b, o); continue; }
        if (o.walkDir) {
          const d = this.dir(o, o.walkDir);
          if ((d[0] || d[1]) && !this._moveEntity(b, o, d)) this.jumpLabel(o, 'thud');
        }
        await this._update(o);
      }
      if (this.board === b) b.entities = b.entities.filter(o => !o.dead);
      this.draw();
    }

    /** Torch, energizer and board time limit, once per tick while playing. */
    _clocks(b) {
      if (this.torch > 0 && --this.torch === 0) this.rt.flash('Your torch burned out!', 2000, this.wrap);
      if (this.energy > 0) {
        if (--this.energy === 10) this.play('s.-c');
      }
      if (b.extra.time_limit > 0 && this.state === 'play') {
        this.secMs += TICK_MS;
        if (this.secMs >= 1000) {
          this.secMs -= 1000;
          const t = this.rt.get('time') - 1;
          this.rt.set('time', t);
          if (t === 10) { this.rt.flash('Running out of time!', 2000, this.wrap); this.play('i.+cfc-f+cfq.c'); }
          if (t <= 0) { this.rt.set('time', b.extra.time_limit); this._hurt(10, true); }
        }
      }
    }

    async _playerTurn() {
      const q = this.queued.shift();
      let d = q ? q.d : this._heldDir();
      if (!d) return;
      this.entryPause = false;
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
        if (EL[el] && EL[el].enemy) { this._attack(b, o); return; }
        if (el === 36) { await this.rt.send('touch', o.id, { from: 'player' }); return; }
        if (el === 37) { const c = b.fg[i]; this._kill(b, o); this._setCell(b, i, 23, c, 0, null); return; }   // slime -> breakable
        if (el === 30) { const to = this._transport(b, nx, ny, dx, dy); if (to) { [p.x, p.y] = to; this.play('c+d-e+f#-g#+a#c+d'); } return; }
        if (el === 13) {
          if (o.p1 === 0) { o.p1 = 9; this.rt.flash('Bomb activated!', 2000, this.wrap); this.play('tcf+cf+c'); return; }
          if (this._pushChain(b, nx, ny, dx, dy)) { p.x = nx; p.y = ny; }
          return;
        }
        return;
      }
      const msg = t => this.rt.flash(t, 2000, this.wrap);
      switch (el) {
        case 5: this.give('ammo', 5); msg('Ammunition - 5 shots per container.'); break;
        case 6: this.give('torches', 1); msg('Torch - used for lighting in the underground.'); break;
        case 7: this.give('gems', 1); this.give('health', 1); this.give('score', 10); msg('Gems give you Health!'); break;
        case 14:
          this.energy = ENERGY_TICKS; msg('Energizer - You are invincible');
          this.play('s.-cd-e-f#-g#-a#'); this.send(null, 'all', 'energize');
          break;
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
          if (!this._pushChain(b, nx, ny, dx, dy)) return;
          break;
        default:
          if (EL[el] && EL[el].enemy) { this._hurt(10); this._setCell(b, i, 0, 0, 0, 32); return; }
          if (!this._walkable(b, i)) return;
      }
      if ([5, 6, 7, 8, 9, 14, 20].includes(el)) this._setCell(b, i, 0, 0, 0, 32);
      p.x = nx; p.y = ny;
    }

    /** Make (x,y) free by pushing what is there one cell along (dx,dy), recursively (boulders, sliders on
     *  their axis, items, bombs, some creatures, the player). Returns true if the cell is free afterwards. */
    _pushChain(b, x, y, dx, dy, depth = 0) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS || depth > 64) return false;
      if (this._free(b, x, y)) return true;
      const p = this.player, i = y * COLS + x;
      if (this._playerAt(x, y)) {
        if (!this._pushChain(b, x + dx, y + dy, dx, dy, depth + 1)) return false;
        p.x += dx; p.y += dy; return true;
      }
      const ent = b.at.get(i), e = b.el[i];
      const ok = ent ? !ent.bullet && PUSH_STAT.has(ent.el)
        : PUSH_TILE.has(e) || (e === 25 && !dx) || (e === 26 && !dy);
      if (!ok || !this._pushChain(b, x + dx, y + dy, dx, dy, depth + 1)) return false;
      if (ent) return this._moveEntity(b, ent, [dx, dy]);
      this._moveTile(b, i, i + dy * COLS + dx);
      return true;
    }

    _moveTile(b, i, j) {
      this._setCell(b, j, b.el[i], b.fg[i], b.bg[i], b.ch[i] < 0 ? null : b.ch[i]);
      this._setCell(b, i, 0, 0, 0, 32);
    }

    /** Transporter at (x,y) entered moving (dx,dy): the cell just past it, else the cell past the next
     *  transporter along the line that faces back. Returns [x,y] or null (blocked). */
    _transport(b, x, y, dx, dy) {
      const t = b.at.get(y * COLS + x);
      if (!t || t.step[0] !== dx || t.step[1] !== dy) return null;
      let ix = x, iy = y, valid = true;
      for (;;) {
        ix += dx; iy += dy;
        if (ix < 0 || iy < 0 || ix >= COLS || iy >= ROWS) return null;
        if (valid) {
          valid = false;
          if (!this._free(b, ix, iy)) this._pushChain(b, ix, iy, dx, dy);
          if (this._free(b, ix, iy)) return [ix, iy];
        }
        const e = b.at.get(iy * COLS + ix);
        if (e && e.el === 30 && e.step[0] === -dx && e.step[1] === -dy) valid = true;
      }
    }

    async _readScroll(b, o) {
      const lines = (o.script ? o.script.text.split('\r') : []).filter((l, i, a) => i < a.length - 1 || l);
      const items = lines.filter(l => !l.startsWith('@')).map(l => (l.startsWith('$') ? { text: this._txt(l.slice(1)), align: 'center' } : this._txt(l)));
      this.play('c-c+d-d+e-e+f-f+g-g');
      await this.rt.showText(items, [], { host: this.wrap, title: 'Scroll' });
      this._kill(b, o);
    }

    /** The player loses `n` health (not while energized, unless `always`). */
    _hurt(n, always = false) {
      if (this.state !== 'play' || (this.energy > 0 && !always)) return;
      this.rt.set('health', Math.max(0, this.rt.get('health') - n));
      this.play('--c');
      this.rt.flash('Ouch!', 1000, this.wrap);
      if (this.rt.get('health') <= 0) { this.gameOver(); return; }
      const b = this.board;
      if (b.extra.unknown && b.extra.unknown.prop6 && b.entry) {   // board flag "re-enter when zapped"
        const [x, y] = b.entry;
        if (!b.at.has(y * COLS + x)) { this.player.x = x; this.player.y = y; }
      }
    }

    /** A creature runs into the player (or the player into it): it dies; the player loses 10 health
     *  unless energized, in which case the player scores for it. */
    _attack(b, o) {
      this._kill(b, o);
      if (this.energy > 0) { this.give('score', (EL[o.el] && EL[o.el].score) || 0); this.play('t+c+d'); } else this._hurt(10);
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
      this._spawnBullet(b, this.player.x, this.player.y, d, 'player', false);
    }

    /** Fire from (x,y) if the next cell is free, breakable or the player. Returns true if fired. */
    _shootFrom(b, x, y, d, owner, star) {
      if (!d[0] && !d[1]) return false;
      const nx = x + d[0], ny = y + d[1];
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return false;
      const i = ny * COLS + nx;
      if (!this._free(b, nx, ny) && !this._playerAt(nx, ny) && !(b.el[i] === 23 && !b.at.has(i))) return false;
      this.play('c-f#');
      this._spawnBullet(b, x, y, d, owner, star);
      return true;
    }

    _spawnBullet(b, x, y, d, owner, star) {
      const o = { id: `bullet-${++this.serial}`, bullet: true, owner, x, y, d: d.slice(), ch: star ? 47 : 248,
        star: !!star, life: star ? 100 : 0, el: star ? 15 : 18, dead: false, fresh: true };
      b.entities.push(o);
      this._moveBullet(b, o);
    }

    async _moveBullet(b, o, bounced = false) {
      if (o.star) {                                     // thrown stars home in on the player and expire
        if (--o.life <= 0) { this._leaveBullet(b, o); o.dead = true; return; }
        if (this.state === 'play') o.d = this._seekDir(o, true);
        o.ch = [179, 47, 196, 92][this.tickN % 4];
      }
      const nx = o.x + o.d[0], ny = o.y + o.d[1];
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) { this._leaveBullet(b, o); o.dead = true; return; }
      const i = ny * COLS + nx;
      if (this._playerAt(nx, ny)) {
        if (o.owner !== 'player') this._hurt(10);
        this._leaveBullet(b, o); o.dead = true; return;
      }
      const t = b.at.get(i);
      if (t && !t.dead) {
        this._leaveBullet(b, o); o.dead = true;
        if (t.bullet) { this._leaveBullet(b, t); t.dead = true; return; }
        if (t.el === 36) { if (o.owner === 'player') await this.rt.send('shot', t.id, { from: 'player' }); }
        else if (EL[t.el] && EL[t.el].enemy && o.owner === 'player') { this._kill(b, t); this.give('score', EL[t.el].score || 0); }
        return;
      }
      const el = b.el[i];
      if (el === 0 || el === 27 || el === 19) {         // bullets fly over empty floor, fake walls and water
        this._leaveBullet(b, o); o.fresh = false;
        o.under = el ? { el, fg: b.fg[i], bg: b.bg[i] } : null;
        o.x = nx; o.y = ny; b.at.set(i, o);
        this._setCell(b, i, o.el, 15, el ? b.bg[i] : 0, o.ch);
        return;
      }
      if (el === 32 && !bounced) {                      // ricochet: bounce straight back
        o.d = [-o.d[0], -o.d[1]]; this.play('t9');
        return this._moveBullet(b, o, true);
      }
      if (el === 23) this._setCell(b, i, 0, 0, 0, 32);
      else if (EL[el] && EL[el].enemy) { this._setCell(b, i, 0, 0, 0, 32); if (o.owner === 'player') this.give('score', EL[el].score || 0); }
      this._leaveBullet(b, o); o.dead = true;
    }

    _leaveBullet(b, o) {
      if (o.fresh) return;
      const i = o.y * COLS + o.x;
      if (b.at.get(i) !== o) return;
      b.at.delete(i);
      const u = o.under;
      if (u) this._setCell(b, i, u.el, u.fg, u.bg, null); else this._setCell(b, i, 0, 0, 0, 32);
    }

    // ---- BUILT-IN ELEMENT BEHAVIOURS (reconstructions; see the file header) ------------------------
    _playerAt(x, y) { return this.state === 'play' && this.player.x === x && this.player.y === y; }

    /** One step toward the player (away while energized, unless `always`); random if not playing. */
    _seekDir(o, always = false) {
      if (this.state !== 'play') return this._rndDir();
      const p = this.player;
      let dx = 0, dy = 0;
      if (rnd(2) < 1 || p.y === o.y) dx = Math.sign(p.x - o.x);
      if (dx === 0) dy = Math.sign(p.y - o.y);
      if (this.energy > 0 && !always) { dx = -dx; dy = -dy; }
      return [dx, dy];
    }

    /** Random step: left/right twice as likely as up/down. */
    _rndDir() { const dx = rnd(3) - 1; return dx ? [dx, 0] : [0, rnd(2) * 2 - 1]; }

    /** A creature tries to step: attacks the player if it walks into them. */
    _creatureStep(b, o, d) {
      if (!d[0] && !d[1]) return false;
      if (this._playerAt(o.x + d[0], o.y + d[1])) { this._attack(b, o); return true; }
      return this._moveEntity(b, o, d);
    }

    /** Lion: p1 = intelligence (0-8): chance in 10 of moving toward the player, else a random step. */
    _actLion(b, o) { this._creatureStep(b, o, rnd(10) < o.p1 ? this._seekDir(o) : this._rndDir()); }

    /** Tiger: moves like a lion; p2 = firing rate (bit 7 set = throws stars), shoots along a row or column
     *  when the player is within 2 cells of it. */
    _actTiger(b, o) {
      const rate = o.p2 & 0x7f, star = (o.p2 & 0x80) !== 0, p = this.player;
      if (this.state === 'play' && rnd(10) * 3 <= rate) {
        let shot = false;
        if (Math.abs(p.x - o.x) <= 2) shot = this._shootFrom(b, o.x, o.y, [0, Math.sign(p.y - o.y)], o.id, star);
        if (!shot && Math.abs(p.y - o.y) <= 2) this._shootFrom(b, o.x, o.y, [Math.sign(p.x - o.x), 0], o.id, star);
      }
      if (!o.dead) this._actLion(b, o);
    }

    /** Bear: p1 = sensitivity; only moves once the player is within 8 - p1 rows/columns. Breaks
     *  breakable walls (and itself) by walking into them. */
    _actBear(b, o) {
      if (this.state !== 'play') return;
      const p = this.player, r = 8 - o.p1;
      let d = [0, 0];
      if (p.x !== o.x && Math.abs(p.y - o.y) <= r) d = [Math.sign(p.x - o.x), 0];
      else if (Math.abs(p.x - o.x) <= r) d = [0, Math.sign(p.y - o.y)];
      if (!d[0] && !d[1]) return;
      const x = o.x + d[0], y = o.y + d[1], i = y * COLS + x;
      if (this._playerAt(x, y)) { this._attack(b, o); return; }
      if (x >= 0 && y >= 0 && x < COLS && y < ROWS && b.el[i] === 23 && !b.at.has(i)) {
        this._setCell(b, i, 0, 0, 0, 32); this._kill(b, o); this.play('t+c-c-c'); return;
      }
      this._moveEntity(b, o, d);
    }

    /** Ruffian: p1 = intelligence, p2 = resting time. Darts in one direction, then rests. */
    _actRuffian(b, o) {
      const p = this.player;
      if (!o.step[0] && !o.step[1]) {
        if (o.p2 + 8 <= rnd(17)) o.step = o.p1 >= rnd(9) ? this._seekDir(o) : this._rndDir();
        return;
      }
      if (this.state === 'play' && (p.x === o.x || p.y === o.y) && rnd(9) <= o.p1) o.step = this._seekDir(o);
      if (this._playerAt(o.x + o.step[0], o.y + o.step[1])) { this._attack(b, o); return; }
      if (this._moveEntity(b, o, o.step)) { if (o.p2 + 8 <= rnd(17)) o.step = [0, 0]; } else o.step = [0, 0];
    }

    /** Shark: moves only through water; p1 = intelligence. */
    _actShark(b, o) {
      const d = rnd(10) < o.p1 ? this._seekDir(o) : this._rndDir();
      const x = o.x + d[0], y = o.y + d[1], i = y * COLS + x;
      if (this._playerAt(x, y)) { this._attack(b, o); return; }
      if (x >= 0 && y >= 0 && x < COLS && y < ROWS && b.el[i] === 19 && !b.at.has(i)) this._moveEntity(b, o, d, true);
    }

    /** Slime: every p2 updates it spreads into each free neighbour, leaving breakable wall behind. */
    _actSlime(b, o) {
      if (o.p1 < o.p2) { o.p1++; return; }
      o.p1 = 0;
      const x0 = o.x, y0 = o.y, i0 = y0 * COLS + x0, color = b.fg[i0];
      let n = 0;
      for (const [dx, dy] of DIR4) {
        const x = x0 + dx, y = y0 + dy;
        if (!this._free(b, x, y)) continue;
        if (n === 0) { this._moveEntity(b, o, [dx, dy]); this._setCell(b, i0, 23, color, 0, null); }
        else { this._setCell(b, y * COLS + x, 37, color, 0, null); this._addStat(b, x, y, 37, { cycle: o.cycle, p2: o.p2 }); }
        n++;
      }
      if (!n) { this._kill(b, o); this._setCell(b, i0, 23, color, 0, null); }
    }

    /** Spinning gun: rotates; p2 = firing rate (bit 7 = stars), p1 = intelligence (aims at the player
     *  when within 2 rows/columns, otherwise shoots at random). */
    _actSpinningGun(b, o) {
      o.spin = ((o.spin || 0) + 1) % 4;
      b.ch[o.y * COLS + o.x] = [24, 26, 25, 27][o.spin];
      if (this.state !== 'play') return;
      const rate = o.p2 & 0x7f, star = (o.p2 & 0x80) !== 0, p = this.player;
      if (rnd(9) >= rate) return;
      if (rnd(9) <= o.p1) {
        let shot = false;
        if (Math.abs(p.x - o.x) <= 2) shot = this._shootFrom(b, o.x, o.y, [0, Math.sign(p.y - o.y)], o.id, star);
        if (!shot && Math.abs(p.y - o.y) <= 2) this._shootFrom(b, o.x, o.y, [Math.sign(p.x - o.x), 0], o.id, star);
      } else this._shootFrom(b, o.x, o.y, this._rndDir(), o.id, star);
    }

    /** Pusher: moves along its step direction, pushing what is in front. */
    _actPusher(b, o) {
      const [dx, dy] = o.step;
      if (!dx && !dy) return;
      if (!this._free(b, o.x + dx, o.y + dy)) this._pushChain(b, o.x + dx, o.y + dy, dx, dy);
      if (this._moveEntity(b, o, [dx, dy])) this.play('t--f');
    }

    /** Bomb: p1 = countdown (0 = not lit; the player lights it by touching). Explodes at 1. */
    _actBomb(b, o) {
      if (o.p1 <= 0) return;
      o.p1--;
      const i = o.y * COLS + o.x;
      b.ch[i] = o.p1 > 1 ? 48 + o.p1 : -1;
      if (o.p1 === 1) { this.play('t+c+c+c'); this._explode(b, o); }
      else if (o.p1 === 0) this._kill(b, o);
      else this.play(o.p1 % 2 ? 't8' : 't5');
    }

    _explode(b, bomb) {
      let hurt = false;
      for (let dy = -5; dy <= 5; dy++) for (let dx = -8; dx <= 8; dx++) {
        const x = bomb.x + dx, y = bomb.y + dy;
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS || !lit(dx, dy)) continue;
        const i = y * COLS + x;
        if (this._playerAt(x, y) && !hurt) { hurt = true; this._hurt(10); }
        const t = b.at.get(i);
        if (t && t !== bomb && !t.dead) {
          if (t.el === 36) Promise.resolve(this.rt.send('bombed', t.id, { from: bomb })).catch(e => console.error(e));
          else if (t.bullet) { this._leaveBullet(b, t); t.dead = true; }
          else if (EL[t.el] && EL[t.el].enemy) this._kill(b, t);
          if (!b.at.has(i)) b.fx.set(i, this.tickN + 4);
        } else if (!t && (b.el[i] === 0 || b.el[i] === 23)) {
          this._setCell(b, i, 0, 0, 0, 32);
          b.fx.set(i, this.tickN + 4);
        }
      }
    }

    /** Duplicator: p1 = animation phase (0-4), p2 = rate. Copies what is on its step side to the other side. */
    _actDuplicator(b, o) {
      const i0 = o.y * COLS + o.x;
      o.cycle = Math.max(1, (9 - o.p2) * 3);
      if (o.p1 <= 4) { b.ch[i0] = [250, 249, 248, 111, 79][o.p1]; o.p1++; return; }
      o.p1 = 0; b.ch[i0] = 250;
      const [sx, sy] = o.step;
      const ax = o.x + sx, ay = o.y + sy, dx = o.x - sx, dy = o.y - sy;
      if ((!sx && !sy) || [ax, dx].some(v => v < 0 || v >= COLS) || [ay, dy].some(v => v < 0 || v >= ROWS)) return;
      const si = ay * COLS + ax, di = dy * COLS + dx;
      if (this._playerAt(ax, ay) || b.el[si] === 0) return;
      if (!this._free(b, dx, dy)) this._pushChain(b, dx, dy, -sx, -sy);
      if (!this._free(b, dx, dy)) return;
      const src = b.at.get(si);
      if (src && (src.bullet || src.dead)) return;
      this._setCell(b, di, b.el[si], b.fg[si], b.bg[si], b.ch[si] < 0 ? null : b.ch[si]);
      if (src) this._cloneStat(b, src, dx, dy);
      this.play('scdefg');
    }

    _cloneStat(b, s, x, y) {
      const o = this._addStat(b, x, y, s.el, { name: s.name, title: s.title, cycle: s.cycle, p1: s.p1, p2: s.p2,
        p3: s.p3, step: s.step.slice(), dest: s.dest, script: s.script, under: { el: 0, fg: 0, bg: 0, ch: null } });
      o.word = s.word;
      if (s.prog) { o.prog = s.prog; o.ip = 0; this.rt.objectOwner.set(o.id, b.id); this._startObject(b, o); }
      return o;
    }

    /** Conveyors turn the 8 cells around them: movable things shift one place (cw or ccw) into gaps. */
    _actConveyorCW(b, o) { this._convey(b, o, 1); }
    _actConveyorCCW(b, o) { this._convey(b, o, -1); }
    _convey(b, o, dir) {
      o.spin = ((o.spin || 0) + 1) % 4;
      b.ch[o.y * COLS + o.x] = (dir > 0 ? [179, 47, 196, 92] : [92, 196, 47, 179])[o.spin];
      const R = RING.map(([dx, dy]) => [o.x + dx, o.y + dy]);
      const kind = k => {
        const [x, y] = R[k];
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return 'block';
        if (this._playerAt(x, y)) return 'mov';
        const i = y * COLS + x, ent = b.at.get(i);
        if (ent) return !ent.bullet && PUSH_STAT.has(ent.el) ? 'mov' : 'block';
        if (b.el[i] === 0) return 'empty';
        return PUSH_TILE.has(b.el[i]) || b.el[i] === 25 || b.el[i] === 26 ? 'mov' : 'block';
      };
      let s = -1;
      for (let k = 0; k < 8; k++) if (kind(k) === 'empty') { s = k; break; }
      if (s < 0) return;
      for (let n = 1; n < 8; n++) {             // walk backwards from a gap: each thing moves into the gap ahead
        const k = (s - n * dir + 16) % 8, to = (k + dir + 8) % 8;
        if (kind(k) !== 'mov' || kind(to) !== 'empty') continue;
        const [x, y] = R[k], [tx, ty] = R[to];
        if (this._playerAt(x, y)) { this.player.x = tx; this.player.y = ty; continue; }
        const ent = b.at.get(y * COLS + x);
        if (ent) this._moveEntity(b, ent, [tx - x, ty - y]);
        else this._moveTile(b, y * COLS + x, ty * COLS + tx);
      }
    }

    /** Blink wall: p1 = start delay, p2 = period, step = direction. Alternately fires a ray of wall
     *  (until something blocks it) and erases it. A player in the way is pushed aside or hurt. */
    _actBlinkWall(b, o) {
      if (!o.p3) o.p3 = o.p1 + 1;
      if (o.p3 > 1) { o.p3--; return; }
      o.p3 = o.p2 * 2 + 1;
      const [sx, sy] = o.step;
      if (!sx && !sy) return;
      const ray = sx ? 33 : 43, color = b.fg[o.y * COLS + o.x];
      let x = o.x + sx, y = o.y + sy;
      const inB = () => x >= 0 && y >= 0 && x < COLS && y < ROWS;
      if (inB() && b.el[y * COLS + x] === ray && b.fg[y * COLS + x] === color) {
        while (inB() && b.el[y * COLS + x] === ray && b.fg[y * COLS + x] === color) { this._setCell(b, y * COLS + x, 0, 0, 0, 32); x += sx; y += sy; }
        return;
      }
      for (; inB(); x += sx, y += sy) {
        const i = y * COLS + x;
        if (this._playerAt(x, y)) {
          const side = [[sy, sx], [-sy, -sx]].find(([dx, dy]) => this._free(b, x + dx, y + dy));
          if (side) { this.player.x += side[0]; this.player.y += side[1]; }
          else { this._hurt(10); break; }
        }
        const t = b.at.get(i);
        if (t) { if (!t.bullet && EL[t.el] && EL[t.el].enemy) this._kill(b, t); else break; }
        if (b.el[i] !== 0) break;
        this._setCell(b, i, ray, color, 0, null);
      }
    }

    /** Centipede head: p1 = intelligence (turns toward the player when lined up), p2 = deviance (random
     *  turns). Segments follow the head; a segment that loses its leader becomes a head. */
    _actHead(b, o) {
      if (!o.linked) { this._linkCentipede(b, o); o.linked = true; }
      const p = this.player, playing = this.state === 'play';
      let [sx, sy] = o.step;
      if (playing && o.x === p.x && rnd(10) < o.p1) { sx = 0; sy = Math.sign(p.y - o.y); }
      else if (playing && o.y === p.y && rnd(10) < o.p1) { sx = Math.sign(p.x - o.x); sy = 0; }
      else if (rnd(10) * 4 < o.p2 || (!sx && !sy)) [sx, sy] = this._rndDir();
      const ok = (dx, dy) => (dx || dy) && (this._free(b, o.x + dx, o.y + dy) || this._playerAt(o.x + dx, o.y + dy));
      if (!ok(sx, sy)) {
        const turns = rnd(2) ? [[-sy, sx], [sy, -sx]] : [[sy, -sx], [-sy, sx]];
        const t = turns.find(([dx, dy]) => ok(dx, dy));
        if (t) [sx, sy] = t;
        else if (ok(-sx, -sy)) [sx, sy] = [-sx, -sy];
        else { o.step = [0, 0]; this._reverseCentipede(b, o); return; }
      }
      o.step = [sx, sy];
      if (this._playerAt(o.x + sx, o.y + sy)) { this._attack(b, o); return; }
      let px = o.x, py = o.y;
      if (!this._moveEntity(b, o, [sx, sy])) return;
      for (let f = o.followerE; f && !f.dead; f = f.followerE) {
        const fx = f.x, fy = f.y;
        if (!this._moveEntity(b, f, [px - fx, py - fy])) { if (f.leaderE) f.leaderE.followerE = null; f.leaderE = null; break; }
        px = fx; py = fy;
      }
    }

    _actSegment(b, o) {
      if (o.leaderE && !o.leaderE.dead) { o.orphan = 0; return; }
      o.leaderE = null;
      o.orphan = (o.orphan || 0) + 1;
      if (o.orphan < 3) return;                // give the head time to link the chain first
      o.el = 44; b.el[o.y * COLS + o.x] = 44; b.ch[o.y * COLS + o.x] = -1; o.linked = true; o.step = [0, 0];
    }

    _linkCentipede(b, head) {
      for (let cur = head; ;) {
        let next = null;
        for (const [dx, dy] of DIR4) {
          const e = b.at.get((cur.y + dy) * COLS + cur.x + dx);
          if (cur.x + dx >= 0 && cur.x + dx < COLS && e && !e.dead && e.el === 45 && !e.leaderE && !e.followerE) { next = e; break; }
        }
        if (!next) return;
        cur.followerE = next; next.leaderE = cur; next.orphan = 0; cur = next;
      }
    }

    _reverseCentipede(b, head) {
      const chain = [];
      for (let c = head; c && !c.dead && chain.length < 999; c = c.followerE) chain.push(c);
      if (chain.length < 2) return;
      for (const c of chain) [c.leaderE, c.followerE] = [c.followerE, c.leaderE];
      const tail = chain[chain.length - 1];
      for (const [c, el] of [[head, 45], [tail, 44]]) { c.el = el; b.el[c.y * COLS + c.x] = el; b.ch[c.y * COLS + c.x] = -1; }
      tail.p1 = head.p1; tail.p2 = head.p2; tail.linked = true; tail.step = [0, 0]; tail.leaderE = null;
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

    /** Show the object's pending message, park until its next update; throws ABORT if a message (or a
     *  chosen `!label`) re-targeted it meanwhile. */
    async yieldTick(o) {
      o.ops = 0;
      await this._flush(o);
      await new Promise(res => { o.wake = res; const p = o.parked; o.parked = null; if (p) p(); });
      if (o.dead) throw DEAD;
      if (o.jumpTo != null) throw ABORT;
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
          const next = seg + 1 < o.prog.segments.length ? seg + 1 : null;
          // The message (text lines) ends when control does not fall through into the next label.
          if (r !== undefined || next == null || o.dead) {
            const picked = await this._flush(o);
            if (picked && r !== DIE && !o.dead) { seg = o.jumpTo; o.jumpTo = null; continue; }
          }
          if (r === DIE || o.dead) break;
          if (r === END) seg = null;
          else if (r === GOTO) { seg = o.jumpTo; o.jumpTo = null; }
          else if (r === RESTART) seg = 0;
          else seg = next;
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
      const s = this._labelSegs(o.prog, label).find(k => !o.zapped.has(k));
      if (s == null) return false;
      o.jumpTo = s;
      return true;
    }

    /** Segments a label name reaches, in program order. As in ZZT, a name also matches a longer label
     *  when the next character is not a letter or `_`: `#send check` reaches `:check2` (reconstruction). */
    _labelSegs(prog, label) {
      const cache = prog._labelCache || (prog._labelCache = new Map());
      if (cache.has(label)) return cache.get(label);
      const out = [];
      for (const [name, segs] of Object.entries(prog.labels)) {
        if (name === label || (name.startsWith(label) && label && !/[a-z_]/.test(name[label.length]))) out.push(...segs);
      }
      out.sort((x, y) => x - y);
      cache.set(label, out);
      return out;
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
        if (!t || t.dead) continue;
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
        const segs = t.prog ? this._labelSegs(t.prog, label) : [];
        if (zap) { const s = segs.find(k => !t.zapped.has(k)); if (s != null) t.zapped.add(s); }
        else for (const s of segs) t.zapped.delete(s);   // restore re-enables every zapped copy
      }
    }

    /** Text lines: added to the object's pending message, shown by _flush when the message ends. */
    say(o, items) { (o.pending || (o.pending = [])).push(...items); return false; }

    /** Show the pending message: one line = a flash at the bottom, more (or a choice) = a window.
     *  A chosen `!label` points the object at that label; returns true in that case. */
    async _flush(o) {
      let items = o.pending;
      if (!items || !items.length) return false;
      o.pending = null;
      items = items.map(x => (typeof x === 'string' ? this._txt(x) : { ...x, text: this._txt(x.text) }));
      while (items.length && items[items.length - 1] === '') items.pop();
      if (!items.length) return false;
      const choices = items.filter(x => typeof x === 'object' && x.choice != null);
      if (items.length === 1 && !choices.length) {
        const t = typeof items[0] === 'string' ? items[0] : items[0].text;
        this.rt.flash(t, 2500, this.wrap);
        return false;
      }
      const id = await this.rt.showText(items, [], { host: this.wrap, title: o.title || 'Interaction' });
      if (id == null || o.dead) return false;
      return this.jumpLabel(o, id);
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
      if (o.followerE) { o.followerE.leaderE = null; o.followerE = null; }     // centipede chain
      if (o.leaderE) { o.leaderE.followerE = null; o.leaderE = null; }
      this.rt.off(o.id);
    }

    /** After a script wrote element `el` at cell i: creatures, bombs, conveyors... get a record. */
    _statFor(b, i, el) {
      if (!EL[el] || !EL[el].stat || b.at.has(i)) return;
      this._addStat(b, i % COLS, Math.floor(i / COLS), el);
    }

    become(o, color, word) {
      const b = this.board, i = o.y * COLS + o.x;
      const c = this.elementCell(word, color);
      this._kill(b, o);
      if (c) { this._setCell(b, i, c.el, color ? c.fg : (b.fg[i] || c.fg), c.bg, c.ch); this._statFor(b, i, c.el); }
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
      this._statFor(b, i, c.el);
    }

    change(c1, w1, c2, w2) {
      const b = this.board, from = ELNUM[w1], to = this.elementCell(w2, c2);
      if (from == null || !to) { this.rt.unsupported('#change', `#change ${c1 || ''} ${w1} ${c2 || ''} ${w2}`); return; }
      for (let i = 0; i < COLS * ROWS; i++) {
        if (b.el[i] !== from || (c1 && b.fg[i] !== COLOR[c1])) continue;
        const t = b.at.get(i);
        if (t) { if (t.el === 36) continue; this._kill(b, t); }
        this._setCell(b, i, to.el, c2 ? to.fg : (to.el === 0 ? 0 : b.fg[i]), to.el === 0 ? 0 : b.bg[i], to.ch);
        this._statFor(b, i, to.el);
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
      if (what === 'energized') return this.energy > 0;
      return false;
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
      const d = this.dir(o, expr);
      this._shootFrom(this.board, o.x, o.y, d, o.id, star);
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
          let d = dx && dy ? (Math.random() < 0.5 ? [dx, 0] : [0, dy]) : [dx, dy];
          if (this.energy > 0) d = [-d[0], -d[1]];     // everything flees an energized player
          return [d, k + 1];
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

    /** Move an entity by (dx,dy) if the target is free (`water`: sharks may enter water). The entity's
     *  cell travels with it and the cell it stood on is restored. */
    _moveEntity(b, o, [dx, dy], water = false) {
      const nx = o.x + dx, ny = o.y + dy;
      if (water) { if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || b.at.has(ny * COLS + nx) || this._playerAt(nx, ny)) return false; }
      else if (!this._free(b, nx, ny)) return false;
      const i = o.y * COLS + o.x, j = ny * COLS + nx;
      const cur = { el: b.el[i], fg: b.fg[i], bg: b.bg[i], ch: b.ch[i] };
      const u = o.under || { el: 0, fg: 0, bg: 0, ch: 32 };
      this._setCell(b, i, u.el, u.fg, u.bg, u.ch == null || u.ch < 0 ? (u.el === 0 ? 32 : null) : u.ch);
      b.at.delete(i);
      o.under = { el: b.el[j], fg: b.fg[j], bg: b.bg[j], ch: b.ch[j] };
      this._setCell(b, j, cur.el, cur.fg, water ? b.bg[j] : cur.bg, cur.ch < 0 ? null : cur.ch);
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
      if ((this.soundAt || 0) - ac.currentTime > 2) return;   // don't pile up effects behind long music
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
      const p = this.player, playing = this.state === 'play';
      const dark = playing && b.extra.dark && !this.rt.shot;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        let e = b.el[i], ch = b.ch[i], fg = b.fg[i], bg = b.bg[i];
        if (dark && !LIT_IN_DARK.has(e) && !(this.torch > 0 && lit(x - p.x, y - p.y))) { r.cell(x, y, 176, 7, 0); continue; }
        if (b.fx.size && b.fx.has(i)) {                 // explosion flash
          if (b.fx.get(i) > this.tickN) { r.cell(x, y, 177, 9 + rnd(7), 0); continue; }
          b.fx.delete(i);
        }
        if (e === 0) { r.cell(x, y, 32, 0, 0); continue; }
        if (e === 31) ch = r.LINE_CHAR[this._lineKey(b, x, y)];
        else if (e === 28) ch = 32;
        else if (ch < 0) ch = EL[e] ? EL[e].ch : null;
        r.cell(x, y, ch, fg, bg);
      }
      if (playing) r.cell(p.x, p.y, 2, this.energy > 0 ? 9 + (this.tickN % 7) : 15, this.energy > 0 && this.tickN % 2 ? 5 : 1);
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
        if (this.board.extra.time_limit > 0) put(6, 'Time:', 14, 1, 4), put(6, String(rt.get('time')), 14, 1, 13);
        row(7, 2, 15, 'Health:', rt.get('health'));
        row(8, 132, 11, 'Ammo:', rt.get('ammo'));
        row(9, 157, 6, 'Torches:', rt.get('torches'));
        if (this.torch > 0) for (let k = 0; k < 4; k++) r.cell(X + 15 + k, 9, k < Math.ceil(this.torch / 50) ? 219 : 176, 6, 1);
        row(10, 4, 11, 'Gems:', rt.get('gems'));
        row(11, 32, 15, 'Score:', rt.get('score'));
        r.cell(X + 2, 12, 12, 15, 1); put(12, 'Keys:', 14, 1, 4);
        for (let k = 1; k <= 7; k++) if (rt.get('key' + k)) r.cell(X + 9 + k, 12, 12, 8 + k, 1);
        if (this.energy > 0) put(13, 'Energized!', 9 + (this.tickN % 7), 1, 4);
        put(15, 'Arrows  Move', 11);
        put(16, 'Shift   Shoot', 11);
        put(17, 'T       Torch', 11);
        put(18, 'S       Sound', 11);
        put(19, 'Q       Title', 11);
      }
    }
  }

  window.ZztEngine = ZztEngine;
})();
