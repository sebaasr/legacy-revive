"""Check the ICON pixel format against the screenshots: for every visible button (no 0x80 flag) on the
displayed card whose icon id exists in the stack's resource fork, search the button rect in
reference.png for the 32x32 icon and print the best match (% of the 1024 pixels) and where it sits.
The displayed card is card #0 except Oblique (#1, its openStack does `go card 2`).
Cards smaller than the screen are placed with the window offsets found by bitmap_check.py."""
import sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hc import *
from rsrc import ResFork
from list_page import card_order
from PIL import Image

SHOWN = {'hypercard_obliquestrategies': 1}
OFFS = {'hypercard_fantasylanguagecreat1': (48, 51), 'hypercard_what_is_hypercard_2': (16, 40),
        'mark-twain---300-quotations': (144, 40)}

for dd in sorted(glob.glob('corpus/hypercard/*/')):
    name = os.path.basename(os.path.normpath(dd))
    rs = glob.glob(os.path.join(dd, '*.rsrc'))
    if not rs: continue
    R = ResFork(rs[0]); s = Stack(glob.glob(os.path.join(dd, '*.stak'))[0])
    ref = Image.open(os.path.join(dd, 'reference.png')).convert('L')
    px = ref.load(); ox, oy = OFFS.get(name, (0, 0))
    cid = card_order(s)[SHOWN.get(name, 0)][0]
    card = parse_layer(s, s.get('CARD', cid)); bk = parse_layer(s, s.get('BKGD', card['bkgd']))
    for L in (bk, card):
        for p in L['parts']:
            if p['kind'] != 1 or p['icon'] <= 0 or p['flags'] & 0x80: continue
            ic = R.get('ICON', p['icon'])
            if ic is None: continue
            bits = [[(ic[y*4 + x//8] >> (7 - x % 8)) & 1 for x in range(32)] for y in range(32)]
            t, l, b, r = p['rect']; best = (0, 0, 0)
            for y0 in range(t + oy - 4, b + oy - 28):
                for x0 in range(l + ox - 4, r + ox - 28):
                    if x0 < 0 or y0 < 0 or x0 + 32 > 512 or y0 + 32 > 342: continue
                    m = sum((px[x0 + x, y0 + y] < 128) == bits[y][x] for y in range(32) for x in range(32))
                    if m > best[0]: best = (m, x0 - ox, y0 - oy)
            cx = (l + r) // 2 - 16
            print('%-28s %-5s icon %6d rect %-22s best %6.2f%% at card (%d,%d); rect centre-16 x=%d' % (
                name[:28], L['type'], p['icon'], p['rect'], 100 * best[0] / 1024, best[1], best[2], cx))
