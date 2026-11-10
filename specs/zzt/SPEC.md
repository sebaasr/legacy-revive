# ZZT world file: format and behavior specification

Target name: `zzt`. Derived only from the bytes of 8 community-made world files (269 boards, 10,297 entity
records, 5,227 programs) and 6 reference screenshots of their first board. Every field has a confidence label:

- **confirmed**: holds on the whole corpus and/or was checked against a reference image.
- **probable**: strong evidence, but not proven.
- **unknown**: meaning not established. Readers must keep or skip these bytes as instructed and never fail on them.

A reader written from this document must parse all 8 corpus files to their exact end.

---

## 1. Overview

- The program is a 1991 MS-DOS text-mode game-creation tool. A **world** file (`*.ZZT`, any case) holds one
  game: a fixed 512-byte world header followed by one or more **boards**. A board is one full screen of
  60 x 25 character cells. **(confirmed)**
- Each board has a run-length-encoded grid of cells (element type + color), a block of board properties
  (exits to neighbouring boards, flags, a message) and a list of **status records**: the active entities on
  the board. Some records carry **program text** written in an object scripting language (Section 5).
  **(confirmed)**
- Byte order: **little-endian** for all multi-byte integers. `i16` = signed 16-bit, `u16` = unsigned
  16-bit, `u8` = unsigned byte. **(confirmed)**
- Text encoding: **IBM PC code page 437** (Python codec `cp437`) for every string, cell character and
  program text. Box-drawing and block characters (0xB0-0xDB) appear and display as the matching shapes.
  **(confirmed)**
- Strings are **length-prefixed with a fixed capacity**: 1 length byte `n`, then `cap` bytes of storage.
  Only the first `min(n, cap)` bytes are the value. The remaining bytes hold leftover memory (for example
  the TOXIC name area holds `TOXICMP8\xb9\x02...` with length 5). Never read past the length.
  Notation below: `pstr(cap)` occupies `1 + cap` bytes. **(confirmed)**
- Coordinates: grid cells are addressed in **row-major** order from the top-left. Entity records use
  **1-based** x (column 1..60) and y (row 1..25). Board numbers used anywhere in the file (exits,
  passages, header) are **0-based indexes in file order**. **(confirmed)**

---

## 2. Container layout

### 2.1 File

```
0x000  512 bytes   world header (2.2)
0x200  board 0     (2.3)
...    board 1 .. board_count-1, stored back to back with no gaps
EOF    immediately after the last board                     (confirmed, 8/8 files)
```

### 2.2 World header (bytes 0x000-0x1FF)

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| 0x00 | 2 | i16 | magic, always -1 (`ff ff`). A reader may reject other values. | confirmed |
| 0x02 | 2 | i16 | **board count minus one**. `board_count = value + 1` (TOXHINTS stores 0 and has 1 board; KINGL2 stores 9 and has 10) | confirmed |
| 0x04 | 2 | i16 | counter, 0 in all files | unknown |
| 0x06 | 2 | i16 | counter, 0 in all files | unknown |
| 0x08 | 7 | bytes | all zero (possibly one value per key color) | unknown |
| 0x0F | 2 | i16 | 100 in all files (health-like counter) | probable |
| 0x11 | 2 | i16 | board the player was on when the file was saved (0-based index) | probable |
| 0x13 | 10 | 5 x i16 | counters; 0 in 6 files, leftover bytes in TOXIC/TOXHINTS | unknown |
| 0x1D | 21 | pstr(20) | world name, e.g. `06 'KINGL2'` | confirmed |
| 0x32 | 210 | 10 x pstr(20) | 10 flag-name slots at 0x32 + 21*i (i = 0..9). Empty (length 0) in every corpus file; the bytes after the length are leftover data. | confirmed layout; contents probable (world flags set by `#set`, Section 5) |
| 0x104 | 5 | bytes | zero in all files | unknown |
| 0x109 | 247 | bytes | padding up to 0x1FF (zero, or leftover bytes in TOXIC/TOXHINTS) | confirmed unused |

The first board always starts at 0x200. **(confirmed)**

### 2.3 Board

Each board is one size field followed by `size` bytes:

| offset (from board start) | size | type | meaning | confidence |
|---|---|---|---|---|
| +0 | 2 | u16 | `size`: number of bytes in this board **after** this field | confirmed |
| +2 | 51 | pstr(50) | board name (longest seen: 28 chars) | confirmed |
| +53 | variable | RLE | grid, decodes to exactly 1500 cells (2.4) | confirmed |
| grid end | 86 | bytes | board properties (2.5) | confirmed |
| grid end + 86 | 2 | i16 | **status record count minus one** (`N`); there are `N + 1` records | confirmed |
| next | variable | records | `N + 1` status records, each 33 bytes + program text (2.6) | confirmed |

**Board iteration (confirmed, 269/269 boards):**

```
off = 0x200
for i in 0 .. board_count-1:
    size = u16(data, off)
    board_bytes = data[off+2 : off+2+size]       # board i
    parse the board starting at off (grid at off+53)
    off = off + 2 + size
assert off == len(data)
```

