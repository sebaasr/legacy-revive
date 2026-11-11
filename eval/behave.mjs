// Behavioral fidelity harness for Legacy Revive apps (HyperCard and ZZT).
//
// Loads an app headlessly (one Chrome, one app at a time), exposes its runtime (`rt`, plus `engine`
// for HyperCard or `game` for ZZT), runs scripted steps and checks expectations derived from the
// ORIGINAL scripts. Also runs a smoke test per app (click every visible start-screen button / press P
// and walk around) and records console errors.
//
//   node eval/behave.mjs <target> [sample ...] [--no-smoke] [--only=<scenario name substring>] [--holdout]
//     reads  eval/<target>/scenarios.json   (--holdout: scenarios_holdout.json, no smoke test)
//     writes eval/<target>/behave/<sample>.json  (--holdout: behave_holdout/<sample>.json)
//   Scenarios with "retired": true are skipped and listed under "retired" in the output.
//
// scenarios.json: { "<sample>": { "notes": "...", "scenarios": [ { "name", "source", "open"?, "steps": [...] } ] } }
//   open:  query string added to index.html (e.g. "card=8" or "board=2")
//   steps (one action key per step, see `act` below):
//     HyperCard: {click: name|id, kind?, layer?}  {clickAt:[x,y]}  {clickChar:{field, char}}  {typeInto:{field, text}}
//     ZZT:       {start:true}  {touch: name|id}  {takeItem: element}  {place:[x,y]}  {move: key, times?}
//     both:      {key: key, times?}  {type: text}  {answer: label|text}  {dismiss:true}  {wait: ms}
//                {waitFor:{js, timeout}}  {setup: js}  {mark:true}  {snapshot:true}
//     {expect: {...}} keys: screen, screenName, screenNumber, field:{name, equals|contains|matches|empty|notEmpty},
//                visible:{name, value}, hilite:{name, value}, enabled:{name, value}, dialog: bool|{contains},
//                shown:{contains}, counter:{name, equals|delta|gte}, flag:{name, value}, entityAlive:{name|id, value},
//                state, js:{code, equals}
//   Every scenario also fails on uncaught JavaScript errors and HyperTalk/ZZT script errors.
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// ---- hooks installed before any app script runs: record every text the app shows ---------------
const INIT = () => {
  window.__shown = [];
  window.__errors = [];
  let LR;
  Object.defineProperty(window, 'LegacyRuntime', {
    configurable: true,
    get() { return LR; },
    set(v) {
      LR = v;
      const p = v.prototype;
      const flatten = lines => (lines || []).map(l => (typeof l === 'string' ? l : (l && l.text) || '')).join('\n');
      const st = p.showText, fl = p.flash, ask = p.askText;
      p.showText = function (lines, choices, opts) {
        window.__shown.push({ kind: 'dialog', text: flatten(lines) + '\n' + (choices || []).map(c => c.text).join('\n') });
        return st.call(this, lines, choices, opts);
      };
      p.flash = function (t, ...a) { window.__shown.push({ kind: 'flash', text: String(t) }); return fl.call(this, t, ...a); };
      p.askText = function (prompt, ...a) { window.__shown.push({ kind: 'ask', text: String(prompt) }); return ask.call(this, prompt, ...a); };
    },
  });
};

