# 05 Status records (per-board active entities)

Probes: `p02_stats.py`, `p04_validate.py`, `dump_world.py`.

After the 86-byte properties: `i16 N` then **N+1** records (record 0 is always the player). Each record is
33 bytes followed by `code_len` bytes of program text. 10,297 records in the corpus; every board parses
to its exact end. **confirmed**

Example KINGL2 board 0, count `2a 00` (42 -> 43 records) at 0x6FC; record 1 at 0x71F:
```
3b 12 | 00 00 | 00 00 | 03 00 | fa 00 00 | ff ff | ff ff | 00 00 | 00 00 f8 32 | ff ff | 11 00 | 00x8 | "@Small star\r#end\r"
 x  y   stepx   stepy   cycle  p1 p2 p3  follow  leader  under   ptr(?)        ip      len     pad
```

| Off | Size | Field | Evidence | Status |
|---|---|---|---|---|
| 0 | u8 | x, 1-based column (1..60) | all 10,297 in range 1..60; record 0 always sits on a type-4 cell (269/269) | **confirmed** |
| 1 | u8 | y, 1-based row (1..25) | as above | **confirmed** |
| 2 | i16 | step x | -1/0/1 on types 12,29,30,40 (moving things) | **probable** direction |
| 4 | i16 | step y | as above | **probable** |
| 6 | i16 | cycle (update interval) | constant per type: player 1, objects 3, type 16=3, 17=2, 13=6, 40=4 | **probable** |
| 8 | u8 | p1 | objects: glyph character (0 conflicts vs reference, notes/03); other types: small values 0/4/8 | **confirmed** for objects |
| 9 | u8 | p2 | | element-specific, unknown |
| 10 | u8 | p3 | passages (type 11): **destination board index** (207/249 targets contain a passage of the same color) | **confirmed** for type 11 |
| 11 | i16 | follower | -1 normally; small indexes for some types | **probable** (link to another record index) |
| 13 | i16 | leader | as above | **probable** |
| 15 | u8 | under-element type | 0 in 9,861; also 19,21..24,27,30,36,42,44 | **probable**: what lies beneath the entity |
| 16 | u8 | under-element color | | **probable** |
| 17 | 4 bytes | varies (`00 00 f8 32`, `01 00 f9 32`...) | looks like a saved memory pointer | unknown, ignore |
| 21 | i16 | ip: execution position in program text | 0 in 9,860; -1 in 338 (halted, e.g. after `#end`); 9 others point inside the text (e.g. TOXIC "@star\r#CHAR 250\r/I/I..." ip=28) | **probable** |
| 23 | i16 | code_len: bytes of program text that follow | never negative in corpus | **confirmed** |
| 25 | 8 bytes | zero (10,028) or leftover patterns | | padding |

Program text: CP437, lines separated by CR (0x0D), always ends with CR, no LF anywhere (5,227 programs).
Owners: type 36 (5,206 objects) and type 10 (20 records whose text is plain prose -> "scroll"-like).
Record 0 (player) holds leftover garbage in most fields (step 144/22016, ip 28752) - ignore except x,y.
