# HyperCard stack format: specification (SPEC.md)

This is the only document the Clean-room Builder reads. Everything needed to write a reader is
here. Each fact carries a confidence label:

* **confirmed**: holds in every corpus sample and was re-checked by a probe;
* **probable**: fits all evidence, but the evidence is thin (one screenshot, a few cases);
* **unknown**: not decoded. Section 7 says how to skip it safely.

Corpus: 10 stacks (`corpus/hypercard/<sample>/<name>.stak`, the data fork), 8 of which also have a
resource fork file (`<name>.rsrc`), plus a `reference.png` screenshot per sample. Nine stacks use
format 10 and one (Inigo Gets Out) uses format 8.

---------------------------------------------------------------------------------------------------

## 1. Overview

* A **stack** is one document. It holds an ordered list of **cards** (screens). Each card belongs to
  one **background**. Cards and backgrounds each have an optional 1-bit **picture** (BMAP), a list
  of **parts** (buttons and fields), field **text**, a **name** and a **script**. The stack also
  has a script. confirmed
* Scripts are plain text in a language this spec calls HyperTalk (section 5). confirmed
* **Byte order:** big-endian for every integer in both the data fork and the resource fork. confirmed
* **Text encoding:** Mac Roman (8-bit). Lines end with CR (0x0D). Strings are either NUL-terminated
  ("C strings"), length-prefixed ("Pascal strings": one length byte, then the bytes), or have an
  explicit length. confirmed
* **Pixels:** 1 bit per pixel, MSB first, 1 = black, 0 = white. confirmed
* **Card size:** from the stack header. 0,0 there means 512 wide × 342 high. confirmed
* **Two files per stack:** the data fork (`.stak`, everything in sections 2 to 4) and an optional
  resource fork (`.rsrc`, section 4.8), which holds icons, sounds and code resources.

Notation: `u8/u16/u32` are unsigned and `i16/i32` signed big-endian integers. `4cc` is 4 ASCII bytes.
`h` is the **common block header length**: 16 in format 10, 12 in format 8 (section 2.1).
Offsets written `h+0x14` are relative to the block start plus h. Plain `0x14` offsets are
relative to the block start.

---------------------------------------------------------------------------------------------------

## 2. Container layout (data fork)

### 2.1 The block chain (confirmed in 10/10)

The data fork is an unbroken sequence of **blocks** from offset 0 to end of file. No gaps, no trailer.

Common block header:

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| 0x00 | 4 | u32 | block size in bytes, header included. Always a multiple of 32 | confirmed |
| 0x04 | 4 | 4cc | block type (`STAK`, `MAST`, `LIST`, `PAGE`, `BKGD`, `CARD`, `BMAP`, `FTBL`, `STBL`, `FREE`, `PRNT`, `PRST`, `PRFT`, `TAIL`) | confirmed |
| 0x08 | 4 | i32 | block id | confirmed |
| 0x0C | 4 | u32 | **format 10 only:** filler, always 0 in CARD/BKGD/BMAP/LIST/PAGE/FTBL/STBL. **Not present in format 8.** | confirmed |

So **h = 16 in format 10** and **h = 12 in format 8**. Every block-specific field from h onward
has the same layout in both formats. The exceptions are spelled out where they occur: STAK uses
absolute offsets, the LIST page table is at absolute 0x30, and PAGE entries start at absolute 0x18.

**Format number:** u32 at file offset 0x10 (inside the STAK block). Value 10 → h = 16. Value 8 → h = 12.
confirmed for these two values. Other values were never seen. The probes use `h = 16 if format >= 9 else 12`,
but that rule is untested.

Algorithm (walk):
```
off = 0
while off + 12 <= file_size:
    size = u32(off); type = 4cc(off+4); id = i32(off+8)
    record block (off, size, type, id)
    if size == 0: stop            # safety; never happens in the corpus
    off += size
# in every sample the walk ends exactly at file_size
```
Index blocks by (type, id). Ids are unique across all block types, except the fixed ids −1
(STAK, MAST, TAIL) and 0 (FREE). confirmed

Block types and counts per stack:

| type | count | role | confidence |
|---|---|---|---|
| STAK | 1, always first, id −1 | stack header (2.2) | confirmed |
| MAST | 1, always second, id −1 | master index (2.5). A reader can ignore it | confirmed |
| LIST | 1, always third | page table (2.3) | confirmed |
| PAGE | ≥1 | card id lists (2.3) | confirmed |
| BKGD | ≥1 | background (3.2) | confirmed |
| CARD | ≥1 | card (3.1) | confirmed |
| BMAP | 0..n | picture of exactly one CARD or BKGD (4.4) | confirmed |
| FTBL | 0..1 (none in format 8) | font table (4.2) | confirmed |
| STBL | 0..1 (none in format 8) | text style table (4.3) | confirmed |
| FREE | 0..n, id 0 | unused space, stale content: skip | confirmed |
| PRNT, PRST, PRFT | 0..1 | print settings / report templates: not decoded, skip | unknown content |
| TAIL | 1, always last, id −1, 32 bytes | end marker (2.6) | confirmed |

Apart from the first three blocks and TAIL, block order is arbitrary. Blocks are interleaved
with FREE blocks after edits. confirmed

**Slack:** blocks are rounded up to 32 bytes, and many CARD/BKGD blocks hold stale bytes after
their last used byte (fragments of other blocks and old script text). Always use the internal
lengths. Never scan to the block end. confirmed

### 2.2 STAK block (stack header). Offsets are absolute from the block start, same in both formats

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| 0x00 | 4 | u32 | block size (0x800, 0x1000, 0x1800, 0x1A00 seen). It grows with the stack script | confirmed |
| 0x04 | 4 | 4cc | `STAK` | confirmed |
| 0x08 | 4 | i32 | −1 | confirmed |
| 0x0C | 4 | u32 | 0 in format 10. `cd8a7bf0` in the format 8 sample | unknown |
| 0x10 | 4 | u32 | **format number** (10 or 8) | confirmed |
| 0x14 | 4 | u32 | total data-fork size | confirmed |
| 0x18 | 4 | u32 | equal to the STAK block size | confirmed |
| 0x1C | 4 | u32 | always 0 | unknown |
| 0x20 | 4 | u32 | 0, 2, 3, 9 seen | unknown |
| 0x24 | 4 | u32 | number of BKGD blocks | confirmed |
| 0x28 | 4 | i32 | id of the first background (start of the background ring, 3.2) | confirmed |
| 0x2C | 4 | u32 | number of CARD blocks | confirmed |
| 0x30 | 4 | i32 | id of the first card (= first entry of the card order) | confirmed |
| 0x34 | 4 | i32 | LIST block id | confirmed |
| 0x38 | 4 | u32 | number of FREE blocks | confirmed |
| 0x3C | 4 | u32 | total bytes in FREE blocks | confirmed |
| 0x40 | 4 | i32 | PRNT block id, 0 if none | confirmed |
| 0x44 | 4 | u32 | 0 except in one sample | unknown |
| 0x48 | 2 | u16 | 5 (9 samples) or 2 | unknown |
| 0x4A | 6 | | `0000 1000 0000`, `0000 4000 0000`… | unknown |
| 0x60 | 16 | 4 × u32 | version-like stamps (e.g. `02208000 02208000 02208000 02418000`). All zero in format 8 | probable (slot meanings unknown) |
| 0x70 | 4 | u32 | varies. Zero in format 8 | unknown |
| 0x78 | 8 | 4 × i16 | window rect top, left, bottom, right. Its size equals the card size in 9/9 format-10 samples | probable |
| 0x84 | 4 | 2 × i16 | screen height, width (480×640, 768×1024…) | probable |
| 0x1B0 | 4 | i32 | FTBL block id, 0 if none | confirmed |
| 0x1B4 | 4 | i32 | STBL block id, 0 if none | confirmed |
| 0x1B8 | 2 | i16 | **card height**. 0 means 342 | confirmed |
| 0x1BA | 2 | i16 | **card width**. 0 means 512 | confirmed |
| 0x2C0 | 320 | 40 × 8 bytes | 8×8 1-bit patterns (rows like `aa55aa55`) | probable (not needed for rendering) |
| 0x400 | var | (u32 offset, u32 size)* | free-block table, one pair per FREE block, ending with a zero pair | confirmed |
| 0x600 | var | C string | **stack script** (Mac Roman, CR lines, NUL-terminated, always inside the block). Empty = one 0 byte | confirmed |

All other bytes in 0x88..0x2BF (apart from 0x1B0..0x1BB) and in 0x430..0x5FF are zero. Card sizes
seen: 512×342 (7 stacks: 4 store 342,512 and 3 store 0,0), 480×296, 416×240 and 224×288.
The card size is confirmed because every BMAP's card rect equals it (4.4).

Example (Game Genie, format 10, offset 0):
```
0000: 0000 0800 5354 414b ffff ffff 0000 0000   size 2048, 'STAK', id -1, 0
0010: 0000 000a 0000 4000 0000 0800 0000 0000   format 10, file size 0x4000, 0x800
0020: 0000 0000 0000 0001 0000 0a11 0000 0002   0x24: 1 bkgd, first bkgd 2577, 2 cards
0030: 0000 0bb4 0000 08d5 0000 0005 0000 0c00   first card 2996, LIST 2261, 5 FREE, 3072 free bytes
01b0: 0000 0d01 0000 0cb9 0156 0200             FTBL 3329, STBL 3257, card 342 x 512
0600: "on openstack\rstart using stack "genie des jeux"\rend openstack\r..." 00
```

### 2.3 Card order: LIST and PAGE (confirmed in 10/10)

