# 05 – Part records (buttons and fields)

Probes: `probes/hc.py` (`parse_part`), `probes/layers.py`, `probes/dump_stack.py`.
437 part records across the 10 samples (228 buttons, 209 fields); same layout in format 8 and 10.

## Layout (offsets from the start of the record) — layout confirmed 437/437
| off | type | meaning | status |
|-----|------|---------|--------|
| +0 | u16 | record size in bytes (even) | confirmed: size == even_round_up(30 + len(name)+1 + 1 + len(script)+1) for 437/437 |
| +2 | u16 | part id (unique inside its card/background) | confirmed |
| +4 | u8 | kind: 1 = button, 2 = field | confirmed (only 1/2 seen; text contents only ever point at kind 2; kind-1 parts have mouseUp scripts and icons) |
| +5 | u8 | flags A (see below) | partial |
| +6 | 4 × i16 | rectangle **top, left, bottom, right** in card pixels | confirmed (top ≤ bottom and left ≤ right in all 437; positions match the reference screenshots, e.g. Cthulhu `Run Away!!` (213,128,260,191) sits under the house icon at x≈160 y≈235) |
| +14 | u16 | flags B: high byte = bits, low byte = style number | partial |
| +16 | u16 | always 0 | confirmed |
| +18 | i16 | icon id for buttons (0 = none); always 0 for fields | confirmed as a number; the icon pictures are not in the data fork (they are probably resources) |
| +20 | i16 | text alignment: 0 = left, 1 = center, −1 = right? | probable: buttons are 1 in 227/228; Wordle `title` field is 1 and its text is centered in the screenshot |
| +22 | i16 | font id → FTBL | confirmed (every font id used by a part exists in FTBL in all 9 samples with an FTBL; e.g. 22 = Courier for Game Genie's 48-pt fields, 0x80 = Charcoal) |
| +24 | u16 | text size in points (9, 12, 14, 24, 28, 48…) | confirmed by consistency (line height grows with it: 12/16, 14/18, 24/32, 28/37, 48/64) |
| +26 | u16 | text style bits, in the **high byte** (seen 0x0100, 0x0200, 0x0800, 0x4000, 0); same encoding as STBL style | probable; bit meanings unknown |
| +28 | u16 | line height in pixels | probable |
| +30 | C string | part name | confirmed |
| … | u8 | always 0 (437/437) | confirmed |
| … | C string | part script | confirmed |
| … | 0 or 1 byte | pad to even | confirmed |

Order of records in the list: probably back-to-front drawing order (not always id order: 6 layers are
not sorted by id).

## Flags A (byte +5)
| bit | evidence | status |
|-----|----------|--------|
| 0x80 | **hidden.** Wordle card 1: buttons `Reset`, `Load`, `Gaming` and fields `words`, `acceptable 1..3`, `row`, `col`… have 0x80 and are not visible in reference.png; all parts without it are visible | probable (one screenshot; no contradiction in others) |
| 0x01 | buttons: What is HyperCard `Previous` (only button with it) is drawn greyed on the first card → disabled? Fields: set on click-to-select fields (`letterS` uses `the clickChunk`, Wordle keys `letter Q`…) → locked text? | probable/unknown |
| 0x04 | set on most fields (both editable-looking and locked) | unknown |
| 0x08 | Mark Twain background field `intro` (0x0D); that background also stores the field's text in the BKGD block | unknown (maybe "same text on all cards") |
| 0x02, 0x10, 0x20 | rare on fields | unknown |

## Flags B (u16 at +14)
High byte bits (buttons):
| bit | evidence | status |
|-----|----------|--------|
| 0x8000 | **show name.** With it, the name is drawn: Cthulhu (4 icon buttons, names under icons), Wordle `New Game`/`Stats`/`Help`, Patients `Options`, `install`, `PATIENT LIST`, Fishing `Click Me to Begin`. Without it, no name: Patients `Home`/`Sort All`/`Find`, Inigo icon button, Game Genie icon buttons | probable (4 screenshots). What is HyperCard / FLC show names on buttons without 0x8000; those names could be painted into the picture — unverified |
| 0x4000 | **highlighted.** What is HyperCard `Welcome` (0x6100) is drawn inverted, its siblings (0x2100) are not | probable (1 screenshot) |
| 0x2000 | very common on buttons and fields | unknown |
| 0x1000, 0x0100 | Oblique bkgd icon buttons (0x10xx), What is HyperCard nav buttons (0x21xx) | unknown |

Low byte = style number:
* Buttons: 0 = transparent (no frame: Inigo, Cthulhu icons), 3 = rounded rectangle (Fishing `Click Me to Begin`, Patients `install` — both drawn as round rects), others seen 1, 2, 4, 5, 6 — unknown.
* Fields: 0 = transparent (Wordle `title`: no frame), 2 = plain rectangle (Game Genie fields and Wordle letter boxes are framed boxes), 4 = framed with a drop shadow (Patients `NAME` banner), 7 = probably scrolling (multi-line hidden word lists), 1 seen — unknown.
Status: probable for 0/2/3/4, unknown for the rest.
