# 03 Board grid: RLE, cells, colors, rendering

Probes: `p01_boards.py`, `p07_refcells.py`, `p08_glyphs.py`, `p12_lines.py`, `p13_compare.py`,
`render_board.py`.

## Encoding (**confirmed**)
- The grid is **60 columns x 25 rows = 1500 cells**, the whole visible screen including the outer ring
  (the ring holds ordinary wall cells, e.g. KINGL2 title ring = type 0x16 color 0x0e, drawn yellow in
  reference.png).
- Stored as RLE triples `(count, element, color)`, row-major from the top-left, until 1500 cells are
  produced. Runs cross row boundaries freely (3,281 of 100,349 runs do). Count 0 never occurs in the
  corpus (a count of 0 meaning 256 is a guess, harmless).
- Every one of the 269 grids decodes to exactly 1500 cells and the following properties/records then
  parse to the exact board end (p02/p04).
- Example KINGL2 0x235: `3d 16 0e` = 61 cells of element 22 color 0x0e (top row + first cell of row 2).

## Color byte (**confirmed** against 6 reference screenshots, 1499-1500/1500 cells match each)
- Ordinary elements: foreground = palette[color & 0x0F], background = palette[color >> 4]. The high nibble
  is a full 4-bit background (no blink): DAMMAK type 19 color `f9` renders blue on **white**; CRIMRING `9f`
  renders white on light blue.
- **Text elements 47..53**: the color byte is a **character code** (CP437), drawn white on a fixed
  background chosen by the element: 47 blue, 48 green, 49 cyan, 50 red, 51 purple, 52 brown, 53 black.
  Evidence: KINGL2 row 9 `35 22`, `35 43`, `35 61`... = `"Castle Of King Lucius"` shown white on black;
  text cells of types 47-52 show exactly the backgrounds (0,0,168), (0,168,0), (0,168,168), (168,0,0),
  (168,0,168), (168,84,0) (p07/p08).
- Type 0 (empty) draws black regardless of its color byte (1379/1379 empty title cells are pure black;
  color bytes like 0x0e/0x0f are stored anyway).
- Object cells (type 36) take their **glyph from the record's p1 byte** (notes/05) and colors from the
  cell color byte: 82 harvested char codes, 0 conflicts between text-derived and object-derived bitmaps
  (e.g. KINGL2 "@Small star" objects p1=250 render as a 1x2-pixel dot).

## Palette (16 colors, derived from references; **confirmed** for 14 entries)
| idx | RGB | idx | RGB |
|---|---|---|---|
| 0 | 0,0,0 | 8 | 84,84,84 *(inferred, never seen)* |
| 1 | 0,0,168 | 9 | 84,84,252 |
| 2 | 0,168,0 | 10 | 84,252,84 |
| 3 | 0,168,168 | 11 | 84,252,252 |
| 4 | 168,0,0 | 12 | 252,84,84 |
| 5 | 168,0,168 | 13 | 252,84,252 |
| 6 | 168,84,0 | 14 | 252,252,84 |
| 7 | 168,168,168 *(inferred)* | 15 | 252,252,252 |

## Glyphs per element (from references; `glyphs.json`)
- 21 = full block (same bitmap as char 219), 22 = dense dither, 23 = 50% checker, 19 and 20 = light
  dither (same bitmap as char 176), 4 = filled smiley (same bitmap as char 2), 6 = a 'Y'-over-cross shape.
- **Type 31 is a connecting double-line wall**: its glyph is chosen by which N/S/E/W neighbours are also
  type 31. 7 neighbour keys observed (EW, NS, NE, NW, SE, SW, NSEW), each with exactly one bitmap
  (p12, 318 cells, 0 conflicts). Unobserved keys are synthesized in render_board.py.
- Glyphs for the other element types are not visible in any reference -> unknown; render_board.py draws a
  box with the type number.

## Comparison (p13)
Board 0 rendered vs reference.png: 5 files 1499/1500 cells (99.93% pixels), KINGL2 1500/1500. The only
mismatch is the **player cell**, which the reference shows blank in 5 titles and as the smiley in KINGL2;
no byte difference explaining this was found (unknown; stat 0 fields hold leftover data, notes/05).
Caveat: glyph bitmaps were harvested from these same references, so the comparison validates the cell
encoding, palette, text/object/line rules, not glyph shapes.