Use `size` to locate the next board (do not rely on parsing to find the end), but the parse of grid,
properties and records ends exactly at `off + 2 + size` on every corpus board; a mismatch means a bug or a
damaged file (record it in `notes`).

Board 0 is the title screen in every corpus file (names like `Title Screen`). **(confirmed)**

### 2.4 Grid run-length decoding

The grid is 60 columns x 25 rows = 1500 cells, the whole visible board including its outer border ring
(the ring is made of ordinary wall cells). **(confirmed)**

It is stored as a sequence of 3-byte runs `(count u8, element u8, color u8)`:

```
cells = []
p = board_start + 53
while len(cells) < 1500:
    count   = data[p]
    element = data[p+1]
    color   = data[p+2]
    if count == 0: count = 256          # guess; count 0 never occurs in the corpus
    append (element, color) to cells, count times
    p += 3
cells = cells[:1500]                    # defensive; corpus runs end exactly at 1500
grid_end = p                            # board properties start here
cell (col, row), 0-based = cells[row*60 + col]
```

- Runs are **not** aligned to rows: a run continues from the end of one row onto the start of the next
  (3,281 of 100,349 runs in the corpus cross a row boundary). Decode into a flat list of 1500, then index
  by `row*60 + col`. **(confirmed)**
- Worked example, KINGL2 board 0: grid starts at file offset 0x235. First runs: `3d 16 0e` = 61 cells of
  element 22 (0x16), color 0x0e: the whole top row (60 cells) plus the first cell of row 2. Then `01 24 0f`
  = 1 cell of element 36 color 0x0f, then `05 00 00` = 5 empty cells. This grid ends at 0x6A6 (379 runs).
  **(confirmed)**

### 2.5 Board properties (86 bytes at `grid_end`)

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| 0 | 1 | u8 | values 255, 0, 5, 2, 1: maximum player shots (255 = unlimited?) | probable |
| 1 | 1 | u8 | 0 or 1: board is dark | probable |
| 2 | 1 | u8 | **exit north**: board index entered when leaving through the top edge; 0 = no exit | confirmed |
| 3 | 1 | u8 | **exit south** (bottom edge); 0 = none | confirmed |
| 4 | 1 | u8 | **exit west** (left edge); 0 = none | confirmed |
| 5 | 1 | u8 | **exit east** (right edge); 0 = none | confirmed |
| 6 | 1 | u8 | 0 or 1 (7 boards) | unknown flag |
| 7 | 59 | pstr(58) | message; empty in 268/269 boards, one holds `ERR: Bad #CHANGE` (a saved runtime error line) | probable |
| 66 | 2 | u8, u8 | x, y: player entry position (1-based); only meaningful on the board saved last, leftover elsewhere | probable |
| 68 | 2 | i16 | 0 everywhere except one board = 100: time limit | probable |
| 70 | 16 | bytes | zero or leftover pattern | unknown, skip |

Exit notes: board 0 (the title) is never an exit target, so 0 safely means "none". All 1,076 exit values
in the corpus are `< board_count`. Exits are mostly reciprocal (a board's north exit leads to a board whose
south exit leads back in 92 of 95 cases). The direction of each byte was established by matching the open
gaps along each edge with the opposite edge of the target board. **(confirmed)**

### 2.6 Status records

`N + 1` records follow the count. Each is 33 bytes, immediately followed by `code_len` bytes of program
text (none when `code_len <= 0`). Record 0 is always the player. **(confirmed)**

| offset | size | type | meaning | confidence |
|---|---|---|---|---|
| 0 | 1 | u8 | x, 1-based column (1..60) | confirmed |
| 1 | 1 | u8 | y, 1-based row (1..25) | confirmed |
| 2 | 2 | i16 | step x (-1/0/1 on moving things) | probable: movement direction |
| 4 | 2 | i16 | step y | probable |
| 6 | 2 | i16 | cycle: update interval (player 1, objects 3; settable with `#cycle`) | probable |
| 8 | 1 | u8 | p1: for objects (element 36) the **character code drawn** for the object | confirmed for objects; element-specific otherwise |
| 9 | 1 | u8 | p2 | unknown, element-specific |
| 10 | 1 | u8 | p3: for passages (element 11) the **destination board index** | confirmed for element 11; unknown otherwise |
| 11 | 2 | i16 | follower: -1 normally, else a small record index | probable |
| 13 | 2 | i16 | leader: as above | probable |
| 15 | 1 | u8 | element type lying under the entity (0 in most) | probable |
| 16 | 1 | u8 | color of that underlying element | probable |
| 17 | 4 | bytes | varies (`00 00 f8 32`...), looks like a saved memory pointer | unknown, ignore |
| 21 | 2 | i16 | ip: byte offset in the program text where execution resumes; 0 = start, -1 = halted (e.g. after `#end`) | probable |
| 23 | 2 | i16 | `code_len`: number of program-text bytes that follow this record (never negative in the corpus; treat negative as 0) | confirmed |
| 25 | 8 | bytes | zero or leftover | padding, skip |

```
r = start of record
read the 33-byte fixed part
code = data[r+33 : r+33+code_len].decode('cp437') if code_len > 0 else None
next record at r + 33 + max(code_len, 0)
```

