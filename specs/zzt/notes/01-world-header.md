# 01 World header (bytes 0x000-0x1FF)

Corpus: 8 files (CRIMRING, DAMMAK, KINGL2, lostmonk, PYRAMID, SMILEY, TOXHINTS, TOXIC). All integers are
little-endian. Probes: `p01_boards.py`, `p04_validate.py`, `dump_world.py`.

| Offset | Size | Field | Evidence | Status |
|---|---|---|---|---|
| 0x00 | i16 | magic, always `ff ff` (-1) | 8/8 files | **confirmed** |
| 0x02 | i16 | number of boards **minus one** | 8/8: e.g. KINGL2 `09 00` and 10 boards parsed, TOXHINTS `00 00` and 1 board; board chain ends exactly at EOF (p01) | **confirmed** |
| 0x04 | i16 | counter, 0 everywhere | 8/8 zero | unknown (player inventory counter?) |
| 0x06 | i16 | counter, 0 everywhere | 8/8 zero | unknown |
| 0x08 | 7 bytes | 0 everywhere | 8/8 zero. 7 = number of colors seen on key-like/door-like elements (notes/06) | unknown (maybe one flag per key color) |
| 0x0F | i16 | `64 00` = 100 in all files | 8/8; odd alignment, follows the 7-byte block | **probable**: health-like counter |
| 0x11 | i16 | board the player is on (current/start board) | CRIMRING=39 and only board 39 has property bytes 66/67 equal to its player position (28,25); TOXHINTS=0 (only board); others 1 or 9 | **probable** |
| 0x13..0x1C | 5 x i16 | counters | zero in 6 files; TOXIC/TOXHINTS have `00 77 43 00` at 0x19..0x1C which matches the garbage that follows (see below) | unknown |
| 0x1D | 1+20 | world name: length byte + 20 bytes | `08 'CRIMDEMO'`, `06 'KINGL2'`, `05 'TOXIC'` followed by leftover bytes `MP8...` (TOXIC) | **confirmed** |
| 0x32 | 10 x (1+20) | 10 flag-name slots, each length byte + 20 bytes | In TOXIC/TOXHINTS the area is filled with leftover x86-looking garbage **except** a `00` byte exactly every 21 bytes from 0x32 (0x32,0x47,0x5C,...,0xEF): length prefixes of empty strings. Other files show stale text `SECRET` at 0x33 with length 0. All 80 slots empty in corpus | **confirmed** layout, contents always empty |
| 0x104 | 5 bytes | zero in all files (garbage resumes at 0x109 in TOXIC) | 8/8 | unknown (time/score/saved flag?) |
| 0x109..0x1FF | | zero padding (TOXIC/TOXHINTS have garbage to 0x116) | 8/8 | **confirmed** unused |

Notes
- Strings are length-prefixed; bytes past the length are **leftover memory**, not data. Readers must honour
  the length byte (TOXIC name area contains `TOXICMP8\xb9\x02...`).
- Text encoding: IBM PC code page 437 (box-drawing and block characters such as 0xB0-0xDB appear in
  program text and render as the matching shapes in the reference screenshots, notes/03).
- The first board always starts at 0x200 (8/8).
