"""Probe 13: render board 0 of each referenced world with render_board.py and compare with reference.png.
Reports pixel and cell agreement, and lists mismatching cells by element type.
Caveat: glyph bitmaps come from these same references (p08), so this mainly tests the cell encoding,
palette, text/object/line rules, not the glyph shapes themselves."""
import os, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
import zztlib, render_board
from p08_glyphs import REFS, ROOT
from PIL import Image, ImageChops
out = os.path.join(ROOT, 'specs/zzt/probes/out'); os.makedirs(out, exist_ok=True)
for folder, fname in REFS.items():
    ref = Image.open(os.path.join(ROOT, 'corpus/zzt', folder, 'reference.png')).convert('RGB')
    d, h, bs, _ = zztlib.load(os.path.join(ROOT, 'corpus/zzt', folder, fname))
    im, unk = render_board.render(bs[0])
    im.save(os.path.join(out, f'{folder}_board0.png'))
    diff = ImageChops.difference(im, ref).convert('L')
    bad_px = sum(1 for v in diff.get_flattened_data() if v) if hasattr(diff, 'get_flattened_data') else sum(1 for v in diff.getdata() if v)
    badcells = collections.Counter()
    for i in range(1500):
        x, y = (i % 60) * 8, (i // 60) * 14
        if diff.crop((x, y, x + 8, y + 14)).getbbox(): badcells[bs[0]['cells'][i][0]] += 1
    print(f'{folder:9s} {fname:13s} pixels match {100 - 100 * bad_px / (480 * 350):6.2f}%  cells match {1500 - sum(badcells.values())}/1500  mismatches by type {dict(badcells)}')
