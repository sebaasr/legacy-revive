"""Render one card (background picture, then card picture) at native card size.

usage: python render_card.py <file.stak> <card_index|card_id> <out.png>
  card_index = 0-based position in card order (from LIST/PAGE); a value that is not a valid index is
  taken as a card id.

Compositing (see notes/08-bitmap-compression.md):
  1. start white; draw the BKGD picture: image bit 1 -> black.
  2. draw the CARD picture: inside the card picture's mask, pixels take the card image value (black or
     white); outside the mask the background shows through.
     mask stream present          -> decoded mask bits (1 = opaque)
     mask rect set, no mask data  -> the whole mask rect is opaque
     mask rect 0,0,0,0            -> the mask is the image itself (only black pixels are drawn)
Buttons and fields are not drawn.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hc import *
from bitmap import bmap_info, decode_stream, rows_to_layer
from list_page import card_order
from PIL import Image, ImageChops

def card_size(s):
    d = s.data
    return (i16(d, 0x1ba) or 512, i16(d, 0x1b8) or 342)   # (width, height), STAK 0x1B8 height / 0x1BA width

def layer_bits(s, bmap_id, size):
    """-> (image L: 255 = black pixel, mask L: 255 = opaque) or None."""
    if not bmap_id: return None
    I = bmap_info(s, s.get('BMAP', bmap_id))
    img = rows_to_layer(decode_stream(I['image'], I['irect']), I['irect'], size) if I['image'] else Image.new('L', size, 0)
    if I['mask']:
        mask = rows_to_layer(decode_stream(I['mask'], I['mrect']), I['mrect'], size)
    elif I['mrect'] != (0, 0, 0, 0):
        mask = Image.new('L', size, 0)
        t, l, b, r = I['mrect']; mask.paste(255, (l, t, r, b))
    else:
        mask = img.copy()
    return img, mask

def resolve_card(s, arg):
    order = [cid for cid, _ in card_order(s)]
    try:
        k = int(arg)
    except ValueError:
        raise SystemExit('card must be an index or an id')
    if 0 <= k < len(order): return order[k]
    if k in order: return k
    raise SystemExit('no such card index/id: %s' % arg)

def render(s, card_id):
    """-> Pillow 'L' image of the card (0 black, 255 white)."""
    size = card_size(s)
    card = parse_layer(s, s.get('CARD', card_id))
    bkgd = parse_layer(s, s.get('BKGD', card['bkgd']))
    black = Image.new('L', size, 0)
    out = Image.new('L', size, 255)
    bl = layer_bits(s, bkgd['bmap'], size)
    if bl:
        out.paste(black, (0, 0), bl[0])
    cl = layer_bits(s, card['bmap'], size)
    if cl:
        img, mask = cl
        card_px = ImageChops.invert(img)             # 0 black, 255 white
        out.paste(card_px, (0, 0), mask)
    return out

def visible_part_rects(s, card_id):
    card = parse_layer(s, s.get('CARD', card_id))
    bkgd = parse_layer(s, s.get('BKGD', card['bkgd']))
    rects = []
    for L in (bkgd, card):
        for p in L['parts']:
            if not p['flags'] & 0x80:
                rects.append(p['rect'])
    return rects

if __name__ == '__main__':
    if len(sys.argv) != 4: raise SystemExit(__doc__)
    s = Stack(sys.argv[1])
    cid = resolve_card(s, sys.argv[2])
    render(s, cid).convert('1').save(sys.argv[3])
    print('card', cid, '->', sys.argv[3])
