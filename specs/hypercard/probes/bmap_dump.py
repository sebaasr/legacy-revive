"""List every BMAP: owner, rects, mask/image lengths, and first bytes of each stream."""
import sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hc import *

def bmap_info(s, b):
    r, h = b.raw, s.hdr
    rect = lambda o: tuple(i16(r, o + 2*j) for j in range(4))
    ml, il = u32(r, h+0x28), u32(r, h+0x2c)
    o = h + 0x30
    return {'card': rect(h+8), 'mrect': rect(h+0x10), 'irect': rect(h+0x18),
            'mask': r[o:o+ml], 'image': r[o+ml:o+ml+il]}

if __name__ == '__main__':
    files = sys.argv[1:] or sorted(glob.glob('corpus/hypercard/*/*.stak'))
    for f in files:
        s = Stack(f)
        print('==', os.path.basename(f))
        for b in s.of_type('BMAP'):
            I = bmap_info(s, b)
            print(b.id, I['mrect'], len(I['mask']), I['mask'][:24].hex(), '|', I['irect'], len(I['image']), I['image'][:40].hex())
