"""render_board.py <file.ZZT> <board#> <out.png> [--numbers]

Renders one board's 60x25 grid at 8x14 px per cell (480x350), using:
  * palette and glyph bitmaps harvested from the reference screenshots by p08_glyphs.py (glyphs.json)
    and p12_lines.py (line_glyphs.json);
  * the recovered rules (notes/03, notes/06):
      type 0             -> black cell
      types 47..53       -> color byte is a character; fg white, bg palette[T-46] (T=53: black)
      type 36            -> character = p1 of the status record at that cell; colors from color byte
      type 31            -> double-line glyph chosen by which N/S/E/W neighbours are also type 31
      other types        -> glyph harvested for that type; colors from color byte (fg low nibble, bg high)
  * anything without a known glyph is drawn as a fg-colored box with the type number (or char code) in
    tiny digits. --numbers draws the element type number on every non-empty, non-text cell instead.
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
import zztlib
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
G = json.load(open(os.path.join(HERE, 'glyphs.json')))
LINES = json.load(open(os.path.join(HERE, 'line_glyphs.json')))
PALETTE = {int(k): tuple(v) for k, v in G['palette'].items()}
PALETTE.setdefault(7, (168, 168, 168))   # inferred (never observed in references): pattern of 0/84/168/252
PALETTE.setdefault(8, (84, 84, 84))      # inferred
CHAR = {int(k): int(v, 16) for k, v in G['char'].items()}
TYPE_GLYPH = {int(t): int(max(m.items(), key=lambda kv: kv[1])[0], 16) for t, m in G['type'].items() if int(t) not in (4, 31)}
TYPE_GLYPH[4] = CHAR.get(2)              # player: the one visible player cell (kingl2) shows this bitmap

DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
          '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111']


def bitmap_from_rows(rows):
    v = 0
    for y in range(14):
        for x in range(8):
            v = (v << 1) | (1 if rows[y][x] == '#' else 0)
    return v


def line_glyph(key):
    if key in LINES: return int(LINES[key], 16)
    # synthesize a double-line glyph for neighbour combinations not seen in any reference
    rows = [['.'] * 8 for _ in range(14)]
    vert = [2, 3, 5, 6]; horiz = [5, 7]
    if 'N' in key or not key:
        for y in range(0, 8):
            for x in vert: rows[y][x] = '#'
    if 'S' in key or not key:
        for y in range(5, 14):
            for x in vert: rows[y][x] = '#'
    if 'E' in key:
        for y in horiz:
            for x in range(4, 8): rows[y][x] = '#'
    if 'W' in key:
        for y in horiz:
            for x in range(0, 5): rows[y][x] = '#'
    return bitmap_from_rows(rows)


def fallback(n):
    rows = [['.'] * 8 for _ in range(14)]
    for x in range(8): rows[0][x] = rows[13][x] = '#'
    for y in range(14): rows[y][0] = rows[y][7] = '#'
    s = str(n)[-2:]
    for k, ch in enumerate(s if len(s) == 2 else ' ' + s):
        if ch == ' ': continue
        pat = DIGITS[int(ch)]
        for yy in range(5):
            for xx in range(3):
                if pat[yy * 3 + xx] == '1': rows[4 + yy][1 + k * 3 + xx] = '#'
    return bitmap_from_rows(rows)


def cell_spec(board, i, objchar):
    """Return (bitmap, fg_rgb, bg_rgb, known) for cell i."""
    t, c = board['cells'][i]
    x, y = i % 60, i // 60
    if t == 0:
        return 0, PALETTE[0], PALETTE[0], True
    if 47 <= t <= 53:
        bg = PALETTE[0] if t == 53 else PALETTE[t - 46]
        bm = CHAR.get(c)
        return (bm if bm is not None else fallback(c)), PALETTE[15], bg, bm is not None
    fg, bg = PALETTE[c & 15], PALETTE[c >> 4]
    if t == 36 and (x, y) in objchar:
        bm = CHAR.get(objchar[(x, y)])
        return (bm if bm is not None else fallback(objchar[(x, y)])), fg, bg, bm is not None
    if t == 31:
        cells = board['cells']
        def is31(xx, yy): return 0 <= xx < 60 and 0 <= yy < 25 and cells[yy * 60 + xx][0] == 31
        key = ''.join(n for n, ok in zip('NSEW', (is31(x, y - 1), is31(x, y + 1), is31(x + 1, y), is31(x - 1, y))) if ok)
        return line_glyph(key), fg, bg, key in LINES
    bm = TYPE_GLYPH.get(t)
    return (bm if bm is not None else fallback(t)), fg, bg, bm is not None


def render(board, numbers=False):
    im = Image.new('RGB', (480, 350))
    px = im.load()
    objchar = {(s['x'] - 1, s['y'] - 1): s['p1'] for s in board['stats']}
    unknown = 0
    for i in range(1500):
        t = board['cells'][i][0]
        bm, fg, bg, known = cell_spec(board, i, objchar)
        if numbers and t != 0 and not (47 <= t <= 53):
            bm = fallback(t)
        unknown += not known
        cx, cy = (i % 60) * 8, (i // 60) * 14
        for yy in range(14):
            for xx in range(8):
                px[cx + xx, cy + yy] = fg if (bm >> (111 - (yy * 8 + xx))) & 1 else bg
    return im, unknown


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) != 3:
        print(__doc__); sys.exit(1)
    d, h, bs, _ = zztlib.load(args[0])
    n = int(args[1])
    if not 0 <= n < len(bs):
        print(f'board {n} out of range: this world has boards 0..{len(bs) - 1}'); sys.exit(2)
    b = bs[n]
    im, unknown = render(b, numbers='--numbers' in sys.argv)
    im.save(args[2])
    print(f"rendered board {b['index']} {b['name']!r} -> {args[2]} ({unknown} cells drawn with fallback glyphs)")


if __name__ == '__main__':
    main()
