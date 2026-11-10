"""Probe 1: header board count + board chain (u16 size prefix) + RLE grid length."""
import sys, glob, struct
files = sys.argv[1:] or sorted(glob.glob('corpus/zzt/*/*.[Zz][Zz][Tt]'))
for f in files:
    d = open(f,'rb').read()
    nb = struct.unpack_from('<h', d, 2)[0]
    off = 512; i = 0; ok = True; lines = []
    while off + 2 <= len(d):
        sz = struct.unpack_from('<H', d, off)[0]
        name = d[off+3:off+3+d[off+2]].decode('cp437')
        # RLE
        p = off + 2 + 51; cells = 0; runs = 0
        while cells < 1500:
            c = d[p] or 256; cells += c; p += 3; runs += 1
        lines.append((i, sz, name, cells, p - off - 2))
        off += 2 + sz; i += 1
    print(f"{f}: len={len(d)} hdr[2]={nb} boards_found={i} end={off} exact={off==len(d)}")
    for l in lines[:3]: print('   ', l)
    bad = [l for l in lines if l[3] != 1500]
    print('    grids not exactly 1500:', bad)