// ---- in-page helpers (evaluated in the browser) --------------------------------------------------
const HELPERS = () => {
  const H = {};
  H.kind = window.engine ? 'hypercard' : 'zzt';
  H.dialogText = () => { const d = document.querySelector('.lr-dialog'); return d ? d.innerText : null; };
  // HyperCard -------------------------------------------------------------------------------------
  H.part = (spec, kind, layer) => {
    const E = window.engine;
    if (E.objects.has(spec)) return spec;
    const cur = E.current.id, bg = E.bgOf(E.current);
    let list = [];
    if (layer !== 'bg') list = list.concat(E.partsOf.get(cur) || []);
    if (layer !== 'card' && bg) list = list.concat(E.partsOf.get(bg) || []);
    const want = String(spec).toLowerCase();
    const hit = list.filter(o => (!kind || o.kind === kind) && (E.state.get(o.id).name || '').toLowerCase() === want);
    return hit.length ? hit[0].id : null;
  };
  H.screen = () => {
    if (window.engine) {
      const E = window.engine;
      return { id: E.current.id, name: E.cardNames.get(E.current.id) || '', number: E.cardIndex.get(E.current.id) + 1, count: E.cards.length, bg: E.bgOf(E.current) };
    }
    const g = window.game;
    return { id: g.board ? g.board.id : null, name: g.board ? g.board.scr.name : '', state: g.state, player: [g.player.x, g.player.y] };
  };
  H.idle = async ms => {
    const E = window.engine;
    const t0 = performance.now();
    for (;;) {
      const q = E.queue;
      let done = false;
      q.then(() => { done = true; }, () => { done = true; });
      while (!done && !window.rt.dialogOpen && performance.now() - t0 < ms) await new Promise(r => setTimeout(r, 25));
      if (window.rt.dialogOpen) return 'dialog';
      if (!done) return 'timeout';
      await new Promise(r => setTimeout(r, 60));
      if (E.queue === q || E._idleBusy) return 'idle';
    }
  };
  // ZZT -------------------------------------------------------------------------------------------
  H.entity = spec => {
    const b = window.game.board;
    const s = String(spec).toLowerCase();
    return b.entities.find(o => o.id === spec && !o.dead) || b.entities.find(o => !o.dead && (o.name === s || o.word === s)) || null;
  };
  H.entityAny = spec => {
    const b = window.game.board;
    const s = String(spec).toLowerCase();
    return b.entities.find(o => o.id === spec) || b.entities.find(o => o.name === s || o.word === s) || null;
  };
  H.approach = (tx, ty, from) => {   // put the player on a free walkable neighbour of (tx,ty); returns the key that walks into it
    const g = window.game, b = g.board, COLS = 60, ROWS = 25;
    const all = { west: [-1, 0, 'ArrowRight'], east: [1, 0, 'ArrowLeft'], north: [0, -1, 'ArrowDown'], south: [0, 1, 'ArrowUp'] };
    const dirs = (from ? [from] : []).concat(['west', 'east', 'north', 'south']).map(k => all[k]);
    for (const [dx, dy, key] of dirs) {
      const x = tx + dx, y = ty + dy;
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
      const i = y * COLS + x;
      if (b.at.has(i)) continue;
      if (!g._walkable(b, i)) continue;
      g.player.x = x; g.player.y = y; g.keys.clear(); g.queued = [];
      g.draw();
      return key;
    }
    return null;
  };
  H.findCell = el => {
    const b = window.game.board;
    for (let i = 0; i < b.el.length; i++) if (b.el[i] === el && !b.at.has(i)) {
      const x = i % 60, y = Math.floor(i / 60);
      const key = H.approach(x, y);
      if (key) { window.__lastCell = i; return { x, y, key }; }
    }
    return null;
  };
  window.__H = H;
};

// ---- runner ----------------------------------------------------------------------------------------
class Runner {
  constructor(page, target, sample) {
    this.page = page; this.target = target; this.sample = sample;
    this.errors = [];
    page.on('pageerror', e => this.errors.push(`pageerror: ${e.message}`));
    page.on('console', m => {
      if (m.type() === 'error') this.errors.push(`console.error: ${m.text().slice(0, 400)}`);
    });
    page.on('dialog', d => d.dismiss().catch(() => {}));
  }

  url(open) {
    const u = pathToFileURL(path.join(ROOT, 'output', this.target, this.sample, 'app', 'index.html')).href;
    return u + (open ? '?' + open : '');
  }

  async load(open) {
    this.errors.length = 0;
    await this.page.goto(this.url(open));
    if (this.target === 'hypercard') {
      await this.page.waitForFunction(() => document.documentElement.dataset.ready === '1' || (window.rt && window.rt.dialogOpen),
        null, { timeout: 30000 }).catch(() => this.errors.push('harness: boot timeout'));
    } else {
      await this.page.waitForFunction(() => window.game && window.game.board, null, { timeout: 15000 }).catch(() => this.errors.push('harness: boot timeout'));
    }
    await this.page.evaluate(HELPERS);
    if (this.target === 'hypercard') await this.settle();
  }

  async settle(ms = 25000) {
    if (this.target === 'hypercard') return this.page.evaluate(m => window.__H.idle(m), ms);
    // ZZT: let a few ticks run, stop early if a dialog opens
    await this.page.waitForFunction(() => window.rt.dialogOpen, null, { timeout: Math.min(ms, 700) }).catch(() => {});
    return 'ok';
  }

  async scriptErrors() {
    return this.page.evaluate(() => (window.engine ? window.engine.errors.slice() : []));
  }