**LIST** (id = STAK 0x34). h-relative fields:

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| h+0x00 | 4 | u32 | number of PAGE blocks | confirmed |
| h+0x04 | 4 | u32 | PAGE block size (always 2048) | confirmed |
| h+0x08 | 4 | u32 | total number of cards | confirmed |
| h+0x0C | 2 | u16 | **E** = size in bytes of one page entry | confirmed |
| h+0x0E | 2 | u16 | 2 in format 10, 1 in format 8 | unknown |
| h+0x10 | 2 | u16 | W = number of 32-bit words after the card id in each entry. E = 4 + 4·W always | confirmed |
| h+0x12 | 2 | u16 | 3 or 4 | unknown |
| h+0x14 | 4 | u32 | varies. 0 in format 8 | unknown |
| h+0x18 | 4 | u32 | card count again (format 10). 0 in format 8 | confirmed (format 10) |
| **0x30 absolute** (both formats) | 6 × pages | (i32 PAGE id, u16 number of cards in that page)* | page table, in order | confirmed |

**PAGE**:

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| h+0x00 | 4 | i32 | LIST id (back reference) | confirmed |
| h+0x04 (format 10) | 4 | u32 | varies. Zero in format 8 | unknown |
| **0x18 absolute** (both formats) | E × n | entries, n = the count from the LIST row | | confirmed |

Page entry (E bytes): `i32 card id`, `u8 flags`, then E − 5 bytes of unknown (hash-like) data.

**Card order = the PAGE blocks in LIST-table order, then entry order inside each PAGE.** Every CARD
id appears exactly once, and the first entry equals STAK 0x30. confirmed
```
order = []
for i in range(LIST.npages):
    page_id = i32(LIST, 0x30 + 6*i); n = u16(LIST, 0x34 + 6*i)
    P = block('PAGE', page_id)
    for k in range(n):
        order.append(i32(P, 0x18 + k*E))
```
Entry flag byte: 0x80 is set exactly when the card has a non-empty name (format 10, confirmed).
0x20 is set in every format-10 entry, 0x40 is set on the first card plus a few others, and 0x10 was
seen once. Their meanings are unknown. The byte is always 0 in format 8.

Example (Game Genie LIST at 0xA00, format 10):
```
0a00: 0000 0080 4c49 5354 0000 08d5 0000 0000   size 128, 'LIST', id 2261, filler
0a10: 0000 0001 0000 0800 0000 0002 0010 0002   1 page, 2048 bytes, 2 cards, E=16, (2)
0a20: 0003 0004 4000 0136 0000 0002 ....        W=3, (4), (40000136), 2 cards
0a30: 0000 09a2 0002                            PAGE 2466 holds 2 cards
0a80: 0000 0800 5041 4745 0000 09a2 0000 0000   'PAGE' 2466
0a90: 0000 08d5 1000 0224 | 0000 0bb4 60 ...    LIST id, (unknown), entry: card 2996 flags 0x60
                          | 0000 0faa 20 ...    entry: card 4010 flags 0x20
```
Format 8 (Inigo): LIST at 0xA00 `0000 0080 4c49 5354 0000 4530 | 0000 0001 0000 0800 0000 001f 0008 0001 0001 ...`
(fields start right after the 12-byte header). The page table is still at 0x30: `0000 4796 001f`.
PAGE 0x4796: `... 0000 4530 | 0000 0000 0000 0000 | 0000 0b6f 00 000000 ...` (entries at 0x18, E = 8).

### 2.4 Background ring (confirmed)
BKGD blocks link through next/prev ids (3.2) in a ring that starts at STAK 0x28 and visits every
BKGD. A stack with one background points to itself. A reader can instead take all BKGD blocks from
the block walk. To list backgrounds in a stable order, follow the ring from STAK 0x28.

### 2.5 MAST (master index): not needed (confirmed)
From MAST offset 0x20 to its end there is an array of u32 entries, 0 = empty. Each entry =
`(file_offset / 32) << 8 | (block_id & 0xFF)`, and it covers every block except STAK/MAST/FREE/TAIL
exactly once. How the slots are chosen is unknown. The block walk gives the same set of blocks.

