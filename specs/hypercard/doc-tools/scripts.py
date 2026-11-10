import sys, glob, os, json; sys.path.insert(0,'specs/hypercard/probes')
from hc import *
out=[]
for f in sorted(glob.glob('corpus/hypercard/*/*.stak')):
    s=Stack(f); st=os.path.basename(f)
    sc,_=cstr(s.data,0x600)
    if sc.strip(): out.append((st,'stack','',sc))
    for b in s.of_type('BKGD')+s.of_type('CARD'):
        L=parse_layer(s,b)
        if L['script'].strip(): out.append((st,b.type.lower(),'%d %s'%(b.id,L['name']),L['script']))
        for p in L['parts']:
            if p['script'].strip(): out.append((st,b.type.lower()+('-btn' if p['kind']==1 else '-fld'),'%d/%d %s'%(b.id,p['id'],p['name']),p['script']))
json.dump(out,open(sys.argv[1],'w'))
from collections import Counter
print(Counter(o[0] for o in out)); print(Counter(o[1] for o in out)); print(sum(len(o[3]) for o in out))