Worked example, KINGL2 board 0: count `2a 00` at 0x6FC (42, so 43 records). Record 1 at 0x71F:
`3b 12 | 00 00 | 00 00 | 03 00 | fa 00 00 | ff ff | ff ff | 00 00 | 00 00 f8 32 | ff ff | 11 00 | 8 x 00`
then 17 bytes `"@Small star\r#end\r"`: x=59, y=18, cycle 3, p1=250, ip=-1, code_len=17.

- **Record 0 (player)** holds leftover values in almost every field (step 144/22016, ip 28752...). Use only
  x, y. It always sits on an element-4 cell. **(confirmed)**
- 31 records sit on cells that are not their own kind (30 on empty cells, 1 on element 23). Keep them in
  the output but they are not drawn. **(probable: leftovers)**
- 62 cells have more than one record at the same position. Where that cell is an object (36), all records
  there have the same p1, so "use the lowest-index record at that cell" is safe. **(confirmed)**
- Every element-36 cell has at least one record at its position (7,792/7,792). **(confirmed)**

---

## 3. Object model

```
World
 ├─ header: name, flags[10], current board, counters
 └─ boards[0 .. board_count-1]          (one screen each)
     ├─ name
     ├─ grid: 60 x 25 cells (element, color)
     ├─ properties: exits N/S/W/E -> board index, shots, dark, message, time
     └─ status records[0 .. N]           record 0 = player
         ├─ position (x, y), cycle, step, p1/p2/p3, under element
         └─ program text (optional)  -> scripted objects (element 36), scrolls (element 10)
```

- **Elements** are what fills the grid. Each cell has one element number and one color byte. The table
  below lists every element number seen in the corpus. Numbers not seen: 1-3, 15, 18, 33, 43, 46, and
  anything above 53. Readers must accept any value 0-255.
- **Entities** are cells that have a status record (same x, y). The record adds state and possibly a
  program. Elements that always have a record: 4, 10, 11, 12, 13, 16, 17, 29, 30, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 44, 45.
- **Links between boards**: edge exits (2.5) and passages (element 11, destination in record p3). In
  207 of 249 passages the destination board contains a passage of the same color. **(confirmed)**
- **Links between objects**: scripts address other objects on the same board by the name in their `@name`
  line (Section 5). `follower`/`leader` fields link records (probable, meaning unknown).

### 3.1 Element table

C = confirmed, P = probable, G = guess, ? = unknown. "Record" = has a status record.

| element | record | colors seen | best known meaning | conf |
|---|---|---|---|---|
| 0 | no (30 stray) | any | empty floor, always drawn black | C |
| 4 | always (record 0) | 0x1f | player, exactly one per board | C |
| 5 | no | always 0x03 | collectible item | G |
| 6 | no | always 0x06 | collectible item | G |
| 7 | no | many | gem-like collectible | G |
| 8 | no | fg only, 0x09-0x0f | key (fg colors 9-15 pair with element-9 bg colors 1-7) | P |
| 9 | no | white on color (0x1f, 0x2f...) | door | P |
| 10 | always | 0x0f | scroll/sign: record holds plain prose text | P |
| 11 | always | white on color | passage to board p3 | C |
| 12 | always | 0x0f | directional mover/shooter | G |
| 13 | always | various | timed element | G |
| 14 | no | 0x05 | ? (one cell) | ? |
| 16, 17 | always | 0x0d / 0x0c | rotating pair | G |
| 19 | no | 0xf9, 0x9f | water | P |
| 20 | no | always 0x20 | forest/brush | P |
| 21 | no | any fg | solid wall | C (look) |
| 22 | no | any fg | normal wall, used for borders | C (look) |
| 23 | no | any fg | breakable wall | P (look C) |
| 24 | no | 0x09, 0x0b, 0x0c, 0x20 | wall variant | G |
| 25, 26 | no | mostly 0x09 | wall/barrier variants | G |
| 27 | no | 0x0a, 0x09, 0x0e | walk-through fill ("fake" wall): entities stand on it | G |
| 28 | no | various | wall variant | G |
| 29 | always | 0x0e, 0x0d | creature or projectile | G |
| 30 | always | 0x0f, 0x09 | moving projectile | G |
| 31 | no | any fg | line wall (double line joined to neighbours) | C |
| 32 | no | 0x0a | ? | ? |
| 34, 35, 37, 38, 39, 41, 42, 44, 45 | always | various | creatures | G |
| 36 | always | any | scripted object (glyph = p1, has program text) | C |
| 40 | always | 0x0e, 0x0c | pusher-like mover | G |
| 47..53 | no | color byte is a character | colored text | C |

The scripting language names elements by word (`empty solid normal breakable fake invisible boulder gem
key pusher passage ...`, Section 5.6), but **the files give no mapping from these words to element
numbers**. Only the C/P rows above are tied to numbers. **(unknown)**

---

## 4. Cells, colors, text and programs

### 4.1 Palette (16 colors)

