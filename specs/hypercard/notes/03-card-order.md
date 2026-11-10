# 03 – Card order: LIST and PAGE blocks

Probe: `probes/list_page.py` (every check passes on 10/10). h = common header length (16 or 12).

## LIST (one per stack, id = STAK 0x34)
| off | type | meaning | status |
|-----|------|---------|--------|
| h+0x00 | u32 | number of PAGE blocks | confirmed |
| h+0x04 | u32 | PAGE block size (always 2048 here) | confirmed |
| h+0x08 | u32 | total number of cards | confirmed |
| h+0x0C | u16 | size in bytes of one page entry | confirmed |
| h+0x0E | u16 | 2 in format 10, 1 in format 8 | unknown |
| h+0x10 | u16 | W = number of 32-bit words after the card id in each entry; entry size == 4 + 4·W in 10/10 | confirmed |
| h+0x12 | u16 | 3 or 4 | unknown |
| h+0x14 | u32 | varies (`14000ace`, `40000136`…), 0 in format 8 | unknown (maybe a checksum) |
| h+0x18 | u32 | card count again (format 10); 0 in format 8 | confirmed for format 10 |
| **0x30** (absolute, both formats) | (i32 page id, u16 cards in page)* | page table, one 6-byte row per PAGE, in order | confirmed |

Example Game Genie (0xA00): `...0000 0001 0000 0800 0000 0002 0010 0002 0003 ...` → 1 page of 2048 bytes,
2 cards, 16-byte entries, W=3; at 0xA30 `0000 09a2 0002` → PAGE 2466 holds 2 cards.

## PAGE
| off | meaning | status |
|-----|---------|--------|
| h+0 | i32 LIST id (back reference) | confirmed 10/10 |
| h+4 (format 10) | u32 unknown (`10000224` in Game Genie); zero in format 8 | unknown |
| 0x18 (absolute, both formats) | entries, `entry size` bytes each, count = the LIST row | confirmed |

Entry: `i32 card id`, `u8 flags`, then 4·W − 1 more bytes (look like hash/bit-set data; unknown).

**Card order of the stack = PAGE order in the LIST table, then entry order inside each PAGE.**
Confirmed: the list holds each CARD id exactly once (10/10), and the first entry equals STAK 0x30 (10/10).
Scripts back this up: Inigo card 2927 has a button `go to card id 3695`, and 3695 is a CARD block id.

Entry flag byte (byte 4):
* bit 0x80 is set exactly when the card has a non-empty name (all format 10 cards) — confirmed for format 10.
* bit 0x20 is set in every format 10 entry — unknown meaning.
* bit 0x40 is set on the first card of every format 10 stack plus a few others — unknown.
* bit 0x10 seen once (Patients) — unknown.
* format 8: the byte is always 0.
