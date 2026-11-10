"""Probe: walk the data fork as a sequence of [size:u32][type:4cc][id:i32]... blocks.
Usage: python blocks.py [file.stak ...]   (default: all corpus stacks)"""
import sys, struct, glob, collections
def walk(data):
    off = 0
    while off + 12 <= len(data):
        size, typ, bid = struct.unpack('>I4si', data[off:off+12])
        yield off, size, typ.decode('mac_roman'), bid
        if size == 0 or off + size > len(data): break
        off += size
def main(files, verbose=False):
    for f in files:
        data = open(f, 'rb').read()
        blocks = list(walk(data))
        last = blocks[-1]
        end = last[0] + last[1]
        cnt = collections.Counter(b[2] for b in blocks)
        print(f"{f.split('/')[-1][:30]:30s} len={len(data):7d} blocks={len(blocks):4d} end={end:7d} ok={end==len(data)} {dict(cnt)}")
        if verbose:
            for b in blocks: print('   off=%06x size=%6d %s id=%d' % b)
if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '-v']
    main(args or sorted(glob.glob('corpus/hypercard/*/*.stak')), '-v' in sys.argv)
