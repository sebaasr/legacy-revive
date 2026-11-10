"""Compare rendered card pictures with corpus/hypercard/<id>/reference.png.

For every sample: render every card (render_card.render), place it on the 512x342 screen (cards smaller
than the screen sit in a window; the offset is found by searching for the best match of the first card),
pick the card that matches best, and print:
  all%   = matching pixels over the whole card area
  nopart% = same, ignoring the rects of visible buttons/fields (parts without the hidden flag 0x80)
  nomenu% = nopart%, also ignoring the top 20 screen rows (menu bar drawn by the emulator)
usage: python bitmap_check.py [sample_dir ...] [--save DIR]  (DIR receives render/diff PNGs)
"""
import sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hc import *
from render_card import render, card_size, visible_part_rects
from list_page import card_order
from PIL import Image, ImageChops

def load_ref(path):
    return Image.open(path).convert('L').point(lambda v: 255 if v >= 128 else 0)

def count_black(im):
    return im.histogram()[255]

def mismatch(a, b, mask=None):
    d = ImageChops.difference(a, b)
    if mask is not None: d = ImageChops.multiply(d, mask)
    return count_black(d)

def find_offset(img, ref):
    W, H = ref.size; w, h = img.size
    if (w, h) == (W, H): return (0, 0)
    best = None
    for y in range(0, H - h + 1):
        for x in range(0, W - w + 1, 1):
            m = mismatch(img, ref.crop((x, y, x + w, y + h)))
            if best is None or m < best[0]: best = (m, x, y)
    return best[1], best[2]

def scores(img, ref, off, rects):
    w, h = img.size; x0, y0 = off
    r = ref.crop((x0, y0, x0 + w, y0 + h))
    full = Image.new('L', (w, h), 255)
    keep = Image.new('L', (w, h), 255)
    for (t, l, b, rr) in rects:
        keep.paste(0, (l, t, rr, b))
    keep2 = keep.copy()
    if y0 < 20: keep2.paste(0, (0, 0, w, 20 - y0))
    res = []
    for m in (full, keep, keep2):
        n = count_black(m)
        res.append(100.0 * (1 - mismatch(img, r, m) / n) if n else 0.0)
    return res, r

def main():
    args = sys.argv[1:]; save = None
    if '--save' in args:
        k = args.index('--save'); save = args[k + 1]; del args[k:k + 2]
        os.makedirs(save, exist_ok=True)
    dirs = args or sorted(glob.glob('corpus/hypercard/*/'))
    print('%-34s %5s %6s %5s %8s %8s %8s %s' % ('sample', 'cards', 'shown', 'first', 'all%', 'nopart%', 'nomenu%', 'offset'))
    for dd in dirs:
        stak = glob.glob(os.path.join(dd, '*.stak'))[0]
        s = Stack(stak); ref = load_ref(os.path.join(dd, 'reference.png'))
        order = [c for c, _ in card_order(s)]
        first = render(s, order[0])
        # offset search on a coarse-to-fine basis is overkill: cards are small in number
        off = find_offset(first, ref)
        best = None
        for k, cid in enumerate(order):
            img = render(s, cid)
            sc, r = scores(img, ref, off, visible_part_rects(s, cid))
            if best is None or sc[1] > best[0][1]: best = (sc, k, cid, img, r)
        sc, k, cid, img, r = best
        name = os.path.basename(os.path.normpath(dd))
        print('%-34s %5d %6s %5s %8.2f %8.2f %8.2f %s' % (name[:34], len(order), '#%d' % k, k == 0, sc[0], sc[1], sc[2], off))
        if save:
            img.save(os.path.join(save, name + '_render.png'))
            ImageChops.difference(img, r).save(os.path.join(save, name + '_diff.png'))

if __name__ == '__main__':
    main()
