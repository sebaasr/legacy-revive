"""Shared parsing library for HyperCard probes (built only from observed bytes).
Every layout below is backed by notes in specs/hypercard/notes/."""
import struct

def u8(d, o): return d[o]
def u16(d, o): return struct.unpack_from('>H', d, o)[0]
def i16(d, o): return struct.unpack_from('>h', d, o)[0]
def u32(d, o): return struct.unpack_from('>I', d, o)[0]
def i32(d, o): return struct.unpack_from('>i', d, o)[0]

def cstr(d, o):
    e = d.index(b'\0', o)
    return d[o:e].decode('mac_roman'), e + 1

class Block:
    def __init__(self, data, off):
        self.off = off
        self.size = u32(data, off)
        self.type = data[off+4:off+8].decode('mac_roman')
        self.id = i32(data, off+8)
        self.raw = data[off:off+self.size]

class Stack:
    def __init__(self, path):
        self.path = path
        self.data = d = open(path, 'rb').read()
        self.blocks = []
        off = 0
        while off + 12 <= len(d):
            b = Block(d, off)
            self.blocks.append(b)
            if b.size == 0: break
            off += b.size
        self.format = u32(d, 0x10)
        # format 8 blocks have a 12-byte common header; format 9/10 have 16 (extra 4-byte filler)
        self.hdr = 16 if self.format >= 9 else 12
        self.by_id = {}
        for b in self.blocks:
            self.by_id[(b.type, b.id)] = b

    def get(self, typ, bid):
        return self.by_id.get((typ, bid))

    def of_type(self, typ):
        return [b for b in self.blocks if b.type == typ]

# ---- cards, backgrounds, parts, contents ----
def parse_layer(s, b):
    """CARD or BKGD block -> dict. Offsets relative to h = common header length."""
    r, h = b.raw, s.hdr
    L = {'type': b.type, 'id': b.id, 'bmap': i32(r, h), 'flags': u16(r, h+4)}
    if b.type == 'CARD':
        L['page'] = i32(r, h+0x10); L['bkgd'] = i32(r, h+0x14); o = h+0x18
    else:
        L['ncards'] = u32(r, h+8); L['next'] = i32(r, h+0x0c); L['prev'] = i32(r, h+0x10); o = h+0x14
    L['nparts'], L['maxpartid'] = u16(r, o), u16(r, o+2)
    L['partsize'] = u32(r, o+4)
    L['ncontents'] = u16(r, o+8)
    L['contentsize'] = u32(r, o+10)
    L['unk_pre'] = r[h+6:(h+0x10 if b.type == 'CARD' else h+8)]
    p = o + 14
    parts = []
    for _ in range(L['nparts']):
        parts.append(parse_part(r, p)); p += parts[-1]['size']
    L['parts_end'] = p
    L['parts'] = parts
    contents = []
    for _ in range(L['ncontents']):
        c = parse_content(r, p); contents.append(c); p += c['stride']
    L['contents'] = contents
    L['contents_end'] = p
    L['name'], p = cstr(r, p)
    L['script'], p = cstr(r, p)
    L['tail_end'] = p
    return L

def parse_part(r, p):
    P = {'off': p, 'size': u16(r, p), 'id': u16(r, p+2), 'kind': r[p+4], 'flags': r[p+5],
         'rect': (i16(r, p+6), i16(r, p+8), i16(r, p+10), i16(r, p+12)),   # top, left, bottom, right
         'flags2': u16(r, p+14), 'f16': u16(r, p+16), 'icon': i16(r, p+18),
         'align': i16(r, p+20), 'font': i16(r, p+22), 'textsize': u16(r, p+24),
         'style': u16(r, p+26), 'lineheight': u16(r, p+28)}
    P['name'], q = cstr(r, p+30)
    P['gap'] = r[q]                       # observed always 0
    P['script'], q = cstr(r, q+1)
    P['slack'] = r[q:p+P['size']]
    return P

def parse_content(r, p):
    pid = i16(r, p); n = u16(r, p+2)
    body = r[p+4:p+4+n]
    C = {'off': p, 'partid': pid, 'len': n, 'stride': 4 + n + (n & 1)}
    if body and body[0] & 0x80:
        sl = u16(body, 0) & 0x7fff
        C['runs'] = [(u16(body, k), u16(body, k+2)) for k in range(2, sl, 4)]
        C['text'] = body[sl:].decode('mac_roman')
        C['plain_prefix'] = None
    else:
        C['runs'] = []
        C['plain_prefix'] = body[:1]
        C['text'] = body[1:].decode('mac_roman')
    return C
