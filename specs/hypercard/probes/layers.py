"""Probe: CARD / BKGD block layout (see notes/04-cards-backgrounds.md).
Tests on every sample:
 - parts and contents fill exactly the declared part-list / content sizes (parse_layer)
 - BKGD next/prev ids form one ring that visits every BKGD; first bkgd == STAK 0x28
 - BKGD card count == number of CARD blocks whose bkgd field points to it
 - CARD page id == the PAGE that lists it (format 10; format 8 stores 0)
 - bitmap id is 0 or an existing BMAP; every part id <= highest-part-id field; part sizes even
 - part ids unique inside a layer"""
import sys, os, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hc import *

files = sys.argv[1:] or sorted(glob.glob('corpus/hypercard/*/*.stak'))
for f in files:
    s = Stack(f); d = s.data; ok = collections.Counter(); bad = collections.Counter()
    def t(k, cond): (ok if cond else bad)[k] += 1
    bk = {b.id: parse_layer(s, b) for b in s.of_type('BKGD')}
    cards = {b.id: parse_layer(s, b) for b in s.of_type('CARD')}
    # ring
    start = i32(d, 0x28); cur = start; seen = []
    while True:
        seen.append(cur); nxt = bk[cur]['next']
        t('prev_link', bk[nxt]['prev'] == cur)
        cur = nxt
        if cur == start or len(seen) > len(bk): break
    t('ring_all', sorted(seen) == sorted(bk))
    use = collections.Counter(c['bkgd'] for c in cards.values())
    for bid, B in bk.items(): t('ncards', B['ncards'] == use[bid])
    # page membership
    L = s.of_type('LIST')[0].raw; o = s.hdr - 16
    for i in range(u32(L, 0x10+o)):
        pid, n = i32(L, 0x30+6*i), u16(L, 0x34+6*i); pg = s.get('PAGE', pid).raw; es = u16(L, 0x1c+o)
        for k in range(n):
            cid = i32(pg, 0x18+k*es)
            t('card_page', cards[cid]['page'] == (pid if s.format >= 9 else 0))
    for lay in list(bk.values()) + list(cards.values()):
        t('bmap_ref', lay['bmap'] == 0 or s.get('BMAP', lay['bmap']) is not None)
        ids = [p['id'] for p in lay['parts']]
        t('ids_unique', len(ids) == len(set(ids)))
        for p in lay['parts']:
            t('id<=maxpartid', p['id'] <= lay['maxpartid']); t('size_even', p['size'] % 2 == 0)
            t('kind12', p['kind'] in (1, 2))
            t('rect_ordered', p['rect'][0] <= p['rect'][2] and p['rect'][1] <= p['rect'][3])
    print(f"{os.path.basename(f)[:26]:26s} bad={dict(bad)} ok={dict(ok)}")
