"""Opcodes used by the BKGD and CARD pictures of the card each reference.png shows (#0, Oblique #1)."""
import sys, os, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hc import *
from bitmap import *
from list_page import card_order
shown = {'hypercard_obliquestrategies': 1}
for dd in sorted(glob.glob('corpus/hypercard/*/')):
    name = os.path.basename(os.path.normpath(dd))
    s = Stack(glob.glob(dd + '*.stak')[0])
    cid = card_order(s)[shown.get(name, 0)][0]
    c = parse_layer(s, s.get('CARD', cid)); bk = parse_layer(s, s.get('BKGD', c['bkgd']))
    for who, bid in (('bkgd', bk['bmap']), ('card', c['bmap'])):
        if not bid: print(name[:20], who, 'none'); continue
        I = bmap_info(s, s.get('BMAP', bid))
        for k, rk in (('mask','mrect'),('image','irect')):
            st = collections.Counter()
            if I[k]: decode_stream(I[k], I[rk], st)
            print(name[:20], who, bid, k, I[rk], len(I[k]), {a:b for a,b in st.items() if a.startswith('8') or a.startswith('a0')})
