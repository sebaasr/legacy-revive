"""zztlib: shared parser for the recovered world-file layout (see specs/zzt/notes/).

Everything here was derived from the corpus bytes; each field comment cites the probe/note that backs it.
Field names for bytes whose meaning is unknown are prefixed `unk_`.
"""
import struct

HEADER_SIZE = 512          # notes/01: first board always starts at 0x200
COLS, ROWS = 60, 25        # notes/03: every RLE grid decodes to exactly 1500 cells
PROPS_SIZE = 86            # notes/04: found by p02_stats.py (K=86 fits all 269 boards)
STAT_SIZE = 33             # notes/05


def i16(d, o): return struct.unpack_from('<h', d, o)[0]
def u16(d, o): return struct.unpack_from('<H', d, o)[0]
def pstr(d, o, cap):
    """Length-prefixed string: 1 length byte + `cap` bytes of storage (rest is leftover garbage)."""
    n = min(d[o], cap)
    return d[o + 1:o + 1 + n].decode('cp437')


def parse_header(d):
    h = {
        'magic': i16(d, 0x00),                 # always -1 (ff ff) in 8/8 files
        'board_count': i16(d, 0x02) + 1,       # stored value = number of boards - 1 (8/8 exact)
        'unk_04': i16(d, 0x04), 'unk_06': i16(d, 0x06),
        'unk_08_0e': list(d[0x08:0x0f]),       # 7 bytes, all zero in corpus
        'unk_0f_health?': i16(d, 0x0f),        # 100 in 8/8 files
        'current_board': i16(d, 0x11),         # board the player is on when saved (notes/01)
        'unk_13': i16(d, 0x13), 'unk_15': i16(d, 0x15), 'unk_17': i16(d, 0x17),
        'unk_19': i16(d, 0x19), 'unk_1b': i16(d, 0x1b),
        'name': pstr(d, 0x1d, 20),             # 1 len byte + 20 bytes
        'flags': [pstr(d, 0x32 + 21 * i, 20) for i in range(10)],  # 10 slots x 21 bytes
        'unk_104_108': list(d[0x104:0x109]),
    }
    return h


def decode_grid(d, p):
    """RLE triples (count, type, color); count 0 would mean 256 (never seen). Returns cells, end offset."""
    cells = []
    while len(cells) < COLS * ROWS:
        n = d[p] or 256
        cells.extend([(d[p + 1], d[p + 2])] * n)
        p += 3
    return cells[:COLS * ROWS], p


def parse_props(b):
    return {
        'unk_00_max_shots?': b[0],
        'dark?': b[1],
        'exits': {'north': b[2], 'south': b[3], 'west': b[4], 'east': b[5]},  # notes/04 (direction order probable)
        'unk_06_reenter?': b[6],
        'message': b[8:8 + min(b[7], 58)].decode('cp437'),
        'unk_66_67_enter_xy?': (b[66], b[67]),
        'unk_68_time?': struct.unpack_from('<h', b, 68)[0],
        'unk_70_85': b[70:86].hex(),
    }


def parse_stat(d, r):
    s = {
        'x': d[r], 'y': d[r + 1],              # 1-based cell coordinates
        'step_x': i16(d, r + 2), 'step_y': i16(d, r + 4),
        'cycle': i16(d, r + 6),
        'p1': d[r + 8], 'p2': d[r + 9], 'p3': d[r + 10],
        'follower': i16(d, r + 11), 'leader': i16(d, r + 13),
        'under_type': d[r + 15], 'under_color': d[r + 16],
        'unk_17_20_ptr': d[r + 17:r + 21].hex(),
        'ip': i16(d, r + 21),
        'code_len': i16(d, r + 23),
        'unk_25_32': d[r + 25:r + 33].hex(),
        'code': None,
    }
    ln = s['code_len']
    if ln > 0:
        s['code'] = d[r + 33:r + 33 + ln].decode('cp437')
    return s, r + 33 + max(ln, 0)


def parse_board(d, off, index):
    size = u16(d, off)
    end = off + 2 + size
    name = pstr(d, off + 2, 50)
    cells, p = decode_grid(d, off + 53)
    props = parse_props(d[p:p + PROPS_SIZE])
    q = p + PROPS_SIZE
    n = i16(d, q)
    r = q + 2
    stats = []
    for _ in range(n + 1):                     # stored count is (records - 1); record 0 is the player
        s, r = parse_stat(d, r)
        stats.append(s)
    return {'index': index, 'offset': off, 'size': size, 'name': name, 'cells': cells,
            'rle_bytes': p - (off + 53), 'props': props, 'stat_count_field': n,
            'stats': stats, 'parsed_end': r, 'end': end}


def parse_world(d):
    h = parse_header(d)
    boards = []
    off = HEADER_SIZE
    for i in range(h['board_count']):
        b = parse_board(d, off, i)
        boards.append(b)
        off = b['end']
    return h, boards, off


def load(path):
    d = open(path, 'rb').read()
    return (d,) + parse_world(d)