### 2.6 TAIL (confirmed)
32 bytes. At h there is a Pascal string (format 10 samples: Swedish text; format 8: "That's all
folks..."). Treat it only as the end marker.

---------------------------------------------------------------------------------------------------

## 3. Object model

```
Stack ── script (STAK 0x600), card size, font table, style table
  ├── Backgrounds (BKGD)  ── picture (BMAP), parts[], content records[], name, script
  └── Cards (CARD, ordered by LIST/PAGE) ── background id, picture, parts[], content records[], name, script
Part = button (kind 1) or field (kind 2), with its own id, rect, flags, name, script
Content record = the text of one field, stored in the card (for card fields AND background fields)
```
Drawing order of one card (section 4.6): white → background picture → card picture → background
parts → card parts (part order inside each layer: see 3.3).

### 3.1 CARD block (confirmed in 10/10 unless noted)

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| h+0x00 | 4 | i32 | BMAP id of the card picture, 0 = none | confirmed |
| h+0x04 | 2 | u16 | flags: 0x0000 or 0x4000 | unknown meaning |
| h+0x06 | 10 | | always 0 | confirmed |
| h+0x10 | 4 | i32 | id of the PAGE that lists this card (0 in format 8) | confirmed |
| h+0x14 | 4 | i32 | BKGD id of this card's background | confirmed |
| h+0x18 | 2 | u16 | number of parts | confirmed |
| h+0x1A | 2 | u16 | highest part id ever given out (≥ every current part id) | confirmed |
| h+0x1C | 4 | u32 | byte length of the part list | confirmed |
| h+0x20 | 2 | u16 | number of content records | confirmed |
| h+0x22 | 4 | u32 | byte length of the content records | confirmed |
| h+0x26 | var | | part records (3.3), then content records (4.1), then **name** (C string), then **script** (C string) | confirmed |

### 3.2 BKGD block (confirmed)

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| h+0x00 | 4 | i32 | BMAP id, 0 = none | confirmed |
| h+0x04 | 2 | u16 | flags 0x0000 / 0x4000 | unknown meaning |
| h+0x06 | 2 | u16 | 0 | confirmed |
| h+0x08 | 4 | u32 | number of cards using this background | confirmed |
| h+0x0C | 4 | i32 | next BKGD id | confirmed |
| h+0x10 | 4 | i32 | previous BKGD id | confirmed |
| h+0x14 | 2 | u16 | number of parts | confirmed |
| h+0x16 | 2 | u16 | highest part id | confirmed |
| h+0x18 | 4 | u32 | part list length | confirmed |
| h+0x1C | 2 | u16 | number of content records | confirmed |
| h+0x1E | 4 | u32 | content length | confirmed |
| h+0x22 | var | | parts, contents, name, script (same as CARD) | confirmed |

In all 632 CARD/BKGD blocks, the parsed part records add up exactly to the declared part length, and
the content records add up exactly to the declared content length. Use this as a self-check.

Parsing a CARD or BKGD:
```
p = h + (0x26 if CARD else 0x22)
repeat nparts:    part = parse_part(p); p += part.size
repeat ncontents: c = parse_content(p); p += 4 + c.n + (c.n & 1)
name,   p = cstring(p)
script, p = cstring(p)
# bytes after p up to the block end are slack
```

Worked example: Game Genie CARD 4010 at 0x1BC0 (format 10).
```
1bc0: 0000 0100 4341 5244 0000 0faa 0000 0000   size 256, 'CARD', id 4010, filler
1bd0: 0000 0000 0000 0000 0000 0000 0000 0000   bmap 0, flags 0, 10 zero bytes
1be0: 0000 09a2 0000 0a11 0001 0001 0000 0022   page 2466, bkgd 2577, 1 part, max id 1, parts 34 bytes
1bf0: 0001 0000 0018                            1 content record, 24 bytes
1bf6: 0022 0001 0204 00a6 002f 0150 01e2 0007   part record (34 bytes, decoded below)
1c06: 0000 0000 0000 0001 000c 0000 0010 00 00 00 00
1c18: ffff 0013 8006 0000 0006 5050 414f 554b 0d45 474c 5045 5800   content record (4.1)
1c30: 00 00                                     name "", script ""
```
The part record at 0x1BF6: size 0x22 = 34, id 1, kind 2 (field), flags A 0x04, rect top 166,
left 47, bottom 336, right 482, flags B 0x0007 (field style 7), icon 0, align 0 (left), font 1, size 12,
style 0, line height 16, name "" (one 00), gap byte 00, script "" (one 00), pad 00 → 30+1+1+1+1 = 34.

Format 8 example (Inigo CARD 2927 at 0x12C0): `0000 0100 4341 5244 0000 0b6f | 0000 4674 | 4000 | 00×10 |
0000 0000 (page 0) | 0000 0a0f | 0002 0003 | 0000 00ae | 0000 | 0000 0000 | parts…`.

### 3.3 Part records (buttons and fields): layout confirmed in 437/437 (228 buttons, 209 fields)

Offsets from the start of the record. Same layout in format 8 and 10.

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| +0 | 2 | u16 | record size in bytes (even) = even_round_up(30 + len(name)+1 + 1 + len(script)+1) | confirmed |
| +2 | 2 | u16 | part id (unique inside its card or background) | confirmed |
| +4 | 1 | u8 | kind: 1 = button, 2 = field | confirmed |
| +5 | 1 | u8 | flags A (table below) | partial |
| +6 | 8 | 4 × i16 | rect **top, left, bottom, right** in card pixels | confirmed |
| +14 | 2 | u16 | flags B: high byte = bits, low byte = style number (tables below) | partial |
| +16 | 2 | u16 | always 0 | confirmed |
| +18 | 2 | i16 | icon id (buttons). 0 = none. Always 0 for fields | confirmed as a number, see 4.8 |
| +20 | 2 | i16 | text alignment: 0 = left, 1 = center, −1 = right | probable (−1 unverified) |
| +22 | 2 | i16 | font id → FTBL (4.2) | confirmed |
| +24 | 2 | u16 | text size in points | confirmed |
| +26 | 2 | u16 | text style bits in the high byte (values 0x0100, 0x0200, 0x0800, 0x4000, 0 seen) | probable layout, bit meanings unknown |
| +28 | 2 | u16 | line height in pixels (12→16, 14→18, 24→32, 28→37, 48→64) | probable |
| +30 | var | C string | part name | confirmed |
| … | 1 | u8 | always 0 | confirmed |
| … | var | C string | part script | confirmed |
| … | 0/1 | | pad to even | confirmed |

Always advance by the size field.

**Order:** records are stored in what is probably back-to-front drawing order. It is not always id
order: 6 layers are not sorted by id. probable

**Flags A (+5):**

| bit | meaning | confidence |
|---|---|---|
| 0x80 | **hidden** (Wordle: every part with the bit is invisible in the screenshot, every part without it is visible) | probable |
| 0x01 | buttons: **disabled** (drawn greyed). What is HyperCard's `Previous` button has it on card 1, and the stack's script says `set the enabled of bkgnd btn "Previous" to NOT (it = 1)` where `it` = card number. Fields: set on click-to-select fields (scripts use `the clickChunk`), possibly "locked text" | probable (buttons) / unknown (fields) |
| 0x04 | set on most fields | unknown |
| 0x08 | Mark Twain background field `intro`, whose text is stored in the BKGD block | unknown (maybe "shared text") |
| 0x02, 0x10, 0x20 | rare on fields | unknown |

**Flags B high byte (+14):**

| bit | meaning | confidence |
|---|---|---|
| 0x8000 | buttons: **show name** (the name is drawn) | probable (4 screenshots) |
| 0x4000 | buttons: **highlighted** (drawn inverted). The script `set the hilite of bkgnd btn "Welcome" to true` agrees | probable (1 screenshot) |
| 0x2000 | very common on buttons and fields | unknown |
| 0x1000, 0x0100 | seen on some button groups | unknown |

**Style number (low byte of +14):**

| kind | value | style | confidence |
|---|---|---|---|
| button | 0 | transparent (no frame) | probable |
| button | 3 | rounded rectangle | probable |
| button | 1, 2, 4, 5, 6 | seen, look unknown | unknown |
| field | 0 | transparent (no frame) | probable |
| field | 2 | plain rectangle frame | probable |
| field | 4 | frame with drop shadow | probable |
| field | 7 | scrolling (multi-line word lists) | probable |
| field | 1 | seen | unknown |

Worked example: a button record from the Cthulhu BKGD 4587 at file 0x1ADE (format 10). Verified with
`hc.parse_part`:
```
00 44 | 00 05 | 01 | 00 | 01 1b 01 6b 01 4d 01 98 | 80 03 | 00 00 | 03 f6 | 00 01 | 00 00 | 00 0c | 00 00 | 00 10
size 68 id 5  btn flagsA top283 left363 bot333 right408 show-name+style3  0  icon 1014 center font 0 size 12 style 0 lh 16
50 72 65 76 00 | 00 | 6f 6e 20 6d 6f 75 73 65 55 70 0d 67 6f 20 70 72 65 76 0d 65 6e 64 20 6d 6f 75 73 65 55 70 0d 00
"Prev"          gap   "on mouseUp\rgo prev\rend mouseUp\r"
```
30 + 5 + 1 + 32 = 68 (already even). In IR terms: rect [363, 283, 408, 333], visible, round rect,
show name, icon 1014. Icon 1014 is not in this stack (Cthulhu has no resource fork), so it is an
application icon and is unavailable (4.8).

---------------------------------------------------------------------------------------------------

## 4. Text, styles, scripts and images

### 4.1 Field text: content records (confirmed, 576 records)

Content records follow the part list inside a CARD or BKGD block.

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| +0 | 2 | i16 | owner: **negative = card part with id −value**. **Positive = background part with that id** | confirmed |
| +2 | 2 | u16 | n = body length | confirmed |
| +4 | n | | body | confirmed |
| +4+n | 0/1 | | pad to even | confirmed |

Body decoding:
```
if n == 0: text = ""                            (defensive; not seen)
elif body[0] & 0x80:                            # styled text
    L = u16(body, 0) & 0x7FFF                   # style header length, these 2 bytes included
    runs = [(u16(body, k), u16(body, k+2)) for k in range(2, L, 4)]   # (char offset, STBL style id)
    text = body[L:n]
else:                                           # plain text
    text = body[1:n]                            # body[0] is 0x00
text = text.decode('mac_roman')                 # CR line ends; no NUL inside
```
In all 40 styled records, run offsets start at 0, ascend and stay ≤ the text length, and every style
id exists in STBL. A run lasts until the next run's offset or the end of the text. confirmed

Who owns which text (confirmed):
* **Card field:** the record is in the CARD block, with owner = −part id.
* **Background field, text for this card:** the record is in the **CARD** block, with owner =
  +background part id. Each card holds its own text for the background fields (Mark Twain: 363 cards
  each hold their own quotation for background field 5).
* **BKGD blocks can hold content records too** (owner = + part id). Example: Mark Twain field 22 `intro`
  = "Click anywhere for a new quotation…". Whether this is shared text shown on every card or a
  default is unknown (see flag A 0x08). Recommended: use the card's record if it has one, otherwise
  the BKGD block's record.
* **Stale records exist** (Game Genie card 2996 holds records for parts that no longer exist).
  Ignore records whose owner part does not exist in the corresponding part list.
* Only fields (kind 2) get content records. Button text never appears here.

Worked example (Game Genie 0x1C18): `ffff 0013 8006 0000 0006 50 50 41 4f 55 4b 0d 45 47 4c 50 45 58 00`
→ card part 1, n = 19, styled, L = 6, one run (offset 0, style 6), text `PPAOUK\rEGLPEX`, pad byte 00.
STBL style 6 is Courier 48 in that stack. The screenshot check is in the notes: field texts such as
`ZKELOLUP` appear in the reference screenshot.

### 4.2 FTBL: font table (confirmed in 9/9 stacks that have one)

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| h+0 | 4 | u32 | number of fonts | confirmed |
| h+4 | 4 | u32 | 0 | confirmed |
| h+8 | var | | entries: u16 font id, C-string name, then pad to an even block offset (the pad byte holds junk) | confirmed |

Example (Game Genie FTBL at 0x1280):
```
1280: 0000 0080 4654 424c 0000 0d01 0000 0000  0000 0007 0000 0000
128c+: 0080 "Charcoal" 00 82 | 0003 "Geneva" 00 e1 | 0016 "Courier" 00 | 3b06 "Brinstar16" 00 37 |
       0001 "Geneva" 00 56 | 0000 "Geneva" 00 ee | 0004 "Monaco" 00
```
Every part font id resolves in FTBL. Format 8 has no FTBL, and all its parts use font id 0. The name
of font 0 in format 8 is unknown (in format 10 samples, id 0 maps to "Geneva", but that is not
proven for format 8).

### 4.3 STBL: style table (layout confirmed, semantics partly known)

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| h+0 | 4 | u32 | number of entries | confirmed |
| h+4 | 4 | u32 | next free style id (= max id + 1) | confirmed |
| h+8 | 24 × count | | entries | confirmed |

Entry (24 bytes):

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| +0 | 4 | i32 | style id (not always 1..n: look up by id) | confirmed |
| +4 | 4 | u32 | always 1 | unknown |
| +8 | 4 | u32 | always 0 | unknown |
| +12 | 2 | i16 | font id (→ FTBL), −1 = use the field's own font | probable |
| +14 | 2 | i16 | text style bits (high byte; 0, 0x0100, 0x0500, 0x4000 seen), −1 = inherit | layout probable, bit meanings unknown |
| +16 | 2 | i16 | size in points, −1 = inherit | probable |
| +18 | 6 | | zero | confirmed |

Example (Game Genie STBL at 0x1660): `0000 000a 0000 000b` (10 entries, next id 11), entry
`0000 0001 0000 0001 0000 0000 ffff ffff ffff 0000 0000 0000` = style 1, all inherit.

### 4.4 BMAP block: picture header (confirmed for 252/252)

A BMAP is referenced by exactly one CARD or BKGD (offset h+0). Offsets are from h:

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| h+0x00 | 4 | u32 | 0 | confirmed |
| h+0x04 | 4 | u32 | 0x00010000 | confirmed (meaning unknown) |
| h+0x08 | 8 | 4 × i16 | card rect 0, 0, card height, card width | confirmed |
| h+0x10 | 8 | 4 × i16 | **mask rect** top, left, bottom, right | confirmed |
| h+0x18 | 8 | 4 × i16 | **image rect** top, left, bottom, right | confirmed |
| h+0x20 | 8 | | 0 | confirmed |
| h+0x28 | 4 | u32 | mask data length | confirmed |
| h+0x2C | 4 | u32 | image data length | confirmed |
| h+0x30 | var | | mask data, then image data | sizes confirmed (h+0x30+mask+image rounded up to 32 = block size). Order mask-then-image confirmed by the 100 % renders |

Mask/image cases seen:
* mask rect = card rect (or another rect), mask length 0
* mask rect = 0,0,0,0, mask length 0
* mask rect partial, with mask data
* image rect = 0,0,0,0, image length 0 → empty picture (no black pixels)
* image rect partial or full, with data

Rect edges are not aligned (e.g. left 12, right 409).

### 4.5 BMAP stream decoding (confirmed: shown cards match the screenshots at 100 % outside parts and the menu bar)

The mask stream and the image stream use the same codec. Each stream covers its own rect (t, l, b, r).

**Row layout:**
* H = b − t rows.
* Row width in bytes **W = 4 × (ceil(r/32) − floor(l/32))**: the rect is widened to whole 32-pixel
  columns. With integers: `W = ((r + 31)//32 − l//32) * 4`.
* Pixel x of a decoded row (bit x, MSB first) lies at card x = floor(l/32)·32 + x. Row k lies at card
  y = t + k.
* Bits outside l..r in the widened rows are always 0. Clipping to the rect changes nothing.
* Examples: l=164, r=353 → W = 4·(12−5) = 28. l=0, r=512 → W = 64.

**End of stream / padding:** decoding stops once H rows exist. In all 386 streams, 0 to 3 bytes are
left (padding to a multiple of 4, junk content such as `af 85 e3`, `ff`, `00`). Ignore them.
If the data ran out before H rows (never happens), the probe fills the remaining rows with white.

**Decoder state:**
* `rows`: decoded rows so far (each W bytes).
* `buf`: byte buffer for the row being built by byte ops.
* `filter = (dh, dv)`: starts as (0, 0) (no filtering).
* `pattern[8]`: initial value **AA 55 AA 55 AA 55 AA 55** (index 0 = AA). confirmed for this default.

**Opcode table** (c = the opcode byte). Counts are over all 386 streams:

| byte | operands | action | count | confidence |
|---|---|---|---|---|
| `0x00–0x7F` ("dz") | d = c >> 4 literal bytes | append **z = c & 0x0F zero bytes first**, then the d literal bytes, to buf | 119 249 | confirmed |
| `0x80` | W bytes | emit those W bytes as one row (unfiltered) | 924 | confirmed |
| `0x81` | – | emit an all-zero (white) row | 896 | confirmed |
| `0x82` | – | emit an all-0xFF (black) row | 41 | confirmed |
| `0x83` | 1 byte x | `pattern[len(rows) % 8] = x`, then emit a row of W × x | 16 | probable (operand size confirmed by stream alignment, never on a shown card) |
| `0x84` | – | emit a row of W × `pattern[len(rows) % 8]` | 35 | confirmed for the default table |
| `0x85` | – | emit a copy of the previous row | 2 528 | confirmed |
| `0x86` | – | emit a copy of the row two above | 968 | confirmed |
| `0x87` | – | probably a copy of the row three above | 0 | unknown (never seen) |
| `0x88` | – | probably a filter mode | 0 | unknown (never seen) |
| `0x89–0x8F` | – | set `filter` for every later byte-op row (table below). It stays until the next filter op | 89:1671 8A:2413 8B:1493 8C:636 8D:230 8E:35 8F:224 | confirmed |
| `0xA0–0xBF` | – | **repeat**: perform the next op (c & 0x1F) times | 3 727 (counts 2..31) | confirmed for row ops |
| `0xC0–0xDF` | (c & 0x1F) × 8 bytes | append those literal bytes to buf | 12 678 (n = 1..7) | confirmed |
| `0xE0–0xEF` | – | append (c & 0x0F) × 16 zero bytes to buf | 32 767 (n = 1..3) | confirmed |
| `0x90–0x9F`, `0xF0–0xFF` | – | never seen inside picture data (0xF_ bytes only appear in the padding) | 0 | unknown: stop decoding if met |

**Row filter table** (applied only to rows built by byte ops, never to rows emitted by 0x80–0x87):

| op | dh (bits) | dv (rows) | confidence |
|---|---|---|---|
| 0x89 | 0 | 0 | confirmed |
| 0x8A | 0 | 1 | confirmed |
| 0x8B | 0 | 2 | confirmed |
| 0x8C | 1 | 0 | confirmed |
| 0x8D | 1 | 1 | confirmed |
| 0x8E | 2 | 2 | confirmed |
| 0x8F | 8 | 0 | confirmed |
| 0x88 | ? | ? | unknown (never used; the probe guesses (16, 0)) |

Evidence: an ablation over the 10 shown cards. The table gives 81 mismatching pixels (all cursor
or screen corner). Changing any single entry to any other tested (dh, dv) gives 6 762 to 214 551
mismatches.

**Finishing a byte-op row** (raw = the first W bytes of buf):
1. Horizontal: treat the row as one bit string of W·8 bits. Going left to right, for every bit
   x ≥ dh: `out[x] = raw[x] XOR out[x − dh]`. Bits x < dh are copied. dh = 0 does nothing. The
   XOR crosses byte boundaries.
2. Vertical: if dv > 0 **and at least dv rows already exist**, XOR the row byte by byte with
   `rows[len(rows) − dv]` (already decoded rows, whichever op produced them).
3. Append to rows and remove those W bytes from buf.

**Main loop** (pseudocode, matches probe `bitmap.py`):
```
i = 0
while i < len(data) and len(rows) < H:
    c = data[i]; i += 1; rep = 1
    if 0xA0 <= c <= 0xBF:                        # repeat prefix
        rep = c & 0x1F; c = data[i]; i += 1
    if c in 0x90..0x9F or c >= 0xF0: break       # unknown op
    for _ in range(rep):
        if c < 0x80:   buf += zeros(c & 15) + data[i : i + (c >> 4)]
        elif c >= 0xE0: buf += zeros((c & 15) * 16)
        elif c >= 0xC0: buf += data[i : i + (c & 31) * 8]
        elif c == 0x80: rows.append(data[i : i + W])
        elif c == 0x81: rows.append(zeros(W))
        elif c == 0x82: rows.append(0xFF * W)
        elif c == 0x83: pattern[len(rows) % 8] = data[i]; rows.append(data[i] * W)
        elif c == 0x84: rows.append(pattern[len(rows) % 8] * W)
        elif c == 0x85: rows.append(rows[-1])
        elif c == 0x86: rows.append(rows[-2])
        elif c == 0x87: rows.append(rows[-3])                    # unknown, never seen
        else:           filter = FILTERS[c]                      # 0x88..0x8F
        while len(buf) >= W and len(rows) < H:
            finish_row(buf[:W]); buf = buf[W:]
    # advance past operands once (after the repeats)
    if c < 0x80: i += c >> 4
    elif 0xC0 <= c < 0xE0: i += (c & 31) * 8
    elif c == 0x80: i += W
    elif c == 0x83: i += 1
rows = rows[:H]; pad with white rows to H
```
Notes on the loop:
* A dz op may run past the end of a row into the next one, because the leftover bytes stay in buf.
  This happens 118 times, including in 3 pictures that match 100 %. confirmed
* Row ops (0x80–0x87) only ever appear when buf is empty (0 exceptions). Behaviour with a partial
  buf is unknown.
* The repeat prefix was only seen before row ops 0x85 (2 160×), 0x86 (894×), 0x81 (622×), 0x82
  (30×) and 0x84 (21×). Repeating a byte op, and the counts 0 and 1, were never seen. The probe
  re-uses the same operand bytes on each repetition, but that is unverified.
* `len(rows) % 8` counts rows from the top of the stream's rect. Whether the pattern index really
  counts from the rect top or from the card top is unknown, because every shown case has t = 0.

### 4.6 Masks and compositing (render order confirmed)

Render one card at card size:
1. Start with an all-white card.
2. Draw the **BKGD picture**, then 3. draw the **CARD picture**. Each picture is drawn the same way:
   inside its mask, the pixel takes the picture's image value (black where the image bit is 1,
   white where it is 0). Outside the mask, what is below shows through. Pixels outside the image
   rect have image value 0 (white).

