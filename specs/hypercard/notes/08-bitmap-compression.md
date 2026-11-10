# 08 – BMAP picture compression, masks and compositing (PART 2)

Built from the BMAP streams of the 10 samples (386 streams: 249 image, 137 mask) and checked
pixel by pixel against each sample's `reference.png`.

Probes (run from the project root):
* `probes/bitmap.py`: the decoder. With no arguments it decodes every stream and prints opcode counts
  and how many bytes are left after the last row.
* `probes/render_card.py <file.stak> <card_index|card_id> <out.png>`: composites one card.
* `probes/bitmap_check.py [--save DIR]`: renders every card of every sample, picks the one that best
  matches the screenshot and prints match percentages.
* `probes/bmap_dump.py`: lists each BMAP's rects and the first bytes of its streams.
* `probes/shown_ops.py`: opcodes used by the pictures of each displayed card.
* `probes/mode_ablation.py`: proves the row-filter table (slow, about 2 minutes).

## Result
| sample | cards | card shown | all % | without visible parts % | also without menu bar % | screen offset |
|---|---|---|---|---|---|---|
| cthulhucard | 32 | #0 | 99.18 | 100.00 | 100.00 | (0,0) |
| fishing-animation | 25 | #0 | 99.46 | 100.00 | 100.00 | (0,0) |
| game-genie-encoder-decoder | 2 | #0 | 76.40 | 100.00 | 100.00 | (0,0) |
| hypercard_fantasylanguagecreat1 | 3 | #0 | 100.00 | 100.00 | 100.00 | (48,51) |
| hypercard_hyper-wordle | 6 | #0 | 93.79 | 100.00 | 100.00 | (0,0) |
| hypercard_inigo_gets_out | 31 | #0 | 99.90 | 99.95 | 99.95 | (0,0) |
| hypercard_obliquestrategies | 130 | #1 | 94.35 | 94.68 | 100.00 | (0,0) |
| hypercard_what_is_hypercard_2 | 10 | #0 | 98.21 | 100.00 | 100.00 | (16,40) |
| mark-twain---300-quotations | 366 | #0 | 96.13 | 100.00 | 100.00 | (144,40) |
| patients-v15 | 8 | #0 | 95.44 | 100.00 | 100.00 | (0,0) |

"100.00" is rounded. The only pixels left over once parts and the menu bar are masked out are:
* 1 to 4 pixels in the bottom-right screen corner (510..511, 340..341) in Cthulhu, Fishing, Wordle,
  Oblique and Patients. That is the screen's rounded corner, not card data.
* 71 pixels in Inigo: the mouse cursor (a hand at about 55,170).
The "all %" losses come from buttons and fields (not drawn by the renderer), and in Oblique from the
menu bar drawn by the emulator.

Shown card: card #0 everywhere except Oblique, whose stack script says `go card 2` in `on openStack`
(dump_stack.py). bitmap_check picks #1 for Oblique on pixels alone, without reading the script.
Cards smaller than the screen sit in a window. The offset is found by searching all positions:
FLC 416×240 at (48,51), What is HyperCard 480×296 at (16,40), Mark Twain 224×288 at (144,40). FLC's
x offset is centred, (512−416)/2 = 48. The STAK "window rect" fields do not match these offsets, because
the emulator places the window itself.

## Stream layout (confirmed)
* Each stream (mask or image) covers its own rect from the BMAP header (07). It holds `bottom − top`
  rows of `W = 4 × (ceil(right/32) − floor(left/32))` bytes, so the rect is widened to whole 32-pixel
  columns. Pixel x of a row lands at card x `floor(left/32)·32 + x`. Bits are MSB-first and 1 = black.
  Evidence: with this W, all 386 streams end after exactly the last row with 0 to 3 bytes left over,
  so the data is padded to a multiple of 4 (bitmap.py: `short 0`, leftover counts 0/1/2/3 only).
  Example widths: Cthulhu 3350 rect l=164 r=353 → W = 4·(12−5) = 28. Mark Twain r=224 → 28.
