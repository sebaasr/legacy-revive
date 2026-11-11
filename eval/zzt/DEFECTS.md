# ZZT defects (Verifier, iteration 2, final)

Measured on 2026-11-11, everything re-run fresh, one headless Chrome at a time: `python eval/visual.py zzt`,
`node eval/behave.mjs zzt <world>` per world (main set, `eval/zzt/behave/`), `node eval/behave.mjs zzt <world>
--holdout` (hold-out set `eval/zzt/scenarios_holdout.json`, results in `eval/zzt/behave_holdout/`),
`python recovered/zzt/test_reader.py`, `python eval/summarize.py`. Iteration-1 files are kept in `eval/zzt/iter1/`.

Headline: title-board color_match mean **0.9999** (6/8 with reference, upper bound as before), behavioral
**55/55** active scenarios (3 retired; iter 1: 42/43), hold-out **15/16**, smoke **8/8**, 15,889/15,890 lines
translated (1 stubbed, iter 1: 4). Reader tests 8/8.

## Scenario review (iteration 2)
- **Retired (3):** Toxhints "Part 1 opens its submenu", "A topic shows its hint text", "Return to Main Menu".
  Checked against the IR (`output/zzt/zzttoxic-toxhints/ir/ir.json`, `screens[0].objects[27]`): the `:TOUCH`
  text runs straight into `:MAIN` with no `#END` between them, and a `:label` does not end a ZZT message, so the
  intro and the Part 1/2/3 menu form ONE window (main scenario 1 asserts this). The retired scenarios dismissed
  that window before choosing `Part 1`, i.e. they encoded the iteration-1 bug. The Modernizer's claim holds.
  They stay in `scenarios.json` with `"retired": true` and a `retired_reason`; `behave.mjs` skips them and lists
  them under `retired`, `summarize.py` counts them.
- **The 15 scenarios added in iteration 2** (3 Toxhints replacements, 2 Dammak, 4 KINGL2, 5 Pyramid, 1 Toxic):
  all test real behaviour and none passes trivially (each asserts a state change that the iteration-1 engine did
  not produce). Weak spots, not failures:
  - Pyramid "Tigers shoot at the player": passes on `health < 100` too, so a tiger that walks into the player
    satisfies it without shooting. Tighten to "a non-player bullet exists".
  - KINGL2 "A lion that reaches the player costs 10 health": checks `health < 100` and fewer lions, not the 10.
  - Pyramid "Conveyor carries a gem around": only checks that the gem left its cell, not that it moved to the
    next cell around the conveyor.
  - KINGL2 Energizer, Pyramid Conveyor and the lion scenario edit the board in `setup` (place an item, set p1);
    acceptable, but they test the element behaviour, not those boards as authored.
  - Element behaviours (creatures, bombs, conveyors...) are reconstructions of ZZT's documented design (engine
    header); the scenarios check plausibility (movement, damage, countdown), not exact timing.

## New defects (found in iteration 2)

| # | sample / board | expected (from the original program) | actual | likely cause | fix in |
|---|---|---|---|---|---|
| N1 | zzttoxic-toxhints, board 0, Part 1 -> Smiley's Place -> "Can't move the dirt." (hold-out fails) | `:PLACE1` text "Look for something to help you." + `!PLACE2` choice, then `#SEND PART1` (a jump to the object's own label, no `#END`): ZZT keeps executing, so the Part 1 menu (ABOVE GROUND, Smiley's Place ... Apple Tree Lane ...) joins the SAME window | window holds only "Look for something to help you." and "Still can't get underground." | same class as iteration-1 defect 2: `_run` flushes the message whenever a segment returns (`r !== undefined`), including `GOTO` from `#send self`/`#label` jumps; iteration 2 only fixed plain fall-through | engine (`_run`): do not flush on `GOTO` to the object's own label; flush only when the object stops for the tick (`#end`, `/i`, movement, `#die`, op limit). Affects Toxhints throughout (75 `#SEND PARTn` lines, most after hint text). **Fixable**. Confidence: high for the label rule (already accepted), medium for jumps, so check one emulator screenshot if available |

Harness notes (not app defects): two objects named `BARREL` on Toxic board 1 made `entityAlive` by name read
the wrong one, and `approach` treats forest as a wall, so the hold-out scenarios use ids and clear one forest
tile explicitly.

## Iteration-1 defects: status

| # | iteration-1 defect | status | evidence (run on 2026-11-11) |
|---|---|---|---|
| 1 | no creatures/bombs/transporters/conveyors/duplicators/dark boards/time limits | **Largely fixed** | new main scenarios pass: lions move and hurt (KINGL2 board 8), tigers shoot, centipedes follow their head, conveyor moves a gem, board time limit counts down, bomb lights/explodes (Pyramid 19/18/12/28/6), transporter (Toxic 16), dark board message + torch (Dammak 14), energizer. Duplicators, pushers, blink walls and spinning guns are implemented per the engine header but **not tested** by any scenario |
| 2 | `:label` splits one message into two windows (Toxhints) | **Fixed** for fall-through | main Toxhints scenario 1 and the 3 replacements pass; the same problem remains for `#SEND <own label>` jumps (N1) |
| 3 | `#if book then check 2` stubbed (Dammak golden box) | **Fixed** | "Golden box ... reaches :check2" passes |
| 4 | `#change sliderns fake wall` stubbed (KINGL2) | **Fixed** | "Release Lever" passes (no sliders left) |
| 5 | Crimring malformed bare `#if` | **Inherent** | still the 1 stubbed line |
| 6 | no references for play boards | **Inherent** | unchanged |

## Hold-out set
`eval/zzt/scenarios_holdout.json`, 16 scenarios, 2 per world, from the original programs: Crimring Toilet
(`#zap touch` exposing a second `:touch`) and bed `#if bedtime`, Dammak weapon maker `#take`/`#set` and a
`#bind patron` copy, KINGL2 Oracle (five `#give`s then `#zap`) and a `#bind dynamite` copy, Lost Monkeys sack
item chain (ammo/torches/health/flags/score over several `/i` waits) and Eject -> No, Pyramid torch object
`#take health 1` and a `#bind Coffin` copy, Smiley `#become gem` and the two-stage BONUS, Toxhints Part 3 menu
and the `#SEND PART1` continuation (N1), Toxic barrel `:SHOT` via a real Shift+arrow shot and a `#bind BARREL`
copy. 15/16 pass.

## What passed (do not regress)
Everything listed in iteration 1, plus the fixed items above. No console errors in any scenario or smoke run.