The mask comes from the BMAP header:

| header case | mask | confidence |
|---|---|---|
| mask length > 0 | the decoded mask stream (same codec, its own rect). 1 = opaque. Outside the mask rect = transparent | confirmed (FLC card 0, Oblique card 1 match 100 % this way and 97.6 % with mask = image) |
| **mask rect = 0,0,0,0 and mask length 0 ("zero-mask-rect rule")** | **mask = the image itself**: only black pixels are drawn and white image pixels are transparent | confirmed (Patients 99.999 %, against 97.18 % with an opaque rect; Cthulhu and What is HyperCard agree) |
| mask rect ≠ 0,0,0,0 and mask length 0 | the whole mask rect is opaque (white areas of the image cover what is below) | probable/untestable: in the corpus this only occurs on BKGD pictures (drawn on white) and on cards whose background has no picture, where opaque and transparent look the same |
| BMAP id 0 | no picture: nothing is drawn | confirmed |

Case counts: CARD with mask rect 0: 70. CARD with mask data: 134. CARD with full mask rect and no
data: 30, none over a background picture. BKGD with full mask rect: 14.

Because the BKGD picture is drawn on white, a reader may simply draw it as "black where image = 1"
over white (this is what the probe does). The result is the same.

Parts (buttons, fields) are drawn after both pictures (they are not part of the BMAPs). Their
drawing is a runtime matter (section 6).

### 4.7 Worked bitmap example (verified by running `probes/bitmap.py` code on the file)

