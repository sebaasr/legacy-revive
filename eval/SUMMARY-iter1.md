# Legacy Revive: verification summary (iteration 1, 2026-11-10)

Reproduce (one headless Chrome at a time): `python eval/visual.py hypercard|zzt` -> `node eval/behave.mjs hypercard|zzt [sample]` -> `python eval/summarize.py`.
Detail: `eval/<target>/results.json`; defects: `eval/<target>/DEFECTS.md`; side-by-side images (reference | app | diff): `eval/<target>/<sample>/side.png`.

Columns: visual = `eval/compare.py` on the start screen (HyperCard ink_f1; ZZT color_match); behavioral = scenarios derived from the original scripts that pass; smoke = click every visible start button (HyperCard) / press P, walk 4 directions, shoot (ZZT) with no JS/script errors; lines = original lines translated / stubbed; largest fn = longest generated handler (lines).

## HyperCard (10 stacks)
| sample | visual ink_f1 | behavioral | smoke | errors | lines tr. / stub | handlers | largest fn |
|---|---|---|---|---|---|---|---|
| cthulhucard | 0.9841 | 6/6 | pass | 0 | 89 / 0 | 43 | 21 |
| fishing-animation | 0.9936 | 3/3 | pass | 0 | 26 / 0 | 2 | 47 |
| game-genie-encoder-decoder | 0.9963 | **3/6** | pass | 0 | 145 / 2 | 11 | 69 |
| hypercard_fantasylanguagecreat1 (offset 48,51) | 0.9979 | **5/7** | pass | 0 | 422 / 9 | 34 | 139 |
| hypercard_hyper-wordle | **0.9340** | 7/7 | **FAIL** | 1 | 648 / 27 | 128 | 127 |
| hypercard_inigo_gets_out | 0.9996 | 5/5 | pass | 0 | 43 / 0 | 26 | 16 |
| hypercard_obliquestrategies | 0.9756 (0.9996 without menu bar) | 5/5 | pass | 0 | 29 / 0 | 7 | 14 |
| hypercard_what_is_hypercard_2 (offset 16,40) | 0.9955 | 5/5 | pass | 0 | 56 / 1 | 30 | 19 |
| mark-twain---300-quotations (offset 144,40) | 0.9899 | 6/6 | pass | 0 | 97 / 0 | 13 | 43 |
| patients-v15 | 0.9842 | **7/8** | pass | 0 | 885 / 34 | 94 | 240 |
| **total** | **mean 0.9851** | **52/58 (89.7%)** | **9/10** | 1 | **2440 / 73 (97.1%)** | 388 | |

Spec accuracy: test_reader.py 10/10 PASS; check_pictures.py start-card pictures 99.95-100.00% (worst Inigo, 71 px); GAPS.md 17 gaps (all ambiguities/silences).

## ZZT (8 worlds)
| sample | color_match | ink_f1 | behavioral | smoke | errors | lines tr. / stub | handlers | largest fn |
|---|---|---|---|---|---|---|---|---|
| crimring-crimring | 1.0000 | 1.0000 | 4/4 | pass | 0 | 2968 / 1 | 925 | 111 |
| dammak-dammak | 1.0000 | 1.0000 | 6/6 | pass | 0 | 671 / 1 | 146 | 57 |
| kingl2-kingl2 | 0.9993 | 1.0000 | 6/6 | pass | 0 | 342 / 2 | 110 | 77 |
| lostmonk-lostmonk | 0.9998 | 1.0000 | 5/5 | pass | 0 | 4114 / 0 | 1085 | 964 |
| pyramid-pyramid | 1.0000 | 1.0000 | 6/6 | pass | 0 | 1170 / 0 | 333 | 185 |
| zzttoxic-smiley | n/a | n/a | 5/5 | pass | 0 | 2241 / 0 | 518 | 66 |
| zzttoxic-toxhints | n/a | n/a | **3/4** | pass | 0 | 363 / 0 | 95 | 39 |
| zzttoxic-toxic | 1.0000 | 1.0000 | 7/7 | pass | 0 | 4017 / 0 | 1105 | 157 |
| **total** | **mean 0.9999** (6 refs) | 1.0000 | **42/43 (97.7%)** | **8/8** | 0 | **15886 / 4 (99.97%)** | 4317 | |

ZZT visual scores are an upper bound (glyphs harvested from these same references; title boards only). Spec accuracy: test_reader.py 8/8 pass; GAPS.md 14 gaps, 1 where the spec was wrong (line-wall neighbour sets 15 vs 7).

## Overall
| | HyperCard | ZZT | all |
|---|---|---|---|
| apps (with reference) | 10 (10) | 8 (6) | 18 (16) |
| mean visual | 0.985 ink_f1 | 0.9999 color_match | |
| behavioral | 52/58 | 42/43 | 94/101 (93.1%) |
| smoke | 9/10 | 8/8 | 17/18 |
| lines translated | 2440/2513 | 15886/15890 | 18326/18403 (99.6%) |
| reader tests | 10/10 | 8/8 | 18/18 |
| spec gaps | 17 | 14 (1 wrong) | 31 |

## Top defects
1. ZZT engine: no creatures/bombs/transporters/conveyors/duplicators/dark boards/time limits (35/60 Pyramid boards, 7/10 KINGL2); not covered by scenarios, so 97.7% overstates playability.
2. Game Genie: bin2dec/bin from a missing library stack, so decode/encode produce nothing; a 2-function shim fixes it.
3. Engine chunkPut pads a space for `put into word N` past the end (FLC words become "x o l").
4. Translator: unassigned locals evaluate to "" instead of their own name (Wordle Stats card script error).
5. doMenu "New card"/"Delete card" unsupported (Patients cannot add a patient).
6. ZZT: a :label inside a text block splits one message into two windows (Toxhints).
7. Visual: Wordle Chicago 24 should be Chicago 12 scaled 2x (0.934); 35 missing HyperCard application icons are inherent.
