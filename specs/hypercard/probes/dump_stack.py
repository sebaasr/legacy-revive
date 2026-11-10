"""Probe: print the whole recovered structure of a HyperCard stack data fork.
Usage: python dump_stack.py <file.stak> [--raw]
Shows: container blocks, STAK header, font/style tables, backgrounds, cards in stack order with
their parts (id, kind, rect, flags, text attrs, name, script), field contents with style runs, and the
bitmap (BMAP) header of each card/background. Field meanings marked '?' are not yet confirmed."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hc import *
from list_page import card_order
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

KIND = {1: 'button', 2: 'field'}

def fonts(s):
    t = s.of_type('FTBL')
    if not t: return {}
    r, h = t[0].raw, s.hdr
    n = u32(r, h); p = h + 8; out = {}
    for _ in range(n):
        fid = u16(r, p); name, q = cstr(r, p + 2)
        out[fid] = name; p = q + (q & 1)
    return out

def styles(s):
    t = s.of_type('STBL')
    if not t: return {}
    r, h = t[0].raw, s.hdr
    n = u32(r, h); out = {}
    for i in range(n):
        p = h + 8 + 24 * i
        out[i32(r, p)] = {'font': i16(r, p + 12), 'style': i16(r, p + 14), 'size': i16(r, p + 16)}
    return out

def bmap_header(s, bid):
    b = s.get('BMAP', bid)
    if not b: return None
    r, h = b.raw, s.hdr
    rects = [tuple(i16(r, h + 8 + 8 * k + 2 * j) for j in range(4)) for k in range(3)]
    return {'size': b.size, 'card_rect': rects[0], 'mask_rect': rects[1], 'image_rect': rects[2],
            'mask_len': u32(r, h + 0x28), 'image_len': u32(r, h + 0x2c)}

def indent(text, pre):
    return '\n'.join(pre + line for line in text.replace('\r', '\n').split('\n'))

def show_parts(L, F, pre):
    for p in L['parts']:
        print(f"{pre}part {p['id']} {KIND.get(p['kind'], p['kind'])} name={p['name']!r} rect(t,l,b,r)={p['rect']} "
              f"flags={p['flags']:#04x} flags2={p['flags2']:#06x} icon={p['icon']} align={p['align']} "
              f"font={p['font']}({F.get(p['font'], '?')}) size={p['textsize']} style={p['style']:#06x} lineh={p['lineheight']}")
        if p['script']:
            print(f"{pre}  script:"); print(indent(p['script'], pre + '    | '))

def show_contents(L, S, pre):
    for c in L['contents']:
        who = f"card part {-c['partid']}" if c['partid'] < 0 else f"bkgd part {c['partid']}"
        runs = ' runs=' + str([(o, sid, S.get(sid)) for o, sid in c['runs']]) if c['runs'] else ''
        print(f"{pre}content for {who} ({len(c['text'])} chars){runs}")
        if c['text']:
            print(indent(c['text'], pre + '    > '))

def main(path, raw=False):
    s = Stack(path); d = s.data
    F, S = fonts(s), styles(s)
    print(f"=== {os.path.basename(path)}  ({len(d)} bytes, format {s.format}, common block header {s.hdr} bytes)")
    print("--- blocks")
    for b in s.blocks:
        print(f"  {b.off:#08x} {b.type} id={b.id} size={b.size}")
    print("--- stack header")
    print(f"  file size={u32(d,0x14)} backgrounds={u32(d,0x24)} first bkgd={i32(d,0x28)} cards={u32(d,0x2c)} "
          f"first card={i32(d,0x30)} LIST={i32(d,0x34)} free blocks={u32(d,0x38)} free bytes={u32(d,0x3c)} PRNT={i32(d,0x40)}")
    print(f"  version stamps?={d[0x60:0x70].hex(' ', 4)} window rect?={[i16(d,0x78+2*i) for i in range(4)]} "
          f"screen?={[i16(d,0x84),i16(d,0x86)]} card size(h,w)={[i16(d,0x1b8),i16(d,0x1ba)]} (0 => 342x512) "
          f"FTBL={i32(d,0x1b0)} STBL={i32(d,0x1b4)}")
    script, _ = cstr(d, 0x600)
    if script:
        print("  stack script:"); print(indent(script, '    | '))
    print("--- fonts (FTBL)")
    for k, v in F.items(): print(f"  {k}: {v}")
    print("--- styles (STBL)  (-1 = inherit)")
    for k, v in S.items(): print(f"  {k}: {v}")
    print("--- backgrounds (in next-chain order)")
    bk = s.get('BKGD', i32(d, 0x28)); seen = set()
    while bk and bk.id not in seen:
        seen.add(bk.id)
        L = parse_layer(s, bk)
        print(f"  BKGD {bk.id} name={L['name']!r} cards={L['ncards']} flags={L['flags']:#06x} bmap={L['bmap']} "
              f"{bmap_header(s, L['bmap']) or ''}")
        if L['script']:
            print("    script:"); print(indent(L['script'], '      | '))
        show_parts(L, F, '    ')
        show_contents(L, S, '    ')
        bk = s.get('BKGD', L['next'])
    print("--- cards (stack order)")
    for n, (cid, extra) in enumerate(card_order(s), 1):
        L = parse_layer(s, s.get('CARD', cid))
        print(f"  [{n}] CARD {cid} name={L['name']!r} bkgd={L['bkgd']} flags={L['flags']:#06x} "
              f"pageflag={extra[0]:#04x} bmap={L['bmap']} {bmap_header(s, L['bmap']) or ''}")
        if L['script']:
            print("    script:"); print(indent(L['script'], '      | '))
        show_parts(L, F, '    ')
        show_contents(L, S, '    ')

if __name__ == '__main__':
    main(sys.argv[1], '--raw' in sys.argv)
