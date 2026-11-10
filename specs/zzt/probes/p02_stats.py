"""Probe 2: find the status-count offset after the grid by brute force.
Hypothesis: after the grid come K bytes of board properties, then i16 count N, then N+1 records of
33 bytes (code length i16 at +23) each followed by `length` bytes of program text. Test: the parse must
end exactly at the board end. Report which K works, for every board of every file."""
import sys, glob, struct, collections
files = sys.argv[1:] or sorted(glob.glob('corpus/zzt/*/*.[Zz][Zz][Tt]'))
hist = collections.Counter(); fails = []
for f in files:
    d = open(f,'rb').read(); off = 512; bi = 0
    while off < len(d):
        sz = struct.unpack_from('<H', d, off)[0]; end = off + 2 + sz
        p = off + 53; c = 0
        while c < 1500: c += d[p] or 256; p += 3
        good = []
        for k in range(0, 200):
            q = p + k
            if q + 2 > end: break
            n = struct.unpack_from('<h', d, q)[0]
            if n < 0 or n > 200: continue
            r = q + 2; okk = True
            for i in range(n + 1):
                if r + 33 > end: okk = False; break
                ln = struct.unpack_from('<h', d, r + 23)[0]
                r += 33 + max(ln, 0)
            if okk and r == end: good.append((k, n))
        hist[tuple(x[0] for x in good)] += 1
        if not good: fails.append((f, bi))
        off = end; bi += 1
print('K candidates histogram:', hist.most_common(10)); print('fails:', fails)
