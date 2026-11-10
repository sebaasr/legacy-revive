# ZZT spec gaps (found by the clean-room builder)

Reader: `recovered/zzt/reader.py`, built from `SPEC.md` and `docs/legacy-ir.md` only. All 8 corpus files
parse to their exact end, and the totals match the spec's (269 boards, 10,297 records, 5,227 programs). These
are the places where the spec was wrong, ambiguous or silent.

| # | spec section | problem | what you did |
|---|---|---|---|
| 1 | 4.2 rule 3 (element 31), 7.9 | **Wrong/incomplete.** The spec says the line-wall neighbour sets seen are EW, NS, NE, NW, SE, SW, NSEW and that "other sets [are] unseen". Over the full corpus the reader finds 15 sets: EW 4368, NS 1535, NSEW 1411, SEW 659, NEW 612, NE 535, NW 526, SW 509, SE 509, NSW 486, NSE 474, E 221, W 218, N 202, S 198. The four T-junctions and the four single-neighbour ends have no shape in the spec. (The 7-set claim probably comes from the reference title boards only.) | Export `char: null` and a `line_keys` entry for every element-31 cell, whatever its set. The renderer still needs shapes for the T and end-stub sets. |
| 2 | 4.2 / 6.2 `line_keys` | The letter order of a key is not defined. The examples (`"NE"`, `"NSEW"`, `"EW"`) fit N,S,E,W order, but `"NW"`/`"SW"` would also fit other orders. | Always N, S, E, W order (`NSEW`, `SEW`, `NW`). |
| 3 | 2.6 vs 6.3 `visible` | 2.6 says the 31 records on cells that are not their own kind (30 on empty, 1 on element 23) "are not drawn", but 6.3 sets `visible: false` only for records on element-0 cells. The element-23 stray is visible under 6.3 but not drawn under 2.6. | Followed 6.3: `visible = (cell element != 0)`. |
| 4 | 6.1 `notes` | "Unknown header bytes if non-zero" does not list exactly which ranges count. | Checked 0x04-0x07, 0x08-0x0E, 0x13-0x1C, 0x104-0x108 and 0x109-0x1FF (Section 7.1 list plus padding). TOXIC/TOXHINTS get notes for 0x13-0x1C and 0x109-0x1FF. Also always note 0x0F and 0x11. |
| 5 | 2.2 / 6.1 | The header flag slots and the health-like counter (0x0F) have no IR field. | Flags go to `notes` only when a slot is non-empty (never in the corpus). The 0x0F and 0x11 values are always noted. |
| 6 | 2.3 | The spec does not say what to do if the status record count `N` is negative (count 0 or fewer). | Read `max(N+1, 0)` records. Never happens in the corpus. |
| 7 | 2.6 / 6.3 | The spec does not say how to export a record whose x,y lies outside 1..60/1..25 (for example the cell lookup for `extra.element`). | Set `element`/`color` to null and add a note. Never happens in the corpus; the test treats it as a failure. |
| 8 | 4.2 rule 3, element 36 | The spec does not say which char to use for an element-36 cell with no record at its position (2.6 says this never happens). | `char: null` plus a note. Never happens in the corpus. |
| 9 | 6.3 `destination` | The spec does not say what to do when a passage's p3 is not a valid board index, or is 0 (unlike exits, it never says 0 means none). | Always emit `board-<p3>`. The test checks it is a real board id: all pass, and no passage targets board 0. |
| 10 | 6.3 `text` | `text` is fixed to `""`, even for scrolls (element 10), whose program is plain prose that would naturally be the object's text. | Kept `""`. The prose is available in `script.text`. |
| 11 | 6.2 vs legacy-ir.md | The IR doc has no `extra` on Screen, and Screen `number` is 1-based in the IR example. The spec uses a 0-based board number. | Followed the spec: screen `extra` added and `number` = 0-based board index. |
| 12 | 2.4 | The pseudocode has no bounds check if the grid runs past the end of the file. | Raise an error (file damaged). Never happens. |
| 13 | 6.3 | Several record fields (bytes 17-20, 25-32, `code_len`) are not in the IR mapping, and the player record's fields other than x,y are "leftover". | Omitted bytes 17-20/25-32 and `code_len`. The player record is exported with all fields like any other, as 6.3 lists them. |
| 14 | 4.2 element 4 | Player glyph 2 is only "probable": 5 of 6 references show the cell blank. | Emitted char 2 per the table. |
