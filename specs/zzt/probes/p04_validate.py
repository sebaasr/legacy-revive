"""Probe 4: validate the full parse on every file and survey stat fields.
Checks: board chain ends at EOF; every board's records end exactly at the board end; board count matches
header; stat (x,y) ranges; which cell types sit under stat positions; negative code lengths; ip values."""
import os, sys, glob, collections
sys.path.insert(0, os.path.dirname(__file__))
import zztlib
files = sys.argv[1:] or sorted(glob.glob('corpus/zzt/*/*.[Zz][Zz][Tt]'))
type_at_stat = collections.Counter(); stat0_type = collections.Counter(); neg = []; ipv = collections.Counter()
xy_range = [99, 0, 99, 0]; outside = 0; pad = collections.Counter(); p1_by_type = collections.defaultdict(collections.Counter)
cyc = collections.defaultdict(collections.Counter); under = collections.Counter(); total = 0; boards = 0
for f in files:
    d, h, bs, end = zztlib.load(f)
    bad = [b['index'] for b in bs if b['parsed_end'] != b['end']]
    print(f"{os.path.basename(f):14s} boards={len(bs)} eof_ok={end == len(d)} record_end_mismatch={bad} name={h['name']!r} cur={h['current_board']}")
    for b in bs:
        boards += 1
        for i, s in enumerate(b['stats']):
            total += 1
            x, y = s['x'], s['y']
            xy_range = [min(xy_range[0], x), max(xy_range[1], x), min(xy_range[2], y), max(xy_range[3], y)]
            if 1 <= x <= 60 and 1 <= y <= 25:
                t = b['cells'][(y - 1) * 60 + (x - 1)][0]
            else:
                t = None; outside += 1
            type_at_stat[t] += 1
            if i == 0: stat0_type[t] += 1
            if s['code_len'] < 0: neg.append((os.path.basename(f), b['index'], i, s['code_len'], t))
            ipv[s['ip'] if s['ip'] in (-1, 0) else 'other'] += 1
            pad[s['unk_25_32']] += 1
            p1_by_type[t][s['p1']] += 1
            cyc[t][s['cycle']] += 1
            under[(s['under_type'])] += 1
print('boards', boards, 'stats', total)
print('stat x/y range', xy_range, 'outside grid', outside)
print('cell type under stat position:', sorted(type_at_stat.items(), key=lambda kv: (kv[0] is None, kv[0] or 0)))
print('stat 0 cell type:', stat0_type)
print('negative code_len:', len(neg), neg[:12])
print('ip values:', ipv)
print('bytes 25..32 values:', pad.most_common(4))
print('under_type values:', sorted(under.items()))
for t in sorted(cyc, key=lambda k: (k is None, k or 0)):
    print(f'  type {t}: cycle {dict(cyc[t].most_common(4))}  p1 {dict(p1_by_type[t].most_common(5))}')
