# HyperCard stack format: analyst notes (PART 1 + PART 2)

Built only from the bytes of the 10 data forks in `corpus/hypercard/*/*.stak`, with the reference
screenshots used to check visual flags. PART 2 adds bitmap decompression (checked pixel by pixel against
the screenshots) and the resource fork / icon format (`*.rsrc`).
Probes live in `specs/hypercard/probes/`. Run each from the project root, for example
`python specs/hypercard/probes/layers.py`. With no arguments they test every sample.

| file | summary |
|------|---------|
| 01-container.md | Big-endian block chain (size, 4cc type, id; +4-byte filler in format 10), 32-byte granularity, MAST offset index, FREE table, TAIL, format 8 vs 10 |
| 02-stack-header.md | STAK fields: counts, first card/bkgd, LIST/FTBL/STBL/PRNT ids, card size, free table, stack script at 0x600 |
| 03-card-order.md | LIST page table and PAGE entries give the card order; entry flag byte |
| 04-cards-backgrounds.md | CARD/BKGD headers, background ring, part/content counts, names and scripts |
| 05-parts.md | 30-byte part header + name + script; rect, kind, font/size/style, icon, flag bits |
| 06-text-fonts-styles.md | Field text records (card vs bkgd ownership, style runs), FTBL font names, STBL text styles |
| 07-bitmaps.md | BMAP header (rects, mask/image lengths) |
| 08-bitmap-compression.md | BMAP codec: row widths, every opcode (dz/C0/E0 byte ops, 80–86 row ops, 89–8F XOR row filters, A0 repeat), mask semantics, compositing. Displayed cards match the screenshots at 100 % outside parts/menu bar |
| 09-resource-fork-icons.md | Resource fork container (header, map, type/ref/name lists), ICON 32×32 1-bit format, ICN#/ics#/CURS, button icon placement, icon ids missing from each stack |

## Probes
| probe | proves |
|-------|--------|
| `blocks.py [-v]` | block chain covers the whole file; per-type counts |
| `stak_header.py` | STAK counts/ids/sizes/free table match the blocks |
| `mast.py` | MAST entry = offset/32 << 8 \| id low byte; covers every indexed block |
| `list_page.py` | LIST/PAGE structure; card order covers every card once; first card |
| `layers.py` | CARD/BKGD header fields, size sums, background ring, page back-references |
| `fonts_styles.py` | FTBL/STBL layout; all part fonts resolve |
| `bmap.py` | BMAP header and size equation |
| `dump_stack.py <file.stak>` | prints everything recovered (blocks, header, fonts, styles, backgrounds, cards in order, parts, texts, scripts, BMAP headers) |
| `hc.py` | shared parser used by the probes |
| `bmap_dump.py` | lists every BMAP's rects and stream heads |
| `bitmap.py` | BMAP decoder; standalone: all 386 streams end after the last row with 0–3 pad bytes, opcode totals |
| `render_card.py <stak> <idx/id> <out.png>` | composites background + card picture |
| `bitmap_check.py [--save DIR]` | per sample: shown card, % matching pixels vs reference.png (all / without parts / without menu bar) |
| `shown_ops.py` | opcodes used by each displayed card's pictures |
| `mode_ablation.py` | proves the 0x89–0x8F row-filter table (each alternative is worse) |
| `rsrc.py` | resource fork parser + self-check on all `.rsrc` |
| `icons.py [<rsrc> <out_dir>]` | exports ICON/ICN#/ics# PNGs; no args: icon ids used vs missing per stack |
| `icon_check.py` | finds each visible button's ICON in reference.png (100 % for 8 buttons) |

## Main open questions
* Meanings of many flag bits (part flags A 0x01/0x04/0x08…, flags B 0x2000/0x1000/0x0100, button/field styles 1/5/6/7, CARD/BKGD 0x4000, page-entry bits 0x40/0x20).
* Text style bit meanings (values seen: 0x0100, 0x0200, 0x0400, 0x0800, 0x4000).
* STAK 0x0C, 0x20, 0x44..0x4F, 0x70; LIST h+0x0E/h+0x12/h+0x14; PAGE h+4; the hash bytes in page entries.
* MAST slot choice; PRNT/PRST/PRFT contents.
* Bitmap: ops 0x87/0x88 never seen; pattern-table row base for 0x83/0x84; meaning of a card picture's "full mask rect, no data" over a background picture (no test case).
* Icons: ids missing from the stack fork (probably in the HyperCard application); colour icon palettes; button frame/hilite drawing around icons.
