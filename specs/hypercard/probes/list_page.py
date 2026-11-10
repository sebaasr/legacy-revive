"""Probe: LIST block (page table) and PAGE blocks (card order).
LIST (offsets from block start): 0x10 u32 page count, 0x14 u32 page block size, 0x18 u32 total cards,
0x1c u16 page entry size, then table at 0x30 of (u32 page id, u16 card count).
PAGE: entries start at 0x18, each `entry size` bytes, first 4 = card id; 0 id ends the list.
Tests: page ids exist, counts sum to card count, every CARD block appears exactly once in order list,
first card == STAK 0x30, and PAGE refers back to LIST id."""
import sys, os, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hc import *

def card_order(s):
    lst = s.of_type('LIST')[0].raw
    b = s.hdr - 16   # format 8: header fields sit 4 bytes earlier
    npages, esize = u32(lst, 0x10+b), u16(lst, 0x1c+b)
    order = []
    for i in range(npages):
        pid, n = i32(lst, 0x30 + 6*i), u16(lst, 0x34 + 6*i)
        pg = s.get('PAGE', pid).raw
        for k in range(n):
            o = 0x18 + k*esize
            order.append((i32(pg, o), pg[o+4:o+esize]))
    return order

if __name__ == '__main__':
    files = sys.argv[1:] or sorted(glob.glob('corpus/hypercard/*/*.stak'))
    for f in files:
        s = Stack(f); d = s.data
        lst = s.of_type('LIST')[0]; L = lst.raw
        b = s.hdr - 16
        npages, psz, ncards, esize = u32(L,0x10+b), u32(L,0x14+b), u32(L,0x18+b), u16(L,0x1c+b)
        hwords = u16(L, 0x20+b)
        pids = [i32(L, 0x30+6*i) for i in range(npages)]
        ok_pages = all(s.get('PAGE', p) for p in pids) and len(pids) == len(s.of_type('PAGE'))
        ok_size = all(s.get('PAGE', p).size == psz for p in pids)
        backref = all(i32(s.get('PAGE', p).raw, s.hdr) == lst.id for p in pids)
        order = card_order(s)
        ids = [c for c, _ in order]
        cards = {b.id for b in s.of_type('CARD')}
        flags = collections.Counter(extra[0] for _, extra in order)
        print(f"{os.path.basename(f)[:26]:26s} pages={npages} psize={psz} ncards={ncards} esize={esize} "
              f"L1e={u16(L,0x1e+b)} hashwords={hwords} esize==4+4*hw:{esize==4+4*hwords} L22={u16(L,0x22+b)} L24={L[0x24+b:0x30].hex()} pages_ok={ok_pages} size_ok={ok_size} backref={backref} "
              f"order_ok={sorted(ids)==sorted(cards) and len(ids)==ncards} first_ok={ids[0]==i32(d,0x30)} flagbyte={dict(flags)}")