Game Genie BMAP 3648 at file 0x17E0 (format 10, h = 16):
```
17e0: 0000 03e0 424d 4150 0000 0e40 0000 0000     size 992, 'BMAP', id 3648
17f0: 0000 0000 0001 0000                         0, 0x00010000
17f8: 0000 0000 0156 0200                         card rect 0,0,342,512
1800: 0000 0000 0156 0200                         mask rect = full card, ...
1808: 0000 0000 0156 0200                         image rect = full card
1810: 0000 0000 0000 0000                         zero
1818: 0000 0000 0000 0388                         mask length 0, image length 904
1820: b4 82 8d e1 44 20 20 00 10 22 10 04 42 40 00 02 02 12 80 72 80 40 04 40 04 20 02 52 08 00 88 00
      80 0b a3 85 8a e1 14 3c 72 1e 1f fe 00 07 87 ff c2 f8 00 3f ff c0 00 0f ff f0 00 78 78 78 78 3c 3c ...
```
W = 64 (l = 0, r = 512), H = 342. Trace (buf length after each op):
```
b4 82          repeat 20 × black row            -> rows 0..19 = FF×64
8d             filter = (dh 1, dv 1)
e1             16 zero bytes                    buf 16
44 20200010    4 zeros, then 20 20 00 10        buf 24
22 1004        2 zeros, then 10 04              buf 28
42 40000202    2 zeros, then 4 literals         buf 34
12 80          2 zeros, then 80                 buf 37
72 80400440042002                               buf 46
52 0800880080                                   buf 53
0b             11 zeros                         buf 64 -> row 20 is finished with filter (1,1)
a3 85          repeat 3 × copy previous row     -> rows 21..23
8a             filter = (0, 1)
e1 14 3c 72 ... next byte-op row (row 24)
```
Row 20, bytes 20..23: raw `20 20 00 10` → horizontal XOR with dh = 1 gives `3f c0 00 1f` → XOR with
row 19 (all FF) gives **`c0 3f ff e0`**. Bytes 0..19 are raw zeros, which become FF after the
vertical XOR. Decoded row 20 (64 bytes):
```
ffffffffffffffffffffffffffffffffffffffff c03fffe0 00001ff8 00007fff fc03ffff 000000ff 80078007
c003ffff f000f000 ffffffffffffffffffffffff
```
Row 24 under filter (0, 1), bytes 20..23: raw `3c ...` XOR row 23 (`c0 3f ...`) → **`fc 3f ff fe`**
(raw byte 20 = 0x3c, 0xc0 XOR 0x3c = 0xfc). These rows match the Game Genie screenshot.

Short streams: a blank 342-row card in Oblique is `bf 82` × 11 then `82` → 11 × 31 + 1 = 342 black rows.
Inigo `84 81` repeated gives alternating AA/00 rows (grey stripes).

### 4.8 Resource fork and icons (container confirmed in 8/8 `.rsrc` files)

Big-endian.

| where | size | type | meaning | confidence |
|---|---|---|---|---|
| file 0x00 | 4 | u32 | data area offset (0x100 in all 8) | confirmed |
| file 0x04 | 4 | u32 | map offset | confirmed (map offset + map length = file size) |
| file 0x08 | 4 | u32 | data area length | confirmed (sum over resources of 4 + length = this) |
| file 0x0C | 4 | u32 | map length | confirmed |
| file 0x10..0xFF | | | not part of the structure | unknown, ignore |
| map +0x00 | 16 | | copy of the file header | confirmed |
| map +0x10 | 6 | | unknown | unknown |
| map +0x16 | 2 | u16 | attributes | unknown meaning |
| map +0x18 | 2 | u16 | type list offset from the map start (0x1C in all 8) | confirmed |
| map +0x1A | 2 | u16 | name list offset from the map start | confirmed |
| type list +0 | 2 | u16 | number of types − 1 | confirmed |
| type list +2 + 8k | 8 | | 4cc type, u16 (number of resources − 1), u16 offset of the reference list **from the type list start** | confirmed |
| reference (12 bytes) | 2 | i16 | resource id | confirmed |
| | 2 | u16 | name offset into the name list, 0xFFFF = no name | confirmed |
| | 1 | u8 | attributes | unknown meaning |
| | 3 | u24 | data offset **from the data area start** | confirmed |
| | 4 | u32 | 0 | confirmed |
| data | 4 + len | | u32 length, then the bytes | confirmed |
| name list | | Pascal strings | | confirmed |

Worked example (Game Genie `.rsrc`, 451 bytes in total; map at 0x208, length 0x42):
```
0000: 0000 0100 0000 0208 0000 0108 0000 0042      data @0x100 len 0x108, map @0x208 len 0x42
0208: 0000 0100 0000 0208 0000 0108 0000 0042      header copy
0218: 003d 891c 09ec | 0000 | 001c | 003e          unknown 6 bytes, attrs 0, type list +0x1C, names +0x3E
0224: 0000 | 'ICON' 0001 000a                       1 type: ICON, 2 resources, refs at type list + 0x0A
022e: 2619 0000 20 000000 00000000                 ICON 9753, name @0, attr 0x20, data @0
023a: 261a ffff 20 000084 00000000                 ICON 9754, no name, data @0x84
0246: 03 'DEC'                                      name list: "DEC"
0100: 0000 0080 ffff ffff ...                      ICON 9753 = 128 bytes
```

**ICON** (128 bytes): 32 × 32 pixels, 4 bytes per row, MSB = leftmost, 1 = black. confirmed (7 icons
found pixel for pixel in the screenshots). ICON 9753 rows 8..11 are `c3ffffc3`, rows 12..15
`fc3ffc3f`, rows 16..19 `ffc3c3ff` and rows 20..23 `fffc3fff`: a white "V" on black.
**ICN#** (256 bytes): 32×32 image plane, then a 32×32 mask plane (probable). **ics#** (64): the
same with 16×16 planes, 2 bytes per row (probable). **CURS** (68): 16×16 image, 16×16 mask, 4 bytes
(probably a hot spot) (probable). **icl4/icl8/ics4/ics8**: colour icons. Their palette is not in the
files (unknown, skip). Other types seen: `snd ` (sounds, not decoded), `vers`, `FONT`, `FOND`, `ftag`,
`XCMD`, `XFCN` (code, cannot be used), `DLOG`, `DITL`, `PICT`, `STR#`, `TEXT`.

**Icon placement in a button** (probable, 9 buttons): icon left = (left + right)/2 − 16 (integer).
Icon top = (top + bottom)/2 − 16 when the name is not shown, and 6 pixels higher when it is
(flag B 0x8000). The icon is clipped to the button rect.

**Missing icons:** a button's icon id often does not exist in the stack's fork. Cthulhu and Inigo have
no fork file at all. Ids missing per stack: Cthulhu 1009 1012 1013 1014 1015 21700 23078 30557 32462
32670. Wordle 7142 15467 19162 32462. Inigo 19678. Oblique 3071 3358 26635. Patients 1004 1013 1014
9253 13744 21700 30557 (9253 exists only as a CURS). The same ids recur across unrelated stacks
(1013, 1014, 1015, 21700, 30557, 32462), which fits icons that belong to the HyperCard application
(probable). Their pixels are **not available** in the corpus. Mark Twain carries its own copy of
1015. Scripts can also set icons by name (`set icon of me to "Inverse Grow Box"`, Wordle). Name
lookup goes through the resource name list, and those names are not in the Wordle fork.

---------------------------------------------------------------------------------------------------

## 5. Script language (HyperTalk) as observed in the corpus

### 5.1 Where scripts live and how they were measured
Scripts: the stack (STAK 0x600), each BKGD and CARD (after the name), and each part (after the name).
All are Mac Roman C strings with CR line ends.

The counts below come from the extraction script `ht_extract.py` (Documenter scratchpad), run over
**all 288 non-empty scripts of the 10 stacks**: 8 stack, 3 background, 14 card, 147 card-button,
64 background-button, 38 card-field and 14 background-field scripts. Method: remove `--` comments
(outside string literals), join lines that end in `¬`, keep only the **3 525 logical lines inside
handlers**, and split `if … then S else S` into statements. Counts are occurrences, so identical
scripts on several parts are counted each time. "[n stacks]" = how many of the 10 stacks use the
form. The counts come from regexes over text and are approximate to ±1–2 on rare forms.

### 5.2 Lexical rules (observed)
* **Case does not matter:** `on mouseUp … End mouseUp`, `Go Home`, and Patients is entirely upper case
  (`ON CLOSEFIELD`, `END IF`, `SEND MOUSEUP TO BKGND BUTTON "CC"`).
* **Comments:** `--` to end of line (`-- hilight selection and follow drag`). Whole handlers are
  commented out this way in Wordle and Patients.
* **Line continuation:** a line ending in `¬` (Mac Roman 0xC2) continues on the next line (66 such
  lines in the distinct scripts):
  `put (theLeft + round((theRight - theLeft) / 2)) & "," & ¬` / `(theTop + round((theBottom - theTop) / 2)) into thePoint`.
* **Strings:** double quotes, no escape mechanism seen. The constant `quote` gives a quote character
  (`put offset(quote, thePath) into theQuote`, 14×).
* **Unquoted literals:** unquoted words that are not variables act as their own text
  (FLC: `put CVC into SYL`, then `if SYL is CVC then …`; `go cd Main`; `cd fld Lexicon`). probable
* **Text outside handlers:** 46 non-comment lines in 4 stacks sit outside any `on`/`function` block
  (decorative banners such as `••••> POWERHEADER™ For This Script <•••`, `Graph Maker 2.2`, credits).
  A translator should ignore lines outside handlers. probable
* Characters `≠`, `≤`, `≥` appear as operators (Mac Roman single bytes).

### 5.3 Handlers
* **Message handler:** `on <name> [p1, p2, …]` … `end <name>`. 25 handlers take parameters
  (`on drawLine startPoint, endPoint`, `on setFont fontName,fontSize,fontAlignment,fontStyle`).
* **Function handler:** `function <name> [p1, …]` … `end <name>`. 33 definitions in 2 stacks
  (`function centerPoint theRect`, `FUNCTION DATELINE FLD`). They return with `return <expr>`
  (40 statements, e.g. `return thePath`, `else return (trunc((wholeNumber/divisor) + 1)) * divisor`).
* **System messages.** These handlers are never called by any script, so the system must send them
  (probable). `mouseUp` and `mouseDown` are only called by `send`:

