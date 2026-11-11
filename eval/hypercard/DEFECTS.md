# HyperCard defects (Verifier, iteration 2, final)

Measured on 2026-11-11, everything re-run fresh, one headless Chrome at a time: `python eval/visual.py hypercard`,
`node eval/behave.mjs hypercard <stack>` per stack (main set, `eval/hypercard/behave/`), `node eval/behave.mjs
hypercard <stack> --holdout` (hold-out set `eval/hypercard/scenarios_holdout.json`, results in
`eval/hypercard/behave_holdout/`), `python recovered/hypercard/test_reader.py`, `check_pictures.py`, `python eval/summarize.py`.
The iteration-1 version of this file and its raw results are kept in `eval/hypercard/iter1/`.

Headline: visual ink_f1 mean **0.9857** (iter 1: 0.9851), behavioral **58/58** (iter 1: 52/58), hold-out
**21/22**, smoke **10/10** (iter 1: 9/10), 2496/2513 lines translated, 17 stubbed (iter 1: 2440 / 73).
Reader tests 10/10, start-card pictures 99.95-100.00% (unchanged).

## New defects (found in iteration 2)

| # | sample / screen | expected (from the original script) | actual | likely cause | fix in |
|---|---|---|---|---|---|
| N1 | patients-v15, PATIENT LIST card, `UPDATE` (hold-out scenario fails) | `GET THE ID OF THIS CARD` -> `card id 50843`; after looping over the patient cards, `GO TO IDEAR` returns to the PATIENT LIST card and fills `PATIENTS` with `AAASON,EVADA`, `TIME` and `DATE1` | stays on the patient card (card-41341); then `PUT NAMEVAR INTO CD FLD "PATIENTS"` raises `No such card field "PATIENTS"` and TIME/DATE1 are never written | `getProp` for a card/bg returns the bare number for `id` (`engine.js`, `if (prop === 'id') return Number(...)`); `go to 50843` is then read as card **number** 50843, which does not exist, and `go` fails silently | engine: `the id of card/bkgnd` must return `card id N` / `bkgnd id N` (`the short id` stays the bare number); optionally set `the result` to `No such card.` when `go` finds nothing. **Fixable**, small |
| N2 | patients-v15, several handlers | `do <built string>` (6 lines) and `set the script of ...` (6 lines) run generated HyperTalk at runtime | stubbed (13 lines in total with `choose button tool`) | no runtime HyperTalk interpreter: the translator works ahead of time | engine: a small interpreter for one-line `do` strings (most are `go`/`put` commands); `set script` is **inherent** unless an interpreter is added. Low impact |
| N3 | hypercard_hyper-wordle, Stats card graph buttons | `updateTotals`, `doDragBtn`, `showInfo` | undefined handlers (3 stubs) | the scripts themselves say `-- Requires handler: updateTotals`: they come from a graphing library stack that is not in the corpus | **Inherent** |

## Iteration-1 defects: status

| # | iteration-1 defect | status | evidence (run on 2026-11-11) |
|---|---|---|---|
| 1 | Game Genie `bin2dec`/`bin` missing | **Fixed** | shim `modern/hypercard/shims/genie_des_jeux.js`; all 6 main scenarios pass (decode 6/8, encode 6) and both hold-outs pass (encode with compare -> `to num 8` gives `SXSOPPYE`; compare 300 rejected) |
| 2 | `put into word N` pads a space (FLC words `x o l`) | **Fixed** | "New makes a word" and "Batch generates..." pass (`^[a-z...]+$`, no spaces) |
| 3 | unassigned local evaluates to `""` (Wordle Stats error) | **Fixed** | smoke 10/10 with 0 script errors; Stats button no longer errors |
| 4 | `doMenu "New card"` / `"Delete card"` | **Fixed** | "PATIENT INFORMATION makes a new patient card" passes (9 cards, empty Name) |
| 5 | Patients XCMDs `PopMenu`/`piece`/`sortLines`/`mouseToLine` | **Fixed (translation)** | shims in `modern/hypercard/shims/xcmds.js`; no undefined handlers left in Patients. The pop-up itself is not exercised by a scenario |
| 6 | Patients `create menu` / menuMsgs | **Fixed (translation)** | no menu stubs left (34 -> 13 stubbed lines, the rest is N2); menu behaviour not exercised by a scenario |
| 7 | Wordle Chicago 24 should be Chicago 12 scaled 2x | **Partly fixed** | ink_f1 0.9340 -> 0.9407 (recall 0.906 -> 0.914); still the lowest visual score |
| 8 | Patients Helvetica 18 header offset | **Open** | ink_f1 unchanged at 0.9842 |
| 9 | `snd` resources not decoded | **Fixed for sounds in the stack (not verified by ear)** | `output/hypercard/*/app/sounds/` now exists; Cthulhu's sounds remain **inherent** (smoke reports `sound "DkCasMus" is not in this stack`) |
| 10 | Wordle graph paint tools | **Fixed (translation)** | no paint stubs left; drawing not checked visually |
| 11 | missing HyperCard application icons | **Inherent** | unchanged |
| 12 | FLC export / print | **Fixed (translation)** | FLC 431/0 lines stubbed (was 9 stubs) |
| 13 | Patients `install` (Home stack) | **Inherent** | still stubbed (`choose button tool`, `go to stack`) |

## Scenario sets
- Main set `eval/hypercard/scenarios.json`: unchanged in iteration 2 (58 scenarios, none retired).
- Hold-out set `eval/hypercard/scenarios_holdout.json` (22 scenarios, at least 1 per stack, written by the
  Verifier from the original scripts and not shown to the Modernizer). Covers branches the main set skips:
  Cthulhu `1st Card` with the `soundoff` global, Fishing card order including the `go next` wrap to card 1,
  Game Genie `to num 8` and the compare-range check, FLC `yesBatch` / `sortLex descending` / Pronunciation tab,
  Wordle wrong-place/absent tile styles and the six-guess loss (`weLost`, answer, `newGame`, losses on the stats
  card), Inigo's longest branch, Oblique's card-2 special cases and plain `go previous`, What is HyperCard's
  disabled Previous on arrow keys and the stack's own "Home" card, Mark Twain's `previous card in this
  background` wrap (363, not 366), `hypertext` click-a-word find, `lastfound` default and `copyQuote`,
  Patients `UPDATE`, `show cc` (commented-out `EXIT MOUSEUP`) and `RETURN`. Only N1 fails.

## What passed (do not regress)
Everything listed in iteration 1, plus the fixes above. No JavaScript errors in any main scenario or smoke run.
