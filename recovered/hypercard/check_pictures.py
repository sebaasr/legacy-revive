"""Fidelity check: composite bkgd + card picture of the start card, compare with reference.png.

Run: python recovered/hypercard/check_pictures.py [--save DIR]

Start card = the first card, unless the stack's `on openStack` handler goes elsewhere
(the last `go` statement in that handler that names a card by number/id/first/last).

Two numbers per sample:
  all   = % of matching pixels over the whole card area in the screenshot;
  pics  = the same, excluding the rects of visible parts (buttons/fields are not in the
          pictures) and the 20-pixel menu bar band at the top of the screen.
Cards smaller than the screen sit in a window; their screen offset is searched (best match).
"""
import glob
import os
import re
import sys

from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import reader  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CORPUS = os.path.join(ROOT, "corpus", "hypercard")
MENUBAR = 20


def start_card(st):
    order = st.order
    text = st.script_raw.decode("mac_roman").replace("\r", "\n")
    m = re.search(r"(?ims)^\s*on\s+openstack\b(.*?)^\s*end\s+openstack", text)
    target = order[0]
    why = "first card"
    if not m:
        return target, why
    for line in m.group(1).split("\n"):
        line = line.split("--")[0].strip()
        g = re.match(r"(?i)go\s+(?:to\s+)?(?:card|cd)\s+id\s+(\d+)\s*$", line)
        if g and int(g.group(1)) in st.cards:
            target, why = int(g.group(1)), "openStack: " + line
            continue
        g = re.match(r"(?i)go\s+(?:to\s+)?(?:card|cd)\s+(\d+)\s*$", line)
        if g and 1 <= int(g.group(1)) <= len(order):
            target, why = order[int(g.group(1)) - 1], "openStack: " + line
            continue
        g = re.match(r"(?i)go\s+(?:to\s+)?(first|last)(?:\s+(?:card|cd))?\s*$", line)
        if g:
            target = order[0] if g.group(1).lower() == "first" else order[-1]
            why = "openStack: " + line
    return target, why


def part_mask(st, card_id):
    """'L' card-size mask, 255 where a visible part covers the card."""
    m = Image.new("L", (st.card_w, st.card_h), 0)
    c = st.cards[card_id]
    for o in (st.bkgds[c["bkgd"]], c):
        for p in o["parts"]:
            if p["flags_a"] & 0x80:
                continue
            m.paste(255, (p["left"], p["top"], p["right"] + 1, p["bottom"] + 1))
    return m


def score(comp, ref, dx, dy, excl):
    w, h = comp.size
    crop = ref.crop((dx, dy, dx + w, dy + h))
    diff = ImageChops.difference(comp, crop).point(lambda v: 255 if v else 0)
    total = w * h
    bad_all = diff.histogram()[255]
    keep = excl.point(lambda v: 0 if v else 255)
    # menu bar band in screen coordinates
    if dy < MENUBAR:
        keep.paste(0, (0, 0, w, MENUBAR - dy))
    nkeep = keep.histogram()[255]
    bad_pic = ImageChops.multiply(diff, keep).histogram()[255]
    return 100.0 * (total - bad_all) / total, 100.0 * (nkeep - bad_pic) / max(1, nkeep), bad_all, bad_pic


def main(argv):
    save = None
    if "--save" in argv:
        save = argv[argv.index("--save") + 1]
        os.makedirs(save, exist_ok=True)
    rows = []
    for stak in sorted(glob.glob(os.path.join(CORPUS, "*", "*.stak"))):
        sample = os.path.basename(os.path.dirname(stak))
        refp = os.path.join(os.path.dirname(stak), "reference.png")
        st = reader.parse_stack(stak)
        cid, why = start_card(st)
        comp = reader.composite(st, cid).point(lambda v: 255 if v >= 128 else 0)
        ref = Image.open(refp).convert("L").point(lambda v: 255 if v >= 128 else 0)
        excl = part_mask(st, cid)
        rw, rh = ref.size
        w, h = comp.size
        if (w, h) == (rw, rh):
            best = (0, 0)
        else:
            # coarse-to-fine search of the window offset on the picture-only score
            cands = [(dx, dy) for dx in range(0, rw - w + 1, 4) for dy in range(0, rh - h + 1, 4)]
            best = max(cands, key=lambda d: score(comp, ref, d[0], d[1], excl)[1])
            fine = [(x, y) for x in range(max(0, best[0] - 4), min(rw - w, best[0] + 4) + 1)
                    for y in range(max(0, best[1] - 4), min(rh - h, best[1] + 4) + 1)]
            best = max(fine, key=lambda d: score(comp, ref, d[0], d[1], excl)[1])
        a, p, ba, bp = score(comp, ref, best[0], best[1], excl)
        rows.append((sample, cid, why, best, a, p, ba, bp))
        if save:
            comp.save(os.path.join(save, sample + "_composite.png"))
    print("%-34s %-12s %-10s %8s %8s %8s  %s" % ("sample", "card", "offset", "all%", "pics%", "badpix", "start"))
    for sample, cid, why, best, a, p, ba, bp in rows:
        print("%-34s %-12s %-10s %8.3f %8.3f %8d  %s" % (sample, cid, "%d,%d" % best, a, p, bp, why))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
