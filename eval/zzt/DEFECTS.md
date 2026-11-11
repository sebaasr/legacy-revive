# ZZT defects (Verifier, iteration 1)

Measured on 2026-11-10 with `eval/visual.py`, `eval/behave.mjs` (scenarios in `eval/zzt/scenarios.json`, raw
results in `eval/zzt/behave/`) and `eval/summarize.py`. Ordered by impact. **Fix in**: `translator` =
`modern/zzt/translator.py`, `engine` = `modern/zzt/engine.js`, `runtime` = `modern/runtime/`.

Headline: title-board visual color_match mean **0.9999** (ink_f1 1.000) on 6/8 worlds with a reference. These are an
**upper bound**: the CP437 glyph shapes were harvested from the same reference screenshots, and only title boards
have references. Behavioral **42/43** scenarios, smoke **8/8** (no console errors), 15,886/15,890 ZZT-OOP lines
translated (4 stubbed).

Note on method: `touch`/`takeItem`/`edge` steps place the player on a free neighbouring cell and then press the
arrow key into the target, so the object's handler runs through the real input path, but path-finding across the
board is not tested.

| # | sample / board | expected (from the original program) | actual | likely cause | fix in |
|---|---|---|---|---|---|
| 1 | all worlds, gameplay boards (not covered by scenarios; quantified from the IR) | creatures move and attack, bombs explode, transporters/conveyors/duplicators/pushers act, dark boards need torches, time limits count down | declared simplifications in `engine.js` header: these do nothing. Affected boards: pyramid 35/60 (87 lions, 95 tigers, 162 transporters, 288 conveyor cells, 20 bombs), kingl2 7/10 (145 lions, 23 bombs), dammak 6/16, toxic 5/41, lostmonk 5/68, smiley 4/30; 23 dark boards across the corpus | not implemented yet | engine: built-in element behaviours (start with creatures' movement + damage, transporters, bombs, dark boards with torch radius). **Fixable**, largest remaining gap for playability |
| 2 | zzttoxic-toxhints, board 0, `HINTS & SOLUTIONS` :TOUCH | one scrollable window: intro text, then the `:MAIN` menu (`Part 1/2/3` choices). In ZZT a `:label` line inside a text block does not end the message | two windows: intro text alone; the menu appears only after the first is closed (scenario 1 fails; scenarios 2-4 pass once the first window is dismissed) | translator splits at label boundaries and `z.say` flushes per segment (`scripts.js:84` and `:97`) | translator/engine: when a segment falls through into the next label, carry the pending text/choices and flush only at a command that ends the message (`#end`, movement, `/i`, etc.). **Fixable** |
| 3 | dammak-dammak, board 14, `@Box` `:touch` | `#if book then check 2` jumps to `:check` when flag `book` is set (ZZT takes the first word after `then` as the command; the trailing `2` is ignored) | whole line stubbed: touching the box with the book does nothing | parser rejects the extra word | translator: parse `#if <cond> then <command>` with the first word(s) as the command, ignore trailing junk like ZZT. **Fixable** |
| 4 | kingl2-kingl2, `#change sliderns fake wall`, `#change sliderew fake wall` | change sliders into fake walls (element word `fake`; `wall` is extra) | stubbed (2 lines) | element parser expects exactly two kinds | translator: accept the first valid element word and ignore the rest. **Fixable** |
| 5 | crimring-crimring, board with `:talk` object | bare `#if` (malformed in the original) | stubbed, rest of the handler runs | original program error | **Inherent** (ZZT would also fail); keep the stub |
| 6 | all worlds, boards other than the title | visual check | not measured: only title boards have reference screenshots | no references | **Inherent** to the corpus; add emulator screenshots of a few play boards to `corpus/zzt/<world>/` to measure line-wall shapes (spec gap #1: T-junctions and end stubs) and object glyphs |

## What passed (do not regress)
- Start from the saved current board (crimring 39, lostmonk 9), passages, board-edge exits (dammak north,
  pyramid south, toxic east, smiley north), `?board=N`.
- Object text: multi-line windows, single-line flashes, `$` centered lines, `!label;choice` menus that jump
  (dammak shops, kingl2 statue, lostmonk sack/controls, toxhints sub-menus and `#SEND MAIN`).
- `#give`/`#take` with fail label (innkeeper with 10 and with 1 gem), `#set` + `#if flag` (pyramid idol,
  dammak broadsword, toxic shovel), `#zap touch` then the second `:touch` (kingl2 statue), `#die`, `#put w blue
  key`, `#char`, `#send other:label`, `#send all:label` chains with idle timing (crimring credits: design ->
  goaway -> appear -> door:die), `#send` chains between objects (toxic FIZZ1 -> AMMO1 -> FIZZ1:DO),
  `#bind` copies, scrolls (read once then removed), item pickups (ammo +5, torch +1, gem +1 gem/+1 health/+10
  score, keys).

## Maintainability notes
- Every statement group keeps the original ZZT-OOP as `//` comments (comment lines >= source lines in all 8
  `scripts.js`). Identical programs are shared (e.g. pyramid: 772 scripted objects -> 169 programs).
- Largest generated function: lostmonk `Clock` `on_start` (964 lines, `scripts.js:14603`), a faithful unrolled
  countdown (`/i/i/i`, `#play a1`, `1:59`, `1:58` ... one block per second in the original). Others stay under 190 lines.
- Only 4 stubbed lines in 15,890; but the unsupported *elements* (#1) are invisible in `stats.json`. Add a
  per-world count of cells whose element the engine does not simulate to `stats.json`/`MIGRATION.md`.
