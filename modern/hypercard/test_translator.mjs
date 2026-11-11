// Tests for the HyperTalk -> JavaScript translator (modern/hypercard/translator.py).
// Snippets are taken from the corpus stacks; each is translated with Python, then run in Node against
// the real HyperCard engine (engine.js) on a tiny fake stack, and its behaviour is checked.
//
//   node modern/hypercard/test_translator.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---- translate a batch of scripts with the Python translator --------------------------------------
function translate(scripts) {
  const py = `
import json, sys
sys.path.insert(0, ${JSON.stringify(HERE)})
from translator import translate_script, collect_handler_names
src = json.load(sys.stdin)
on, fn = collect_handler_names(list(src.values()))
out = {}
for owner, text in src.items():
    js, st = translate_script(text, json.dumps(owner), on, fn)
    out[owner] = {"js": "\\n".join(js), "lines": st.lines, "stubbed": st.stubbed}
print(json.dumps(out))
`;
  const r = spawnSync('python', ['-c', py], { input: JSON.stringify(scripts), encoding: 'utf-8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}

// ---- a minimal browser-less environment for engine.js ---------------------------------------------
const PASS = Symbol('pass');
const ctx = { console, performance, setTimeout, Promise, Symbol, Math, JSON };
ctx.window = ctx;
ctx.LegacyRuntime = { DOCUMENT: '@document', PASS };
vm.createContext(ctx);
vm.runInContext(readFileSync(path.join(HERE, 'engine.js'), 'utf-8'), ctx);
for (const f of ['genie_des_jeux.js', 'xcmds.js']) vm.runInContext(readFileSync(path.join(HERE, 'shims', f), 'utf-8'), ctx);

function makeStack(scripts) {
  const field = (id, name, text = '') => ({ id: `card-1/field-${id}`, kind: 'field', name, number: id, rect: [0, 0, 100, 20],
    visible: true, style: { shape: 'rectangle', font: 'Geneva', size: 12, align: 'left', locked: false }, text, icon: null,
    script: null, extra: { part_id: id, flags_b: 0, line_height: 16, runs: [] } });
  const button = (id, name) => ({ id: `card-1/button-${id}`, kind: 'button', name, number: id, rect: [0, 30, 50, 50],
    visible: true, style: { shape: 'roundrect', show_name: true }, text: name, icon: null, script: null,
    extra: { part_id: id, flags_b: 0x8000, enabled: true, runs: [] } });
  const ir = {
    name: 'Test', size: { width: 512, height: 342 }, start_screen: 'card-1', script: null, assets: [],
    layers: [{ id: 'bkgnd-9', name: 'bg', image: null, script: null,
      objects: [{ ...field(1, 'data'), id: 'bkgnd-9/field-1' }] }],
    screens: [
      { id: 'card-1', name: 'main', number: 1, layers: ['bkgnd-9'], image: null, layer_text: { 'bkgnd-9/field-1': 'x' },
        objects: [field(4, 'tcoda', 'ZKELOLUP'), field(5, 'Lexicon', 'apple\nbanana'), field(6, 'words', 'CIGAR\nREBUT\nSISSY'), button(7, 'decode')] },
      { id: 'card-2', name: 'stats', number: 2, layers: ['bkgnd-9'], image: null, layer_text: {}, objects: [] },
      { id: 'card-3', name: 'about', number: 3, layers: ['bkgnd-9'], image: null, layer_text: {}, objects: [] },
    ],
  };
  const handlers = new Map();
  const stubs = [];
  const rt = {
    ir, shot: true, params: new URLSearchParams(''), handlers, current: null, dialogOpen: false,
    on(owner, msg, fn) { if (!handlers.has(owner)) handlers.set(owner, new Map()); handlers.get(owner).set(msg.toLowerCase(), fn); },
    unsupported(cmd, line) { stubs.push(`${cmd}: ${line}`); },
    wait: () => Promise.resolve(), flash() {},
    screen: id => ir.screens.find(s => s.id === id),
  };
  const tr = translate(scripts);
  const install = H => {
    for (const [owner, t] of Object.entries(tr)) {
      const fn = new vm.Script(`(function (H) { 'use strict';
${t.js}
})`).runInContext(ctx);
      fn(H);
    }
  };
  const E = new ctx.HyperCardEngine(rt, install);
  E.current = ir.screens[0];
  E.renderer = { insertText: () => false, refresh() {}, drawScreen() {}, commitFields() {}, setMessageBox() {}, selectRange() {}, focusedFieldId: () => null };
  return { E, H: E.H, stubs, tr };
}

const call = async (E, owner, name, args = [], kind = 'message') => (await E.dispatch(name, owner, args, kind)).value;
let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok   ${name}`); }
  catch (e) { console.log(`FAIL ${name}\n     ${e.message.replace(/\n/g, '\n     ')}`); process.exitCode = 1; }
}

// ---- tests -----------------------------------------------------------------------------------------
await test('chunks: char/item/word/line, ranges, last, nested (Game Genie decode)', async () => {
  const { E } = makeStack({ '@document': `
function t1
  put "0000,0001,0010,0011" into bina
  put "APZLGITYEOXUKSVN" into letters
  put empty into tobin
  repeat with i=1 to 2
    put item offset (char i of "PZ",letters) of bina after tobin
  end repeat
  return tobin
end t1
function t2
  put "abc def ghi" & return & "second line here" into x
  return (word 2 of line 2 of x) & "|" & (char 2 to 4 of x) & "|" & (last char of x) & "|" & the number of words in x
end t2
function t3
  put "********" into data
  put "1" into char 3 of data
  put "xy" into word 2 of data
  return data
end t3` });
  assert.equal(await call(E, '@document', 't1', [], 'function'), '00010010');
  assert.equal(await call(E, '@document', 't2', [], 'function'), 'line|bc |e|6');
  // HyperCard pads missing lines/items with delimiters but appends a missing word with no space
  assert.equal(await call(E, '@document', 't3', [], 'function'), '**1*****xy');
});

await test('put into/after/before fields and lines (FLC noBatch, Wordle setWinRow)', async () => {
  const { E, H } = makeStack({ '@document': `
on noBatch
  put 1 into LIN
  if line LIN of cd fld Lexicon is empty then
    put "x" into line LIN of card field Lexicon
  else repeat until line LIN of card field Lexicon is empty
    add 1 to LIN
  end repeat
  put "cherry" into line LIN of card field Lexicon
end noBatch
on setWinRow theRow, theValue
  put theValue into line ((6 - theRow) mod 6 + 1) of background field "data" of card "stats"
end setWinRow
on wrap
  put "<" before cd fld "tcoda"
  put ">" after cd fld "tcoda"
end wrap` });
  await call(E, '@document', 'noBatch');
  assert.equal(H.value(H.part({}, 'card', 'field', 'Lexicon')), 'apple\nbanana\ncherry');
  await call(E, '@document', 'setWinRow', [2, 7]);
  assert.equal(E.fieldText('bkgnd-9/field-1', 'card-2'), '\n\n\n\n7');
  assert.equal(E.fieldText('bkgnd-9/field-1', 'card-1'), 'x');      // other cards keep their own text
  await call(E, '@document', 'wrap');
  assert.equal(H.value(H.part({}, 'card', 'field', 'tcoda')), '<ZKELOLUP>');
});

await test('repeat forms, exit/next repeat, if/else chains with single-line else (FLC makeWord)', async () => {
  const { E } = makeStack({ '@document': `
function loops
  put 0 into n
  repeat 3 times
    add 1 to n
  end repeat
  repeat with i = 10 down to 8
    put n & "," after s
  end repeat
  repeat
    add 1 to n
    if n > 6 then exit repeat
  end repeat
  repeat with j = 1 to 5
    if j mod 2 = 0 then next repeat
    put j after odd
  end repeat
  return n & ":" & odd
end loops
function syl SYL
  if SYL is CVC then put 1 into r
  else if SYL is CV then put 2 into r
  else put 3 into r
  if r = 3
  then put r + 1 into r
  return r
end syl` });
  assert.equal(await call(E, '@document', 'loops', [], 'function'), '7:135');
  assert.equal(await call(E, '@document', 'syl', ['CVC'], 'function'), 1);
  assert.equal(await call(E, '@document', 'syl', ['cv'], 'function'), 2);
  assert.equal(await call(E, '@document', 'syl', ['V'], 'function'), 4);
});

await test('functions: user functions, built-ins, operators (Wordle roundUp, centerPoint, maxChars)', async () => {
  const { E } = makeStack({ '@document': `
function roundUp anyNumber
  put trunc(anyNumber) into wholeNumber
  put (10^(length(wholeNumber) - 1)) into divisor
  if wholeNumber mod divisor = 0 then return wholeNumber
  else return (trunc((wholeNumber/divisor) + 1)) * divisor
end roundUp
function centerPoint theRect
  put item 1 of theRect into theLeft
  put item 2 of theRect into theTop
  put item 3 of theRect into theRight
  put item 4 of theRect into theBottom
  put (theLeft + round((theRight - theLeft) / 2)) & "," & ¬
  (theTop + round((theBottom - theTop) / 2)) into thePoint
  return thePoint
end centerPoint
function maxChars textList
  put 0 into longest
  repeat with theLine = 1 to the number of lines in textList
    if length(line theLine of textList) > longest
    then put length(line theLine of textList) into longest
  end repeat
  return longest
end maxChars
function ops
  return ("a" && "b") & (3 div 2) & (not (1 = 2)) & ("Hello" contains "ell") & ("/" is in "a/b") & (2 <> 3) & (5 is not 5) & max(2,(min(5,7))) & numToChar(charToNum("A") + 1) & the length of "abcd"
end ops` });
  assert.equal(await call(E, '@document', 'roundUp', [347], 'function'), 400);
  assert.equal(await call(E, '@document', 'centerPoint', ['10,20,30,61'], 'function'), '20,41');
  assert.equal(await call(E, '@document', 'maxChars', ['ab\nabcd\nabc'], 'function'), 4);
  assert.equal(await call(E, '@document', 'ops', [], 'function'), 'a b1truetruetruetruefalse5B4');
});

await test('messages: send, pass, globals, go and the number of this card (Oblique, What is HyperCard)', async () => {
  const { E, H } = makeStack({
    '@document': `
on openCard
  global visits
  add 1 to visits
end openCard
on goTopic
  go card (the short name of the target)
end goTopic`,
    'card-1': `
on openCard
  pass openCard
end openCard`,
    'card-1/button-7': `
on mouseUp
  visual effect wipe left very slowly
  if the number of this card is 130 ¬
  or the number of this card is 1 then
    go card "about"
  else
    go next card
  end if
end mouseUp`,
    'card-1/field-4': `
on returnInField
  send mouseup to cd btn "decode"
end returnInField` });
  await E.dispatch('returnInField', 'card-1/field-4');
  assert.equal(E.current.id, 'card-3');
  assert.equal(H.g.visits, 1);             // card-3 has no openCard: the stack handler ran once
  await E.goCard({ key: 1 });
  assert.equal(H.g.visits, 2);             // card-1's handler passed openCard to the stack
});

await test('answer/ask in shot mode, stubs are counted', async () => {
  const { E, stubs, tr } = makeStack({ '@document': `
on t
  answer "Leave?" with "No" or "Yes"
  put it into r
  edit script of me
  ask "Name?" with "Anne"
  return r & "/" & it
end t` });
  assert.equal(await call(E, '@document', 't'), 'Yes/Anne');
  assert.equal(tr['@document'].stubbed, 1);
  assert.ok(stubs.some(s => s.startsWith('edit')));
});

await test('word put past the end builds a word (FLC makeWord: x o l -> xol)', async () => {
  const { E } = makeStack({ '@document': `
function mk
  put empty into w
  put "x" into word 1 of w
  put "o" into word 2 of w
  put "l" into word 3 of w
  put "a" into char 5 of w
  return w
end mk` });
  assert.equal(await call(E, '@document', 'mk', [], 'function'), 'xola');
});

await test('unassigned locals read as their own name (Wordle drawChart: bg field data)', async () => {
  const { E } = makeStack({ '@document': `
function chart
  if bg field data is not empty then put stripIt(bg fld "Data") into data
  return data
end chart
function stripIt s
  return "got " & s
end stripIt
function later
  put n after acc
  put 5 into n
  return acc & "/" & n
end later` });
  assert.equal(await call(E, '@document', 'chart', [], 'function'), 'got x');
  assert.equal(await call(E, '@document', 'later', [], 'function'), 'n/5');
});

await test('library shim via start using (Game Genie bin2dec/bin)', async () => {
  const { E, stubs } = makeStack({ '@document': `
on openStack
  start using stack "genie des jeux"
end openStack
function t
  return bin2dec("0001000111011001") & "," & bin(173) & "," & bin2dec(bin(15233))
end t` });
  await E.dispatch('openStack', 'card-1');
  assert.equal(await call(E, '@document', 't', [], 'function'), '4569,0000000010101101,15233');
  assert.deepEqual([...stubs], []);
});

await test('doMenu New card / Delete card; reconstructed XCMDs piece and sortLines', async () => {
  const { E, H } = makeStack({ '@document': `
on mk
  send "doMenu New card" to HyperCard
end mk
on rm
  doMenu "Delete card"
end rm
on newCard
  global made
  put the number of this card into made
end newCard
function x
  return piece("a;b;c", ";", 2) & "|" & sortLines("pear" & return & "Apple" & return & return & "fig")
end x` });
  await call(E, '@document', 'mk');
  assert.equal(E.cards.length, 4);
  assert.equal(E.current.id, 'card-4');
  assert.equal(E.cardIndex.get('card-4'), 1);         // inserted after card 1
  assert.equal(H.g.made, 2);
  assert.equal(E.fieldText('bkgnd-9/field-1', 'card-4'), '');   // background fields start empty
  await call(E, '@document', 'rm');
  assert.equal(E.cards.length, 3);
  assert.equal(E.current.id, 'card-2');
  assert.equal(await call(E, '@document', 'x', [], 'function'), 'b|Apple\nfig\npear');
});

await test('menus, sort cards by an expression, virtual files (Patients Procedure menu and Sort, FLC export)', async () => {
  const { E, H, stubs } = makeStack({ '@document': `
on mk
  if there is not a menu "Procedure" then create menu "Procedure"
  put "Colonoscopy,EGD" into menu "PROCEDURE" with menuMsgs "LOWER,EGD"
  disable menu "Procedure"
end mk
on rm
  if there is a menu "PROCEDURE" then delete menu "Procedure"
end rm
on egd
  global done
  put "egd" into done
end egd
on srt
  sort cards descending by the short name of this card
end srt
function files
  open file "lex.txt"
  write "a" & return & "b" to file "lex.txt"
  close file "lex.txt"
  open file "lex.txt"
  read from file "lex.txt" for 1
  put it into x
  read from file "lex.txt" until return
  close file "lex.txt"
  return x & "|" & it
end files` });
  await call(E, '@document', 'mk');
  assert.equal(H.hasMenu('procedure'), true);
  assert.equal(E.menus[0].items.map(i => i.text + ':' + i.msg).join(' '), 'Colonoscopy:LOWER EGD:EGD');
  assert.equal(E.menus[0].enabled, false);
  await E.menuCommand('EGD');
  assert.equal(H.g.done, 'egd');
  await call(E, '@document', 'rm');
  assert.equal(H.hasMenu('procedure'), false);
  await call(E, '@document', 'srt');
  assert.deepEqual(E.cards.map(c => c.name), ['stats', 'main', 'about']);
  assert.equal(E.current.id, 'card-1');
  const store = new Map();
  E.diskRead = n => store.get(n) || ''; E.diskWrite = (n, t) => store.set(n, t); E.download = () => {};
  assert.equal(await call(E, '@document', 'files', [], 'function'), 'a|\n');
  assert.equal(store.get('lex.txt'), 'a\nb');
  assert.deepEqual([...stubs], []);
});

console.log(`\n${passed} test groups passed`);
