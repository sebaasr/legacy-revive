"""Probe 5: survey attached program text. Line terminator, first-character classes, '#' command words,
':' labels, '/' and '?' movement tokens, '@' name lines, '!' choice lines, '$' centered text."""
import os, sys, glob, collections, re
sys.path.insert(0, os.path.dirname(__file__))
import zztlib
files = sys.argv[1:] or sorted(glob.glob('corpus/zzt/*/*.[Zz][Zz][Tt]'))
first = collections.Counter(); cmds = collections.Counter(); ends_cr = collections.Counter(); lf = 0
examples = collections.defaultdict(list); owners = collections.Counter(); nprog = 0
for f in files:
    d, h, bs, _ = zztlib.load(f)
    for b in bs:
        for s in b['stats']:
            c = s['code']
            if not c: continue
            nprog += 1
            t = b['cells'][(s['y'] - 1) * 60 + s['x'] - 1][0]
            owners[t] += 1
            ends_cr[c.endswith('\r')] += 1
            lf += c.count('\n')
            for line in c.split('\r'):
                if not line: first['<empty>'] += 1; continue
                ch = line[0]
                k = ch if not ch.isalnum() and ch != ' ' else ('text' if ch != ' ' else 'space')
                first[k] += 1
                if ch == '#':
                    w = re.match(r'#\s*([A-Za-z]*)', line).group(1).lower()
                    cmds[w] += 1
                    if len(examples['#' + w]) < 3 and line not in examples['#' + w]: examples['#' + w].append(line)
                elif len(examples[k]) < 6 and line not in examples[k]:
                    examples[k].append(line)
print('programs', nprog, 'owner cell types', owners)
print('ends with CR', ends_cr, 'LF count', lf)
print('line first char classes', first.most_common())
print('# command words', cmds.most_common())
for k, v in sorted(examples.items()):
    print(repr(k), [ascii(x) for x in v])
