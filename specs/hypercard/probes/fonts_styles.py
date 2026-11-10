"""Probe: FTBL (font table) and STBL (style table).
FTBL (offsets from h = common header length): h+0 u32 count, h+4 u32 (0), entries from h+8:
  u16 font id, C-string name, padded to even offset.
STBL: h+0 u32 count, h+4 u32 next free style id?, entries from h+8, 24 bytes each:
  +0 u32 style id, +4 u32 ?, +8 u32 ?, +12 i16 font id (-1 = inherit), +14 i16 text style (-1 = inherit),
  +16 i16 size (-1 = inherit), +18 6 bytes ?
Tests: every entry parses inside the block; STBL ids are 1..count; h+4 == max id + 1;
every font id used by parts / style entries exists in FTBL."""
import sys, os, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hc import *

files = sys.argv[1:] or sorted(glob.glob('corpus/hypercard/*/*.stak'))
for f in files:
    s = Stack(f); h = s.hdr; name = os.path.basename(f)[:26]
    ft, sb = s.of_type('FTBL'), s.of_type('STBL')
    if not ft and not sb:
        print(f"{name:26s} no FTBL/STBL (format {s.format})"); continue
    r = ft[0].raw; n = u32(r, h); p = h + 8; fonts = {}
    for _ in range(n):
        fid = u16(r, p); nm, q = cstr(r, p + 2); fonts[fid] = nm; p = q + (q & 1)
    ft_ok = p <= len(r) and u32(r, h+4) == 0
    r = sb[0].raw; n = u32(r, h); ents = []
    for i in range(n):
        e = h + 8 + 24 * i
        ents.append((i32(r, e), u32(r, e+4), u32(r, e+8), i16(r, e+12), i16(r, e+14), i16(r, e+16), r[e+18:e+24].hex()))
    ids = [e[0] for e in ents]
    used = collections.Counter()
    for b in s.of_type('CARD') + s.of_type('BKGD'):
        for pt in parse_layer(s, b)['parts']:
            used[pt['font']] += 1
    sfonts = {e[3] for e in ents if e[3] != -1}
    print(f"{name:26s} fonts={len(fonts)} ft_ok={ft_ok} styles={len(ents)} ids_seq={ids == list(range(1, len(ids)+1))} "
          f"next={u32(r, h+4)} max+1={max(ids)+1 if ids else None} f4={collections.Counter(e[1] for e in ents)} f8={collections.Counter(e[2] for e in ents)} "
          f"tail={collections.Counter(e[6] for e in ents)} styles_seen={sorted({e[4] for e in ents})} "
          f"part_fonts_missing={[x for x in used if x not in fonts]} style_fonts_missing={[x for x in sfonts if x not in fonts]}")
