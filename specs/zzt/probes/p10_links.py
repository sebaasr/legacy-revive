"""Probe 10: cross-reference checks for element guesses.
 a) type 11 records: p3 is a valid board index? does the target board contain a type-11 cell of the same color?
 b) type 8 vs type 9 colors per world: is each type-9 bg nibble (+8) among the type-8 fg nibbles?
 c) exits: reciprocity of the four exit bytes (offset 2..5 of the property block).
 d) type 10 records: show their program text (first lines)."""
import os, sys, glob, collections
sys.path.insert(0, os.path.dirname(__file__))
import zztlib
files = sys.argv[1:] or sorted(glob.glob('corpus/zzt/*/*.[Zz][Zz][Tt]'))
pv = collections.Counter(); kd = []; recip = collections.Counter(); scrolls = []
for f in files:
    d, h, bs, _ = zztlib.load(f)
    nb = len(bs)
    for b in bs:
        for s in b['stats']:
            t, c = b['cells'][(s['y'] - 1) * 60 + s['x'] - 1]
            if t == 11:
                tgt = s['p3']
                if tgt >= nb: pv['p3 out of range'] += 1; continue
                tcolors = {cc for tt, cc in bs[tgt]['cells'] if tt == 11}
                pv['target has same-color type 11' if c in tcolors else ('target has type 11 other color' if tcolors else 'target has no type 11')] += 1
            if t == 10 and len(scrolls) < 4: scrolls.append((os.path.basename(f), b['index'], s['code'][:160]))
        ex = b['props']['exits']
        for a, bb in (('north', 'south'), ('south', 'north'), ('west', 'east'), ('east', 'west')):
            tgt = ex[a]
            if tgt:
                recip[(a, 'back' if tgt < nb and bs[tgt]['props']['exits'][bb] == b['index'] else 'no')] += 1
    keys = {c & 15 for b in bs for t, c in b['cells'] if t == 8}
    doors = {c >> 4 for b in bs for t, c in b['cells'] if t == 9}
    kd.append((os.path.basename(f), sorted(keys), sorted(doors), sorted(x for x in doors if x + 8 not in keys)))
print('a) passages:', pv)
print('b) per world: type-8 fg nibbles, type-9 bg nibbles, doors lacking a key of nibble+8:')
for r in kd: print('   ', r)
print('c) exit reciprocity:', sorted(recip.items()))
print('d) type 10 programs:'); [print('   ', ascii(x)) for x in scrolls]
