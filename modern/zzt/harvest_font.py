"""Harvest an 8x14 CP437 glyph font from the reference title screens of the original program.

The cell renderer needs real glyph bitmaps to look like the original. Each reference.png is a 480x350
screenshot of board 0, and the IR's grid file says which character, foreground and background each
cell holds. For every cell with fg != bg we read the 8x14 block and record the pixels that have the fg
color. Votes are merged per character code; a pixel is set when most samples set it.

Characters never seen in a reference fall back to the browser's monospace font at runtime.

Writes modern/runtime/cp437-font.js:  window.CP437_FONT = { "<code>": "<28 hex digits>", ... }
(14 rows, 8 bits per row, MSB = leftmost pixel).

Usage: python modern/zzt/harvest_font.py
"""
import json
from collections import defaultdict
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
# reference folder -> world IR folder whose board 0 the screenshot shows
REFS = {
    "crimring": "crimring-crimring", "dammak": "dammak-dammak", "kingl2": "kingl2-kingl2",
    "lostmonk": "lostmonk-lostmonk", "pyramid": "pyramid-pyramid", "zzttoxic": "zzttoxic-toxic",
}
# null-char cells whose shape is a known CP437 glyph (SPEC 4.2: dense dither, checkerboard)
NULL_ELEMENT_CHAR = {22: 178, 23: 177}
LINE_CHAR = {  # element 31 neighbour key -> CP437 double-line glyph (same table as render-cells.js)
    "": 249, "N": 208, "S": 210, "NS": 186, "W": 181, "NW": 188, "SW": 187, "NSW": 185,
    "E": 198, "NE": 200, "SE": 201, "NSE": 204, "EW": 205, "NEW": 202, "SEW": 203, "NSEW": 206,
}


def line_key(cells, i):
    col, row = i % 60, i // 60
    key = ""
    for d, (dc, dr) in zip("NSEW", ((0, -1), (0, 1), (1, 0), (-1, 0))):
        c, r = col + dc, row + dr
        if 0 <= c < 60 and 0 <= r < 25 and cells[r * 60 + c][3] == 31:
            key += d
    return key


def main():
    votes = defaultdict(lambda: [0] * 112)
    samples = defaultdict(int)
    for ref, world in REFS.items():
        im = Image.open(ROOT / "corpus/zzt" / ref / "reference.png").convert("RGB")
        grid = json.loads((ROOT / "output/zzt" / world / "ir/assets/board-0.json").read_text())
        pal = [tuple(p) for p in grid["palette"]]
        cells = grid["cells"]
        for i, (ch, fg, bg, el) in enumerate(cells):
            if el == 4:  # player cell is blank in most references
                continue
            if ch is None:
                ch = LINE_CHAR[line_key(cells, i)] if el == 31 else NULL_ELEMENT_CHAR.get(el)
            if ch is None or pal[fg] == pal[bg]:
                continue
            cx, cy = (i % 60) * 8, (i // 60) * 14
            v = votes[ch]
            for y in range(14):
                for x in range(8):
                    if im.getpixel((cx + x, cy + y)) == pal[fg]:
                        v[y * 8 + x] += 1
            samples[ch] += 1
    font = {}
    for ch, v in sorted(votes.items()):
        n = samples[ch]
        rows = []
        for y in range(14):
            b = 0
            for x in range(8):
                if v[y * 8 + x] * 2 > n:
                    b |= 0x80 >> x
            rows.append(f"{b:02x}")
        font[str(ch)] = "".join(rows)
    out = ROOT / "modern/runtime/cp437-font.js"
    out.write_text(
        "// 8x14 CP437 glyphs harvested from the reference screenshots (modern/zzt/harvest_font.py).\n"
        "// Each value: 14 rows x 2 hex digits, MSB = leftmost pixel. Missing codes fall back to a\n"
        "// browser monospace font (see render-cells.js).\n"
        "window.CP437_FONT = " + json.dumps(font, indent=0) + ";\n", encoding="utf-8")
    print(f"{len(font)} glyphs -> {out}")


if __name__ == "__main__":
    main()