* Bits outside left..right in the widened rows are always 0 (all 386 streams). Clipping to the rect
  therefore changes nothing.
* Left-over padding bytes are junk. The most common is `af 85 e3` (125 streams). Other values: `ff`,
  `00`, nothing.
* Byte ops (00–7F, C0–DF, E0–EF) add bytes to a row buffer. A dz op may run past the end of a row
  into the next one: this happens 118 times, and FLC 5099, Mark Twain 4346 and Patients 266993, which
  are all shown and match 100 %, contain such ops. Row ops (80–87) only ever appear at a row start
  (0 exceptions).

## Opcodes
Counts are over all 386 streams (bitmap.py totals). "Shown" means the op appears in a picture that is
on a displayed card and was checked against a screenshot.

| byte | meaning | count | status / evidence |
|---|---|---|---|
| `0x00–0x7F` = `dz` | high nibble d = number of literal bytes that follow, low nibble z = number of zero bytes. The z zeros are written first, then the d literals | 119 249 | **confirmed**. Fishing rows: `11 03`, `e3`, `0e` = 2+48+14 = 64 bytes. Game Genie row 20 decodes to the screenshot bytes. 100 % matches. z=0 4 009×, d=0 29 215× |
| `0xC0–0xDF` | (c & 0x1F) × 8 literal bytes follow | 12 678 (n = 1..7 seen) | **confirmed**. Cthulhu 12434 `7f`(7 literals)`c1`(8 literals)`e1`. Shown in several pictures |
| `0xE0–0xEF` | (c & 0x0F) × 16 zero bytes | 32 767 (n = 1, 2, 3 seen) | **confirmed**. Fishing `e3` = 48 |
| `0x80` | one uncompressed row: the next W bytes | 924 | **confirmed**. FLC bkgd (176×) and Mark Twain bkgd (156×) match 100 % |
| `0x81` | all-white row (zeros) | 896 | **confirmed**. Inigo rows 1,3,5… are `00` in the screenshot |
| `0x82` | all-black row (FF) | 41 | **confirmed**. Oblique blank BKGD `bf82`×11 `82` = 342 black rows, and the screenshot is black. Game Genie `b4 82` = top 20 rows black |
| `0x83 xx` | row filled with byte xx; xx is also stored in an 8-entry pattern table at index (row mod 8) | 16 | **probable**. 1 operand byte confirmed by stream alignment. Inigo 14620: `8310 8302 8320 8301 8308 8340 8304 8380` then `bf84…` gives a regular period-8 diagonal pattern. Not on a shown card |
| `0x84` | row filled with pattern-table byte [row mod 8]. Initial table = AA,55,AA,55,… (50 % grey) | 35 | **confirmed** for the default table. Inigo `8481`×14 gives rows AA/00 as in the screenshot. Cthulhu BKGD `b7 84` = 23 grey rows, both parities, 100 %. Whether "row" counts from the rect top or the card top is unknown (every shown case has top = 0) |
| `0x85` | copy the previous row | 2 528 | **confirmed**. Game Genie `a3 85` after a text row; screenshot rows 20–23 are identical |
| `0x86` | copy the row two above | 968 | **confirmed**. Shown in Cthulhu, Inigo, What is HyperCard (100 %) |
| `0x87` | (probably copy the row three above) | 0 | **unknown**, never seen |
| `0x88` | (probably a mode, see below) | 0 | **unknown**, never seen |
| `0x89–0x8F` | set the row filter used for every later row built from byte ops (stays until the next mode op; starts as none) | 89:1671, 8A:2413, 8B:1493, 8C:636, 8D:230, 8E:35, 8F:224 | **confirmed**, see the next table |
| `0xA0–0xBF` | repeat the next op (c & 0x1F) times | 3 727 (counts 2..31) | **confirmed**. Seen only before row ops 85 (2 160), 86 (894), 81 (622), 82 (30), 84 (21). Oblique `bf82` = 31 black rows |
| `0x90–0x9F`, `0xF0–0xFF` | never seen inside picture data. F-bytes only turn up in the padding after the last row | — | unknown / unused |

