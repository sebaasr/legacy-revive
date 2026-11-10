"""Export icon resources from a resource fork as PNG.

usage: python icons.py <file.rsrc> <out_dir>
  ICON (128 bytes) -> 32x32, 1 bit per pixel, 4 bytes per row, MSB = leftmost pixel, 1 = black.
                      written as ICON_<id>.png
  ICN# (256 bytes) -> two 32x32 planes: image then mask (mask = probable). ICN#_<id>.png and
                      ICN#_<id>_mask.png
  ics# (64 bytes)  -> two 16x16 planes (2 bytes per row), same convention. ics#_<id>.png / _mask.png
Colour icons (icl4/icl8/ics4/ics8) are not exported: their palette is not in the files (unknown).
With no arguments: prints, for every sample, the icon ids its buttons use and which are missing from
the stack's resource fork.
"""
import sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rsrc import ResFork

def plane(data, size):
    from PIL import Image
    w = size // 8
    raw = bytes(0xFF ^ c for c in data[:w * size])        # 1 = black -> Pillow '1' 0 = black
    return Image.frombytes('1', (size, size), raw)

def export(path, out):
    os.makedirs(out, exist_ok=True)
    R = ResFork(path); n = 0
    for typ, rid, name, attr, b in R.res:
        safe = typ.replace('#', '#').strip()
        if typ == 'ICON' and len(b) == 128:
            plane(b, 32).save(os.path.join(out, 'ICON_%d.png' % rid)); n += 1
        elif typ == 'ICN#' and len(b) == 256:
            plane(b, 32).save(os.path.join(out, 'ICN#_%d.png' % rid))
            plane(b[128:], 32).save(os.path.join(out, 'ICN#_%d_mask.png' % rid)); n += 1
        elif typ == 'ics#' and len(b) == 64:
            plane(b, 16).save(os.path.join(out, 'ics#_%d.png' % rid))
            plane(b[32:], 16).save(os.path.join(out, 'ics#_%d_mask.png' % rid)); n += 1
    return n

def corpus_report():
    from hc import Stack, parse_layer
    for dd in sorted(glob.glob('corpus/hypercard/*/')):
        stak = glob.glob(os.path.join(dd, '*.stak'))[0]
        rs = glob.glob(os.path.join(dd, '*.rsrc'))
        s = Stack(stak)
        have = set()
        if rs:
            R = ResFork(rs[0]); have = {rid for t, rid, *_ in R.res if t == 'ICON'}
        used = {}
        for b in s.of_type('CARD') + s.of_type('BKGD'):
            for p in parse_layer(s, b)['parts']:
                if p['kind'] == 1 and p['icon'] > 0:
                    used[p['icon']] = used.get(p['icon'], 0) + 1
        missing = sorted(i for i in used if i not in have)
        print('%-34s rsrc=%-5s ICONs=%-3d used=%s missing=%s' % (os.path.basename(os.path.normpath(dd))[:34],
              bool(rs), len(have), sorted(used), missing))

if __name__ == '__main__':
    if len(sys.argv) == 3:
        print(export(sys.argv[1], sys.argv[2]), 'icons written to', sys.argv[2])
    elif len(sys.argv) == 1:
        corpus_report()
    else:
        raise SystemExit(__doc__)
