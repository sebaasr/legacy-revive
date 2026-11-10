# 07 – BMAP blocks (card/background pictures) — location and header only

Probe: `probes/bmap.py` (all checks pass for all 252 BMAP blocks in 10/10 samples).
Decompression: see 08-bitmap-compression.md.

## Who points to a BMAP
CARD h+0 and BKGD h+0 hold the BMAP id (0 = no picture). Each BMAP is used by exactly one CARD or BKGD
(`ref_once` 10/10). Card pictures are drawn over the background picture (assumed from layering;
not verified).

## Header (offsets from h; format 8 has the same layout 4 bytes earlier in the file)
| off | type | meaning | status |
|-----|------|---------|--------|
| h+0x00 | u32 | 0 | confirmed |
| h+0x04 | u32 | 0x00010000 | confirmed (maybe a version) |
| h+0x08 | 4 × i16 | card rect (0,0,card height,card width) | confirmed == STAK card size |
| h+0x10 | 4 × i16 | mask bounding rect (t,l,b,r) | confirmed as a rect inside the card |
| h+0x18 | 4 × i16 | image bounding rect (t,l,b,r) | confirmed as a rect inside the card |
| h+0x20 | 8 bytes | 0 | confirmed |
| h+0x28 | u32 | mask data length | confirmed |
| h+0x2C | u32 | image data length | confirmed |
| h+0x30 | … | mask data, then image data | sizes confirmed: h+0x30+mask+image rounded up to 32 == block size in 252/252; order mask-then-image probable (both streams look alike) |

Example Game Genie BMAP 3648 at 0x17E0:
`0000 0000 0001 0000 | 0000 0000 0156 0200 | 0000 0000 0156 0200 | 0000 0000 0156 0200 | 0000.. | 0000 0000 | 0000 0388 | b482 8de1 4420 ...`
→ card 342×512, mask rect full, image rect full, mask 0 bytes, image 904 bytes.

Mask/image combinations seen (all samples):
* mask rect = card rect, mask length 0 (common) — probably "mask is solid over the whole rect" (unknown).
* mask rect = 0,0,0,0 and length 0 — no mask.
* mask rect partial with data (Oblique 129×, FLC 3×, Mark Twain 3×).
* image rect = 0,0,0,0 and length 0 — empty picture (Wordle backgrounds, 64-byte blocks).
* image rect partial or full with data.
Image rect edges are not multiples of 8 or 16 (e.g. FLC left 12, right 409), so any alignment happens inside the coder.

## What the compressed data looks like
Byte stream, no obvious per-row length table. Nearly-empty full-card images are tiny:
Oblique BKGD (342×512) image = 24 bytes `bf82 bf82 bf82 bf82 bf82 bf82 bf82 bf82 bf82 bf82 bf82 826d`;
Inigo blank card = 24 bytes `bf82 … bf82 8280`. Repeated `bfXX`/`8481` pairs look like opcodes with
counts. Other streams start with bytes like `b4 82 8d e1`, `8c 11 20 e1`, `e1 22 01 e0`, so values ≥ 0x80
seem to act as commands. Mask streams use the same style. Decoded in 08-bitmap-compression.md.
