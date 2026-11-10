"""Probe 6: token vocabulary inside program text: movement tokens, direction words, #if conditions,
#give/#take counters, element/color words in #put/#change/#become, #send targets, zapped labels."""
import os, sys, glob, collections, re
sys.path.insert(0, os.path.dirname(__file__))
import zztlib
files = sys.argv[1:] or sorted(glob.glob('corpus/zzt/*/*.[Zz][Zz][Tt]'))
C = collections.defaultdict(collections.Counter)
zap_pairs = collections.Counter(); colon_targets = 0; names_seen = 0; inline_cmds = collections.Counter()
for f in files:
    d, h, bs, _ = zztlib.load(f)
    for b in bs:
        objnames = set()
        for s in b['stats']:
            c = s['code'] or ''
            m = re.match(r'@(.*)\r', c)
            if m: objnames.add(m.group(1).strip().lower())
        for s in b['stats']:
            c = s['code']
            if not c: continue
            lines = c.split('\r')
            labels = {l[1:].strip().lower() for l in lines if l.startswith(':')}
            quoted = {l[1:].strip().lower() for l in lines if l.startswith("'")}
            if lines[0].startswith('@'): names_seen += 1
            for l in lines:
                ll = l.lower().strip()
                if l.startswith('/') or l.startswith('?'):
                    for tok in re.findall(r'[/?]([a-z]+)', ll): C['move'][tok] += 1
                    rest = re.sub(r'([/?][a-z]+)+', '', ll, count=1)
                    if rest: C['after-move'][rest[:12]] += 1
                if l.startswith('#'):
                    parts = ll[1:].split()
                    if not parts: continue
                    w = parts[0]
                    if ':' in w: C['#x:y'][w.split(':')[0] in objnames or w.split(':')[0] in ('all', 'others', 'self')] += 1; continue
                    if w in ('go', 'walk', 'shoot', 'throwstar', 'try', 'put'):
                        C['dir:' + w][' '.join(parts[1:2] if w != 'go' else parts[1:])] += 1
                    if w == 'if': C['if'][' '.join(parts[1:-1]) if len(parts) > 2 else ' '.join(parts[1:])] += 1
                    if w in ('give', 'take'): C['counter'][parts[1] if len(parts) > 1 else ''] += 1
                    if w in ('put', 'change', 'become'): C['elem'][' '.join(parts[2:] if w == 'put' else parts[1:])] += 1
                    if w == 'send': C['send'][(parts[1] if len(parts) > 1 else '') in labels] += 1
                    if w in ('zap', 'restore'):
                        tgt = parts[1] if len(parts) > 1 else ''
                        C['zap-local-label-exists'][(w, tgt in labels or tgt in quoted)] += 1
                    if w not in ('end','bind','char','play','send','die','cycle','restart','zap','put','if','take','give','change','lock','become','walk','endgame','shoot','unlock','restore','set','go','clear','throwstar','try'):
                        C['other#'][w] += 1
for k in C:
    print('==', k, C[k].most_common(40))
print('programs starting with @name:', names_seen)
