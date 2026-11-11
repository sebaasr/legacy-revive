"""ZZT post-build step: element coverage in stats.json and the engine notes in MIGRATION.md.

    python modern/build.py zzt all && python modern/zzt/postbuild.py all

`modern/build.py` (shared with the HyperCard target) writes a generic MIGRATION.md; this step replaces its
"Known limitations" section with the current engine's notes (which behaviours are reconstructions) and
adds per-world element coverage, so the numbers stay next to the code that defines them. Folding this
into `build_zzt()` is a one-line call (`postbuild.finish(world)`).
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# element -> (name, status). "static": nothing to simulate (floor, walls, text). "reconstructed": the
# behaviour follows ZZT's documented design (the files only store parameters). "partial": see notes.
ELEMENTS = {
    0: ("empty", "static"), 4: ("player", "reconstructed"), 5: ("ammo", "reconstructed"),
    6: ("torch", "reconstructed"), 7: ("gem", "reconstructed"), 8: ("key", "reconstructed"),
    9: ("door", "reconstructed"), 10: ("scroll", "reconstructed"), 11: ("passage", "reconstructed"),
    12: ("duplicator", "reconstructed"), 13: ("bomb", "reconstructed"), 14: ("energizer", "reconstructed"),
    15: ("star", "reconstructed"), 16: ("conveyor cw", "reconstructed"), 17: ("conveyor ccw", "reconstructed"),
    18: ("bullet", "reconstructed"), 19: ("water", "reconstructed"), 20: ("forest", "reconstructed"),
    21: ("solid", "static"), 22: ("normal", "static"), 23: ("breakable", "reconstructed"),
    24: ("boulder", "reconstructed"), 25: ("slider ns", "reconstructed"), 26: ("slider ew", "reconstructed"),
    27: ("fake", "reconstructed"), 28: ("invisible", "reconstructed"), 29: ("blink wall", "reconstructed"),
    30: ("transporter", "partial"), 31: ("line", "static"), 32: ("ricochet", "reconstructed"),
    33: ("blink ray", "reconstructed"), 34: ("bear", "reconstructed"), 35: ("ruffian", "reconstructed"),
    36: ("object", "scripted"), 37: ("slime", "reconstructed"), 38: ("shark", "reconstructed"),
    39: ("spinning gun", "reconstructed"), 40: ("pusher", "reconstructed"), 41: ("lion", "reconstructed"),
    42: ("tiger", "reconstructed"), 43: ("blink ray", "reconstructed"), 44: ("centipede head", "partial"),
    45: ("centipede segment", "partial"),
}
for _n in range(47, 54):
    ELEMENTS[_n] = ("text", "static")

NOTES = """## Engine behaviour (built-in elements)

Everything below comes from ZZT's *design* (how the game is documented to play), not from the world files:
the files only store each record's `cycle`, `step`, `p1`, `p2`, `p3` (SPEC 2.6, 3.1, 7). These behaviours
are therefore **reconstructions**; the parameter meanings are the engine's assumptions. Code:
`ZztEngine._act*` in `engine.js` (one method per element, run every `cycle` ticks, ~9.5 ticks/s).

| element | behaviour (reconstructed) | parameters used |
|---|---|---|
| lion | random step, or toward the player with chance p1/10; attacking costs the player 10 health and kills the lion | p1 intelligence |
| tiger | moves like a lion; shoots along its column/row when the player is within 2 cells | p1, p2 firing rate (bit 7 = stars) |
| bear | waits until the player is within 8 - p1 rows/columns, then closes in; breaks breakable walls (and itself) | p1 sensitivity |
| ruffian | darts in a direction (toward the player when lined up), then rests | p1 intelligence, p2 resting time |
| slime | every p2 updates spreads into free neighbours, leaving breakable wall; touching it turns it into wall | p2 speed |
| shark | moves only through water | p1 |
| spinning gun | rotates; shoots at the player when within 2 rows/columns, else at random | p1, p2 (bit 7 = stars) |
| centipede | head moves on (p2 = chance of random turns, p1 = turns toward the player when lined up), turns or reverses when blocked; segments follow; a segment without a leader becomes a head | p1, p2; follower/leader links are rebuilt from adjacency (the saved links are -1) |
| pusher | moves along `step`, pushing boulders, sliders, items, bombs, creatures and the player | step |
| bullets, stars | fly every tick over floor/fake/water; break breakable walls; kill creatures (score lion 1, tiger 2, bear 1, ruffian 2, head 1, segment 3); send `:shot` to objects (player bullets); hurt the player 10; ricochets bounce them back; stars home in on the player for 100 moves | |
| bomb | touch lights it (p1 = 9), counts down, explodes in an 8x5 ellipse: breakable walls and creatures go, objects get `:bombed`, player -10 | p1 countdown |
| transporter | the player entering in its `step` direction lands past it, or past the next transporter facing back | step |
| conveyor cw/ccw | the 8 neighbours turn one place; movable things shift into gaps | |
| duplicator | animates through 5 phases, then copies the thing on its `step` side (with its program, for objects) to the other side | p1 phase, p2 rate, step |
| blink wall | after p1, alternately fires a ray of wall along `step` (pushes the player aside or hurts) and erases it every p2*2+1 updates | p1 start, p2 period, step |
| energizer | 75 ticks of invincibility; creatures flee (`seek` reversed) and die on contact for score; sends `all:energize` | |
| torch / dark boards | `T` lights a torch (200 ticks): cells within the 8x5 ellipse around the player are visible; elsewhere `░`; passages, torches and the player stay visible | board `dark` flag |
| time limit | the sidebar `Time` counts down each second; at 0 the player loses 10 health and the clock restarts | board `time_limit` |
| health | at 0 the game is over; on boards with property byte 6 set ("re-enter when zapped", probable) the player returns to where they entered after each hit | |
| board entry | built-in elements wait for the first key press after entering a board (scripted objects do not wait) | |
| labels | `#send check` also reaches `:check2` (a label matches a longer one when the next character is not a letter or `_`) | |
| text | text lines collect into one message until the program stops (`#end`, a move, `/i`, `#die`, a jump or its end), so a `:label` inside a text block does not split the window | |

