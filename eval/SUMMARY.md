# Legacy Revive: verification summary (final, iteration 2, 2026-11-11)

Everything was re-run fresh for this report, one headless Chrome and one app at a time: `python eval/visual.py hypercard|zzt`, then `node eval/behave.mjs <target> <sample>` and `node eval/behave.mjs <target> <sample> --holdout` for each sample, then the spec checks (`recovered/hypercard/test_reader.py`, `check_pictures.py`, `recovered/zzt/test_reader.py`), then `python eval/summarize.py`. Detail: `eval/<target>/results.json`. Defects: `eval/<target>/DEFECTS.md`. Iteration-1 files: `eval/SUMMARY-iter1.md`, `eval/<target>/iter1/`.

Columns: visual = `eval/compare.py` on the start screen (HyperCard ink_f1, ZZT color_match). behavioral = main scenarios (`scenarios.json`, derived from the original scripts) that pass. hold-out = Verifier-only scenarios (`scenarios_holdout.json`), written in iteration 2 from the original scripts and never shown to the Modernizer. smoke = click every visible start button (HyperCard) / press P, walk 4 directions, shoot (ZZT) with no errors. stub = original lines left untranslated.

## HyperCard (10 stacks)
| sample | visual it1 | visual it2 | behavioral it1 | behavioral it2 | hold-out | smoke it1 / it2 | lines tr. / stub it1 | it2 |
|---|---|---|---|---|---|---|---|---|
| cthulhucard | 0.9841 | 0.9841 | 6/6 | 6/6 | 2/2 | pass / pass | 89 / 0 | 89 / 0 |
| fishing-animation | 0.9936 | 0.9936 | 3/3 | 3/3 | 1/1 | pass / pass | 26 / 0 | 26 / 0 |
| game-genie-encoder-decoder | 0.9963 | 0.9963 | **3/6** | 6/6 | 2/2 | pass / pass | 145 / 2 | 147 / 0 |
| hypercard_fantasylanguagecreat1 | 0.9979 | 0.9979 | **5/7** | 7/7 | 3/3 | pass / pass | 422 / 9 | 431 / 0 |
| hypercard_hyper-wordle | **0.9340** | 0.9407 | 7/7 | 7/7 | 2/2 | **FAIL** / pass | 648 / 27 | 672 / 3 |
| hypercard_inigo_gets_out | 0.9996 | 0.9996 | 5/5 | 5/5 | 1/1 | pass / pass | 43 / 0 | 43 / 0 |
| hypercard_obliquestrategies | 0.9756 | 0.9756 | 5/5 | 5/5 | 2/2 | pass / pass | 29 / 0 | 29 / 0 |
| hypercard_what_is_hypercard_2 | 0.9955 | 0.9955 | 5/5 | 5/5 | 2/2 | pass / pass | 56 / 1 | 56 / 1 |
| mark-twain---300-quotations | 0.9899 | 0.9899 | 6/6 | 6/6 | 4/4 | pass / pass | 97 / 0 | 97 / 0 |
| patients-v15 | 0.9842 | 0.9842 | **7/8** | 8/8 | **2/3** | pass / pass | 885 / 34 | 906 / 13 |
| **total** | **0.9851** | **0.9857** | **52/58 (89.7%)** | **58/58 (100%)** | **21/22 (95.5%)** | 9/10 / **10/10** | 2440 / 73 (97.1%) | **2496 / 17 (99.3%)** |

Spec accuracy (unchanged): reader tests 10/10 PASS; start-card pictures 99.95-100.00% (worst Inigo, 71 px); GAPS.md 17 gaps. No main scenario was retired or changed for HyperCard.

