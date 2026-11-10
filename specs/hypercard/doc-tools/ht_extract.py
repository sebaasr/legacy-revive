"""Extract HyperTalk usage statistics from every script in the 10 corpus stacks.
usage: python ht_extract.py <scripts.json>   (scripts.json from scripts.py)
Comments (-- to end of line, outside quotes) are removed and lines ending in the continuation
character U+00AC are joined before counting. Each line is split into statements at `then`/`else`.
"""
import json, sys, re, collections
sys.stdout.reconfigure(encoding="utf-8")
C = collections.Counter
out = json.load(open(sys.argv[1]))

def strip_comment(line):
    q = False
    for i, ch in enumerate(line):
        if ch == '"': q = not q
        elif not q and line.startswith('--', i): return line[:i]
    return line

def logical_lines(sc):
    buf = ''
    for raw in sc.replace('\r', '\n').split('\n'):
        l = strip_comment(raw).rstrip()
        if l.endswith('¬'):
            buf += l[:-1] + ' '; continue
        l = (buf + l).strip(); buf = ''
        if l: yield l
    if buf.strip(): yield buf.strip()

def mask(l):  # replace string literals by "" for keyword matching
    return re.sub(r'"[^"]*"', '""', l)

stats = collections.defaultdict(C); ex = {}; where = collections.defaultdict(set)
def hit(cat, key, example, st, n=1):
    stats[cat][key] += n; where[(cat, key)].add(st[:10])
    ex.setdefault((cat, key), example)

handlers_defined = collections.defaultdict(set)
all_lines = []
for st, kind, who, sc in out:
    lines = list(logical_lines(sc))
    inside = None
    for l in lines:
        m = re.match(r'(on|function)\s+(\w+)', l, re.I)
        if inside is None and not m:
            hit('outside-handler', 'non-comment line outside any handler', l, st); continue
        all_lines.append((st, l))
        if inside and re.match(r'end\s+' + re.escape(inside) + r'\b', l, re.I): inside = None
        if m and inside is None: inside = m.group(2)
        if m:
            handlers_defined[st].add(m.group(2).lower())
            hit('handler-' + m.group(1).lower(), m.group(2).lower(), l, st)
            if len(l.split()) > 2 and m.group(1).lower() == 'on': hit('form', 'on X with params', l, st)
            if len(l.split()) > 2 and m.group(1).lower() == 'function': hit('form', 'function X with params', l, st)

def statements(l):
    """Split one logical line into statements; yields (stmt, context)."""
    ml = mask(l); low = ml.lower()
    if re.match(r'(on|function|end)\b', low): return
    # else if X then S / else S / if X then S / then S
    m = re.match(r'(else\s+)?if\b(.*?)\bthen\b(.*)$', ml, re.I)
    if m:
        yield ('if', m.group(0))
        rest = m.group(3).strip()
        if rest:
            m2 = re.match(r'(.*?)\belse\b(.*)$', rest, re.I)
            if m2:
                if m2.group(1).strip(): yield (m2.group(1).strip(), 'then')
                if m2.group(2).strip(): yield (m2.group(2).strip(), 'else')
            else: yield (rest, 'then')
        return
    m = re.match(r'if\b', ml, re.I)
    if m: yield ('if', ml); return              # if whose then is on the next line
    m = re.match(r'then\b(.*)$', ml, re.I)
    if m:
        if m.group(1).strip(): yield (m.group(1).strip(), 'then')
        return
    m = re.match(r'else\b(.*)$', ml, re.I)
    if m:
        if m.group(1).strip(): yield (m.group(1).strip(), 'else')
        return
    yield (ml, 'line')