| idx | RGB | conf | idx | RGB | conf |
|---|---|---|---|---|---|
| 0 | 0, 0, 0 | confirmed | 8 | 84, 84, 84 | probable (never seen; inferred from the pattern) |
| 1 | 0, 0, 168 | confirmed | 9 | 84, 84, 252 | confirmed |
| 2 | 0, 168, 0 | confirmed | 10 | 84, 252, 84 | confirmed |
| 3 | 0, 168, 168 | confirmed | 11 | 84, 252, 252 | confirmed |
| 4 | 168, 0, 0 | confirmed | 12 | 252, 84, 84 | confirmed |
| 5 | 168, 0, 168 | confirmed | 13 | 252, 84, 252 | confirmed |
| 6 | 168, 84, 0 | confirmed | 14 | 252, 252, 84 | confirmed |
| 7 | 168, 168, 168 | probable (inferred) | 15 | 252, 252, 252 | confirmed |

### 4.2 Cell → (character, foreground, background) rules

For each cell `(element, color)` at 0-based `(col, row)` produce `[char, fg, bg, element]`, where fg and bg
are palette indexes 0-15 and `char` is a CP437 character code 0-255, or `null` when the code is not known.

Apply the first matching rule:

1. **element 0 (empty)** → `[32, 0, 0, 0]`. Empty cells draw pure black whatever their stored color byte
   (1379/1379 checked). **(confirmed)**
2. **elements 47..53 (text)** → the color byte **is the character code**; fg = 15 (white); bg by element:
   47 → 1 (blue), 48 → 2 (green), 49 → 3 (cyan), 50 → 4 (red), 51 → 5 (purple), 52 → 6 (brown), 53 → 0 (black).
   That is `bg = element - 46` for 47..52 and 0 for 53. Example KINGL2 row 9: runs `35 22`, `35 43`, `35 61`
   ... = element 53 with characters `"Castle Of King Lucius"` shown white on black. **(confirmed)**
3. **all other elements**: `fg = color & 0x0F`, `bg = color >> 4`. The high nibble is a full 4-bit background
   (no blink bit): color 0xf9 shows blue on white, 0x9f white on light blue. **(confirmed)** Then the
   character:
   - **element 36 (object)**: `char = p1` of the (lowest-index) status record at this cell. **(confirmed)**
     Example: KINGL2 `@Small star` objects have p1 = 250 and show as a small dot.
   - **element 31 (line wall)**: `char = null`. Its glyph is a double line joined towards each of the 4
     neighbours (N, S, E, W) that is also element 31 (neighbours outside the grid count as not 31). The
     renderer picks the shape from the neighbour set. Neighbour sets seen: EW, NS, NE, NW, SE, SW, NSEW, each
     always with the same shape. **(confirmed for those 7 sets; other sets unseen)** A reader may export the
     neighbour key (e.g. `"NE"`) as extra data (6.3).
   - fixed-glyph elements, from the table below.
   - any other element: `char = null` (glyph unknown; renderer draws a placeholder).

| element | character code | shape seen in references | conf |
|---|---|---|---|
| 4 (player) | 2 | filled smiley face | probable: the player cell is blank in 5 of 6 reference title screens and a smiley in 1; no byte difference explains this |
| 19 | 176 | light dither | confirmed (same bitmap as char 176) |
| 20 | 176 | light dither | confirmed (same bitmap as char 176) |
| 21 | 219 | full block | confirmed (same bitmap as char 219) |
| 22 | null | dense dither (about 3/4 of pixels set) | shape confirmed, code unknown |
| 23 | null | 50% checkerboard | shape confirmed, code unknown |
| 6 | null | a 'Y' shape over a cross | shape confirmed, code unknown |

The reader exports character codes and colors only. **Drawing glyphs is the renderer's job**: the renderer
needs a CP437 8x14 font for the codes, plus shapes for the `null` cases above (dense dither, checker,
the line-wall joins) and a placeholder for unknown elements.

Comparison against the references (a renderer following these rules): 1499-1500 of 1500 cells match on each
of 6 title boards; the only mismatch is the player cell (see element 4 above).

### 4.3 Board and world strings

Board name, world name, flag names and board message are `pstr` strings (Section 1), CP437.

### 4.4 Program text

- Stored after its record (2.6), `code_len` bytes, CP437. **(confirmed)**
- Lines are terminated by CR (0x0D). Every program ends with CR. There is no LF anywhere. Split with
  `text.split('\r')` and drop the final empty element. **(confirmed)**
- Owners: element 36 objects (5,206 programs), element 10 scrolls (20 programs, plain prose only), and one
  stray record on element 23. Many element-36 records have `code_len = 0` (no program). **(confirmed)**
- Keep text exactly, including leading and trailing spaces (trailing spaces occur, e.g. `#die    `;
  leading spaces occur in message lines).

---

## 5. Script language (`zzt-oop`)

Observed over ~36,000 lines. The language is **line-oriented**: the first character of a line decides its
type. Keywords, labels, names and directions are **case-insensitive** (`#end`, `#END`, `#End`;
`:touch`, `:TOUCH`, `:Touch` all appear). Lines may carry trailing spaces; trim before matching words.

### 5.1 Line types

