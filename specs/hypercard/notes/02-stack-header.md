# 02 – STAK block (stack header)

Always at file offset 0. Offsets below are **absolute** (from the start of the block), the same in
format 8 and 10. Probe: `probes/stak_header.py` (all checks pass on 10/10, `fails=[]`).

| off | type | meaning | status |
|-----|------|---------|--------|
| 0x00 | u32 | block size (0x800, 0x1000, 0x1800, 0x1A00 seen; grows with the stack script) | confirmed |
| 0x04 | 4cc | `STAK` | confirmed |
| 0x08 | i32 | −1 | confirmed |
| 0x0C | u32 | 0 in format 10; `cd8a7bf0` in the format 8 sample | unknown |
| 0x10 | u32 | format number: 10, or 8 (Inigo) | confirmed as a version switch (block header length changes with it) |
| 0x14 | u32 | total file (data fork) size | confirmed 10/10 |
| 0x18 | u32 | equal to the STAK block size | confirmed 10/10 |
| 0x1C, 0x20 | u32 | 0x1C always 0; 0x20 = 0,2,3,9 | unknown (0x20) |
| 0x24 | u32 | number of BKGD blocks | confirmed |
| 0x28 | i32 | id of first background (start of BKGD ring, see 04) | confirmed |
| 0x2C | u32 | number of CARD blocks | confirmed |
| 0x30 | i32 | id of first card (= first card in LIST/PAGE order) | confirmed |
| 0x34 | i32 | LIST block id | confirmed |
| 0x38 | u32 | number of FREE blocks | confirmed |
| 0x3C | u32 | total bytes in FREE blocks | confirmed |
| 0x40 | i32 | PRNT block id, 0 if none (4 samples have PRNT and match) | confirmed |
| 0x44 | u32 | 0 except FLC (`f1ff91f5`) | unknown |
| 0x48 | u16 | 5 (9 samples) or 2 (FLC) | unknown |
| 0x4A..0x4F | | `0000 1000 0000`, `0000 1400 0000`, `0000 4000 0000`, `0000 5000 0000` | unknown |
| 0x60 | 4 × u32 | version-like stamps, e.g. `02208000 02208000 02208000 02418000`. Byte 0 ∈ {1,2}, byte 1 looks BCD (0x10,0x20,0x30,0x35,0x41), byte 2 usually 0x80. All zero in format 8 | probable (meaning of the 4 slots unknown) |
| 0x70 | u32 | e.g. `dd83238a`; zero in format 8 | unknown (maybe a timestamp; values not consistent with one epoch) |
| 0x78 | 4 × i16 | window rect top,left,bottom,right. Its height/width equals the card size in 9/9 format-10 samples (What is HyperCard holds −32767.. values = moved off-screen?) | probable |
| 0x80 | u32 | 0 | — |
| 0x84 | 2 × i16 | screen height,width (480×640, 768×1024, 624×832, 870×1152) | probable |
| 0x1B0 | i32 | FTBL block id (0 if none) | confirmed |
| 0x1B4 | i32 | STBL block id (0 if none) | confirmed |
| 0x1B8 | 2 × i16 | card height, width. **0,0 means 342 × 512** | confirmed: the BMAP card rect equals this size in every BMAP of all 10 samples (`bmap.py card_ok`), and samples with 0,0 have 342×512 BMAP rects and a 342×512 window rect |
| 0x2C0..0x3FF | 40 × 8 bytes | 8×8 one-bit patterns (rows like `aa55aa55`, `88228822`). Slightly different sets in format 8 vs 10 | probable |
| 0x400.. | (u32 off, u32 size)* | free-block table, zero-terminated (see 01) | confirmed |
| 0x600.. | C string | **stack script**, NUL-terminated, Mac Roman, CR line ends. Ends inside the block in 10/10. Empty script = single 0 byte | confirmed |

Every other byte in 0x88..0x2BF (apart from 0x1B0..0x1BB) is zero in all 10 samples. Bytes 0x430..0x5FF are zero too.

Sample card sizes: 342×512 (6), 296×480 (What is HyperCard), 240×416 (FLC), 288×224 (Mark Twain).

Example (Game Genie):
`0x24: 0000 0001 0000 0a11 0000 0002 0000 0bb4 0000 08d5 0000 0005 0000 0c00` →
1 background (id 2577), 2 cards, first card 2996, LIST 2261, 5 free blocks, 3072 free bytes.
Stack script at 0x600: `on openstack\rstart using stack "genie des jeux"\rend openstack ...`.