# --- if/then/else forms ---
for st, l in all_lines:
    low = mask(l).lower()
    if re.match(r'if\b.*\bthen\s*$', low): hit('if', 'if C then  (block, ends with end if)', l, st)
    elif re.match(r'if\b.*\bthen\s+\S.*\belse\b', low): hit('if', 'if C then S else S  (one line)', l, st)
    elif re.match(r'if\b.*\bthen\s+\S', low): hit('if', 'if C then S  (one line)', l, st)
    elif re.match(r'if\b', low): hit('if', 'if C  (then on next line)', l, st)
    if re.match(r'then\b', low): hit('if', 'then S  (line starting with then)', l, st)
    if re.match(r'else\s+if\b', low): hit('if', 'else if C then ...', l, st)
    elif re.match(r'else\s*$', low): hit('if', 'else  (alone)', l, st)
    elif re.match(r'else\s+\S', low): hit('if', 'else S  (one line)', l, st)
    if re.match(r'end\s+if\b', low): hit('if', 'end if', l, st)
    # repeat forms
    if re.match(r'repeat\b', low):
        if re.match(r'repeat\s+with\b.*\bdown\s+to\b', low): k = 'repeat with V = A down to B'
        elif re.match(r'repeat\s+with\b', low): k = 'repeat with V = A to B'
        elif re.match(r'repeat\s+for\b', low): k = 'repeat for N [times]'
        elif re.match(r'repeat\s+while\b', low): k = 'repeat while C'
        elif re.match(r'repeat\s+until\b', low): k = 'repeat until C'
        elif re.match(r'repeat\s+forever\b', low): k = 'repeat forever'
        elif re.match(r'repeat\s*$', low): k = 'repeat  (bare, endless)'
        else: k = 'repeat N [times]'
        hit('repeat', k, l, st)
    for k, rx in (('exit repeat', r'\bexit\s+repeat\b'), ('next repeat', r'\bnext\s+repeat\b'),
                  ('end repeat', r'^end\s+repeat\b'), ('exit to HyperCard', r'\bexit\s+to\s+hypercard\b'),
                  ('exit <handler>', r'\bexit\s+(?!repeat|to\b)\w+'), ('pass <message>', r'\bpass\s+\w+'),
                  ('return <value>', r'^return\b')):
        if re.search(rx, low): hit('control', k, l, st)

# --- commands: first word of every statement ---
for st, l in all_lines:
    for s, ctx in statements(l):
        if s == 'if': continue
        w = re.match(r'[A-Za-z]\w*', s)
        if not w: continue
        cmd = w.group(0).lower()
        if cmd in ('end',): continue
        hit('command', cmd, l, st)
        low = s.lower()
        if cmd == 'go':
            m = re.match(r'go\s+(to\s+)?(\w+)(\s+\w+)?', low)
            if m:
                a = m.group(2); b = (m.group(3) or '').strip()
                if a in ('card', 'cd'):
                    k = 'go [to] card id N' if b == 'id' else ('go [to] card "name"/expr' )
                elif a in ('next', 'prev', 'previous', 'first', 'last', 'home', 'back', 'this', 'stack', 'help'):
                    k = 'go [to] ' + a + (' card' if b in ('card', 'cd') else '')
                elif a in ('bkgnd', 'bg', 'background'): k = 'go [to] bkgnd ...'
                else: k = 'go [to] ' + a + ' ...'
                hit('go', k + (' (with "to")' if m.group(1) else ''), l, st)
        if cmd == 'visual':
            hit('visual effect', re.sub(r'\s+', ' ', low), l, st)
        if cmd == 'play':
            m = re.match(r'play\s+(""|stop|\w+)(.*)', low)
            hit('play', 'play stop' if m and m.group(1) == 'stop' else ('play "sound"' + (' + notes/tempo' if m and m.group(2).strip() else '')), l, st)
        if cmd in ('answer', 'ask'):
            k = cmd
            if re.match(r'ask\s+password\b', low): k = 'ask password'
            if re.match(r'answer\s+file\b', low): k = 'answer file'
            if ' with ' in low: k += ' ... with ' + ('choices "a" or "b"...' if cmd == 'answer' else 'default')
            hit('dialog', k, l, st)
        if cmd in ('show', 'hide'):
            m = re.match(r'(show|hide)\s+(.*)', low)
            t = m.group(2) if m else ''
            t = re.sub(r'""', '"x"', t)
            tm = re.match(r'(menubar|msg|message box|message|groups|picture|card picture|cd picture|bg picture|bkgnd picture|all cards|titlebar|tool window|pattern window)', t)
            if tm: k = cmd + ' ' + tm.group(1)
            else:
                om = re.match(r'((card|cd|bkgnd|bg|background)\s+)?(button|btn|field|fld)\b', t)
                k = cmd + ' ' + (om.group(0) if om else t.split()[0] if t else '?') + ' ...'
            hit('show/hide', k, l, st)
        if cmd == 'send':
            m = re.match(r'send\s+(.*?)\s+to\s+(\w+(\s+\w+)?)', low)
            hit('send', 'send M to ' + (m.group(2) if m else '?'), l, st)
        if cmd == 'set':
            m = re.match(r'set\s+(the\s+)?(\w+)(\s+of\s+(.*?))?\s+to\b', low)
            if m:
                hit('set property', m.group(2) + (' of <object>' if m.group(3) else ' (global/current)'), l, st)
        if cmd == 'put':
            if re.search(r'\binto\b', low): k = 'put V into C'
            elif re.search(r'\bafter\b', low): k = 'put V after C'
            elif re.search(r'\bbefore\b', low): k = 'put V before C'
            else: k = 'put V  (to message box)'
            hit('put', k, l, st)
        if cmd == 'get': hit('get', 'get V  (sets it)', l, st)
        if cmd == 'wait':
            m = re.match(r'wait\s+(until|while|for)?', low)
            k = 'wait ' + (m.group(1) + ' ...' if m and m.group(1) else 'N [ticks|seconds]')
            hit('wait', k, l, st)
        if cmd in ('lock', 'unlock'): hit('lock', cmd + ' ' + ' '.join(low.split()[1:2]), l, st)
        if cmd == 'choose': hit('choose', re.sub(r'\s+', ' ', low), l, st)
        if cmd == 'domenu': hit('doMenu', re.sub(r'\s+', ' ', s.lower()), l, st)
        if cmd == 'global': hit('global', 'global v1, v2', l, st)

