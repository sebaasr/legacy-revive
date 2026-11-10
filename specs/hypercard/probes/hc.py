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