| handler | definitions | stacks | example owner |
|---|---|---|---|
| mouseUp | 206 | 10 | almost every button: `on mouseUp` / `go next` / `end mouseUp` |
| mouseDown | 42 | 4 | fields/buttons: `on mousedown` … `put the clickLoc into ClickedHere` |
| openCard | 12 | 4 | card/bkgd/stack: `on openCard` … `pass openCard` |
| closeCard | 9 | 2 | |
| mouseEnter / mouseLeave | 7 / 7 | 1 | Patients buttons |
| openStack | 6 | 6 | stack: `on OpenStack` / `hide menubar` / `play "DkCasMus"` |
| closeField | 6 | 1 | Patients: `ON CLOSEFIELD` / `IF FLD "DOB" IS NOT A DATE` |
| closeStack | 5 | 5 | `on closeStack` / `doMenu "Compact Stack"` |
| returnInField | 4 | 1 | Game Genie: `on returninfield` / `send mouseup to cd btn "decode"` |
| arrowKey | 3 | 3 | FLC: `on arrowKey` / `go this card` |
| tabKey | 2 | 1 | Wordle fields |
| keyDown | 1 | 1 | Wordle card: `on keyDown theKey` (also sent by scripts: `send "keyDown S"`) |
| resumeStack, suspendStack, openField, mouseWithin, resume, stackopen | 1 each | | `stackopen` (Cthulhu) is probably a misspelling that never fires |

* **Calling user handlers** (observed forms):
  * as a command: `updateTotals`, `drawLine startPoint, endPoint`, `setWinRow theRow, 0`,
    `setKeyboardLetter (character j of theWord), true`;
  * with `do`: `do sortLex`, `do makeWord` (30 `do` statements; Patients also uses
    `DO "PUT NEWNAME INTO" && LOCAL`, which runs a built string);
  * as a function: `put getRow() into theRow`, `setCol(1)`, `put centerPoint(the rect of me) into startPoint`;
  * with `send`: `send mouseup to cd btn "decode"`, `send "keyDown S"`,
    `SEND "DOMENU COMPACT STACK" TO HYPERCARD`, `send mouseUp to this card`.
* **pass:** `pass openCard` (11×). The message continues to the next object in the chain.
* **Handlers that are not defined in the stack:** Game Genie calls `bin2dec(...)` and `bin(...)`,
  defined in another stack loaded with `start using stack "genie des jeux"`. That stack is not in the
  corpus. Patients calls XFCN/XCMD code resources from its fork (`PopMenu`, `Piece`, `MouseToLine`,
  `popUp`, `sortLines`, `ChangeCase`, `PRINTENGOOD`), and they cannot be run. A translator must
  stub these and log them.

### 5.4 Commands (first word of each statement, all 10 stacks)

| command | count | stacks | quoted examples |
|---|---|---|---|
| put | 598 | 8 | `put the clickLoc into ClickedHere` · `put char (cr+1) div 2 of "AEPOZXLUGKISTVYN" after cd fld tcoda` · `if the optionkey is down then put tcod` |
| set | 160 | 7 | `set lockText of target to false` · `set the hilite of bkgnd btn "Welcome" to true` · `set the cursor to busy` |
| go | 144 | 9 | `go prev` · `go to card id 2523` · `go to card "list card"` · `Go Home` |
| repeat | 86 | 6 | `repeat with i=1 to 6` · `repeat 20` · `repeat until the mouse is up` |
| exit | 75 | 6 | `exit mouseup` · `exit repeat` · `exit to hyperCard` |
| play | 72 | 4 | `play "DkCasMus"` · `play harpsichord tempo 300 c#4q g#3q` · `play stop` |
| global | 70 | 5 | `global soundoff` · `global wordLoc, SYL, SF, BTC` |
| hide | 62 | 6 | `hide menubar` · `hide cd fld Glossary` · `hide card button ID 125` · `hide me` |
| answer | 58 | 7 | `answer "Wrong character(s) in Code field"` · `answer "Are you sure you want to quit" with "Yes" or "No"` |
| send | 54 | 4 | `send mouseup to cd btn "decode"` · `send "keyDown Z"` |
| get | 48 | 3 | `get the number of this card` · `GET THE FOUNDCHUNK` |
| return | 40 | 2 | `return thePath` |
| show | 39 | 4 | `show menuBar` · `show card field "row"` · `show bg btn "GrowLegend"` |
| wait | 34 | 6 | `wait until the sound is "done"` · `wait 200` · `wait 300 ticks` · `wait 1 second` |
| visual | 34 | 7 | `visual effect dissolve very fast` · `visual wipe left fast` |
| lock / unlock | 34 / 31 | 4 / 3 | `lock screen` · `unlock screen` · `lock messages` |
| do | 30 | 2 | `do sortLex` |
| choose | 26 | 3 | `choose browse tool` · `choose line tool` · `choose "Select Tool"` |
| select | 23 | 4 | `select char i  of cd fld tcoda` · `select text in background field "quotation"` · `SELECT BEFORE TEXT OF FLD "BOO"` · `select after line theLine of bg field "Data"` |
| type | 20 | 2 | `type return` · `type line lineNum of labels` |
| delete | 18 | 2 | `delete char 1 to theQuote of thePath` · `delete last char of theText` · `DELETE LINE N OF FLD "TEXT"` |
| ask | 15 | 3 | `ask "Find what?"` · `ask "How many words do you wish to generate?" with "12"` |
| add / subtract | 13 / 5 | 3 / 2 | `add 1 to LIN` · `subtract 1 from cd fld Count` |
| click | 11 | 4 | `click at the loc of bkgnd btn "Next"` · `click at right of target - 20, item 2 of ClickedHere with shiftKey` |
| pass | 11 | 4 | `pass openCard` |
| doMenu | 8 | 4 | `doMenu "Compact Stack"` · `doMenu "Quit HyperCard"` · `doMenu "Select All"` · `doMenu "Clear Picture"` |
| find | 8 | 2 | `find whole it` · `FIND WHOLE NAME` · `find it` |
| sort | 7 | 3 | `sort lines of cd fld Lexicon ascending` · `sort dataList descending numeric` · `SORT BY LAST WORD OF FLD "NAME"` |
| push / pop | 7 / 6 | 2 | `push card` · `pop card` |
| open / close | 4 / 5 | 2 / 3 | `open file fileName` · `close file fileName` · `open printing` · `close printing` |
| reset | 5 | 2 | `reset paint` |
| enable / disable / create | 5 / 4 / 4 | 1 | `ENABLE MENU "Procedure"` · `CREATE MENU "Procedure"` |
| next | 4 | 1 | `IF IT IS "TITLE" THEN NEXT REPEAT` |
| beep | 3 | 2 | `if holder = "" then beep` |
| speak | 3 | 1 | `speak "The end!"` · `speak "…" with female voice` |
| drag | 3 | 1 | `drag from startPoint to endPoint` |
| print | 2 | 1 | `print cd fld Lexicon` |
| read / write | 1 / 1 | 1 | `read from file filePath for 16384` · `write card field Lexicon to file fileName` |
| start / stop | 1 / 1 | 1 | `start using stack "genie des jeux"` · `stop using stack "genie des jeux"` |
| flash | 1 | 1 | `flash 6` |

Every other first word is a call to a user handler (list in 5.3), for example `checkUserCancel` (11),
`goTopic` (10), `setCol` (7), `drawLine` (7) and `eraseLine` (7).

### 5.5 Control structures

**if** (8 stacks):

| form | count | example |
|---|---|---|
| `if C then` … `end if` (block) | 109 | `if soundoff = "on" then` … `end if` |
| `if C then S` (one line) | 94 | `if holder = "" then beep` |
| `if C` with `then S` on the next line | 65 | `if length(line theLine of textList) > longest` / `then put length(line theLine of textList) into longest` |
| `else if C then …` | 117 | `else if it is "Export" then` |
| `else` alone (block) | 42 | |
| `else S` (one line) | 11 | `else do basicSyl` · `else repeat until line LIN of card field Lexicon is empty` |
| `end if` | 171 | |

A one-line `if … then S` can be followed by `else …` on the next line
(`if SF <= 12 then put CVC into SYL` / `else if SF >= 13 and SF <= 16 then put CV into SYL`). A
translator must treat a one-line `if` as possibly continued by an `else` on the next line.

**repeat** (6 stacks), always closed by `end repeat` (85):

| form | count | example |
|---|---|---|
| `repeat with V = A to B` | 54 | `repeat with i=1 to 6` · `repeat with theKey = charToNum("A") to charToNum("Z")` |
| `repeat with V = A down to B` | 13 | `REPEAT WITH Z = NUMBER OF LINES OF FIELD FLD DOWN TO 0` |
| `repeat until C` | 4 | `repeat until the mouse is up` |
| `repeat while C` | 1 | `repeat while the mouse is down` |
| `repeat for N` | 4 | `repeat for NUM` |
| `repeat N [times]` | 2 | `repeat 20` |
| `repeat forever` / bare `repeat` | 4 / 2 | `repeat` … `if it is empty then exit repeat` |

Loop exits: `exit repeat` (15), `next repeat` (4).
**exit:** `exit <handlerName>` (57, leaves the handler), `exit to HyperCard` (3, aborts everything).

### 5.6 Expressions

