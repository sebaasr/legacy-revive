# 06 Element type numbers observed

Probes: `p09_elements.py` (survey), `p08_glyphs.py` / `p12_lines.py` (reference glyphs),
`p10_links.py` (passages, keys/doors). Columns: cells in corpus / boards using it / has a status record.
Confidence: **C** confirmed by reference image or a cross-check, **P** probable, **G** guess, **?** unknown.

| Type | Cells | Boards | Record | Colors | Evidence | Best guess | Conf |
|---|---|---|---|---|---|---|---|
| 0 | 134,102 | 265 | 30 stray | any | always pure black in references | empty floor | C |
| 4 | 269 | 269 | always, record 0 | 1f | exactly one per board; smiley glyph (KINGL2) | player | C |
| 5 | 153 | 18 | no | always 03 | fixed color | collectible item | G |
| 6 | 85 | 12 | no | always 06 | fixed color; 'Y'-over-cross glyph | collectible item | G |
| 7 | 729 | 38 | no | 0f,0c,09,0d.. | many colors, scattered | gem-like collectible | G |
| 8 | 76 | 34 | no | fg-only 09..0f | fg colors 9..15 pair with type-9 bg colors 1..7 in 4/6 worlds (p10) | key | P |
| 9 | 102 | 34 | no | 1f,2f,3f,4f.. (white on color) | bg colors 1..7 | door | P |
| 10 | 20 | 14 | always | 0f | record carries prose text, cycle 1 | scroll / sign (text record) | P |
| 11 | 249 | 130 | always | white on color | p3 = destination board; target board has same-color type 11 in 207/249 | passage between boards | C |
| 12 | 30 | 7 | always | 0f | step ±1 in one axis, p2=8, cycle 2 | directional mover/shooter | G |
| 13 | 50 | 9 | always | various | cycle 6, all params 0 | timed element | G |
| 14 | 1 | 1 | no | 05 | single cell | ? | ? |
| 16, 17 | 155, 157 | 7 | always | 0d/0c | cycle 3 / 2, params 0; co-occur on 6 of 7 boards | rotating/conveyor pair (cw/ccw) | G |
| 19 | 4,523 | 22 | no | f9, 9f | light-dither glyph (= char 176), blue/white | water | P |
| 20 | 12,565 | 52 | no | always 20 | light-dither glyph, black on green | forest/brush | P |
| 21 | 44,869 | 225 | no | any fg | full-block glyph (= char 219) | solid wall | C (look) |
| 22 | 56,659 | 230 | no | any fg | dense-dither glyph; used for screen borders | normal wall | C (look) |
| 23 | 74,772 | 230 | 1 stray | any fg | 50% checker glyph | breakable wall | P (look C) |
| 24 | 2,785 | 57 | no | 09,0b,0c,20 | often on ring (846) | wall variant | G |
| 25, 26 | 500, 633 | 22, 19 | no | mostly 09 | co-occur on 15 boards | wall/barrier variants | G |
| 27 | 22,052 | 67 | no | 0a,09,0e | big fills (1,174 cells on a boat board = sea); 169 records stand on it (under_type 27) -> passable | walk-through fill ("fake" wall) | G |
| 28 | 2,784 | 25 | no | various | | wall variant | G |
| 29 | 145 | 10 | always | 0e,0d | cycle 1, step ±1, p1 0..6 | creature or projectile | G |
| 30 | 307 | 27 | always | 0f,09 | cycle 2, step one of 4 directions | moving projectile/mover | G |
| 31 | 12,463 | 87 | no | any fg | double-line glyph joined to neighbours (p12) | line wall | C |
| 32 | 58 | 4 | no | 0a | | ? | ? |
| 34 | 39 | 4 | always | 06 | cycle 3, p1 0/1/4 | creature | G |
| 35 | 55 | 6 | always | 0d | cycle 1, p1 8 p2 4 | creature | G |
| 36 | 7,792 | 246 | always | any | glyph = p1, has `@name` program text | scripted object | C |
| 37, 38 | 10, 3 | 3, 1 | always | | cycle 3 | creature | G |
| 39 | 53 | 5 | always | | cycle 2, p2 136/1/4 | creature | G |
| 40 | 82 | 16 | always | 0e,0c | cycle 4, step one of 4 directions | pusher-like mover | G |
| 41 | 232 | 10 | always | always 0c | cycle 2, p1 4/0/8 | creature | G |
| 42 | 101 | 10 | always | always 0b | cycle 2, p1/p2 0..8 | creature | G |
| 44 | 121 | 20 | always | various | cycle 2, p1/p2 0..8 | creature | G |
| 45 | 312 | 17 | always | various | cycle 2, params 0 | creature | G |
| 47..53 | 23,407 | 111 | no | char code | white text on blue/green/cyan/red/purple/brown/black | colored text | C |

Not observed: 1-3, 15, 18, 33, 43, 46 (and anything above 53).

Script vocabulary that names elements (`#put/#change/#become`, notes/07) - `empty, solid, normal,
breakable, fake, invisible, boulder, gem, key, pusher, passage` with color words `red, green, yellow,
cyan, blue, purple, white` - shows the game has these elements, but the files give no direct
name-to-number mapping. Only the rows marked C/P above are tied to numbers by evidence.

Records on non-entity cells: 30 records sit on type-0 cells and 1 on type 23 (p1=177): probably
leftovers or entities whose cell was overwritten; readers should keep them but not draw them.
