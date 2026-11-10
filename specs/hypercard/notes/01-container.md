# 01 – Container: blocks, master index, free space

All integers are **big-endian**. Text is Mac Roman (8-bit) with CR (0x0D) line ends.
Probes: `probes/blocks.py`, `probes/mast.py`, `probes/hc.py`.

## Block sequence — confirmed (10/10)
The data fork is an unbroken sequence of blocks. Each block starts with a common header:

| off | type | meaning |
|-----|------|---------|
| 0x00 | u32 | block size in bytes, header included |
| 0x04 | 4 chars | block type (ASCII) |
| 0x08 | i32 | block id |
| 0x0C | u32 | **format 10 only:** filler, always 0 in CARD/BKGD/BMAP/LIST/PAGE/FTBL/STBL. Not present in format 8 |

So the common header is **16 bytes in format 10** and **12 bytes in format 8**. In this file
"h" means the common header length. Every block-specific field from h onward has the same layout in
both formats (checked for CARD, BKGD, BMAP, PAGE, TAIL, and the LIST fields at 0x10..0x2C). Two
exceptions: the STAK header uses absolute offsets (see 02), and the LIST page table sits at 0x30 in
both formats.

Evidence: walking `size` from offset 0 lands exactly on EOF in all 10 samples (`blocks.py`: `ok=True`).
Every block size is a multiple of 32 (all 10). Example, Game Genie, offset 0x1BC0:
`0000 0100 4341 5244 0000 0faa 0000 0000` = size 256, `CARD`, id 4010, filler 0.
Format 8 (Inigo Gets Out), offset 0x12C0: `0000 0100 4341 5244 0000 0b6f | 0000 4674 ...` and
the block's first field (bitmap id 0x4674) comes right after the id.

## Block types seen
| type | count/stack | role (evidence in note) |
|------|-------------|--------------------------|
| STAK | 1, always first, id −1 | stack header (02) |
| MAST | 1, always second, id −1 | master index (below) |
| LIST | 1, always third | page table (03) |
| PAGE | ≥1 | ordered card id lists (03) |
| BKGD | ≥1 | background (04) |
| CARD | ≥1 | card (04) |
| BMAP | 0..n | card/background picture (07) |
| FTBL | 0..1 (missing in format 8) | font name table (06) |
| STBL | 0..1 (missing in format 8) | text style table (06) |
| FREE | 0..n, id 0 | unused space |
| PRNT, PRST, PRFT | 0..1 | print settings / reports (not decoded; PRNT id is in STAK 0x40) |
| TAIL | 1, always last, id −1, 32 bytes | end marker (below) |

Order between LIST/PAGE and TAIL is arbitrary (blocks get interleaved with FREE blocks after edits).
Block ids are unique across all types (except fixed −1 / 0 ids) in all 10 samples.

## MAST (master index) — confirmed (10/10, every entry)
From block offset 0x20 to block end: array of u32 entries, 0 = empty slot.
Each entry = `(file_offset / 32) << 8 | (block_id & 0xFF)`.
Example, Game Genie MAST at 0x820: `0000 50d5` → offset 0x50×32 = 0xA00 (the LIST block), id low byte
0xD5 (LIST id 2261 = 0x8D5). `mast.py`: every non-zero entry hits a block start with matching id low
byte (bad=0), and every block except STAK/MAST/FREE/TAIL is listed exactly once (missing=[] dup=0).
MAST size varies (512, 1536, 2048, 5120 bytes). Bytes 0x10..0x1F of MAST are zero in all samples.
Unknown: how a slot index is chosen (not sequential, not obviously id-based). A reader does not need
it: the block walk gives the same set.

## FREE blocks and the free table — confirmed (10/10)
FREE blocks have id 0; their content is stale data. STAK 0x38 = number of FREE blocks,
STAK 0x3C = total FREE bytes, and STAK 0x400.. holds (u32 offset, u32 size) pairs, one per FREE
block, ending with a zero pair (`stak_header.py`: `freetab` passes in all 10).

## TAIL — confirmed (10/10)
32-byte block. At h: a Pascal string (length byte + Mac Roman text). Format 10 samples all hold
`0F "Nu är det slut…"` (Swedish text); the format 8 sample holds `13 "That's all folks..."`.
No other content. Treat it purely as the end marker.

## Slack inside blocks — confirmed
Block size is rounded up to 32, and many CARD/BKGD blocks have stale bytes after the last used byte
(7 blocks: Fishing, Game Genie, Oblique, Patients). These contain fragments of other blocks
(e.g. `BKGD` tags, script text). Readers must use the internal sizes and ignore the rest.

## Version differences seen
* STAK 0x10 = 10 in 9 samples, 8 in Inigo Gets Out (the only format 8 sample).
* Format 8: 12-byte common block header; no FTBL/STBL blocks; STAK 0x60..0x8F and 0x1B0..0x1BB all
  zero; STAK 0x0C nonzero (`cd8a7bf0`, unknown); page entries 8 bytes with zero flag byte.
* Game Genie (16 KB) is format 10, not older; it is just small.