**Containers and special values**
| item | count | example |
|---|---|---|
| `it` (set by `get`, `answer`, `ask`, `read`) | 146 | `answer "…" with "Both" or "Export" or "Sort"` / `if it is "Both" then` · `get the short name of this card` · `read from file filePath for 16384` / `if it is empty then exit repeat` |
| variables (implicit local; `global` shares them) | – | `put "APZLGITYEOXUKSVN" into letters` · `global gDebug` |
| `empty` | 144 | `put empty into cd fld com` · `if co is empty then` |
| `me` (the object whose script runs) | 67 | `set style of me to rectangle` · `put empty into me` · `hide me` |
| `target` / `the target` | 5 / 1 | `set lockText of target to false` · `go card (the short name of the target)` |
| `the result` | 7 | `open file filePath` / `if the result is empty then` |
| message box: `msg`, `message`, `message box`, `put X` with no destination | 15 + 8 | `hide msg` · `put the loc of message into temp` · `if the optionkey is down then put tcod` |
| `selection` | 2 | `put selection into holder` |
| fields as containers | – | `put empty into cd fld Batch` · `subtract 1 from cd fld Count` · `put "…" into word WRD of LNG` |
| constants | | `true`/`false` (100), `return` as the CR character (in expressions, e.g. `≠ return`), `quote` (14), `space`, `zero` |

**put** destinations: `into` (576), `after` (14), `before` (seen in `select before`), none = message
box (8).

**Chunk expressions** (chunks are 1-based):
| form | count | example |
|---|---|---|
| `line N of X` | 104 | `if line LIN of cd fld Lexicon is empty then` |
| `word N of X` | 89 | `put word 2 of the clickchunk into cr` |
| `char N of X` (also `character`) | 60 | `put char c of tobin into tch` · `character j of theWord` |
| `item N of X` (comma-separated) | 41 | `put item 1 of theRect into theLeft` |
| ranges `char A to B of X` | 8 | `char i*4-3 to i*4 of tobin` · `select char 1 to 100 of cd fld addr` |
| nested chunks | 1+ | `SELECT AFTER CHAR 19 OF LINE NXTLINE-3 OF FIELD "TEXT"` · `item offset (char i of tcod,letters) of bina` |
| ordinals `first/last/any` | 17 | `last char of theText` · `the first word of line theGame of card field "words"` · `go to any card in background quotations` |
| counts | 33 | `the number of words in LNG` · `number of lines in data` · `the number of cards` |
| chunk as a destination | | `put tch into char (char c of scram) of data` · `put CV into word LOC of cd fld Sylab` |

**Object references**
| form | count | example |
|---|---|---|
| `card field` / `cd fld` + name or expression | 315 | `cd fld tcoda` · `card field "words"` · `card field ("letter " & numToChar(theKey))` |
| bare `field` / `fld` | 250 | `FIELD "TEXT"` · `fld "Body Dev"` |
| `bkgnd field` / `bg field` / `background field` | 33 | `bg field "Data"` · `background field "quotation"` |
| `card button` / `cd btn` | 39 | `cd btn "decode"` · `card button ID 125` |
| `bkgnd button` / `bg btn` / `background button` | 46 | `bkgnd btn "Next"` · `BKGND BUTTON "PRINT"` |
| `<object> id N` | 60 | `card id 2523` · `card button ID 125` |
| card by name / expression | 41 | `card "list card"` · `cd "Trade"` · `card (the short name of the target)` |
| remote part | 13 | `background field "data" of card "stats"` |
| `this card` / `this stack` / `this background` | 17 | `go this card` · `the long name of this stack` · `go to next card in this background` |
| `stack "name"` | 5 | `go to stack "home"` · `start using stack "genie des jeux"` |
| `card window` | 5 | `width of card window` |
| `last button` | 1 | `set the loc of last button to the mouseLoc` |
| existence test | 6 | `if there is a bkgnd btn it` · `if there is a cd btn "Drawgraph"` |

**Properties.** Two syntaxes are used: `the P of <object>` (87) and `P of <object>` without `the` (105):
* set on objects: `hilite` (24), `visible` (21), `name` (18), `textStyle` (13), `style` (11),
  `script` (6), `lockText` (4), `loc` (4), `icon` (2), `enabled` (2), `scroll` (2), `botRight`,
  `rect`. Examples: `set the visible of fld "Body Dev" to it`, `set hilite of cd button Lexicon to true`,
  `set the name of card button ID 125 to "Gaming"`, `set textStyle of card field letterField to outline`,
  `set style of me to rectangle`, `set the enabled of bkgnd btn "Previous" to NOT (it = 1)`,
  `SET SCROLL OF FLD "TEXT" TO HLINE*HSIZE`, `set SCRIPT OF BKGND BUTTON "PRINT" TO FLD "BOO"`.
* read: `the rect of bg btn "Legend"`, `the loc of bkgnd btn "Next"`, `the short name of this card`,
  `the long name of this stack`, `the number of this card`, `width of me`, `height of card window`,
  `bottom of me`, `right of me`, `name of me`, `the textHeight of fld "TEXT"`, `THE ID OF THIS CARD`,
  `THE FREESIZE OF THIS STACK`, `the script of …`.
* global properties (`set P to V`): `cursor` (12: `set the cursor to busy`, `set cursor to "Grab Hand"`),
  `lockScreen` (10), `lockMessages` (9), `userLevel` (4), `lineSize`, `pattern`, `filled`, `editBkgnd`,
  `textFont`, `textSize`, `textHeight`, `textAlign`, `textStyle`.

**Built-in functions**
* `the <name>` with no argument: `the clickLoc`, `the clickChunk`, `the clickLine`, `the clickText`,
  `the mouse` (`repeat until the mouse is up`), `the mouseClick`, `the mouseLoc`, `the optionKey`,
  `the sound` (17×, `wait until the sound is "done"`), `the result`, `the date`, `the time`,
  `the version` (`if the version < 2.2 then`), `the foundChunk`, `the selectedLine`, `the selection`,
  `the userLevel`, `the textHeight`, `the stacks`, `the environment`.
* `the <name> of X` / `<name> of X`: `the random of 4`, `the length of cd fld tcoda`, `the number of …`,
  `the value of it`, `numToChar of (…)`.
* call syntax `f(args)` (built-in): `offset(quote, thePath)`, `offset (char i of tcod,letters)`,
  `length(…)`, `round(…)`, `trunc(…)`, `max(a,b)`, `min(a,b)`, `random(5)`, `numToChar(…)`,
  `charToNum("A")`, `param(1)`.

**Operators** (counts = lines containing them)
| operator | count | example |
|---|---|---|
| `is`, `is not` | 198, 46 | `wait until the sound is "done"` · `else if cd fld Batch is not empty then` |
| `=`, `<>`, `≠` | 138, 9, 8 | `if c <>9 then` · `repeat until last char of theText ≠ return` |
| `<`, `>`, `<=`, `>=`, `≤`, `≥` | 30, 133 | `if adr<0 or adr>65535 then` · `if SF >= 13 and SF <= 16 then` |
| `+ - * /`, `div`, `mod`, `^` | 112, 15, 5, 2 | `put char (cr+1) div 2 of …` · `if wholeNumber mod divisor = 0` · `10^(length(wholeNumber) - 1)` |
| `&` (concatenate), `&&` (with a space) | 105, 22 | `stackPath & ":" & fileName` · `"…" && "requires version 2.2…"` |
| `and`, `or`, `not` | 63, 52, 51 | `if lc=6 or the optionkey is down then` · `NOT (it = 1)` |
| `contains`, `is in`, `is not in` | 5, 17 | `else if theMatch contains character j of theWord then` · `IF "/" IS IN LINE Z OF FIELD FLD` |
| `is a <type>` / `is not a` | 8 | `if ((line count of data is not a number) or …` · `IS NOT A DATE` |
| `there is a` | 6 | `if there is a bkgnd btn it` |

### 5.7 Navigation, effects, sound, dialogs

**go** (144):
| form | count | example |
|---|---|---|
| `go [to] card id N` | 56 | `go to card id 3185` |
| `go [to] card "name"` / `cd <expr>` | 39 | `go to card "list card"` · `go cd "Trade"` · `go cd Main` · `go to cd holder` |
| `go home` | 7 | `Go Home` (leaves the stack) |
| `go [to] next/prev/previous/first/last [card]` | 30 | `go next` · `go prev` · `go first` · `go last card` · `go previous card` |
| `… in/of this background` | 3 | `go to next card in this background` · `go to prev card of this background` |
| `go [to] first card of bg "Title"` | 4 | |
| `go [to] any card in background X` | 2 | `go to any card in background quotations` |
| `go [to] background "X"` | 3 | `GO TO BACKGROUND "PATIENT INFO"` |
| `go back` | 3 | |
| `go this card` | 1 | (redraws the current card) |
| `go [to] stack "name"` | 3 | `go to stack "home"` |

**visual effect** (34, 7 stacks). It comes right before a `go` (`visual effect stretch from bottom fast` /
`go cd "Trade"`). Forms seen, with counts:
`dissolve very fast` 6, `dissolve to black` 4, `stretch from top fast` 3, `stretch from bottom fast` 2,
`dissolve slowly` 2, `venetian blinds to grey` 2, `stretch from bottom very slow`,
`stretch from center very slow`, `dissolve slow`, `dissolve very slowly`, `dissolve`, `scroll left`,
`wipe left`, `wipe left very slowly`, `wipe right very slowly`, `iris close`, `iris close to inverse` (1 each),
and without the word `effect`: `visual wipe left/right [fast]` (4).
Grammar: `visual [effect] <name> [from top|bottom|center | left|right] [very] [fast|slow|slowly] [to black|grey|inverse]`.

**play** (72, 4 stacks): `play "<sound name>"` (52, e.g. `play "Don't Worry.snd"`), and
`play <instrument> [tempo N] <notes>` (19, e.g. `play harpsichord tempo 150 b4e c5e d3e f4e g3q`,
`play flute`), `play stop` (1). Followed by `wait until the sound is "done"` (19). Sound names refer to
`snd ` resources (Fishing plays "MJW", which is `snd ` 16621 named "MJW" in its fork). Most sounds
are not in the corpus forks. probable

**wait:** `wait N` (in ticks, probable), `wait N ticks`, `wait N second(s)`, `wait until C`.

