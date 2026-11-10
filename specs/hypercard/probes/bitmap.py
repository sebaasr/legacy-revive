"""BMAP decoder (card/background pictures), built from the bytes + reference screenshots.
See notes/08-bitmap-compression.md for the evidence behind every opcode.

decode_stream(data, rect) -> list of rows (bytes, 1 bit per pixel, 1 = black), one per rect row.
Row width in bytes = 4 * (ceil(right/32) - floor(left/32)): the rect is widened to 32-pixel columns.
Pixel x of a row maps to card x = floor(left/32)*32 + x.

Stand-alone use: python bitmap.py [file.stak ...]  -> decodes every BMAP stream of every sample and
reports (a) how many streams end exactly after the last row (only 0-3 padding bytes left) and (b) opcode
usage counts.
"""
import sys, os, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hc import *

# opcode 0x88..0x8F -> (horizontal XOR distance in bits, vertical XOR distance in rows)
MODES = {0x88: (16, 0), 0x89: (0, 0), 0x8A: (0, 1), 0x8B: (0, 2),
         0x8C: (1, 0), 0x8D: (1, 1), 0x8E: (2, 2), 0x8F: (8, 0)}

def bmap_info(s, b):
    r, h = b.raw, s.hdr
    rect = lambda o: tuple(i16(r, o + 2*j) for j in range(4))
    ml, il = u32(r, h+0x28), u32(r, h+0x2c)
    o = h + 0x30
    return {'id': b.id, 'card': rect(h+8), 'mrect': rect(h+0x10), 'irect': rect(h+0x18),
            'mask': r[o:o+ml], 'image': r[o+ml:o+ml+il]}

def row_bytes(rect):
    t, l, b, r = rect
    return ((r + 31) // 32 - l // 32) * 4

def _hdelta(row, dh):
    """Undo a horizontal XOR delta: out[x] = raw[x] ^ out[x-dh] (bits, left to right)."""
    if dh == 0: return row
    n = len(row) * 8
    v = int.from_bytes(row, 'big'); k = dh
    while k < n:
        v ^= v >> k; k *= 2
    return v.to_bytes(len(row), 'big')

def decode_stream(d, rect, stats=None):
    t, l, b, r = rect
    w, h = row_bytes(rect), b - t
    rows, cur, i = [], bytearray(), 0
    mode = (0, 0)
    pat = [0xAA, 0x55] * 4          # default 8-row pattern for opcode 0x84 (probable)
    st = stats if stats is not None else collections.Counter()

    def finish(raw):
        dh, dv = mode
        row = _hdelta(bytes(raw), dh)
        if dv and len(rows) >= dv:
            row = bytes(a ^ c for a, c in zip(row, rows[-dv]))
        rows.append(row)

    while i < len(d) and len(rows) < h:
        c = d[i]; i += 1; rep = 1
        if 0xA0 <= c < 0xC0:                 # repeat the following opcode (c & 0x1F) times
            st['a0-bf repeat'] += 1
            rep = c & 0x1F; c = d[i]; i += 1
        if c < 0x80:   st['00-7f dz'] += 1
        elif c < 0x90: st['%02x' % c] += 1
        elif 0xC0 <= c < 0xE0: st['c0-df literal'] += 1
        elif 0xE0 <= c < 0xF0: st['e0-ef zeros'] += 1
        else:
            st['unknown %02x' % c] += 1
            break
        for _ in range(rep):
            if c < 0x80:                          # high nibble: data bytes, low nibble: zero bytes first
                n, z = c >> 4, c & 15
                cur += bytes(z) + d[i:i+n]
            elif 0xC0 <= c < 0xE0:                # (c&31)*8 literal bytes
                cur += d[i:i + (c & 31) * 8]
            elif 0xE0 <= c < 0xF0:                # (c&15)*16 zero bytes
                cur += bytes((c & 15) * 16)
            elif c == 0x80: rows.append(bytes(d[i:i+w]))          # one uncompressed row
            elif c == 0x81: rows.append(bytes(w))                 # white row
            elif c == 0x82: rows.append(b'\xff' * w)              # black row
            elif c == 0x83:                                        # row of one byte; remembered in pattern
                pat[len(rows) % 8] = d[i]; rows.append(bytes([d[i]]) * w)
            elif c == 0x84: rows.append(bytes([pat[len(rows) % 8]]) * w)
            elif c == 0x85: rows.append(rows[-1])                 # copy row above
            elif c == 0x86: rows.append(rows[-2])                 # copy row two above
            elif c == 0x87: rows.append(rows[-3])                 # copy row three above (unseen)
            else: mode = MODES[c]                                  # 0x88..0x8F
            while len(cur) >= w and len(rows) < h:
                finish(cur[:w]); cur = cur[w:]
        if c < 0x80: i += c >> 4
        elif 0xC0 <= c < 0xE0: i += (c & 31) * 8
        elif c == 0x80: i += w
        elif c == 0x83: i += 1
    st['rows_short'] += (len(rows) < h)
    st['left_over_bytes_%d' % min(len(d) - i, 9)] += 1
    rows = rows[:h]
    return rows + [bytes(w)] * (h - len(rows))

def rows_to_layer(rows, rect, size):
    """Return a Pillow '1' image of the card size: 1-bits drawn black(0) on white, plus a '1' image where
    the rect area is set (255) for use as a mask."""
    from PIL import Image
    cw, ch = size
    t, l, b, r = rect
    left = l // 32 * 32
    img = Image.new('L', (cw, ch), 0)
    if rows and rows[0]:
        w = len(rows[0])
        src = Image.frombytes('1', (w * 8, len(rows)), b''.join(rows)).convert('L')
        img.paste(src.crop((l - left, 0, r - left, len(rows))), (l, t))
    return img   # 255 where bit is 1, 0 elsewhere

if __name__ == '__main__':
    files = sys.argv[1:] or sorted(glob.glob('corpus/hypercard/*/*.stak'))
    tot = collections.Counter()
    for f in files:
        s = Stack(f); st = collections.Counter()
        for b in s.of_type('BMAP'):
            I = bmap_info(s, b)
            for k, rk in (('mask', 'mrect'), ('image', 'irect')):
                if I[k]:
                    decode_stream(I[k], I[rk], st); st['streams'] += 1
        tot.update(st)
        print(os.path.basename(f)[:28].ljust(28), 'streams', st['streams'], 'short', st['rows_short'],
              'leftover', {k[15:]: v for k, v in st.items() if k.startswith('left_over')})
    print('opcode totals:')
    for k, v in sorted(tot.items()):
        if not k.startswith('left') and k not in ('streams', 'rows_short'): print('  ', k, v)
