"""Ablation for the row-filter modes 0x89..0x8F: counts mismatching pixels (outside visible parts and the
menu bar) over the 10 shown cards with the MODES table of bitmap.py, then with each mode swapped for
every alternative (dh, dv). The table in bitmap.py must give the lowest count for every swap."""
import sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bitmap, render_card
from bitmap_check import *
shown = {'hypercard_obliquestrategies': 1}
offs = {'hypercard_fantasylanguagecreat1': (48,51), 'hypercard_what_is_hypercard_2': (16,40), 'mark-twain---300-quotations': (144,40)}
samples = []
for dd in sorted(glob.glob('corpus/hypercard/*/')):
    name = os.path.basename(os.path.normpath(dd))
    s = Stack(glob.glob(dd + '*.stak')[0]); ref = load_ref(dd + 'reference.png')
    cid = card_order(s)[shown.get(name, 0)][0]
    samples.append((name, s, ref, cid))
def bad():
    tot = 0; per = {}
    for name, s, ref, cid in samples:
        img = render(s, cid); w, h = img.size; x0, y0 = offs.get(name, (0,0))
        r = ref.crop((x0, y0, x0+w, y0+h))
        keep = Image.new('L', (w, h), 255)
        for (t, l, b, rr) in visible_part_rects(s, cid): keep.paste(0, (l, t, rr, b))
        keep.paste(0, (0, 0, w, max(0, 20 - y0)))
        m = mismatch(img, r, keep); per[name[:12]] = m; tot += m
    return tot, per
print("baseline", bad())
base = dict(bitmap.MODES)
ALTS = [(0,0),(1,0),(0,1),(1,1),(2,2),(8,0),(0,2),(16,0),(2,0),(4,0),(0,4),(2,1),(1,2),(4,2),(12,0),(32,0)]
for op in range(0x89, 0x90):
    for alt in ALTS:
        if alt == base[op]: continue
        bitmap.MODES.clear(); bitmap.MODES.update(base); bitmap.MODES[op] = alt
        print(hex(op), alt, bad()[0], flush=True)
bitmap.MODES.clear(); bitmap.MODES.update(base)