  async clickSelector(id) {
    const box = await this.page.evaluate(id => {
      const el = [...document.querySelectorAll('[data-id]')].find(e => e.dataset.id === id);
      if (!el || el.offsetParent === null) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, id);
    if (!box) throw new Error(`object ${id} is not on screen`);
    await this.page.mouse.click(box.x, box.y);
  }

  async act(step) {
    const p = this.page;
    if ('click' in step) {
      const id = await p.evaluate(([s, k, l]) => window.__H.part(s, k, l), [step.click, step.kind || null, step.layer || null]);
      if (!id) throw new Error(`no object "${step.click}" on ${JSON.stringify(await p.evaluate(() => window.__H.screen()))}`);
      await this.clickSelector(id);
      return this.settle(step.timeout);
    }
    if ('clickAt' in step) {
      const box = await p.evaluate(() => { const c = document.querySelector('.hc-card'); const r = c.getBoundingClientRect(); return { x: r.left, y: r.top }; });
      await p.mouse.click(box.x + step.clickAt[0], box.y + step.clickAt[1]);
      return this.settle(step.timeout);
    }
    if ('clickChar' in step) {
      const pt = await p.evaluate(([name, n]) => {
        const id = window.__H.part(name, 'field');
        const el = [...document.querySelectorAll('[data-id]')].find(e => e.dataset.id === id);
        if (!el) return null;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let k = n - 1, node;
        while ((node = walker.nextNode())) {
          if (k < node.length) {
            const r = document.createRange(); r.setStart(node, k); r.setEnd(node, k + 1);
            const b = r.getBoundingClientRect();
            return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
          }
          k -= node.length;
        }
        return null;
      }, [step.clickChar.field, step.clickChar.char]);
      if (!pt) throw new Error(`char ${step.clickChar.char} of field ${step.clickChar.field} not found`);
      await p.mouse.click(pt.x, pt.y);
      return this.settle(step.timeout);
    }
    if ('typeInto' in step) {
      const id = await p.evaluate(n => window.__H.part(n, 'field'), step.typeInto.field);
      if (!id) throw new Error(`no field ${step.typeInto.field}`);
      await this.clickSelector(id);
      await this.settle(3000);
      await p.keyboard.press('Control+A');
      await p.keyboard.press('Delete');
      if (step.typeInto.text) await p.keyboard.type(step.typeInto.text, { delay: 10 });
      // leave the field the way a user would (commits the edit, sends closeField)
      await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
      return this.settle(step.timeout);
    }
    if ('key' in step || 'move' in step) {
      const k = step.key || step.move;
      for (let i = 0; i < (step.times || 1); i++) {
        await p.keyboard.press(k);
        if (this.target === 'zzt') await p.waitForTimeout(step.gap || 260); else await this.settle(step.timeout);
      }
      return this.settle(step.timeout);
    }
    if ('type' in step) {
      for (const ch of step.type) { await p.keyboard.press(ch); if (this.target === 'hypercard') await this.settle(5000); }
      return this.settle(step.timeout);
    }
    if ('answer' in step) {
      const ok = await p.evaluate(label => {
        const d = document.querySelector('.lr-dialog');
        if (!d) return 'no dialog';
        const input = d.querySelector('input');
        if (input) {
          input.value = label;
          const btn = [...d.querySelectorAll('button')].find(b => b.textContent === 'OK');
          btn.click(); return 'ok';
        }
        const want = String(label).toLowerCase();
        const cand = [...d.querySelectorAll('button, .lr-choice')];
        const b = cand.find(b => b.textContent.trim().toLowerCase() === want) || cand.find(b => b.textContent.toLowerCase().includes(want));
        if (!b) return 'no choice ' + label + ' in [' + cand.map(c => c.textContent).join(' | ') + ']';
        b.click(); return 'ok';
      }, step.answer);
      if (ok !== 'ok') throw new Error(ok);
      return this.settle(step.timeout);
    }
    if ('dismiss' in step) {
      for (let i = 0; i < (step.times || 1); i++) {
        const open = await p.evaluate(() => window.rt.dialogOpen);
        if (!open) break;
        await p.keyboard.press(step.dismiss === 'Escape' ? 'Escape' : 'Enter');
        await this.settle(step.timeout);
      }
      return;
    }
    if ('wait' in step) { await p.waitForTimeout(step.wait); return; }
    if ('waitFor' in step) {
      await p.waitForFunction(new Function('return (' + step.waitFor.js + ')'), null, { timeout: step.waitFor.timeout || 10000 })
        .catch(() => { throw new Error(`timed out waiting for ${step.waitFor.js}`); });
      return;
    }
    if ('setup' in step) { await p.evaluate(new Function(step.setup)); return this.settle(step.timeout); }
    if ('mark' in step) { await p.evaluate(() => { window.__shown.length = 0; }); return; }
    if ('snapshot' in step) { this.snap = await p.evaluate(() => Object.fromEntries(window.rt.vars)); return; }
    // ZZT ------------------------------------------------------------------------------------------
    if ('start' in step) {
      await p.keyboard.press('p');
      await p.waitForTimeout(400);
      return;
    }
    if ('place' in step) {
      await p.evaluate(([x, y]) => { const g = window.game; g.player.x = x; g.player.y = y; g.keys.clear(); g.queued = []; g.draw(); }, step.place);
      return;
    }
    if ('touch' in step) {
      const key = await p.evaluate(([spec, from]) => {
        const o = window.__H.entity(spec);
        if (!o) return { err: 'no live entity ' + spec };
        const k = window.__H.approach(o.x, o.y, from);
        return k ? { key: k } : { err: `no free cell next to ${spec} at ${o.x},${o.y}` };
      }, [step.touch, step.from || null]);
      if (key.err) throw new Error(key.err);
      await p.keyboard.press(key.key);
      return this.settle(1500);
    }
    if ('edge' in step) {   // walk off the board edge: north|south|east|west
      const key = await p.evaluate(dir => {
        const g = window.game, b = g.board, COLS = 60, ROWS = 25;
        const target = (b.extra.exits || {})[dir];
        if (!target) return { err: 'no exit ' + dir };
        const t = g._boardState(target);
        const free = (bb, x, y) => { const i = y * COLS + x; return !bb.at.has(i) && g._walkable(bb, i); };
        const K = { north: 'ArrowUp', south: 'ArrowDown', west: 'ArrowLeft', east: 'ArrowRight' }[dir];
        const n = dir === 'north' || dir === 'south' ? COLS : ROWS;
        for (let k = 0; k < n; k++) {
          const [x, y, tx, ty] = dir === 'north' ? [k, 0, k, ROWS - 1] : dir === 'south' ? [k, ROWS - 1, k, 0]
            : dir === 'west' ? [0, k, COLS - 1, k] : [COLS - 1, k, 0, k];
          if (free(b, x, y) && free(t, tx, ty)) { g.player.x = x; g.player.y = y; g.keys.clear(); g.queued = []; return { key: K }; }
        }
        return { err: 'no free crossing on the ' + dir + ' edge' };
      }, step.edge);
      if (key.err) throw new Error(key.err);
      await p.keyboard.press(key.key);
      return this.settle(700);
    }
    if ('takeItem' in step) {
      const r = await p.evaluate(el => window.__H.findCell(el), step.takeItem);
      if (!r) throw new Error(`no reachable element ${step.takeItem} on this board`);
      this.lastCell = r;
      await p.keyboard.press(r.key);
      return this.settle(700);
    }
    throw new Error('unknown step ' + JSON.stringify(step));
  }

  async check(exp) {
    const p = this.page;
    const out = [];
    const rec = (what, pass, actual, expected) => out.push({ what, pass: !!pass, actual, expected });
    const scr = await p.evaluate(() => window.__H.screen());
    const textOK = (v, c) => {
      if (v == null) return false;
      if ('equals' in c) return String(v) === String(c.equals);
      if ('contains' in c) return String(v).toLowerCase().includes(String(c.contains).toLowerCase());
      if ('matches' in c) return new RegExp(c.matches, c.flags || '').test(String(v));
      if (c.empty) return String(v) === '';
      if (c.notEmpty) return String(v) !== '';
      return true;
    };
    for (const [k, c] of Object.entries(exp)) {
      if (k === 'screen') rec('screen', scr.id === c, scr.id, c);
      else if (k === 'screenName') rec('screenName', String(scr.name).toLowerCase() === String(c).toLowerCase(), scr.name, c);
      else if (k === 'screenNumber') rec('screenNumber', scr.number === c, scr.number, c);
      else if (k === 'screenCount') rec('screenCount', scr.count === c, scr.count, c);
      else if (k === 'bg') rec('background', scr.bg === c, scr.bg, c);
      else if (k === 'state') rec('state', scr.state === c, scr.state, c);
      else if (k === 'field') {
        const v = await p.evaluate(n => { const id = window.__H.part(n, 'field'); return id == null ? null : window.engine.fieldText(id, window.engine.current.id); }, c.name);
        rec(`field "${c.name}"`, textOK(v, c), v, c);
      } else if (k === 'visible' || k === 'hilite' || k === 'enabled') {
        const prop = k;
        const v = await p.evaluate(([n, kind, prop, layer]) => { const id = window.__H.part(n, kind, layer); return id == null ? 'missing' : window.engine.state.get(id)[prop]; }, [c.name, c.kind || null, prop, c.layer || null]);
        rec(`${k} of "${c.name}"`, v === c.value, v, c.value);
      } else if (k === 'dialog') {
        const v = await p.evaluate(() => window.__H.dialogText());
        if (c === true || c === false) rec('dialog open', (v != null) === c, v, c);
        else rec('dialog', textOK(v, c), v, c);
      } else if (k === 'shown') {
        const v = await p.evaluate(() => window.__shown.map(s => s.text).join('\n---\n'));
        if (c === false) rec('nothing shown', v === '', v, '(nothing)');
        else rec('text shown', textOK(v, c), v.slice(0, 300), c);
      } else if (k === 'counter') {
        const v = await p.evaluate(n => window.rt.get(n), c.name);
        let pass = true;
        if ('equals' in c) pass = v === c.equals;
        if ('delta' in c) pass = v - ((this.snap || {})[c.name] || 0) === c.delta;
        if ('gte' in c) pass = v >= c.gte;
        rec(`counter ${c.name}`, pass, v, c);
      } else if (k === 'flag') {
        const v = await p.evaluate(n => window.rt.hasFlag(n), c.name);
        rec(`flag ${c.name}`, v === c.value, v, c.value);
      } else if (k === 'entityAlive') {
        const v = await p.evaluate(s => { const o = window.__H.entityAny(s); return o ? !o.dead : false; }, c.name);
        rec(`entity ${c.name} alive`, v === c.value, v, c.value);
      } else if (k === 'js') {
        const v = await p.evaluate(new Function('return (' + c.code + ')'));
        const pass = 'equals' in c ? JSON.stringify(v) === JSON.stringify(c.equals) : !!v;
        rec(c.label || c.code, pass, v, 'equals' in c ? c.equals : true);
      } else rec('unknown expectation ' + k, false, null, c);
    }
    return out;
  }

  async scenario(sc) {
    const res = { name: sc.name, source: sc.source || '', checks: [], errors: [], pass: false };
    try {
      await this.load(sc.open || '');
      for (const step of sc.steps) {
        if ('expect' in step) res.checks.push(...await this.check(step.expect));
        else await this.act(step);
      }
    } catch (e) {
      res.checks.push({ what: 'step failed', pass: false, actual: String(e.message || e).slice(0, 400) });
    }
    const scriptErrs = await this.scriptErrors().catch(() => []);
    res.errors = [...new Set(this.errors.concat(scriptErrs.map(s => 'script error: ' + s)))];
    const fatal = res.errors.filter(e => !/\[unsupported\]/.test(e));
    res.checks.push({ what: 'no JS/script errors', pass: fatal.length === 0, actual: fatal.slice(0, 5) });
    res.pass = res.checks.every(c => c.pass);
    return res;
  }

  // ---- smoke tests -------------------------------------------------------------------------------
  async smokeHyperCard() {
    await this.load('');
    const start = await this.page.evaluate(() => window.__H.screen());
    const buttons = await this.page.evaluate(() => [...document.querySelectorAll('.hc-card .lr-button')]
      .filter(b => b.offsetParent !== null && getComputedStyle(b).visibility !== 'hidden')
      .map(b => b.dataset.id));
    const clicks = [];
    const all = new Set();
    for (const id of buttons) {
      await this.load('');
      let err = null;
      try {
        await this.clickSelector(id);
        await this.settle();
        for (let i = 0; i < 10; i++) {
          if (!(await this.page.evaluate(() => window.rt.dialogOpen))) break;
          await this.page.keyboard.press('Enter');
          await this.settle();
        }
      } catch (e) { err = String(e.message || e); }
      const after = await this.page.evaluate(() => window.__H.screen());
      const se = await this.scriptErrors();
      const errs = this.errors.concat(se.map(s => 'script error: ' + s));
      errs.forEach(e => all.add(e));
      clicks.push({ button: id, to: after.id, error: err, errors: errs.slice(0, 5) });
    }
    const stubs = await this.page.evaluate(() => window.rt.stubReport().map(s => `${s.cmd}: ${s.line}`));
    return { start: start.id, buttons: buttons.length, clicks, errors: [...all], pass: all.size === 0 && clicks.every(c => !c.error), runtimeStubs: stubs };
  }

  async smokeZzt() {
    await this.load('');
    const visited = new Set();
    let err = null;
    try {
      await this.page.keyboard.press('p');
      await this.page.waitForTimeout(500);
      const dismiss = async () => { for (let i = 0; i < 6; i++) { if (!(await this.page.evaluate(() => window.rt.dialogOpen))) return; await this.page.keyboard.press('Escape'); await this.page.waitForTimeout(150); } };
      await dismiss();
      visited.add((await this.page.evaluate(() => window.__H.screen())).id);
      for (const k of ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowRight']) {
        await this.page.keyboard.down(k);
        await this.page.waitForTimeout(1400);
        await this.page.keyboard.up(k);
        await dismiss();
        visited.add((await this.page.evaluate(() => window.__H.screen())).id);
      }
      await this.page.keyboard.press('Space');   // shoot
      await this.page.waitForTimeout(400);
      await dismiss();
    } catch (e) { err = String(e.message || e); }
    const end = await this.page.evaluate(() => window.__H.screen());
    const stubs = await this.page.evaluate(() => window.rt.stubReport().map(s => `${s.cmd}: ${s.line}`));
    return { state: end.state, boardsSeen: [...visited], end: end.id, error: err, errors: [...new Set(this.errors)], pass: !err && end.state !== 'title' && this.errors.length === 0, runtimeStubs: stubs };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const target = args.shift();
  const noSmoke = args.includes('--no-smoke');
  const only = (args.find(a => a.startsWith('--only=')) || '').slice(7);
  const holdout = args.includes('--holdout');   // hold-out set: scenarios_holdout.json -> behave_holdout/
  const scenFile = holdout ? 'scenarios_holdout.json' : 'scenarios.json';
  const outDir = path.join(ROOT, 'eval', target, holdout ? 'behave_holdout' : 'behave');
  const all = JSON.parse(fs.readFileSync(path.join(ROOT, 'eval', target, scenFile), 'utf8'));
  const samples = args.filter(a => !a.startsWith('--'));
  const list = samples.length ? samples : Object.keys(all).filter(k => !k.startsWith('_'));
  fs.mkdirSync(outDir, { recursive: true });
  for (const sample of list) {
    const spec = all[sample] || { scenarios: [] };
    const browser = await chromium.launch({ executablePath: CHROME, args: ['--mute-audio', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
    const ctx = await browser.newContext({ viewport: { width: 900, height: 640 } });
    await ctx.addInitScript(INIT);
    const page = await ctx.newPage();
    const r = new Runner(page, target, sample);
    const retired = spec.scenarios.filter(s => s.retired);
    const out = { sample, scenarios: [], smoke: null, retired: retired.map(s => ({ name: s.name, reason: s.retired_reason || '' })) };
    if (retired.length) console.log(`${sample} | skipping ${retired.length} retired scenario(s)`);
    for (const sc of spec.scenarios.filter(s => !s.retired && (!only || s.name.includes(only)))) {
      const res = await r.scenario(sc);
      out.scenarios.push(res);
      console.log(`${sample} | ${res.pass ? 'PASS' : 'FAIL'} | ${sc.name}`);
      if (!res.pass) for (const c of res.checks.filter(c => !c.pass)) console.log(`     x ${c.what}: got ${JSON.stringify(c.actual).slice(0, 250)} want ${JSON.stringify(c.expected)}`);
    }
    if (!noSmoke && !holdout) {
      out.smoke = target === 'hypercard' ? await r.smokeHyperCard() : await r.smokeZzt();
      console.log(`${sample} | smoke ${out.smoke.pass ? 'PASS' : 'FAIL'} | errors: ${out.smoke.errors.length}`);
      for (const e of out.smoke.errors.slice(0, 6)) console.log('     ' + e.slice(0, 250));
    }
    await browser.close();
    out.pass = out.scenarios.filter(s => s.pass).length;
    out.total = out.scenarios.length;
    const file = path.join(outDir, sample + '.json');
    if (only && fs.existsSync(file)) {   // partial rerun: merge
      const prev = JSON.parse(fs.readFileSync(file, 'utf8'));
      const names = new Set(out.scenarios.map(s => s.name));
      out.scenarios = prev.scenarios.filter(s => !names.has(s.name)).concat(out.scenarios);
      out.smoke = out.smoke || prev.smoke;
      out.pass = out.scenarios.filter(s => s.pass).length; out.total = out.scenarios.length;
    }
    fs.writeFileSync(file, JSON.stringify(out, null, 2));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
