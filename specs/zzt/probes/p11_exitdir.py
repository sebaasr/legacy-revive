"""Probe 11: which edge does each exit byte belong to? For every exit A -(byte k)-> B, compare the cell
types along A's edge with the opposite edge of B (an open gap on one board should line up with an open
gap on the neighbour). Score = fraction of positions where (type==0) agrees. Higher = better fit."""
import os, sys, glob, collections
sys.path.insert(0, os.path.dirname(__file__))
import zztlib
files = sys.argv[1:] or sorted(glob.glob('corpus/zzt/*/*.[Zz][Zz][Tt]'))
def edge(cells, which):
    if which == 'top': return [cells[x][0] for x in range(60)]
    if which == 'bottom': return [cells[24 * 60 + x][0] for x in range(60)]
    if which == 'left': return [cells[y * 60][0] for y in range(25)]
    if which == 'right': return [cells[y * 60 + 59][0] for y in range(25)]
hyp = {2: [('top', 'bottom'), ('bottom', 'top')], 3: [('top', 'bottom'), ('bottom', 'top')],
       4: [('left', 'right'), ('right', 'left')], 5: [('left', 'right'), ('right', 'left')]}
score = collections.defaultdict(list)
for f in files:
    d, h, bs, _ = zztlib.load(f)
    for b in bs:
        raw = [b['props']['exits'][k] for k in ('north', 'south', 'west', 'east')]
        for k, tgt in zip((2, 3, 4, 5), raw):
            if not tgt or tgt >= len(bs): continue
            for mine, theirs in hyp[k]:
                e1, e2 = edge(b['cells'], mine), edge(bs[tgt]['cells'], theirs)
                # positions where my edge is passable (type 0) : does the neighbour also have 0 there?
                opens = [i for i, t in enumerate(e1) if t == 0]
                if opens:
                    score[(k, mine)].append(sum(e2[i] == 0 for i in opens) / len(opens))
for k in sorted(score):
    v = score[k]; print(f'byte {k} as {k[1]:6s} edge: mean open-gap agreement {sum(v)/len(v):.3f} over {len(v)} exits')
