"""Probe 8: harvest 8x14 glyph bitmaps from the six reference.png title screens, keyed by evidence.

Hypotheses tested here (see notes/03 and notes/06):
  * text element types 47..53: the cell's color byte is a character code; fg white, bg = palette[T-46]
    (T=53: bg black).
  * object cells (type 36): the glyph is the character code in the record's p1 byte.
  * all other types: fg = palette[color & 15], bg = palette[(color >> 4) & 7]; glyph depends on the type.
A bitmap is the set of pixels equal to the fg color. If one char code / type yields several different
bitmaps the hypothesis is weakened; the script reports every conflict.
Writes specs/zzt/probes/glyphs.json:
  {"palette": {...}, "char": {code: hex-mask}, "type": {T: {hex-mask: count}}, "type_char": {T: code}}
"""
import os, sys, glob, json, collections
sys.path.insert(0, os.path.dirname(__file__))
import zztlib
from PIL import Image

REFS = {'crimring': 'CRIMRING.ZZT', 'dammak': 'DAMMAK.ZZT', 'kingl2': 'KINGL2.ZZT',
        'lostmonk': 'lostmonk.zzt', 'pyramid': 'PYRAMID.ZZT', 'zzttoxic': 'TOXIC.ZZT'}
ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..')


def cell_pixels(im, cx, cy):
    return [im.getpixel((cx * 8 + x, cy * 14 + y)) for y in range(14) for x in range(8)]


def mask_hex(px, fg):
    bits = 0
    for i, p in enumerate(px):
        if p == fg: bits |= 1 << (111 - i)
    return f'{bits:028x}'


def main():
    # pass 1: palette from text cells (bg) and two-color non-text cells (fg/bg nibble votes)
    pal_votes = collections.defaultdict(collections.Counter)
    data = []
    for folder, fname in REFS.items():
        im = Image.open(os.path.join(ROOT, 'corpus/zzt', folder, 'reference.png')).convert('RGB')
        d, h, bs, _ = zztlib.load(os.path.join(ROOT, 'corpus/zzt', folder, fname))
        b = bs[0]
        objchar = {}
        for s in b['stats']:
            objchar[(s['x'] - 1, s['y'] - 1)] = s['p1']
        data.append((folder, im, b, objchar))
        for i, (t, c) in enumerate(b['cells']):
            px = cell_pixels(im, i % 60, i // 60)
            cols = collections.Counter(px)
            if 47 <= t <= 52:
                pal_votes[t - 46][cols.most_common(1)[0][0]] += 1
            if t == 53 and len(cols) == 2:
                for col in cols:
                    pal_votes['text_fg' if col != (0, 0, 0) else 0][col] += 1
            if t not in (0,) and t < 47 and len(cols) == 2:
                fgc = [col for col in cols if col != cols.most_common(1)[0][0]]
    # palette: majority votes from text backgrounds plus the 2-color-cell analysis in p07
    palette = {}
    for k, v in pal_votes.items():
        palette[k] = v.most_common(1)[0][0]
    # nibble->rgb from non-text cells: for each cell with exactly 2 colors whose color byte has distinct
    # nibbles, both assignments are possible; vote only when one color is already known.
    for it in range(3):
        for folder, im, b, objchar in data:
            for i, (t, c) in enumerate(b['cells']):
                if t == 0 or t >= 47: continue
                fgn, bgn = c & 15, c >> 4
                cols = set(cell_pixels(im, i % 60, i // 60))
                if len(cols) == 2 and fgn != bgn:
                    if bgn in palette and palette[bgn] in cols and fgn not in palette:
                        palette[fgn] = (cols - {palette[bgn]}).pop()
                    elif fgn in palette and palette[fgn] in cols and bgn not in palette:
                        palette[bgn] = (cols - {palette[fgn]}).pop()
    palette.pop('text_fg', None)
    palette = {int(k): v for k, v in palette.items()}
    print('palette (derived):', {k: palette[k] for k in sorted(palette, key=str)})

    chars = collections.defaultdict(collections.Counter)
    types = collections.defaultdict(collections.Counter)
    for folder, im, b, objchar in data:
        for i, (t, c) in enumerate(b['cells']):
            x, y = i % 60, i // 60
            px = cell_pixels(im, x, y)
            if 47 <= t <= 53:
                chars[c][mask_hex(px, (252, 252, 252))] += 1
            elif t == 36 and (x, y) in objchar:
                fg = palette.get(c & 15)
                if fg is None or fg == palette.get(c >> 4): continue
                chars[objchar[(x, y)]][mask_hex(px, fg)] += 1
            elif t != 0:
                fg = palette.get(c & 15)
                if fg is None or fg == palette.get(c >> 4): continue
                types[t][mask_hex(px, fg)] += 1
    out_chars = {}
    conflicts = 0
    for code, masks in chars.items():
        m, n = masks.most_common(1)[0]
        out_chars[code] = m
        if len(masks) > 1:
            conflicts += 1
            print(f'  char {code}: {len(masks)} different bitmaps {masks.most_common(3)}')
    print(f'chars harvested: {len(out_chars)}, conflicting codes: {conflicts}')
    print('char codes:', sorted(out_chars))
    # which char code (if any) each element type's dominant bitmap equals
    type_char = {}
    inv = collections.defaultdict(list)
    for code, m in out_chars.items(): inv[m].append(code)
    for t, masks in sorted(types.items()):
        m, n = masks.most_common(1)[0]
        codes = [cc for cc in inv.get(m, []) if cc != 32] or inv.get(m, [])
        type_char[t] = codes
        print(f'  type {t}: {len(masks)} distinct bitmaps (dominant {n}/{sum(masks.values())}) == char codes {codes}')
    json.dump({'palette': {str(k): v for k, v in palette.items()}, 'char': {str(k): v for k, v in out_chars.items()},
               'type': {str(t): dict(m) for t, m in types.items()}, 'type_char': {str(k): v for k, v in type_char.items()}},
              open(os.path.join(os.path.dirname(__file__), 'glyphs.json'), 'w'), indent=0)


if __name__ == '__main__':
    main()