| first char | count | meaning | example | conf |
|---|---|---|---|---|
| `@` | 3,372 | object name, rest of the line (may contain spaces: `@SWITCH 1`) | `@Mailbox` | confirmed |
| `#` | 15,927 | command (5.3) | `#give gems 50` | confirmed |
| `:` | 3,609 | label: an entry point that messages jump to (5.4) | `:touch` | confirmed |
| `'` | 14 | comment, ignored | `'rose controls petunia` | probable |
| `/` | | movement: one step per `/dir` token, tokens chain (5.5) | `/i/i/i`, `/e/e/n` | probable |
| `?` | | movement that is tried and skipped if blocked (contrast with `/`) | `?e?e?e?s?w` | probable |
| `!` | 545 | menu choice: `!label;text`, always has `;` | `!op;The operator.` | probable |
| `$` | 405 | centered/highlighted message line | `$Hello Mr. Roberts.` | probable |
| empty | 6,107 | blank line inside a message | | probable |
| anything else | ~3,600 | plain text shown to the player as a message | `In your mailbox you find nothing.` | probable |

Details:
- **Name line**: 3,354 of 5,206 object programs start with `@name`. In 17 programs the first line is empty
  and the `@name` is on line 2. Treat the first non-empty line, if it starts with `@`, as the name; do not
  execute it. A `@` line elsewhere has no observed meaning. The name is matched case-insensitively
  (`@LINE` and `@line` both used). Programs without a name line are anonymous.
- **Text lines**: consecutive text, `$` and `!` lines (and blank lines between them) are shown together as
  one message/dialog when execution reaches them (probable). Text may contain any CP437 character (block
  and box characters for pictures: `$▀▀▀▀▀  ▒▓ ▓▒`). A `#` in the middle of a text line is plain text
  (`PS: You can contact me on PRODIGY at ID#`).
- **Menu lines** `!label;text`: shows `text` as a selectable choice; choosing it jumps to `label` (in the
  same object). Examples: `!A;Yes` / `!B;No`, `!TOUCH;Return to hints`, `!f2;Floor 2`. **(probable)**
- **Scroll programs** (element 10) consist only of text lines; touching a scroll presumably shows them (guess).
- **Labels with trailing junk**: `:DOA             '1` occurs (label, spaces, then a `'` remark). The label
  name is the first word after `:`; ignore the rest. Label names seen use letters and digits only
  (`:x1`, `:1`, `:DO1`, `:change2`).

### 5.2 Execution model (inferred)

- Each object runs its program from the top (or from `ip`, 2.6; `ip = -1` means halted) one line at a
  time. Movement lines and some commands take time (one step per update; `#cycle` sets the update
  interval). **(probable)**
- `#end` stops execution until a message arrives (188 saved objects have `ip = -1` after `#end`).
  **(probable)**
- A **message** sent to an object (from `#send`, `#target:label`, a menu choice, or the engine) makes
  execution jump to the first enabled `:label` with that name. If no such label exists nothing happens
  (guess). `#lock` makes an object ignore messages until `#unlock`. **(probable)**
- `#zap label` disables the first enabled label of that name; `#restore label` re-enables it. This gives
  successive replies (see the `@Manager` example in 5.7). **(probable)** How a zapped label is stored in a
  saved file is unknown (no evidence in the corpus).
- `#restart` jumps to the start of the program. **(probable)**

### 5.3 Commands

A command is `#` + word + arguments separated by spaces. If the word is not a known command and the line has
the form `#target:label` or `#label`, it is a **send** (see `#send`). One malformed line `#CHAR15` (no space)
occurs; treat a command word followed directly by digits as word + number (guess). One bare `#if` occurs;
ignore it.

Counts are corpus totals.

