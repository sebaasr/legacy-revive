"""Probe: BMAP header. Offsets relative to h (= common header length, 16 in format 10, 12 in format 8):
h+0 u32 (0), h+4 u32 (0x00010000), h+8 card rect, h+0x10 mask rect, h+0x18 image rect (rects = 4 x i16
top,left,bottom,right), h+0x20 8 bytes (0), h+0x28 u32 mask data length, h+0x2c u32 image data length,
h+0x30 data. Tests: h+0x30+mask+image rounded up to 32 == block size; card rect == stack card size;
every BMAP is referenced by exactly one CARD or BKGD; rects inside card rect; zero-length data <=> rect."""
import sys, os, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hc import *

files = sys.argv[1:] or sorted(glob.glob('corpus/hypercard/*/*.stak'))
for f in files:
    s = Stack(f); d = s.data; h = s.hdr
    ch, cw = i16(d, 0x1b8) or 342, i16(d, 0x1ba) or 512
    refs = collections.Counter()
    for b in s.of_type('CARD') + s.of_type('BKGD'):
        bm = i32(b.raw, h)
        if bm: refs[bm] += 1
    stats = collections.Counter()
    for b in s.of_type('BMAP'):
        r = b.raw
        rect = lambda o: tuple(i16(r, o + 2*j) for j in range(4))
        card, mask, img = rect(h+8), rect(h+0x10), rect(h+0x18)
        ml, il = u32(r, h+0x28), u32(r, h+0x2c)
        end = h + 0x30 + ml + il
        stats['size_ok'] += ((end + 31) // 32 * 32 == b.size)
        stats['const_ok'] += (u32(r, h) == 0 and u32(r, h+4) == 0x10000 and r[h+0x20:h+0x28] == bytes(8))
        stats['card_ok'] += (card == (0, 0, ch, cw))
        stats['ref_once'] += (refs[b.id] == 1)
        inside = lambda q: q == (0,0,0,0) or (0 <= q[0] <= q[2] <= ch and 0 <= q[1] <= q[3] <= cw)
        stats['inside'] += inside(mask) and inside(img)
        stats[('mask', 'rect0' if mask == (0,0,0,0) else ('full' if mask == card else 'part'), 'len0' if ml == 0 else 'data')] += 1
        stats[('img', 'rect0' if img == (0,0,0,0) else ('full' if img == card else 'part'), 'len0' if il == 0 else 'data')] += 1
        stats['n'] += 1
    print(os.path.basename(f)[:26], dict(stats))