### Known limitations
- Transporters move only the player (objects and creatures walking into them are blocked).
- Centipede chain linking is rebuilt from adjacency at the first update, so tangled chains may link differently.
- Conveyors and pushers move the documented pushable kinds only (boulder, sliders on their axis, ammo, torch,
  gem, key, energizer, bomb, bear, ruffian, lion, tiger, player); objects are never carried.
- Monitor, board-edge, messenger and the unused element numbers have no behaviour (none occur in the corpus).
- A text message is shown when the object jumps with `#send` to itself; ZZT may keep collecting lines across
  that jump too (scenario 3 of Toxhints relies on the current choice).
- `/dir` waits up to ~50 updates for a blocked path, then gives up (ZZT presumably waits forever).
- A saved `ip` in the middle of a program restarts at the beginning of the enclosing label section.
- `#play` is an approximation (square wave; durations, octaves, sharps/flats, percussion digits as blips).
  Sound starts after the first key press (browser autoplay rules). `S` toggles it.
- The player glyph is hidden on the title board (5 of 6 reference screenshots show it blank).
- Saving/loading games is not implemented.

"""


def coverage(world: str) -> dict:
    ir_dir = ROOT / "output" / "zzt" / world / "ir"
    ir = json.loads((ir_dir / "ir.json").read_text(encoding="utf-8"))
    cells = Counter()
    for s in ir["screens"]:
        g = json.loads((ir_dir / s["grid"]["cells"]).read_text(encoding="utf-8"))
        cells.update(c[3] for c in g["cells"])
    by_status = Counter()
    unknown = {}
    for el, n in cells.items():
        name, status = ELEMENTS.get(el, (f"element {el}", "not simulated"))
        by_status[status] += n
        if status in ("partial", "not simulated"):
            unknown[f"{el} {name}"] = n
    return {"cells_by_status": dict(by_status), "partial_or_unsimulated_cells": unknown}


def finish(world: str):
    app = ROOT / "output" / "zzt" / world / "app"
    st_file = app / "stats.json"
    st = json.loads(st_file.read_text(encoding="utf-8"))
    st["elements"] = coverage(world)
    st_file.write_text(json.dumps(st, indent=2, ensure_ascii=False), encoding="utf-8")
    md_file = app / "MIGRATION.md"
    md = md_file.read_text(encoding="utf-8")
    cov = st["elements"]
    rows = "\n".join(f"| {k} | {v} |" for k, v in sorted(cov["cells_by_status"].items()))
    part = ", ".join(f"{k} ({v})" for k, v in cov["partial_or_unsimulated_cells"].items()) or "none"
    block = NOTES + f"""### Element coverage ({world}, all boards)

| cells whose element is | count |
|---|---|
{rows}

Partial or not simulated: {part}.

"""
    md = re.sub(r"## Known limitations \(engine simplifications\).*?(?=## How to add a feature)", lambda m: block, md, flags=re.S)
    md = md.replace("- **Creature AI**: in `ZztEngine.tick()`, entities without a program are skipped; give elements with\n"
                    "  `enemy: true` an update function (e.g. move toward `this.player` with `_moveEntity`) there.",
                    "- **New element behaviour**: add `ACT[element] = '_actName'` and a `_actName(b, o)` method in\n"
                    "  `engine.js` (it runs every `o.cycle` ticks; use `_moveEntity`, `_creatureStep`, `_shootFrom`,\n"
                    "  `_pushChain`), and a row in `modern/zzt/postbuild.py` `ELEMENTS`.")
    md = md.replace("Engine-triggered labels: `touch` (player bumps the object), `shot` (player bullet hits it),\n`thud` (its movement is blocked).",
                    "Engine-triggered labels: `touch` (player bumps the object), `shot` (player bullet hits it),\n`thud` (its movement is blocked), `bombed` (explosion), `energize` (sent to all on an energizer).")
    md_file.write_text(md, encoding="utf-8")
    return cov


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    worlds = sorted(p.name for p in (ROOT / "output/zzt").iterdir() if (p / "app/stats.json").exists()) if arg == "all" else [arg]
    for w in worlds:
        c = finish(w)
        print(f"{w}: {c['cells_by_status']} partial/unsimulated {c['partial_or_unsimulated_cells']}")
