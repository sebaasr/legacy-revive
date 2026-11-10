# 04 – CARD and BKGD blocks

Probes: `probes/hc.py` (`parse_layer`), `probes/layers.py` (all checks pass on 10/10, `bad={}`),
`probes/dump_stack.py`. h = common header length (16 in format 10, 12 in format 8).

## CARD layout
| off | type | meaning | status |
|-----|------|---------|--------|
| h+0x00 | i32 | BMAP id of the card picture, 0 = none | confirmed (every non-zero id is an existing BMAP; each BMAP is used by exactly one CARD/BKGD) |
| h+0x04 | u16 | flags: 0x0000 or 0x4000 (all cards of Inigo, Mark Twain, Patients; 1 Wordle card) | unknown meaning |
| h+0x06..h+0x0F | 10 bytes | always 0 | confirmed |
| h+0x10 | i32 | id of the PAGE that lists this card (0 in format 8) | confirmed |
| h+0x14 | i32 | BKGD id of this card's background | confirmed |
| h+0x18 | u16 | number of parts (buttons + fields) | confirmed |
| h+0x1A | u16 | highest part id ever given out (≥ every current part id; > when parts were deleted). New id = this + 1 | confirmed (≥ in 10/10; equal to the max id in most) |
| h+0x1C | u32 | byte length of the part list | confirmed |
| h+0x20 | u16 | number of content (text) records | confirmed |
| h+0x22 | u32 | byte length of the content records | confirmed |
| h+0x26 | … | part records (05), then content records (06), then the card **name** (C string), then the card **script** (C string) | confirmed |

## BKGD layout
Same idea with a different head:
| off | type | meaning | status |
|-----|------|---------|--------|
| h+0x00 | i32 | BMAP id, 0 = none | confirmed |
| h+0x04 | u16 | flags 0x0000 / 0x4000 | unknown meaning |
| h+0x06 | u16 | 0 | — |
| h+0x08 | u32 | number of cards using this background | confirmed (equal to a count of CARD.bkgd) |
| h+0x0C | i32 | next BKGD id | confirmed |
| h+0x10 | i32 | previous BKGD id | confirmed |
| h+0x14 | u16 | number of parts | confirmed |
| h+0x16 | u16 | highest part id | confirmed |
| h+0x18 | u32 | part list length | confirmed |
| h+0x1C | u16 | number of content records | confirmed |
| h+0x1E | u32 | content length | confirmed |
| h+0x22 | … | parts, contents, name, script (same as CARD) | confirmed |

Backgrounds form a **ring** through next/prev, starting at STAK 0x28; it visits every BKGD (10/10).
A one-background stack points to itself (Game Genie: next = prev = 2577).

Size check: in all 632 CARD/BKGD blocks the parsed part records add up to the declared part length
and the content records add up to the declared content length exactly.

## Worked example (Game Genie CARD 4010 at 0x1BC0, format 10)
```
1bd0: 0000 0000 | 0000 | 00×10                   bmap 0, flags 0
1be0: 0000 09a2 | 0000 0a11 | 0001 | 0001 | 0000 0022   page 2466, bkgd 2577, 1 part, max id 1, 34 bytes
1bf0: 0001 | 0000 0018                           1 content record, 24 bytes
1bf6: 0022 0001 0204 00a6 002f 0150 01e2 ...     part (see 05)
1c18: ffff 0013 8006 0000 0006 "PPAOUK\rEGLPEX" 00   content (see 06)
1c30: 00 00                                       name "", script ""
```
Format 8 (Inigo CARD 2927 at 0x12C0): `0000 4674 | 4000 | 00.. | 0000 0000 (page = 0) | 0000 0a0f | 0002 0003 | 0000 00ae | 0000 | 0000 0000 | parts…`.

## Names and scripts
Name and script are NUL-terminated Mac Roman strings with CR line ends; empty = a single 0 byte.
Names seen: cards `Welcome`, `Introduction`… (What is HyperCard), `game` (Wordle); backgrounds `Content`, `Graphs`.
Bytes after the script up to the block end are slack (see 01).
