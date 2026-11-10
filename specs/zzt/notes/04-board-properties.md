# 04 Board properties (86 bytes after the grid)

Probes: `p02_stats.py` (size), `p03_props.py` (per-offset survey), `p11_exitdir.py` (exit directions),
`p10_links.py` (reciprocity).

The block size 86 was found by brute force: for K in 0..199, "i16 count at grid_end+K, then count+1
records of 33 bytes + code" ends exactly at the board end. K=86 works for **269/269 boards** (a few boards
also admit other K by coincidence, never consistently). **confirmed**

| Off | Size | Field | Evidence | Status |
|---|---|---|---|---|
| 0 | u8 | values 255 (180 boards), 0 (53), 5 (28), 2 (6), 1 (2) | survey | **probable**: max player shots (255 = unlimited?) |
| 1 | u8 | 0 or 1 (23 boards) | survey | **probable**: "dark board" flag |
| 2 | u8 | exit north: board index, 0 = none | edge-continuity test: open gaps on this board's top edge line up with the target's bottom edge 0.82 vs 0.37 for the opposite hypothesis | **confirmed** |
| 3 | u8 | exit south | bottom edge 0.81 vs 0.42 | **confirmed** |
| 4 | u8 | exit west | left edge 0.82 vs 0.36 | **confirmed** |
| 5 | u8 | exit east | right edge 0.79 vs 0.44 | **confirmed** |
| 6 | u8 | 0 or 1 (7 boards) | survey | unknown flag (re-enter when hit?) |
| 7 | 1+58 | message: length byte + 58 bytes | 268/269 lengths 0; lostmonk board 0 = 16 `'ERR: Bad #CHANGE'` (a runtime error string saved into the file). Bytes 8..65 otherwise hold leftover text | **probable** |
| 66 | u8,u8 | x,y | values (27,7) common, (116,19) in TOXIC = leftover; CRIMRING board 39 (the header's current board) = (28,25) = player position | **probable**: player entry position (only meaningful for the board played last) |
| 68 | i16 | 0 except PYRAMID board 28 = 100 | 1 sample | **probable**: time limit |
| 70 | 16 bytes | zero, or a repeated leftover pattern (37 boards identical) | survey | unknown / padding |

Exit reciprocity (p10): north->south back-links 92/95, south->north 92/99, west->east 74/78,
east->west 74/91. Exits use 0-based board indexes; 0 means "no exit" (board 0 is the title, never a target).
