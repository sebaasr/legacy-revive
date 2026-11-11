# HyperCard defects (Verifier, iteration 1)

Measured on 2026-11-10 with `eval/visual.py`, `eval/behave.mjs` (scenarios in `eval/hypercard/scenarios.json`,
raw results in `eval/hypercard/behave/`) and `eval/summarize.py`. Ordered by impact on what a user can do.
**Fix in** says where the change belongs: `translator` = `modern/hypercard/translator.py`,
`engine` = `modern/hypercard/engine.js`, `runtime` = `modern/runtime/`. *Inherent* = the data is not in the stack.

Headline: visual ink_f1 mean **0.985** (10/10 with reference), behavioral **52/58** scenarios, smoke **9/10**,
2440/2513 HyperTalk lines translated (73 stubbed).

| # | sample / screen | expected (from the original script) | actual | likely cause | fix in |
|---|---|---|---|---|---|
| 1 | game-genie-encoder-decoder, card 1, `decode`/`encode` | `SXIOPO` decodes to addr 4569, value 173; saved code `ZKELOLUP` decodes to 15233/66/147 (the values stored in the stack); encode 4569/173 gives `SXIOPO` (hand simulation: `eval/hypercard/gamegenie_sim.py`) | addr/dat/com stay empty; encode writes `AAAAAA` (3 of 6 scenarios fail, silently: only an `[unsupported]` warning) | `bin2dec` and `bin` live in the library stack `"genie des jeux"` (`start using`), which is not in the corpus | translator/engine: ship a small library shim for well-known missing functions: `bin2dec(s)` = binary string to decimal, `bin(n)` = 16-char binary string (16 bits reproduce all stored values). **Fixable** (the app is useless without it) |
| 2 | hypercard_fantasylanguagecreat1, Trade card, `New` / `Batch` | `put x into word N of fld` past the end appends with no delimiter, so a word is built as `xol` (HyperCard pads only lines and items) | Word field gets `x o l`; every Batch line has spaces (`m i n`, `r a sch`) | `chunkPut` pads a space for a missing `word` chunk (`engine.js` ~line 125: `else if (r.type === 'word' ...) pad = ' '`) | engine: no padding for `word` (and `char`) chunks. **Fixable** |
| 3 | hypercard_hyper-wordle, Stats card (`openCard` -> `drawChart`) | `if bg field data is not empty`: `data` is unassigned at that point, so HyperTalk uses the literal name and finds bg field "data"; then `doStats` fills "win percent" | Script error `No such background field ""`; `openCard` aborts, so `doStats` never runs (smoke test fails on the Stats button) | translator declares `data` as a JS local initialised to `""` (`scripts.js:1635`, `H.part($, "bg", "field", data)`) | translator: a local that is read before any assignment must evaluate to its own name (initialise `let data = "data"`, or use an `H.lit(name)` fallback). **Fixable**; likely hits other stacks that use unquoted names |
| 4 | patients-v15, Title -> `PATIENT INFORMATION` (and bg `New Patient`) | `send "doMenu New card" to HyperCard` creates an empty patient card after the current one (9 cards, empty Name) | Still 8 cards, still on EVADA AAASON's card; `doMenu "New card"` hits `rt.unsupported` | `menuCommand` has no `new card` / `delete card` (Patients' closeCard also uses `DOMENU DELETE CARD`) | engine: implement `new card` (same background, empty card-layer text, insert after current, go to it) and `delete card`. **Fixable** |
| 5 | patients-v15, patient card, `MEDICATION LIST` / `PROBLEM LIST` (mouseDown) | pop-up menu of medicines/problems; choice is appended to the field | nothing happens (`PopMenu`, `piece`, `sortLines`, `mouseToLine` undefined, reported as `[unsupported] handler`) | XCMDs/XFCNs that were in the stack's resource fork or another stack | engine/translator: shims. `piece(list, delim, n)` and `sortLines(text)` are trivial; `PopMenu(loc, items)` can be a DOM pop-up returning the item number; `mouseToLine()` = line under the click. **Fixable** |
| 6 | patients-v15, every card, `Procedure` menu | `create menu "Procedure"`, `put ... into menu ... with menuMsgs "LOWER,EGD"` adds a menu whose items run `LOWER`/`EGD` | 34 stubbed lines; `if there is not a menu "PROCEDURE"` is stubbed as a whole `if` | menus not modelled | engine: a minimal menu bar above the card (create/delete/enable/disable menu, menuMsgs) and `there is a menu`. **Fixable**, medium effort |
| 7 | hypercard_hyper-wordle, game card title (field "title", Chicago 24) | reference shows Chicago 12 scaled 2x (the Mac font manager scaled the bitmap when no 24-pt size was installed) | browser substitute font: wider "Hyper", different "WORDLE"; lowest visual score (ink_f1 0.934, recall 0.906) | the renderer has only the 12-pt Chicago bitmap | runtime (`render-pixels.js`): when a bitmap font size is missing, integer-scale the nearest smaller size, as the Mac did. **Fixable** |
| 8 | patients-v15, Title card header (field "NAME", Helvetica 18 bold) | text aligned with the reference | text shifted horizontally (red/blue doubling in `eval/hypercard/patients-v15/side.png`) | metric mismatch of the Helvetica substitute | runtime: metric-compatible font (Arial/Liberation Sans metrics) or bitmap Helvetica. **Fixable**, low impact |
| 9 | fishing-animation, last step (`play "MJW"`) | plays the stack's own `snd` resource MJW | 150 ms placeholder blip | `snd ` resources are not decoded (SPEC 6) | reader/translator + engine: decode format 1/2 sampled `snd ` to a WAV data URL. **Fixable** for sounds present in the stack; all 33 Cthulhu sounds are **inherent** (not in the stack) |
| 10 | hypercard_hyper-wordle, Stats card graph | `graph` draws the bar chart with paint tools (`choose line tool`, `drag`, `type`) | nothing drawn (14 paint stubs) | paint tools not modelled | engine: paint layer on a canvas for line/rectangle/text tools. **Fixable**, medium effort; only after #3 |
| 11 | cthulhucard (18), patients-v15 (9), hypercard_hyper-wordle (4), hypercard_obliquestrategies (3), hypercard_inigo_gets_out (1) | button icons drawn | icon area blank (buttons still work); visible as the missing icons in every side.png | icons are HyperCard application resources, not in the stack | **Inherent**. Optional: outline placeholder so users can see the button |
| 12 | hypercard_fantasylanguagecreat1, `Sort/Export`, `Print` | export lexicon to a file; print | `open file`/`write`/`print` stubbed (9 lines) | no file system | engine: `write ... to file` -> download a .txt; `print` -> `window.print()` of the field. **Fixable**, low priority |
| 13 | patients-v15, `install` button | copies a button into the Home stack (`go to stack "home"`, `choose button tool`, `type "C" with commandKey`) | stubs | other stacks and tools are not available | **Inherent** (no Home stack); nothing to fix beyond the existing stub message |