| command | count | syntax (observed) | examples | meaning | conf |
|---|---|---|---|---|---|
| `#end` | 3,828 | `#end` | `#end`, `#END` | stop and wait for messages | probable |
| `#bind` | 2,350 | `#bind name` | `#bind door`, `#BIND SLIME` | use the program of the object named `name` instead of own text; 1,590 programs consist of a single `#bind` line | probable |
| `#char` | 1,870 | `#char n` (0-255) | `#CHAR 126`, `#char 250`, `#char 179` | set own glyph; same value as record p1 | probable |
| `#play` | 1,557 | `#play music` | see 5.8 | play a tune/sound | probable |
| `#send` | 1,058 | `#send label` or `#send target:label` | `#send loop`, `#SEND POINTER:DO`, `#send all:open` | send a message to self, to every object named `target` on the board, or to `all` | probable |
| `#target:label` | ~50 | `#target:label` | `#door:open`, `#all:stop`, `#x1:gone`, `#block:end`, `#spin:start` | shorthand for `#send target:label` (targets are `@names` on the same board, or `all`; `block`, `spin` here are object names, not commands) | probable |
| `#die` | 667 | `#die` | | remove self from the board | probable |
| `#cycle` | 642 | `#cycle n` | `#cycle 1` (383), `#CYCLE 3`, `#CYCLE 130` | set update interval (record field cycle) | probable |
| `#restart` | 519 | `#restart` | | jump to program start | probable |
| `#zap` | 423 | `#zap label` | `#zap touch`, `#ZAP DOA`, `#zap talk` | disable first enabled label | probable |
| `#restore` | 104 | `#restore label` | `#restore touch`, `#RESTORE COUNT` | re-enable a zapped label | probable |
| `#put` | 351 | `#put dir [color] element` | `#put w empty`, `#put e red boulder`, `#put n red fake` | place an element in the neighbouring cell in direction `dir` (dir words seen: n s e w south east seek) | probable |
| `#if` | 311 | `#if condition [then] action` | see 5.3.1 | conditional | probable |
| `#take` | 273 | `#take counter n [label]` | `#take health 10`, `#TAKE HEALTH 10 TOOWEAK`, `#take gems 1 notenuff` | decrease a player counter; if there is not enough, jump to `label` (4-word form, 178 uses) | probable |
| `#give` | 267 | `#give counter n` | `#give score 1000`, `#GIVE AMMO 20` | increase a player counter | probable |
| `#change` | 267 | `#change [color] element [color] element` | `#change red boulder empty`, `#CHANGE YELLOW SOLID BLUE SOLID`, `#change yellow invisible yellow solid` | replace every element of the first kind on the board with the second | probable |
| `#lock` | 242 | `#lock` | | ignore messages | probable |
| `#unlock` | 134 | `#unlock` | | accept messages again | probable |
| `#become` | 202 | `#become [color] element` | `#become red breakable`, `#BECOME GEM`, `#become white fake` | turn self into that element | probable |
| `#walk` | 175 | `#walk direction` | `#walk s`, `#walk idle`, `#WALK OPP SEEK`, `#WALK EAST` | set continuous movement direction (`idle` stops) | probable |
| `#endgame` | 161 | `#endgame` | | end the game | probable |
| `#shoot` | 149 | `#shoot direction` | `#shoot seek`, `#shoot n`, `#SHOOT WEST` | fire a projectile | probable |
| `#throwstar` | 35 | `#throwstar direction` | `#throwstar seek`, `#THROWSTAR WEST` | fire a different projectile | probable |
| `#set` | 101 | `#set flag` | `#set rose`, `#set switch1` | set a world flag (10 slots in the header) | probable |
| `#clear` | 64 | `#clear flag` | `#clear dayone` | clear a world flag | probable |
| `#go` | 96 | `#go direction` | `#go seek`, `#go opp seek`, `#go cw rndns`, `#GO RNDP NORTH` | move one step | probable |
| `#try` | 4 | `#try direction label` | `#try e next`, `#try w next2` | move one step; if blocked, jump to `label` | probable |

Counter words for `#give`/`#take`: `health score gems ammo torches energy` (and `points` once, unknown).
Most frequent: `take health` 178, `give score` 139.

#### 5.3.1 `#if` conditions

Form: `#if <condition> then <action>`. In 12 CRIMRING lines `then` is missing (`#if dayone dayone`,
`#if gun gun`), so `then` is optional (probable).

| condition | examples | meaning | conf |
|---|---|---|---|
| `flag` | `#if pan then okay`, `#if dayone then x1` | world flag is set | probable |
| `not flag` | `#if not shovel then restart`, `#if not flowers then end` | flag is not set | probable |
| `contact` | `#if contact then touch` (64 uses) | object is touching the player | probable |
| `alligned` (sic) | `#if alligned then start`, `#if alligned then shoot seek` | object is in line with the player | probable |
| `blocked dir` | `#if blocked e then die`, `#if blocked south then start` | the neighbouring cell in `dir` is not free | probable |

Action: if the remainder is one word, it is a **label** to jump to (send to self). Otherwise it is a
**command without `#`**: seen `shoot` (11), `become` (3), `send`, `set` (`#if contact then shoot seek`,
`#if deadbody then become white fake`). A single word that is a command name with no arguments
(`die`, `end`, `restart`: `#if detox then die`, `#if not vhs then end`) is ambiguous: these appear only as
commands in practice, so prefer the command if the object has no label of that name (guess).

### 5.4 Labels and engine-triggered labels

- Defined by `:name` lines; a message `name` jumps to the line after the label. Duplicate labels are
  common (three `:talk` labels in `@Manager`); with `#zap` they act as successive entries. The first
  enabled one wins. **(probable)**
- Most common labels: `touch` 1,113, `shot` 309, `loop` 147, `do` 122, `go` 120, `thud` 89,
  `tooweak` 87, `boom` 68.
- **Engine-triggered labels (probable)**: used by all authors, yet `shot` and `thud` are never sent by any
  script and `touch` only 35 times (vs 1,113 labels). The engine itself jumps to them:
  - `:touch`: the player touches (bumps into) the object.
  - `:shot`: the object is hit by a shot.
  - `:thud`: the object's movement is blocked.
- Labels named in `#take ... label` (`tooweak`, `toolow`, `atzero`, `poor`, `toopoor`, `notenuff`) and
  `#try ... label` are author-defined jump targets.
- `restart` and `end` are also used as `#if` actions (5.3.1).

### 5.5 Directions and movement

Direction words (case-insensitive):

