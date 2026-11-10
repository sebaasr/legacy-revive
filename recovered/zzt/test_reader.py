"""Invariant tests for the clean-room ZZT reader. Run: python recovered/zzt/test_reader.py"""
import os
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import reader  # noqa: E402

CORPUS = os.path.join(ROOT, "corpus", "zzt")


def samples():
    for folder in sorted(os.listdir(CORPUS)):
        fdir = os.path.join(CORPUS, folder)
        if not os.path.isdir(fdir):
            continue
        for fn in sorted(os.listdir(fdir)):
            if fn.lower().endswith(".zzt"):
                yield folder, os.path.join(fdir, fn)


def check(path):
    errs = []
    ir, grids = reader.read_with_grids(path)
    with open(path, "rb") as f:
        hdr_count = struct.unpack_from("<h", f.read(4), 2)[0] + 1
    nb = len(ir["screens"])
    if nb != hdr_count:
        errs.append(f"board count {nb} != header {hdr_count}")
    valid = {s["id"] for s in ir["screens"]}
    for note in ir["notes"]:
        if "parse ended" in note or "last board ends" in note:
            errs.append(note)
    for s in ir["screens"]:
        bi = s["number"]
        g = grids[bi]
        if len(g["cells"]) != 1500:
            errs.append(f"board {bi}: {len(g['cells'])} cells")
        for c in g["cells"]:
            ch, fg, bg, el = c
            if not (ch is None or 0 <= ch <= 255) or not (0 <= fg < 16 and 0 <= bg < 16):
                errs.append(f"board {bi}: bad cell {c}")
                break
        for d, t in s["extra"]["exits"].items():
            if t is not None and t not in valid:
                errs.append(f"board {bi}: exit {d} -> {t} invalid")
        if not s["objects"] or s["objects"][0]["extra"]["element"] != 4:
            errs.append(f"board {bi}: record 0 is not on a player cell")
        for o in s["objects"]:
            x, y = o["extra"]["x"], o["extra"]["y"]
            if not (1 <= x <= 60 and 1 <= y <= 25):
                errs.append(f"{o['id']}: position ({x},{y}) outside 60x25")
            l, t, r, b = o["rect"]
            if not (0 <= l < r <= 60 and 0 <= t < b <= 25):
                errs.append(f"{o['id']}: rect {o['rect']} outside")
            sc = o["script"]
            if sc is not None:
                if not isinstance(sc["text"], str) or not sc["text"]:
                    errs.append(f"{o['id']}: program does not decode")
                elif "\n" in sc["text"]:
                    errs.append(f"{o['id']}: program contains LF")
            if "destination" in o["extra"] and o["extra"]["destination"] not in valid:
                errs.append(f"{o['id']}: passage destination {o['extra']['destination']} invalid")
    return ir, errs


def main():
    failed = 0
    total = 0
    for folder, path in samples():
        total += 1
        try:
            ir, errs = check(path)
        except Exception as e:  # noqa: BLE001
            print(f"FAIL {folder}/{os.path.basename(path)}: exception {e!r}")
            failed += 1
            continue
        n_obj = sum(len(s["objects"]) for s in ir["screens"])
        n_prog = sum(1 for s in ir["screens"] for o in s["objects"] if o["script"])
        status = "ok  " if not errs else "FAIL"
        print(f"{status} {folder}/{os.path.basename(path)}: {len(ir['screens'])} boards, "
              f"{n_obj} entities, {n_prog} programs")
        for e in errs[:20]:
            print("     ", e)
        if errs:
            failed += 1
    print(f"{total - failed}/{total} files passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