## ZZT (8 worlds)
| sample | color_match | behavioral it1 | behavioral it2 | retired | hold-out | smoke it1 / it2 | lines tr. / stub it1 | it2 |
|---|---|---|---|---|---|---|---|---|
| crimring-crimring | 1.0000 | 4/4 | 4/4 | 0 | 2/2 | pass / pass | 2968 / 1 | 2968 / 1 |
| dammak-dammak | 1.0000 | 6/6 | 8/8 (+2) | 0 | 2/2 | pass / pass | 671 / 1 | 672 / 0 |
| kingl2-kingl2 | 0.9993 | 6/6 | 10/10 (+4) | 0 | 2/2 | pass / pass | 342 / 2 | 344 / 0 |
| lostmonk-lostmonk | 0.9998 | 5/5 | 5/5 | 0 | 2/2 | pass / pass | 4114 / 0 | 4114 / 0 |
| pyramid-pyramid | 1.0000 | 6/6 | 11/11 (+5) | 0 | 2/2 | pass / pass | 1170 / 0 | 1170 / 0 |
| zzttoxic-smiley | n/a | 5/5 | 5/5 | 0 | 2/2 | pass / pass | 2241 / 0 | 2241 / 0 |
| zzttoxic-toxhints | n/a | **3/4** | 4/4 (+3) | 3 | **1/2** | pass / pass | 363 / 0 | 363 / 0 |
| zzttoxic-toxic | 1.0000 | 7/7 | 8/8 (+1) | 0 | 2/2 | pass / pass | 4017 / 0 | 4017 / 0 |
| **total** | **0.9999** (6 refs, upper bound) | **42/43 (97.7%)** | **55/55 (100%)** | **3** | **15/16 (93.8%)** | 8/8 / 8/8 | 15886 / 4 | **15889 / 1** |

Iteration-1 ZZT on today's rules (3 retired scenarios removed): 39/40. Visual scores did not change in any world. Spec accuracy (unchanged): reader tests 8/8; GAPS.md 14 gaps, 1 where the spec was wrong.

**Retired scenarios (3, Toxhints 2-4).** The Modernizer said they encoded the iteration-1 bug, and the IR confirms it: the `:TOUCH` text of `HINTS & SOLUTIONS` runs into `:MAIN` with no `#END`, so the intro and the menu form one window, and dismissing that window before choosing `Part 1` was only possible with the bug. They are kept with `"retired": true` and a reason; `behave.mjs` skips them and `summarize.py` counts them. **The 15 scenarios added in iteration 2** all test real behaviour, and none of them passed on the iteration-1 engine. Three are weaker than their names: the tiger test also accepts contact damage, the lion test does not check the exact -10, and the conveyor test only checks that the gem moved (details in `eval/zzt/DEFECTS.md`).

## Overall
| | iteration 1 | iteration 2 |
|---|---|---|
| apps (with reference) | 18 (16) | 18 (16) |
| mean visual | HC 0.9851 ink_f1 / ZZT 0.9999 color_match | HC 0.9857 / ZZT 0.9999 |
| behavioral (main set) | 94/101 (93.1%) | **113/113 (100%)**, 3 retired |
| hold-out (new, Verifier-only) | - | **36/38 (94.7%)**: HC 21/22, ZZT 15/16 |
| smoke | 17/18 | **18/18** |
| JS / script errors in main runs | 1 | 0 |
| lines translated | 18326/18403 (99.6%) | **18385/18403 (99.90%)**, 18 stubbed |
| reader tests | 18/18 | 18/18 |
| spec gaps | 31 | 31 (unchanged) |

The main set reaching 100% partly reflects 15 scenarios the Modernizer wrote next to its own fixes. The hold-out score (94.7%) is the more independent measure, and it found 2 new defects.

## Remaining defects
Fixable:
1. **HyperCard engine, `the id of this card`** returns `50843` instead of `card id 50843`, so `GO TO IDEAR` fails without an error. Patients' PATIENT LIST `UPDATE` stays on the patient card and then hits a script error (hold-out fail). Small fix in `getProp`.
2. **ZZT engine, message flush on `#SEND <own label>`.** Text written before a self-jump is shown alone, but ZZT would continue the same window into the target label's text and menu. Toxhints has 75 such `#SEND PARTn` lines (hold-out fail). This is the same family as iteration-1 defect 2; only plain fall-through was fixed. Medium confidence on the exact ZZT rule for jumps.
3. Wordle title font is still off: ink_f1 0.9407, the lowest visual score. Patients' Helvetica header offset is unchanged (0.9842).
4. Patients: 12 lines of `do <built string>` / `set script` are still stubbed; they need a runtime HyperTalk interpreter.
5. Not yet covered by any scenario: ZZT duplicators, pushers, blink walls and spinning guns (implemented according to the engine header), the Patients pop-up menus and menu bar, and the Wordle graph drawing. They are translated, but nobody has checked how they behave.

Inherent (data not in the corpus or the original is broken): the missing HyperCard application icons (35) and Cthulhu's external sounds; Wordle's `updateTotals`/`doDragBtn`/`showInfo` from an absent graph library; Patients `install` (needs the Home stack); Crimring's malformed bare `#if`; ZZT has reference screenshots only for title boards, so its visual score is an upper bound (glyphs were harvested from the same references).
