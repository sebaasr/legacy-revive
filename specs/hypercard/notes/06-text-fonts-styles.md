# 06 – Field text (content records), font table, style table

Probes: `probes/hc.py` (`parse_content`), `probes/fonts_styles.py`, `probes/dump_stack.py`.

## Content records — confirmed (576 records, all consistent)
They follow the part list inside a CARD or BKGD block (count and byte length in the block header, see 04).

| off | type | meaning |
|-----|------|---------|
| +0 | i16 | which part: **negative = card part, id = −value**; **positive = background part with that id** |
| +2 | u16 | n = byte length of the body |
| +4 | n bytes | body |
| +4+n | 0/1 byte | pad to even |

Body:
* If the first byte has bit 0x80 set: u16 `0x8000 | L` where L = length of the style header including these 2 bytes,
  then (L−2)/4 style runs of `u16 char offset, u16 style id` (→ STBL). The text follows (n − L bytes).
* Otherwise: one 0x00 byte, then the text (n − 1 bytes).
* Text is Mac Roman, CR line ends, no terminator inside n (no NUL in any of 576 texts).

Evidence: in every CARD/BKGD the records add up to the declared content length; in all 40 styled
records the run offsets start at 0, ascend, stay ≤ text length, and every style id exists in STBL.
Example Game Genie 0x1C18: `ffff 0013 8006 0000 0006 50 50 41 4f 55 4b 0d 45 47 4c 50 45 58 00` →
card part 1, 19 bytes, style header 6 bytes, one run (offset 0, style 6 = Courier 48), text `PPAOUK\rEGLPEX`, pad.

Who owns the text:
* Card-part fields: text in the card, id negative.
* Background fields: the text **for that card** is stored in the card block with the positive bkgd part id
  (e.g. Mark Twain: 363 cards each hold their own quotation for bkgd field 5). Confirmed against BKGD part lists.
* BKGD blocks can hold content records too (Mark Twain: bkgd fields 1, 5, 22; field 22 `intro` = "Click anywhere for a new quotation…").
  Whether this is "shared text" or a default is unknown (see flag 0x08 in 05).
* Stale records exist: Game Genie card 2996 has records for card parts 2, 5, 7 and bkgd part 1 that no longer exist. Readers should ignore records whose part is missing.
* Only fields (kind 2) ever get content records; button text never appears here.

Screenshot check: Game Genie reference.png shows `ZKELOLUP`, `15233`, `66`, `147` in the boxes for
fields `tcoda`, `addr`, `dat`, `com`; those are exactly the parsed texts.

## FTBL (font table) — confirmed
| off | meaning |
|-----|---------|
| h+0 | u32 number of fonts |
| h+4 | u32 0 |
| h+8 | entries: u16 font id, C-string name, then pad to an even offset (the pad byte holds junk, e.g. `82`, `e1`) |

Example Game Genie 0x1298: `0080 "Charcoal" 00 82 | 0003 "Geneva" 00 e1 | 0016 "Courier" 00 | 3b06 "Brinstar16" 00 37 | 0001 "Geneva" 00 56 | 0000 "Geneva" 00 ee | 0004 "Monaco" 00`.
Every part font id is found in FTBL (9/9 stacks with FTBL). Format 8 has no FTBL (font ids 0 only).

## STBL (style table) — confirmed layout, partial semantics
| off | meaning |
|-----|---------|
| h+0 | u32 number of entries |
| h+4 | u32 next free style id (== max id + 1 in all 7 stacks with entries) |
| h+8 | entries, 24 bytes each |

Entry: `+0 i32 style id`, `+4 u32` (always 1), `+8 u32` (always 0), `+12 i16 font id`, `+14 i16 text style`,
`+16 i16 size`, `+18` 6 zero bytes. **−1 in font/style/size means "use the field's own value"**
(probable: run style 1 in Game Genie is all −1 and covers the plain letters, style 3 = size 9 only covers the spaces between them).
Ids are not always 1..n (FLC, What is HyperCard, Patients skip ids) — look them up by id.
Text-style values seen: 0, 0x0100, 0x0500, 0x4000 (bits live in the high byte, as in part +26). Bit meanings unknown.