| word | meaning | conf |
|---|---|---|
| `n`, `north` | up (row - 1) | probable |
| `s`, `south` | down (row + 1) | probable |
| `e`, `east` | right (col + 1) | probable |
| `w`, `west` | left (col - 1) | probable |
| `i`, `idle` | no move; wait one step (`i` used 3,891 times as `/i` pauses) | probable |
| `seek` | toward the player | probable |
| `opp <dir>` | modifier before a direction (`opp seek`) | unknown; the word suggests "opposite of" (guess) |
| `cw <dir>` | modifier before a direction (`cw rndns`, `?CW FLOW`) | unknown; the word suggests "rotated clockwise" (guess) |
| `rndns` | a direction word | unknown; perhaps random north/south (guess) |
| `rndp <dir>` | takes a direction (`rndp north`, `rndp west`) | unknown; perhaps random perpendicular to dir (guess) |
| `flow` | a direction word (`?CW FLOW`) | unknown; perhaps current movement direction (guess) |

Direction parsing: read words left to right; `opp`, `cw` and `rndp` take the following direction as an
argument, so a direction is a small expression tree (`cw rndns`, `opp seek`, `rndp north`).

Movement lines:
- A movement line is a sequence of tokens, each `/dir` or `?dir`. Prefixes can mix on one line
  (`?N?S/I`, `/E?E`, `/N/N/N/N/N/N?N?N?N`). Token words seen: `n s e w i seek cw`. Two lines contain a full
  direction expression with spaces: `?CW RNDNS`, `?CW FLOW`: the last token takes the rest of the line.
  One line ends with a stray `/` (`/i/i/`); ignore an empty token.
- `/dir`: move one step in `dir` (probable: waits until it can move). `?dir`: try one step; if blocked,
  skip it (probable).
- Each token is one step of time (probable).
- The saved `ip` can point into the middle of a movement line (`@LEYE\r?W?E\r#RESTART\r` with ip = 8), so
  execution position is a byte offset, not a line number. **(probable)**

### 5.6 Element and color words

Used by `#put`, `#change`, `#become` (and `#if ... then become`):
- colors: `red green yellow cyan blue purple white` (an optional color precedes an element word).
- elements (counts): `solid` 266, `fake` 205, `invisible` 134, `empty` 133, `breakable` 116, `boulder` 99,
  `gem` 42, `normal` 37, `key` 12, `teleport` 8, `sliderew` 7, `pusher` 4, `sliderns` 4, `object` 4,
  `slime` 3, `passage` 2, `wall` 2, `bomb` 2, `transporter` 2, `water`, `lion`, `duplicator`, `bullet`,
  `ammo`, `torch` (1 each); one typo `fake.`.
- The mapping from these words to element numbers is **unknown** (3.1). A translator should keep them as
  symbolic names; plausible pairs from the element table (`solid` ≈ 21, `normal` ≈ 22, `breakable` ≈ 23,
  `fake` ≈ 27, `empty` = 0, `passage` ≈ 11, `key` ≈ 8, `water` ≈ 19) are guesses only.

### 5.7 Complete example (CRIMRING board 1, object at (30,3), p1 = 1)

```
@Manager
#end
:talk
Hi Jason!

$Hello Mr. Roberts.
...
#zap talk
#end
:talk
Please, I have a lot of work to do...
#zap talk
#end
:talk
#play T-DEGACBEFD
Go away!
#end
```

Reading: on start the object stops (`#end`). Each `talk` message runs the first enabled `:talk`
section, shows its text, disables that label (`#zap talk`) and stops; the next `talk` reaches the next
section. The last section plays a tune and keeps answering "Go away!".

Other typical patterns:
```
@Small star          (KINGL2: a decoration that does nothing)
#end

#bind ndoor          (whole program: reuse object "ndoor"'s program)

:touch               (react to the player)
#take gems 10 poor
#give score 50
#end
:poor
You need more gems.
#end

#if contact then touch
?e?e?e?s?w
#restart
```

### 5.8 `#play` music strings

Argument is the rest of the line (may contain spaces: `#play i-da hg# e-dd`). Characters seen, by
frequency: `e x c 1 a + 9 d - g f b 0 i ! q t 7 # s 4 6 8 5 h . w 2 space [ ] 3`. Examples:
`#play 9`, `#play a1`, `#play q89`, `#play T-DEGACBEFD`, `#play S++C-B!A!G!EG!A!B!`,
`#play 10x10x10x111x10x10x10x111`, `#play Q--EF#GF#EDTDEDEDEDEHE++++TCDFA`, `#play [T--] CDEFGAB`.
Inferred (all **unknown/guess**): `a`-`g` notes, `#` sharp, `!` perhaps flat, `+`/`-` octave up/down,
`t s i q h w` duration letters, `.` dotted, `x` rest, digits drum/sound effects. A translator may emit the
string unchanged to a `play(str)` runtime call.

### 5.9 Translator notes

- Parse each program into: name, list of lines with type, labels map (name → list of line indexes, each
  with an enabled flag).
- Model each object as a resumable coroutine (e.g. a JS generator) that yields on every movement token,
  `#go`, `#try`, `#walk` step, and `#end`; message delivery resets it to the label.
- Provide runtime hooks for: send(target, label), give/take counters, flags set/clear/test, put/change/become
  with symbolic element words, char, cycle, die, endgame, lock/unlock, zap/restore, shoot/throwstar,
  play, show message (text/$/! lines), menu choice.

