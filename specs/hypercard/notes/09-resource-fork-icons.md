# 09 – Resource fork container and button icons

Built from the 8 `*.rsrc` files in the corpus. Cthulhu and Inigo have no resource fork file.
Probes:
* `probes/rsrc.py`: container parser and per-file self-check.
* `probes/icons.py <file.rsrc> <out_dir>`: exports ICON / ICN# / ics# as PNG. With no arguments it
  prints the icon ids each stack's buttons use and which of them are missing.
* `probes/icon_check.py`: searches each visible icon button's rect in reference.png for the icon.

## Container (confirmed: 8/8 files pass every check in rsrc.py)
All values are big-endian.
| where | field | evidence |
|---|---|---|
| file 0x00 | u32 data-area offset (0x100 in all 8) | |
| file 0x04 | u32 map offset | map offset + map length == file size in 8/8 |
| file 0x08 | u32 data-area length | sum over resources of (4 + length) == data-area length in 8/8 |
| file 0x0C | u32 map length | |
| file 0x10..0xFF | not part of the structure (Game Genie: a copy of Finder-like strings, "DeskDraw", "STAKWILD") | unknown, ignored |
| map +0x00 | copy of the 16-byte file header | 8/8 |
| map +0x10..0x15 | 6 bytes (Game Genie: `003d 891c 09ec`) | unknown |
| map +0x16 | u16 attributes (0 in Game Genie) | unknown meaning |
| map +0x18 | u16 type-list offset from map start (0x1C in all 8) | |
| map +0x1A | u16 name-list offset from map start | |
| type list +0 | u16 number of types − 1 | |
| type list +2 + 8k | 4cc type, u16 number of resources − 1, u16 offset of the reference list from the type-list start | |
| reference (12 bytes) | i16 id, u16 name offset into the name list (FFFF = none), u8 attributes (0x20 in Game Genie), u24 offset of the data from the data-area start, u32 0 | |
| data | u32 length, then the bytes | lengths tile the data area exactly |
| name list | Pascal strings (length byte + Mac Roman) | Game Genie ICON 9753 is named "DEC" |

Worked example (Game Genie, map at 0x208): `0000 0100 0000 0208 0000 0108 0000 0042` (header copy) …
`001c 003e | 0000 | 'ICON' 0001 000a | 2619 0000 20 000000 00000000 | 261a ffff 20 000084 00000000 |
03 'DEC'`. That is 2 ICONs, 9753 named "DEC" with data at 0x100 (length 0x80) and 9754 with data at
0x184.

Types in the corpus (count × length): ICON ×36 (always 128 bytes), ICN# ×2 (256), ics# ×2 (64),
icl4 ×2 (512), icl8 ×2 (1024), ics4 ×2 (128), ics8 ×2 (256), CURS ×4 (68), snd, vers, FONT, FOND,
ftag, XCMD, XFCN, DLOG, DITL, PICT, STR#, TEXT.

## Icon pixel formats
* **ICON** (128 bytes): 32×32 pixels, 1 bit per pixel, 4 bytes per row, MSB = leftmost pixel, 1 = black.
  **Confirmed** by icon_check.py: Game Genie 9753 and 9754, Wordle 6134 and 17316, and Patients 20186,
  6096 and 16376 (×2) are found pixel-for-pixel (100.00 %) in the screenshots. Patients 8538 matches
  99.41 %.
* Placement in a button (probable, 9 buttons): icon left = (left + right)/2 − 16, exact in all 9.
  Icon top = (top + bottom)/2 − 16 when the button does not show its name (Game Genie 162, Patients 74,
  71, 76, 140). When the name is shown (flag 0x8000, note 05), the icon sits 6 pixels higher (Wordle
  94 and 79, Patients `Options` 245). The icon is clipped to the button rect: Oblique 28022 and What is
  HyperCard 30394 match 100 % inside their 15- to 24-pixel-tall rects. Oblique 13982/15420 (65 %) and
  What is HyperCard 19858 (89 %) differ only in pixels outside the icon's black bits: those buttons
  paint an opaque or framed box around the icon (button style, out of scope here).
* **ICN#** (256) and **ics#** (64): two planes of 32×32 (or 16×16, 2 bytes per row), image then mask.
  **Probable**: in 4/4 resources the second plane is a superset of the first.
* **CURS** (68): 16×16 image (32 bytes), 16×16 mask (32 bytes, a superset of the image in 4/4), then
  4 bytes (`0001 0001` in all 4, probably a hot spot). Probable.
* icl4/icl8/ics4/ics8: 4- or 8-bit colour versions of the same id (−16455). The palette is not in
  the files. Unknown, not exported.

## Icons used by buttons vs icons present (icons.py, all CARD and BKGD buttons)
| sample | rsrc | ICONs in fork | used by buttons | missing from the fork |
|---|---|---|---|---|
| cthulhucard | no | 0 | 1009 1012 1013 1014 1015 21700 23078 30557 32462 32670 | all 10 |
| fishing-animation | yes | 1 (21190) | — | — |
| game-genie-encoder-decoder | yes | 2 | 9753 9754 | — |
| hypercard_fantasylanguagecreat1 | yes | 0 | — | — |
| hypercard_hyper-wordle | yes | 10 | 6134 7142 9120 15467 17316 18223 19162 29484 32462 | 7142 15467 19162 32462 |
| hypercard_inigo_gets_out | no | 0 | 19678 | 19678 |
| hypercard_obliquestrategies | yes | 6 | 3071 3358 13982 15420 26635 28022 | 3071 3358 26635 |
| hypercard_what_is_hypercard_2 | yes | 10 | 10 ids | — |
| mark-twain---300-quotations | yes | 1 (1015) | 1015 | — |
| patients-v15 | yes | 6 | 1004 1013 1014 6096 8538 9253 13744 16376 20186 21700 30385 30557 | 1004 1013 1014 9253 13744 21700 30557 |

Some ids recur across unrelated stacks (1013, 1014, 1015, 21700, 30557, 32462), which fits icons
shipped with the HyperCard application rather than with the stack. Mark Twain carries its own copy
of 1015. Patients 9253 exists in its fork only as a CURS, not as an ICON. In the Cthulhu screenshot
the icons are visible (house, cards, eye, "?"), but their bits are not in the corpus files.