## What passed (do not regress)
- Navigation everywhere (go card/id/name/next/prev/first/last, `go to any card in background`, `push`/`pop`,
  arrowKey handlers, `click at the loc of`), visual-effect sequences with `wait` (Fishing ends on "edn" then "as";
  Inigo's multi-go handlers), answer/ask dialogs with button results (Oblique, FLC, Mark Twain x3 chained dialogs),
  `find` with `the result` (Mark Twain), `the clickChunk` on locked fields (Game Genie letters, Cthulhu list),
  hilite/enabled/visible properties (What is HyperCard), the whole Wordle game logic (typing, delete, scoring, win,
  stats on another card), random card ranges (Oblique), openStack chains (Patients, Oblique).
- No JavaScript errors in any scenario; only #3 raises a HyperTalk error.

## Maintainability notes
- Every generated handler keeps each original HyperTalk line as a `//` comment above its translation
  (checked: comment lines >= statement lines in all 10 `scripts.js`).
- Largest generated functions: Patients `mouseUp` of "CHANGE NAME" (240 lines, `scripts.js:2134`), FLC `IniCon`
  (139), Wordle `handleEnterKey` (127). They mirror the original handlers; no generated helper is oversized.
- Silent failure mode: a call to an undefined handler/function (#1, #5) only logs `console.warn` and returns empty.
  A developer will not notice; consider `rt.flash` once per missing function in non-shot mode.
