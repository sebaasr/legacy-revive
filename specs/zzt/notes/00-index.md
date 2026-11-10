# zzt analyst notes - index

Target: 1991 MS-DOS text-mode game-creation tool world files (`corpus/zzt/*/*.ZZT`, 8 files, 269 boards,
10,297 status records, 5,227 programs). Work from bytes only; reference.png used to check cell encoding.

| Note | Summary |
|---|---|
| [01-world-header.md](01-world-header.md) | 512-byte header: magic -1, board count-1, name (1+20), 10 flag slots (1+20), counters (mostly unknown) |
| [02-boards.md](02-boards.md) | Boards back to back from 0x200, each `u16 size` + name (1+50) + grid + 86-byte props + records |
| [03-grid.md](03-grid.md) | 60x25 RLE (count,element,color) row-major; color = fg/bg nibbles; text elements 47-53 store a char; palette; glyph rules; 99.93-100% match vs references |
| [04-board-properties.md](04-board-properties.md) | 86 bytes: shots?, dark?, exits N/S/W/E (confirmed by edge continuity), message (1+58), entry xy?, time? |
| [05-status-records.md](05-status-records.md) | i16 count-1, then 33-byte records (x,y 1-based, step, cycle, p1-p3, follower/leader, under, ip, code_len) + CR-separated text |
| [06-elements.md](06-elements.md) | Table of 40 observed element numbers with evidence and confidence |
| [07-scripting.md](07-scripting.md) | The object language: `@name`, `#command`, `:label`, `/dir` `?dir` moves, `!label;choice`, `$text`, `'comment`; commands and examples |

## Probes (`specs/zzt/probes/`, run from repo root)
| Probe | Proves |
|---|---|
| `zztlib.py` | shared parser (all recovered layout in one place) |
| `dump_world.py <file>` | full structure dump; exits 1 on any structural mismatch (`--grid`, `--raw`) |
| `render_board.py <file> <n> <out.png> [--numbers]` | render one board to 480x350 PNG |
| `p01_boards.py` | header count + board chain + 1500-cell RLE on every board |
| `p02_stats.py` | 86-byte property block + 33-byte record layout (brute force, 269/269) |
| `p03_props.py` | per-offset survey of the property block |
| `p04_validate.py` | full-parse validation, record x/y ranges, cell type under records, ip/code_len survey |
| `p05_code.py`, `p06_tokens.py` | script line classes, command words, token vocabulary |
| `p07_refcells.py` | best file per reference, color nibble votes |
| `p08_glyphs.py` | palette + glyph harvest from references -> `glyphs.json` (text-char and object-p1 hypotheses, 0 conflicts) |
| `p09_elements.py` | element type survey (counts, colors, record params) |
| `p10_links.py` | passages p3 -> board, key/door colors, exit reciprocity, scroll text |
| `p11_exitdir.py` | which exit byte is which edge |
| `p12_lines.py` | line-wall neighbour glyph rule -> `line_glyphs.json` |
| `p13_compare.py` | render board 0 vs reference.png (outputs in `probes/out/`) |
