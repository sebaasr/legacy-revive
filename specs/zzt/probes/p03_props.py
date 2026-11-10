"""Probe 3: survey the 86-byte board property block (per-offset value stats across all boards)."""
import os, sys, glob, struct, collections
files = sys.argv[1:] or sorted(glob.glob('corpus/zzt/*/*.[Zz][Zz][Tt]'))
blocks = []
for f in files:
    d = open(f,'rb').read(); off = 512; bi = 0
    nb = struct.unpack_from('<h', d, 2)[0] + 1
    while off < len(d):
        sz = struct.unpack_from('<H', d, off)[0]; end = off + 2 + sz
        p = off + 53; c = 0
        while c < 1500: c += d[p] or 256; p += 3
        blocks.append((os.path.basename(f), bi, nb, d[p:p+86]))
        off = end; bi += 1
for i in range(86):
    vals = collections.Counter(b[3][i] for b in blocks)
    print(i, len(vals), vals.most_common(6))
print()
for name, bi, nb, b in blocks[:20] + [x for x in blocks if x[0]=='TOXIC.ZZT'][:12]:
    msglen = b[8]
    print(name, bi, 'b0=%d dark=%d exits=%s b6=%d msg=%r tail=%s' % (b[0], b[1], list(b[2:6]), b[6], b[8:9+min(b[8],58)][1:].decode('cp437'), b[66:].hex()))
