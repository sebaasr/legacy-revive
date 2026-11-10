"""Resource fork container parser (built from the bytes of the corpus *.rsrc files).
See notes/09-resource-fork-icons.md.

File header (big-endian, offset 0): u32 data area offset, u32 map offset, u32 data area length,
u32 map length.  Map: copy of the 16-byte header, 4 + 2 bytes not decoded, u16 attributes,
u16 type-list offset (from map start), u16 name-list offset (from map start).
Type list: u16 (number of types - 1), then 8-byte entries: 4cc type, u16 (count - 1), u16 offset of
this type's reference list (from type list start).
Reference entry (12 bytes): i16 id, u16 name offset into name list (0xFFFF = no name), u8 attributes,
u24 data offset (from data area start), u32 0.
Data: u32 length, then the resource bytes.  Names: Pascal strings (length byte + Mac Roman).

python rsrc.py [file.rsrc ...] -> checks every file and lists its types/resources.
"""
import sys, os, glob, struct

def u16(d, o): return struct.unpack_from('>H', d, o)[0]
def i16(d, o): return struct.unpack_from('>h', d, o)[0]
def u32(d, o): return struct.unpack_from('>I', d, o)[0]

class ResFork:
    def __init__(self, path):
        self.path = path
        d = self.data = open(path, 'rb').read()
        self.doff, self.moff, self.dlen, self.mlen = struct.unpack_from('>IIII', d, 0)
        m = self.moff
        self.map_copy_ok = d[m:m+16] == d[0:16]
        self.attrs = u16(d, m + 0x16)
        tl = m + u16(d, m + 0x18)
        nl = m + u16(d, m + 0x1a)
        self.res = []        # (type, id, name, attrs, bytes)
        ntypes = (u16(d, tl) + 1) & 0xFFFF
        for k in range(ntypes):
            e = tl + 2 + 8 * k
            typ = d[e:e+4].decode('mac_roman')
            cnt = u16(d, e + 4) + 1
            rl = tl + u16(d, e + 6)
            for j in range(cnt):
                r = rl + 12 * j
                rid, noff = i16(d, r), u16(d, r + 2)
                attr = d[r + 4]
                off = u32(d, r + 4) & 0xFFFFFF
                name = None
                if noff != 0xFFFF:
                    n = d[nl + noff]; name = d[nl + noff + 1: nl + noff + 1 + n].decode('mac_roman')
                p = self.doff + off
                ln = u32(d, p)
                self.res.append((typ, rid, name, attr, d[p + 4: p + 4 + ln]))

    def get(self, typ, rid):
        for t, i, n, a, b in self.res:
            if t == typ and i == rid: return b
        return None

    def of_type(self, typ):
        return [(i, n, b) for t, i, n, a, b in self.res if t == typ]

if __name__ == '__main__':
    files = sys.argv[1:] or sorted(glob.glob('corpus/hypercard/*/*.rsrc'))
    for f in files:
        R = ResFork(f)
        d = R.data
        ok_size = R.moff + R.mlen == len(d) and R.doff + R.dlen <= R.moff
        # every resource's data must lie inside the data area, and lengths must tile it
        total = sum(4 + len(b) for *_, b in R.res)
        types = {}
        for t, i, n, a, b in R.res: types.setdefault(t, []).append(i)
        print('==', os.path.basename(f), 'size', len(d), 'data@%#x len %#x map@%#x len %#x' % (R.doff, R.dlen, R.moff, R.mlen),
              'map_end==file_end:', ok_size, 'header_copy:', R.map_copy_ok, 'sum(4+len)==data_len:', total == R.dlen)
        for t, ids in types.items():
            print('   %s x%d %s' % (t, len(ids), sorted(ids)[:12]))
