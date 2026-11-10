# 02 Boards: container and iteration

Probe: `p01_boards.py` (chain), `p02_stats.py` (inner layout), `p04_validate.py` (all checks).

A world is the 512-byte header followed by `board_count` boards stored back to back. Each board:

```
+0   u16   size = number of bytes that follow this field
+2   1+50  board name: length byte + 50 bytes (rest is leftover)
+53  ...   RLE grid (notes/03), variable length, decodes to exactly 1500 cells
     86    board properties (notes/04)
     i16   status record count MINUS ONE (record 0 is the player)
     ...   status records, each 33 bytes + program text (notes/05)
```

Iterate: `off = 0x200; repeat board_count times: size = u16(off); board = d[off+2 : off+2+size]; off += 2+size`.

Evidence (all **confirmed**, 8/8 files, 269/269 boards):
- The chain of u16 sizes ends exactly at EOF in every file, and the number of boards equals header
  0x02 + 1 (p01 output: e.g. `KINGL2 len=53211 hdr[2]=9 boards_found=10 end=53211 exact=True`).
- KINGL2 board 0 at 0x200: `3b 0d` (size 3387) `0c` "Title Screen" (12 chars) then leftover `n Screen`
  up to 0x234; grid starts 0x235 with `3d 16 0e`.
- Name length max seen 28; field capacity 50 deduced from the fixed grid start at +53 (holds for all
  269 boards, since every grid decodes to exactly 1500 cells and every board then parses to its end).
- Board sizes 642..15704 bytes. Board 0 is the title screen in every file (names "Title screen",
  "Title Screen", "-Lost Monkeys- Title"), matching reference.png.
- Board numbers used by exits, passages and the header's current-board field are 0-based indexes in
  file order (notes/04, notes/05).
