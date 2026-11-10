"""Probe 12: type-31 glyph depends on neighbours? Group the reference bitmap of every type-31 cell by
which of its N/S/E/W neighbours are also type 31 (variant A: off-grid counts as not-31; variant B: off-grid
counts as 31). A consistent hypothesis gives exactly one bitmap per neighbour key."""
import os, sys, json, collections
sys.path.insert(0, os.path.dirname(__file__))
import zztlib
from PIL import Image
from p08_glyphs import REFS, ROOT, cell_pixels, mask_hex
pal = {int(k): tuple(v) for k, v in json.load(open(os.path.join(os.path.dirname(__file__), 'glyphs.json')))['palette'].items()}
for variant, offval in (('A off-grid=not31', False), ('B off-grid=31', True)):
    groups = collections.defaultdict(collections.Counter)
    for folder, fname in REFS.items():
        im = Image.open(os.path.join(ROOT, 'corpus/zzt', folder, 'reference.png')).convert('RGB')
        d, h, bs, _ = zztlib.load(os.path.join(ROOT, 'corpus/zzt', folder, fname))
        cells = bs[0]['cells']
        def is31(x, y):
            if not (0 <= x < 60 and 0 <= y < 25): return offval
            return cells[y * 60 + x][0] == 31
        for i, (t, c) in enumerate(cells):
            if t != 31: continue
            x, y = i % 60, i // 60
            key = ''.join(n for n, ok in zip('NSEW', (is31(x, y - 1), is31(x, y + 1), is31(x + 1, y), is31(x - 1, y))) if ok)
            groups[key][mask_hex(cell_pixels(im, x, y), pal[c & 15])] += 1
    bad = {k: len(v) for k, v in groups.items() if len(v) > 1}
    print(variant, 'keys', len(groups), 'inconsistent keys', bad)
    if not bad:
        json.dump({k: v.most_common(1)[0][0] for k, v in groups.items()}, open(os.path.join(os.path.dirname(__file__), 'line_glyphs.json'), 'w'), indent=0)
        print('  saved line_glyphs.json keys:', sorted(groups))
