"""Probe: test STAK header field hypotheses on every sample.
Checks: 0x14==file size, 0x24/0x28 bkgd count/first id, 0x2c/0x30 card count/first id,
0x34==LIST id, 0x38/0x3c free count/total size, 0x1b0/0x1b4 FTBL/STBL ids, free table at 0x400."""
import sys, glob, collections
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hc import *
files = sys.argv[1:] or sorted(glob.glob('corpus/hypercard/*/*.stak'))
for f in files:
    s = Stack(f); d = s.data
    name = os.path.basename(f)[:24]
    cnt = collections.Counter(b.type for b in s.blocks)
    frees = s.of_type('FREE')
    lst = s.of_type('LIST')[0]
    ft = s.of_type('FTBL'); st = s.of_type('STBL')
    chk = {
      'size': u32(d,0x14) == len(d),
      'stakblk': u32(d,0x18) == s.blocks[0].size,
      'nbkgd': u32(d,0x24) == cnt['BKGD'],
      'bkgd1': s.get('BKGD', i32(d,0x28)) is not None,
      'ncard': u32(d,0x2c) == cnt['CARD'],
      'card1': s.get('CARD', i32(d,0x30)) is not None,
      'list': i32(d,0x34) == lst.id,
      'nfree': u32(d,0x38) == len(frees),
      'freesz': u32(d,0x3c) == sum(b.size for b in frees),
      'ftbl': (i32(d,0x1b0) == ft[0].id) if ft else i32(d,0x1b0)==0,
      'stbl': (i32(d,0x1b4) == st[0].id) if st else i32(d,0x1b4)==0,
    }
    # free table at 0x400: (offset,size) pairs
    ftab = []
    o = 0x400
    while u32(d,o) or u32(d,o+4):
        ftab.append((u32(d,o), u32(d,o+4))); o += 8
    chk['freetab'] = sorted(ftab) == sorted((b.off, b.size) for b in frees)
    bad = [k for k,v in chk.items() if not v]
    print(f"{name:24s} fmt={s.format:2d} f20={u32(d,0x20):3d} f40={u32(d,0x40):#x} f44={u32(d,0x44):#x} f48={d[0x48:0x50].hex()} "
          f"ver={d[0x60:0x70].hex(' ',4)} f70={u32(d,0x70):#x} win={[i16(d,0x78+2*i) for i in range(4)]} "
          f"scr={[i16(d,0x84+2*i) for i in range(2)]} cardsz={[i16(d,0x1b8),i16(d,0x1ba)]} fails={bad}")
