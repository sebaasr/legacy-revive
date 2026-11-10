"""Probe: MAST block = master index of u32 entries starting at block offset 0x20.
Hypothesis: entry>>8 = file offset / 32, entry & 0xFF = low byte of the block id; 0 = empty slot.
Tests on every sample that (a) every non-zero entry points at a block start whose id low byte matches,
(b) every block other than STAK/MAST/FREE/TAIL is referenced exactly once."""
import sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hc import *

files = sys.argv[1:] or sorted(glob.glob('corpus/hypercard/*/*.stak'))
for f in files:
    s = Stack(f)
    starts = {b.off: b for b in s.blocks}
    masts = s.of_type('MAST')
    entries = []
    for m in masts:
        for o in range(0x20, m.size, 4):
            e = u32(m.raw, o)
            if e: entries.append(e)
    bad = 0; seen = {}
    for e in entries:
        off = (e >> 8) * 32
        b = starts.get(off)
        if b is None or (b.id & 0xFF) != (e & 0xFF):
            bad += 1
        else:
            seen[off] = seen.get(off, 0) + 1
    need = [b for b in s.blocks if b.type not in ('STAK', 'MAST', 'FREE', 'TAIL')]
    missing = [(b.type, b.id) for b in need if b.off not in seen]
    dup = [o for o, c in seen.items() if c > 1]
    print(f"{os.path.basename(f)[:26]:26s} MAST blocks={len(masts)} size={[m.size for m in masts]} entries={len(entries)} "
          f"bad={bad} missing={missing[:5]} dup={len(dup)}")