### Row filters (modes 0x89–0x8F)
When a byte-op row is complete it is decoded as:
1. horizontal: `out[x] = raw[x] XOR out[x − dh]` (bits, left to right; dh = 0 does nothing), then
2. vertical: `row = row XOR row[y − dv]` (the already-decoded row dv rows above; dv = 0 does nothing).
Row ops 80–87 are not filtered.

| op | dh (bits) | dv (rows) | status |
|---|---|---|---|
| 0x89 | 0 | 0 | confirmed |
| 0x8A | 0 | 1 | confirmed |
| 0x8B | 0 | 2 | confirmed |
| 0x8C | 1 | 0 | confirmed |
| 0x8D | 1 | 1 | confirmed |
| 0x8E | 2 | 2 | confirmed |
| 0x8F | 8 | 0 | confirmed |
| 0x88 | — | — | unknown (never used) |

Evidence (`probes/mode_ablation.py`): an ablation over the 10 shown cards, counting mismatching pixels outside parts and the menu
bar. The table above gives 81 mismatches, all of them cursor or corner pixels. Changing any single
mode to any of 11–17 other (dh,dv) values raises the count to between 6 762 and 214 551. Examples:
8E→(0,2) 12 649, (1,2) 12 649, (4,2) 18 618. 8F→(0,0) 6 762, (4,0) 6 808, (12,0) 8 682. 8A→(0,2) 59 385.
Worked example (Game Genie, after `8d`): row bytes 20..23 raw `20 20 00 10` → horizontal XOR with dh=1
gives `3f c0 00 1f` → XOR with the black row above gives `c0 3f ff e0`, which is exactly the screenshot.
Then `8a` and raw `3c` at byte 20 → `c0 XOR 3c = fc` (screenshot row 24 = `fc`).

## Mask and compositing
Render order: white card → BKGD picture → CARD picture. A picture layer draws its image pixels only
where its mask is 1.
| header case | mask meaning | status |
|---|---|---|
| mask stream present (rect + data) | the decoded mask bits (same codec) | **confirmed**. Oblique card #1 and FLC card #0: with the decoded mask they match 100 %. Using mask = image instead drops them to 97.55 % and 97.62 % (white text areas of the card must cover the black background) |
| mask rect 0,0,0,0, no data | mask = the image itself (only black pixels are drawn, white is transparent) | **confirmed** on Patients (99.999 %, against 97.18 % if the image rect were opaque). Cthulhu and What is HyperCard agree |
| mask rect = card rect (or another rect), no data | the whole mask rect is opaque | **probable/untestable**. In the corpus this case only occurs on BKGD pictures (drawn on white) and on cards with no background picture (Fishing, Game Genie, Inigo), where opaque and transparent give the same result |

Counts of the cases (layer, mask case, has background picture): CARD rect0 70; CARD with mask data
134; CARD full mask 30, none over a background picture; BKGD full mask 14.

## Opcodes seen per shown card picture (`probes/shown_ops.py`)
Cthulhu bkgd 3821: 84 86 89 8A 8B 8C 8D 8F + repeat. Inigo card 18036: 81 84 86 89 8B 8C 8E 8F.
What is HyperCard bkgd/card: 81 84 85 86 89 8A 8B 8C 8D 8E. FLC bkgd: 80 89 8B 8C. Mark Twain bkgd: 80 82
89 8A 8B 8C. Game Genie: 82 85 8A 8C 8D. Patients bkgd: 84 89 8A 8B 8C 8D 8E. Every opcode with a
non-zero count except 0x83 is therefore checked against a screenshot.

## Still unknown
* 0x87, 0x88, 0x90–0x9F and 0xF0–0xFF inside data (never used).
* Pattern-table row index base (rect top or card top) for 0x83/0x84.
* Whether a "full mask rect, no data" card picture hides the background's black pixels (no test case).
