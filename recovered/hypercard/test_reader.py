"""Invariant checks for the clean-room HyperCard reader over every corpus sample.

Run: python recovered/hypercard/test_reader.py
"""
import glob
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import reader  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CORPUS = os.path.join(ROOT, "corpus", "hypercard")


def check(stak):
    st = reader.parse_stack(stak)
    fails = []
    info = {}

    def ok(cond, msg):
        if not cond:
            fails.append(msg)

    # block chain
    ok(st.walk_end == len(st.data), "block walk ends at %d, file is %d" % (st.walk_end, len(st.data)))
    ok(st.blocks[0].type == "STAK" and st.blocks[1].type == "MAST" and st.blocks[2].type == "LIST"
       and st.blocks[-1].type == "TAIL", "block order STAK/MAST/LIST..TAIL")
    ok(all(b.size % 32 == 0 for b in st.blocks), "block sizes multiple of 32")
    ok(st.stak["datasize"] == len(st.data), "STAK 0x14 data size")

    # card counts
    ncard_blocks = sum(1 for b in st.blocks if b.type == "CARD")
    ok(st.stak["ncards"] == ncard_blocks, "STAK ncards %d vs CARD blocks %d" % (st.stak["ncards"], ncard_blocks))
    ok(st.list["ncards"] == ncard_blocks, "LIST ncards %d" % st.list["ncards"])
    ok(sum(st.page_counts) == ncard_blocks, "PAGE counts sum %d" % sum(st.page_counts))
    ok(len(st.order) == ncard_blocks and set(st.order) == set(st.cards), "card order covers every CARD once")
    ok(st.order[0] == st.stak["first_card"], "first card = STAK 0x30")
    ok(st.list["E"] == 4 + 4 * st.list["W"], "page entry size E = 4+4W")
    nbk = sum(1 for b in st.blocks if b.type == "BKGD")
    ok(st.stak["nbkgds"] == nbk and len(st.ring) == nbk, "background count / ring")
    info["cards"] = ncard_blocks
    info["bkgds"] = nbk

    # parts, contents, rects
    nparts = 0
    for o in list(st.cards.values()) + list(st.bkgds.values()):
        tag = ("CARD" if o["is_card"] else "BKGD") + " %d" % o["id"]
        ok(len(o["parts"]) == o["nparts"], tag + " part count")
        ok(o["parts_bytes"] == o["partlen"], tag + " part bytes %d vs %d" % (o["parts_bytes"], o["partlen"]))
        ok(o["contents_bytes"] == o["contentlen"], tag + " content bytes %d vs %d" % (o["contents_bytes"], o["contentlen"]))
        if o["is_card"]:
            ok(o["bkgd"] in st.bkgds, tag + " background exists")
        for p in o["parts"]:
            nparts += 1
            pt = "%s part %d" % (tag, p["id"])
            ok(p["kind"] in (1, 2), pt + " kind %d" % p["kind"])
            ok(p["computed_size"] == p["size"], pt + " record size %d vs computed %d" % (p["size"], p["computed_size"]))
            ok(p["id"] <= o["maxpart"], pt + " id <= max part id")
            ok(0 <= p["left"] <= p["right"] <= st.card_w and 0 <= p["top"] <= p["bottom"] <= st.card_h,
               pt + " rect %s outside card %dx%d" % ((p["left"], p["top"], p["right"], p["bottom"]), st.card_w, st.card_h))
            if st.fonts:
                ok(p["font"] in st.fonts, pt + " font id %d unresolved" % p["font"])
            for s in (p["name_raw"], p["script_raw"]):
                ok(is_text(s), pt + " name/script is not text")
        for c in o["contents"]:
            ok(is_text(c["text_raw"]), tag + " content %d not text" % c["owner"])
            last = -1
            for off, sid in c["runs"]:
                ok(off >= last and off <= len(c["text_raw"]), tag + " run offsets")
                last = off
                ok(sid in st.styles, tag + " style id %d in STBL" % sid)
        ok(is_text(o["name_raw"]) and is_text(o["script_raw"]), tag + " name/script not text")
    ok(is_text(st.script_raw), "stack script not text")
    for sid, s in st.styles.items():
        if st.fonts and s["font"] != -1:
            ok(s["font"] in st.fonts, "STBL style %d font %d unresolved" % (sid, s["font"]))
    info["parts"] = nparts

    # bitmaps
    nstreams = 0
    refs = [o["bmap"] for o in list(st.cards.values()) + list(st.bkgds.values()) if o["bmap"]]
    ok(sorted(refs) == sorted(st.bmaps), "every BMAP referenced exactly once")
    for bid, bm in st.bmaps.items():
        ok(bm["card_rect"] == (0, 0, st.card_h, st.card_w), "BMAP %d card rect" % bid)
        blk = st.by[("BMAP", bid)]
        need = st.h + 0x30 + bm["mask_len"] + bm["image_len"]
        ok((need + 31) // 32 * 32 == blk.size, "BMAP %d lengths vs block size" % bid)
        for nm, data, rect in (("mask", bm["mask_data"], bm["mask_rect"]),
                               ("image", bm["image_data"], bm["image_rect"])):
            if not data:
                continue
            nstreams += 1
            rows, W, s = reader.decode_stream(data, rect)
            ok(s["unknown_op"] is None, "BMAP %d %s unknown op %r" % (bid, nm, s["unknown_op"]))
            ok(s["rows_decoded"] == s["H"], "BMAP %d %s decoded %d of %d rows" % (bid, nm, s["rows_decoded"], s["H"]))
            ok(s["leftover"] <= 3, "BMAP %d %s %d bytes left over" % (bid, nm, s["leftover"]))
            ok(s["partial_buf_rowop"] == 0, "BMAP %d %s row op with partial buffer" % (bid, nm))
            ok(s["byte_op_repeat"] == 0, "BMAP %d %s repeat prefix on a byte op" % (bid, nm))
            ok(all(len(r) == W for r in rows), "BMAP %d %s row widths" % (bid, nm))
    info["bmaps"] = len(st.bmaps)
    info["streams"] = nstreams

    # resource fork + full IR build
    if st.rsrc is not None:
        info["resources"] = len(st.rsrc)
    ir = reader.build_ir(st)
    ids = [s["id"] for s in ir["screens"]] + [l["id"] for l in ir["layers"]] + \
          [o["id"] for x in ir["screens"] + ir["layers"] for o in x["objects"]]
    ok(len(ids) == len(set(ids)), "IR ids unique")
    ok(ir["start_screen"] in {s["id"] for s in ir["screens"]}, "start_screen exists")
    return fails, info


def is_text(b):
    try:
        s = b.decode("mac_roman")
    except Exception:
        return False
    return all(ch in "\r\n\t" or ord(ch) >= 32 for ch in s)


def main():
    total_fail = 0
    for stak in sorted(glob.glob(os.path.join(CORPUS, "*", "*.stak"))):
        sample = os.path.basename(os.path.dirname(stak))
        try:
            fails, info = check(stak)
        except Exception as ex:
            import traceback
            traceback.print_exc()
            fails, info = ["exception: %r" % ex], {}
        status = "PASS" if not fails else "FAIL (%d)" % len(fails)
        print("%-36s %s  %s" % (sample, status, " ".join("%s=%s" % kv for kv in info.items())))
        for f in fails[:15]:
            print("    -", f)
        if len(fails) > 15:
            print("    ... %d more" % (len(fails) - 15))
        total_fail += bool(fails)
    print("\n%d sample(s) failed" % total_fail)
    return 1 if total_fail else 0


if __name__ == "__main__":
    sys.exit(main())