**Dialogs:** `answer "msg"` (35), `answer "msg" with "A" or "B" [or "C"]` (23; the chosen label goes
into `it`), `ask "prompt" [with "default"]` (15; the reply goes into `it`, empty on cancel:
`if it is empty then exit exportLex`).

**show/hide** targets: card/bkgnd buttons and fields (by name, id or expression), `me`, `menubar`,
`msg`/`message`/`message box`, `titleBar`.

**Painting and tools** (Wordle chart code): `choose line tool`, `choose browse tool`,
`set lineSize to 2`, `drag from startPoint to endPoint`, `doMenu "Select All"`, `doMenu "Clear Picture"`,
`reset paint`. These draw into the card picture at run time.

### 5.8 Translator checklist
1. Split scripts into handlers. Ignore text outside handlers and `--` comments. Join `¬` lines.
2. Match keywords case-insensitively. Accept `cd`/`card`, `bg`/`bkgnd`/`background`, `fld`/`field`,
   `btn`/`button`, `prev`/`previous`, `char`/`character`.
3. Message dispatch: part → card → background → stack, with `pass` continuing the chain
   (probable, from `pass openCard` usage in card scripts). `send M to <object>` targets one object.
4. Unknown handlers (XCMD/XFCN, handlers from other stacks via `start using`) → stub and log.

---------------------------------------------------------------------------------------------------

## 6. Mapping to the Legacy IR (`docs/legacy-ir.md`)

**Top level**
| IR field | value |
|---|---|
| `ir_version` | 1 |
| `program` | `"hypercard"` |
| `source` | `{ "file": <.stak file name>, "bytes": <data fork size> }` |
| `name` | the file name without `.stak` (the stack has no stored name field we know of) |
| `size` | `{ "width": STAK 0x1BA or 512, "height": STAK 0x1B8 or 342 }` (the card size, not the screen size) |
| `units` | `"px"` |
| `start_screen` | `"card-<STAK 0x30>"` (= first card in order). Opening scripts may move elsewhere (Oblique's `on openStack` does `go card 2`) |
| `script` | `{ "language": "hypertalk", "text": <STAK 0x600 script> }`, or null if empty |
| `layers` | one per BKGD, in ring order from STAK 0x28 |
| `screens` | one per CARD, in LIST/PAGE order |
| `assets` | picture PNGs + icon PNGs |
| `notes` | everything skipped (list below) |

**Layer (one per BKGD)**
```json
{ "id": "bkgnd-2577", "name": "<BKGD name>", "image": "assets/bkgnd-2577.png",
  "objects": [ /* BKGD parts */ ], "script": {"language":"hypertalk","text":"…"} | null }
```
* `image`: an **opaque** card-size PNG = white + the BKGD picture (4.6 steps 1–2). Always emit it,
  all white when the BMAP id is 0, so the runtime does not have to assume a white base.
* Background field objects: `text` = the BKGD block's own content record for that field, if any, else "".

**Screen (one per CARD)**
```json
{ "id": "card-2996", "name": "<card name>", "number": <1-based position in card order>,
  "layers": ["bkgnd-2577"],
  "image": "assets/card-2996.png" | null,
  "objects": [ /* CARD parts */ ],
  "layer_text": { "bkgnd-2577/field-1": "<this card's text for bkgd field 1>" },
  "script": … | null, "grid": null }
```
* `image`: if the card's BMAP id is non-zero, a card-size **RGBA** PNG: alpha = the mask (4.6 table,
  including the zero-mask-rect rule → alpha only where the image is black), colour = black where the
  image bit is 1, white where it is 0. Fully transparent outside the mask. null if there is no BMAP.
* `layer_text`: one entry per content record in the CARD block with a **positive** owner id that
  matches an existing BKGD part. Key = `"<layer id>/field-<part id>"`.

**Object (one per part)**
| IR | source |
|---|---|
| `id` | `"<owner id>/<button|field>-<part id>"`, e.g. `"card-2996/button-14"`, `"bkgnd-2577/field-1"` (unique in the file and matches the layer_text keys) |
| `kind` | `"button"` (kind 1) / `"field"` (kind 2) |
| `name` | part name |
| `number` | 1-based position of the record in its owner's part list (whether HyperTalk numbers buttons and fields separately is unknown) |
| `rect` | **[left, top, right, bottom]**, reordered from the stored top, left, bottom, right |
| `visible` | `not (flagsA & 0x80)` |
| `style.shape` | button: 0 → `"transparent"`, 3 → `"roundrect"`. Field: 0 → `"transparent"`, 2 → `"rectangle"`, 4 → `"shadow"`, 7 → `"scrolling"`. Any other value → `"style-<n>"` plus a note |
| `style.font` | FTBL name for the part font id (format 8: no FTBL → null plus a note) |
| `style.size` | +24 |
| `style.align` | 0 → `"left"`, 1 → `"center"`, −1 → `"right"` |
| `style.show_name` | buttons: `bool(flagsB & 0x8000)`. Fields: false |
| `style.highlight` | buttons: `bool(flagsB & 0x4000)` |
| `style.locked` | fields: `bool(flagsA & 0x01)` (probable meaning) |
| `text` | fields: card fields → the CARD's record with owner −id. Background fields → see Layer above (per-card text goes into `layer_text`). Buttons: the name (the label) |
| `icon` | `"assets/icon-<id>.png"` if an ICON with that id is in the stack's resource fork, else null |
| `script` | part script or null |
| `extra` | `{ "part_id", "flags_a", "flags_b", "style_number", "text_style", "line_height", "font_id", "icon_id", "enabled": not (button && flagsA & 0x01), "runs": [{"start", "font", "size", "style"}] (styled text, from STBL with −1 resolved to the part's values), "icon_top_offset": -6 if show_name else 0 }` |

**Assets**
* `{ "id": "bkgnd-<id>", "kind": "image", "file": "assets/bkgnd-<id>.png", "width": W, "height": H }`, and the
  same for `card-<id>`.
* Icons: `{ "id": "icon-<id>", "kind": "image", "file": "assets/icon-<id>.png", "width": 32, "height": 32 }`,
  1-bit pixels as RGBA: black opaque, white **transparent** (only the black bits were checked against
  screenshots, see 7). Export only the ICON ids that some button uses (others are optional).
* **Icons not in the stack's fork belong to the HyperCard application and are unavailable.** Set
  `icon: null`, keep `extra.icon_id`, and add a note: `"icon 1014 (card-…/button-5): not in stack
  resource fork (HyperCard application icon), not exported"`.
* Sounds: `snd ` resources are not decoded. Add a note for each `play "<name>"` target.

**Notes to emit** (IR rule: never drop silently): skipped PRNT/PRST/PRFT blocks; unknown style
numbers; missing icons; BMAP opcodes 0x87/0x88/0x9x/0xFx if met; stale content records ignored;
colour icon types; XCMD/XFCN resources present; unknown flag bits that are set.

**Display context** (for comparing with screenshots, not for the reader): cards smaller than the
screen are shown in a window on a 512×342 screen. The offsets seen in the reference screenshots are
FLC (48, 51), What is HyperCard (16, 40) and Mark Twain (144, 40). The STAK window rect does not give
these offsets. Screenshots also show the menu bar, the cursor and rounded screen corners, which are
not card data.

---------------------------------------------------------------------------------------------------

## 7. Known unknowns

### Safe to skip
* MAST slot choice (use the block walk); FREE, PRNT, PRST, PRFT block contents; TAIL text.
* STAK 0x0C, 0x1C, 0x20, 0x44, 0x48, 0x4A–0x4F, 0x60 slot meanings, 0x70, 0x78 window rect, 0x84,
  and the 0x2C0 pattern list.
* LIST h+0x0E, h+0x12, h+0x14. PAGE h+4. The page-entry hash bytes and flag bits 0x40/0x20/0x10.
* CARD/BKGD flag word (0x0000/0x4000).
* STBL entry +4/+8 words.
* Resource map +0x10..0x15, map attributes, reference attributes, file bytes 0x10..0xFF.
* Colour icons (icl4/icl8/ics4/ics8): no palette. `snd `, `PICT`, `DLOG`, `DITL`, `FONT`, `FOND`,
  `XCMD`, `XFCN` contents.

### Open questions (affect rendering or behaviour)
1. **Part flag bits:** flags A 0x01 on fields, 0x04, 0x08, 0x02, 0x10, 0x20. Flags B 0x2000, 0x1000, 0x0100.
2. **Button styles 1, 2, 4, 5, 6 and field style 1:** how they look. Button frame and hilite drawing
   around icons.
3. **Text style bits** (0x0100, 0x0200, 0x0400, 0x0800, 0x4000 in part +26 and STBL +14): which bit
   is bold, italic, underline, outline, shadow and so on.
4. **Alignment −1 = right** (no observed case confirms it).
5. **Format-8 font names** (no FTBL; font id 0).
6. **BKGD content records:** shared text or default text (flag A 0x08?).
7. **Bitmap:** ops 0x87 and 0x88 (never seen); 0x90–0x9F and 0xF0–0xFF; a repeat prefix before byte
   ops, and the counts 0/1; row ops met with a partial buffer; the row base of the 0x83/0x84 pattern
   index (rect top or card top); whether a "mask rect set, no mask data" card picture over a
   background picture is opaque (no test case).
8. **Icons:** pixels of application icons (ids missing from every fork); whether the white pixels of an
   ICON are drawn opaque. The ICN#/ics#/CURS mask planes are probable.
9. **Format values** other than 8 and 10 (header length rule untested).
10. **HyperTalk semantics** are inferred from usage only (no interpreter was run): message order,
    `wait N` units, numbering of parts, how unquoted literals are evaluated.
