"""Probe 9: survey every element type number across all boards: cell count, boards using it, most common
color bytes, whether cells of that type carry a status record (and its cycle/p1..p3), and whether the type
appears on the outer ring of the grid."""
import os, sys, glob, collections
sys.path.insert(0, os.path.dirname(__file__))
import zztlib
files = sys.argv[1:] or sorted(glob.glob('corpus/zzt/*/*.[Zz][Zz][Tt]'))
cnt = collections.Counter(); boards = collections.defaultdict(set); colors = collections.defaultdict(collections.Counter)
withstat = collections.Counter(); statinfo = collections.defaultdict(collections.Counter); ring = collections.Counter()
for f in files:
    d, h, bs, _ = zztlib.load(f)
    for b in bs:
        pos = {(s['x'] - 1, s['y'] - 1): s for s in b['stats']}
        for i, (t, c) in enumerate(b['cells']):
            x, y = i % 60, i // 60
            cnt[t] += 1; boards[t].add((f, b['index'])); colors[t][c] += 1
            if x in (0, 59) or y in (0, 24): ring[t] += 1
            if (x, y) in pos:
                withstat[t] += 1; s = pos[(x, y)]
                statinfo[t][(s['cycle'], s['p1'], s['p2'], s['p3'], s['step_x'], s['step_y'])] += 1
print(f"{'type':>4} {'cells':>7} {'boards':>6} {'ring':>5} {'w/stat':>6}  top colors | top (cycle,p1,p2,p3,stepx,stepy)")
for t in sorted(cnt):
    cols = ' '.join(f'{c:02x}:{n}' for c, n in colors[t].most_common(4))
    si = ' '.join(f'{k}:{n}' for k, n in statinfo[t].most_common(3))
    print(f'{t:>4} {cnt[t]:>7} {len(boards[t]):>6} {ring[t]:>5} {withstat[t]:>6}  {cols} | {si}')
