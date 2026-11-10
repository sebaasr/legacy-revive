"""Probe 7: compare the title board (board 0) of each world against reference.png cell by cell.
For each 8x14 cell: the set of RGB colors and a bitmask. Collect, per color-byte nibble, which RGB values
appear (fg = low nibble, bg = high nibble hypothesis) for element types < 47; and for types 47..53 check the
'color byte is a character code' hypothesis by grouping bitmaps per character code."""
import os, sys, glob, collections
sys.path.insert(0, os.path.dirname(__file__))
import zztlib
from PIL import Image

def cell_info(im, cx, cy):
    px = [im.getpixel((cx * 8 + x, cy * 14 + y)) for y in range(14) for x in range(8)]
    cols = collections.Counter(px)
    return px, cols

def main():
    fg_rgb = collections.defaultdict(collections.Counter); bg_rgb = collections.defaultdict(collections.Counter)
    for folder in sorted(glob.glob('corpus/zzt/*/')):
        im = Image.open(os.path.join(folder, 'reference.png')).convert('RGB')
        best = None
        for f in glob.glob(os.path.join(folder, '*.[Zz][Zz][Tt]')):
            d, h, bs, _ = zztlib.load(f)
            cells = bs[0]['cells']
            # score: fraction of cells where type 0 (assumed empty) is all-black in the reference
            sc = sum(1 for i, (t, c) in enumerate(cells) if t == 0 and len(cell_info(im, i % 60, i // 60)[1]) == 1 and cell_info(im, i % 60, i // 60)[1].most_common(1)[0][0] == (0, 0, 0))
            tot = sum(1 for t, c in cells if t == 0)
            if best is None or sc / max(tot, 1) > best[0]: best = (sc / max(tot, 1), f, cells, tot)
        print(f'{folder}: best match {os.path.basename(best[1])} empty->black {best[0]:.3f} of {best[3]} empty cells')
        for i, (t, c) in enumerate(best[2]):
            px, cols = cell_info(im, i % 60, i // 60)
            if t in (0,) or t >= 47: continue
            if len(cols) == 2:
                # the less frequent color is likely the foreground for most glyphs; record both
                (a, na), (b, nb) = cols.most_common(2)
                fg_rgb[c & 15][a] += 0; fg_rgb[c & 15][b] += 1; bg_rgb[c >> 4][a] += 1
    print('low nibble -> minority RGB in 2-color cells:')
    for k in sorted(fg_rgb): print(' ', k, fg_rgb[k].most_common(3))
    print('high nibble -> majority RGB in 2-color cells:')
    for k in sorted(bg_rgb): print(' ', k, bg_rgb[k].most_common(3))
main()