# --- expressions: whole-line regex counts ---
EXPR = [
 ('property', 'the P of <object>', r'\bthe\s+(\w+)\s+of\s+(me|target|the\s+target|this|(card|cd|bkgnd|bg|background)\s+(button|btn|field|fld)|button|btn|field|fld|card|cd|stack|bkgnd|bg)\b'),
 ('property', 'P of <object> (no "the")', r'(?<!the\s)\b(visible|hilite|name|rect|loc|textfont|textsize|textstyle|locktext|icon|style|width|height|bottom|right|top|left|botright|topleft|number|id|short name|long name)\s+of\s+(me|target|this|(card|cd|bkgnd|bg)\s|button|btn|field|fld)'),
 ('chunk', 'char N of', r'\bchar(acter)?s?\s+[^"]*?\bof\b'),
 ('chunk', 'char A to B of', r'\bchar(acter)?\s+\S+.*?\bto\b.*?\bof\b'),
 ('chunk', 'word N of', r'\bwords?\s+\S+\s+of\b'),
 ('chunk', 'line N of', r'\blines?\s+\S+\s+of\b'),
 ('chunk', 'item N of', r'\bitems?\s+\S+\s+of\b'),
 ('chunk', 'nested chunk (X of Y of)', r'\b(char|word|line|item)\s+\S+\s+of\s+(char|word|line|item)\b'),
 ('chunk', 'ordinal chunk (first/last/any ... of)', r'\b(first|last|any|second|third|middle|mid)\s+(char|word|line|item)\b'),
 ('chunk', 'the number of <chunks> in/of', r'\bnumber\s+of\s+(chars|characters|words|lines|items)\s+(in|of)\b'),
 ('chunk', 'the number of <objects>', r'\bnumber\s+of\s+(cards|cds|buttons|btns|fields|flds|bkgnds|card\s+buttons|cd\s+btns|card\s+fields|cd\s+flds|bg\s+flds|bkgnd\s+fields)\b'),
 ('container', 'it', r'\bit\b'),
 ('container', 'me', r'\bme\b'),
 ('container', 'the target', r'\bthe\s+target\b'),
 ('container', 'target (no "the")', r'(?<!the\s)\btarget\b'),
 ('container', 'the result', r'\bthe\s+result\b'),
 ('container', 'msg / message box', r'\b(msg|message box|message)\b'),
 ('container', 'the selection / selection', r'\bselection\b'),
 ('container', 'empty', r'\bempty\b'),
 ('constant', 'quote', r'\bquote\b'),
 ('constant', 'return', r'\breturn\b'),
 ('constant', 'true/false', r'\b(true|false)\b'),
 ('constant', 'space/tab/comma', r'\b(space|tab|comma)\b'),
 ('object', 'card field / cd fld', r'\b(card|cd)\s+(field|fld)\b'),
 ('object', 'bkgnd field / bg fld', r'\b(bkgnd|bg|background)\s+(field|fld)\b'),
 ('object', 'field/fld (bare)', r'(?<!card\s)(?<!cd\s)(?<!bg\s)(?<!bkgnd\s)(?<!background\s)\b(field|fld)\b'),
 ('object', 'card button / cd btn', r'\b(card|cd)\s+(button|btn)\b'),
 ('object', 'bkgnd button / bg btn', r'\b(bkgnd|bg|background)\s+(button|btn)\b'),
 ('object', 'button/btn (bare)', r'(?<!card\s)(?<!cd\s)(?<!bg\s)(?<!bkgnd\s)(?<!background\s)\b(button|btn)\b'),
 ('object', '<obj> id N', r'\b(card|cd|button|btn|field|fld|bkgnd|bg)\s+id\s+\d+'),
 ('object', 'card "name" / cd "name"', r'\b(card|cd)\s+""'),
 ('object', 'stack "name"', r'\bstack\s+""'),
 ('object', 'this card / this stack / this bkgnd', r'\bthis\s+(card|cd|stack|bkgnd|bg)\b'),
 ('object', 'card window', r'\bcard\s+window\b'),
 ('object', 'of card id / of cd N (remote reference)', r'\bof\s+(card|cd)\s+(id\s+\d+|""|\d+)'),
 ('operator', '&', r'[^&]&[^&]'), ('operator', '&&', r'&&'),
 ('operator', '=', r'[^<>≠]=(?!=)'), ('operator', '<>', r'<>'), ('operator', '≠', r'≠'),
 ('operator', '<=, >=, ≤, ≥', r'<=|>=|≤|≥'), ('operator', '< or >', r'[^<>-]<[^>=]|[^<-]>[^=]'),
 ('operator', 'is', r'\bis\b(?!\s+not)'), ('operator', 'is not', r'\bis\s+not\b'),
 ('operator', 'contains', r'\bcontains\b'), ('operator', 'is in / is not in', r'\bis\s+(not\s+)?in\b'),
 ('operator', 'is a number / is a <type>', r'\bis\s+(not\s+)?an?\s+\w+'),
 ('operator', 'there is a', r'\bthere\s+is\s+(not\s+)?an?\b'),
 ('operator', 'and', r'\band\b'), ('operator', 'or', r'\bor\b'), ('operator', 'not', r'\bnot\b'),
 ('operator', 'div', r'\bdiv\b'), ('operator', 'mod', r'\bmod\b'),
 ('operator', '+ - * /', r'[+*/]|\s-\s'), ('operator', '^', r'\^'),
 ('function', 'the <function> (no args)', r'\bthe\s+(date|time|long date|short date|long time|seconds|ticks|mouse|mouseclick|mouseloc|mouseh|mousev|clickloc|clickh|clickv|clickchunk|clickline|clicktext|selectedline|selectedtext|selectedchunk|optionkey|commandkey|shiftkey|sound|result|target|number|random|length|name|short name|long name|foundchunk|foundtext|foundline|tool|version|diskspace|params|paramcount|abbrev date)\b'),
 ('function', 'f(args) call', r'\b[a-z]\w*\s?\('),
]
for st, l in all_lines:
    low = mask(l).lower()
    for cat, key, rx in EXPR:
        n = len(re.findall(rx, low))
        if n: hit(cat, key, l, st, n)
    for m in re.finditer(r'\bthe\s+([a-z]+(\s+(date|time|name))?)\b(?!\s+of)', low):
        hit('the-word', m.group(1), l, st)
    for m in re.finditer(r'\bthe\s+(\w+)\s+of\b', low):
        hit('the-prop-of', m.group(1), l, st)
    for m in re.finditer(r'\b([a-z]\w*)\s?\(', low):
        hit('call', m.group(1), l, st)
    if re.match(r'(on|function)\b', low):
        continue

# handlers that are invoked by name somewhere (as command, do X, send "X", or f(..))
invoked = C()
for st, l in all_lines:
    low = mask(l).lower()
    for s, ctx in statements(l):
        w = re.match(r'(do\s+)?([a-z]\w*)', s.lower())
        if w: invoked[w.group(2)] += 1
    for m in re.finditer(r'\bsend\s+(\w+)', low): invoked[m.group(1)] += 1
    for m in re.finditer(r'\b([a-z]\w*)\s?\(', low): invoked[m.group(1)] += 1
for m in re.finditer(r'send\s+"(\w+)', ' '.join(l.lower() for _, l in all_lines)): invoked[m.group(1)] += 1

for cat in sorted(stats):
    print('\n##', cat)
    for k, v in stats[cat].most_common():
        e = ex[(cat, k)]
        print('  %5d  %-45s [%d stacks]  e.g. %s' % (v, k, len(where[(cat, k)]), e[:110]))
print('\n## handlers never invoked by any script (likely system messages)')
names = set(stats['handler-on']) | set(stats['handler-function'])
print(sorted(n for n in stats['handler-on'] if invoked[n] == 0))
print('\n## total logical lines', len(all_lines), 'scripts', len(out))