---

## 6. Mapping to the Legacy IR (`docs/legacy-ir.md`, v1)

### 6.1 Top level

| IR field | value |
|---|---|
| `ir_version` | 1 |
| `program` | `"zzt"` |
| `source` | `{ "file": <file name>, "bytes": <file size> }` |
| `name` | world name (header 0x1D) |
| `size` | `{ "width": 60, "height": 25 }` |
| `units` | `"cells"` |
| `start_screen` | `"board-0"` (the title board, shown first in every reference) |
| `script` | `null` |
| `layers` | `[]` |
| `screens` | one per board, file order |
| `assets` | one `"data"` asset per board grid file |
| `notes` | header current board (0x11), unknown header bytes if non-zero, any parse mismatch, unknown elements met |

### 6.2 Screens (boards)

```json
{
  "id": "board-<i>", "name": "<board name>", "number": <i>,
  "layers": [], "image": null,
  "objects": [ ... ],
  "layer_text": {},
  "script": null,
  "grid": { "cols": 60, "rows": 25, "cells": "assets/board-<i>.json" },
  "extra": {
    "exits": { "north": "board-3" | null, "south": ..., "west": ..., "east": ... },
    "max_shots": <prop 0>, "dark": <prop 1 != 0>, "message": "<prop 7>",
    "time_limit": <prop 68>, "enter_xy": [x, y],
    "unknown": { "prop6": <u8>, "prop70_85": "<hex>" }
  }
}
```
An exit value 0 maps to `null`; otherwise to `"board-<value>"`. (`extra` on a screen is a zzt-specific
addition; the runtime may ignore it.)

**Grid file** `assets/board-<i>.json`: a JSON object
```json
{ "cols": 60, "rows": 25,
  "palette": [[0,0,0],[0,0,168], ... 16 entries from 4.1],
  "cells": [ [char, fg, bg, element], ... 1500 entries in row order ] }
```
`char` is a CP437 code or `null` (4.2), `fg`/`bg` palette indexes. Optionally a reader may add
`"line_keys": { "<index>": "NE", ... }` for element-31 cells. Asset entry:
`{ "id": "board-<i>-grid", "kind": "data", "file": "assets/board-<i>.json" }`.

### 6.3 Objects (status records)

Every status record becomes one Object of kind `"entity"` (record 0 included, so the player position is
available):

```json
{
  "id": "board-<i>-stat-<k>", "kind": "entity",
  "name": "<@name or ''>", "number": <k>,
  "rect": [x-1, y-1, x, y],            // one cell, 0-based, right/bottom exclusive
  "visible": true,                     // see the rule below
  "style": {},
  "text": "",
  "icon": null,
  "script": { "language": "zzt-oop", "text": "<program text, CR line ends>" } | null,
  "extra": {
    "element": <element at the cell>, "color": <color byte>,
    "x": x, "y": y, "cycle": .., "step": [sx, sy], "p1": .., "p2": .., "p3": ..,
    "follower": .., "leader": .., "under": [type, color], "ip": ..,
    "destination": "board-<p3>"        // only when element == 11 (passage)
  }
}
```
- `name`: text after `@` on the name line (5.1), trimmed; `""` if none.
- `script`: present when `code_len > 0` (objects and scrolls), else `null`. Keep the text exactly
  (CR-separated) so the translator sees the original.
- `visible`: `false` for records standing on an element-0 cell (stray records, 2.6), else `true`.
- Records do not change grid drawing beyond rule 4.2 (element 36 char = p1); the grid file is the
  picture, the objects are behaviour.

---

## 7. Known unknowns

Readers can skip all of these safely (keep raw values in `extra`/`notes` where listed above):

1. Header 0x04, 0x06, 0x08-0x0E, 0x13-0x1C, 0x104-0x108: meaning unknown (all zero or leftover in corpus).
   0x0F (100, health?) and 0x11 (current board) are only probable.
2. Flag-name slot contents: always empty in the corpus.
3. Board property bytes 0 (shots?), 1 (dark?), 6 (unknown flag), 7 message (probable), 66-67 entry xy
   (probable), 68 time (probable), 70-85 unknown.
4. Record fields: step, cycle, follower, leader, under, ip are probable; p2 unknown; p1 and p3 are known
   only for elements 36 and 11; bytes 17-20 unknown (pointer-like); 25-32 padding.
5. Player record: all fields except x, y are leftover data.
6. RLE count 0: never seen; treating it as 256 is a guess.
7. Element meanings for most numbers (3.1, rows G/?), and the glyph character codes for elements 6, 22, 23,
   31 and all G/? elements. Element 4's glyph is probable (player cell shows blank in 5 of 6 references).
8. Palette entries 7 and 8 are inferred, not observed.
9. Line-wall joins for neighbour sets other than EW, NS, NE, NW, SE, SW, NSEW.
10. Mapping from script element words to element numbers.
11. Exact semantics of `opp`, `cw`, `rndns`, `rndp`, `flow`; of `/` vs `?` when blocked; of `#play` notation;
    of the `points` counter; how zapped labels are stored.
12. Whether execution should resume at the saved `ip` or start at 0 when a world is loaded.
