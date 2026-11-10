"""Clean-room ZZT world reader -> Legacy IR v1.

Implemented only from specs/zzt/SPEC.md and docs/legacy-ir.md.
Usage: python reader.py <file.ZZT> <out_dir>
"""
import json
import os
import struct
import sys

COLS, ROWS = 60, 25
NCELLS = COLS * ROWS

# SPEC 4.1 (entries 7 and 8 are inferred in the spec)
PALETTE = [
    [0, 0, 0], [0, 0, 168], [0, 168, 0], [0, 168, 168],
    [168, 0, 0], [168, 0, 168], [168, 84, 0], [168, 168, 168],
    [84, 84, 84], [84, 84, 252], [84, 252, 84], [84, 252, 252],
    [252, 84, 84], [252, 84, 252], [252, 252, 84], [252, 252, 252],
]

# SPEC 4.2 fixed glyph table (null = shape known, code unknown -> omitted, falls to null)
FIXED_GLYPH = {4: 2, 19: 176, 20: 176, 21: 219}

# Elements listed in SPEC 3.1 (anything else is "unknown element met", noted)
KNOWN_ELEMENTS = {0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 20, 21, 22, 23, 24,
                  25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 39, 40, 41, 42, 44,
                  45, 47, 48, 49, 50, 51, 52, 53}

TEXT_BG = {47: 1, 48: 2, 49: 3, 50: 4, 51: 5, 52: 6, 53: 0}


def u8(d, o):
    return d[o]


def u16(d, o):
    return struct.unpack_from("<H", d, o)[0]


def i16(d, o):
    return struct.unpack_from("<h", d, o)[0]


def pstr(d, o, cap):
    n = d[o]
    return d[o + 1:o + 1 + min(n, cap)].decode("cp437")


def parse_header(d, notes):
    if len(d) < 0x200:
        raise ValueError("file shorter than 512-byte header")
    magic = i16(d, 0)
    if magic != -1:
        notes.append(f"header: magic is {magic}, expected -1")
    board_count = i16(d, 2) + 1
    hdr = {
        "board_count": board_count,
        "counter_0x04": i16(d, 0x04),
        "counter_0x06": i16(d, 0x06),
        "health_0x0f": i16(d, 0x0F),
        "current_board": i16(d, 0x11),
        "name": pstr(d, 0x1D, 20),
        "flags": [pstr(d, 0x32 + 21 * i, 20) for i in range(10)],
    }
    # Unknown header bytes (SPEC 7.1): note when non-zero
    unknown_ranges = [(0x04, 0x08), (0x08, 0x0F), (0x13, 0x1D), (0x104, 0x109), (0x109, 0x200)]
    for a, b in unknown_ranges:
        chunk = d[a:b]
        if any(chunk):
            notes.append(f"header: unknown bytes 0x{a:03x}-0x{b - 1:03x} non-zero: {chunk.hex()}")
    notes.append(f"header: health-like counter 0x0f = {hdr['health_0x0f']} (probable)")
    notes.append(f"header: current board at save (0x11, probable) = {hdr['current_board']}")
    return hdr


def decode_grid(d, p, notes, bi):
    cells = []
    while len(cells) < NCELLS:
        if p + 3 > len(d):
            raise ValueError(f"board {bi}: grid runs past end of file")
        count, element, color = d[p], d[p + 1], d[p + 2]
        if count == 0:
            count = 256
            notes.append(f"board {bi}: RLE count 0 at 0x{p:x} treated as 256 (guess)")
        cells.extend([(element, color)] * count)
        p += 3
    if len(cells) > NCELLS:
        notes.append(f"board {bi}: grid runs overflow 1500 cells by {len(cells) - NCELLS}; truncated")
    return cells[:NCELLS], p


def parse_props(d, p):
    return {
        "max_shots": u8(d, p + 0),
        "dark": u8(d, p + 1) != 0,
        "exits_raw": [u8(d, p + 2), u8(d, p + 3), u8(d, p + 4), u8(d, p + 5)],
        "prop6": u8(d, p + 6),
        "message": pstr(d, p + 7, 58),
        "enter_xy": [u8(d, p + 66), u8(d, p + 67)],
        "time_limit": i16(d, p + 68),
        "prop70_85": d[p + 70:p + 86].hex(),
    }


def parse_record(d, r):
    if r + 33 > len(d):
        raise ValueError(f"status record at 0x{r:x} runs past end of file")
    rec = {
        "x": u8(d, r), "y": u8(d, r + 1),
        "step": [i16(d, r + 2), i16(d, r + 4)],
        "cycle": i16(d, r + 6),
        "p1": u8(d, r + 8), "p2": u8(d, r + 9), "p3": u8(d, r + 10),
        "follower": i16(d, r + 11), "leader": i16(d, r + 13),
        "under": [u8(d, r + 15), u8(d, r + 16)],
        "ip": i16(d, r + 21),
        "code_len": i16(d, r + 23),
    }
    n = max(rec["code_len"], 0)
    raw = d[r + 33:r + 33 + n]
    if len(raw) < n:
        raise ValueError(f"program text at 0x{r + 33:x} runs past end of file")
    rec["code"] = raw.decode("cp437") if n > 0 else None
    return rec, r + 33 + n


def program_name(code):
    """SPEC 5.1: first non-empty line, if it starts with '@', is the name."""
    if not code:
        return ""
    for line in code.split("\r"):
        if line == "":
            continue
        if line.startswith("@"):
            return line[1:].strip()
        return ""
    return ""


def line_key(cells, col, row):
    k = ""
    for name, dc, dr in (("N", 0, -1), ("S", 0, 1), ("E", 1, 0), ("W", -1, 0)):
        c, r = col + dc, row + dr
        if 0 <= c < COLS and 0 <= r < ROWS and cells[r * COLS + c][0] == 31:
            k += name
    return k


def render_cells(cells, records, notes, bi):
    # lowest-index record per cell
    at = {}
    for k, rec in enumerate(records):
        key = (rec["x"] - 1, rec["y"] - 1)
        at.setdefault(key, rec)
    out, line_keys, unknown = [], {}, set()
    for idx, (el, color) in enumerate(cells):
        col, row = idx % COLS, idx // COLS
        if el not in KNOWN_ELEMENTS:
            unknown.add(el)
        if el == 0:
            out.append([32, 0, 0, 0])
            continue
        if el in TEXT_BG:
            out.append([color, 15, TEXT_BG[el], el])
            continue
        fg, bg = color & 0x0F, color >> 4
        if el == 36:
            rec = at.get((col, row))
            ch = rec["p1"] if rec else None
            if rec is None:
                notes.append(f"board {bi}: object cell ({col},{row}) has no status record; char null")
        elif el == 31:
            ch = None
            line_keys[str(idx)] = line_key(cells, col, row)
        else:
            ch = FIXED_GLYPH.get(el)
        out.append([ch, fg, bg, el])
    if unknown:
        notes.append(f"board {bi}: elements not in SPEC table: {sorted(unknown)}")
    return out, line_keys


def board_ref(v):
    return None if v == 0 else f"board-{v}"


def read(path, _grids=None):
    with open(path, "rb") as f:
        d = f.read()
    notes = []
    hdr = parse_header(d, notes)
    screens, assets = [], []
    grids = {}
    off = 0x200
    for bi in range(hdr["board_count"]):
        if off + 2 > len(d):
            raise ValueError(f"board {bi}: starts past end of file (0x{off:x})")
        size = u16(d, off)
        end = off + 2 + size
        if end > len(d):
            raise ValueError(f"board {bi}: size {size} runs past end of file")
        name = pstr(d, off + 2, 50)
        cells, p = decode_grid(d, off + 53, notes, bi)
        props = parse_props(d, p)
        p += 86
        n_rec = i16(d, p) + 1
        p += 2
        records = []
        for _ in range(max(n_rec, 0)):
            rec, p = parse_record(d, p)
            records.append(rec)
        if p != end:
            notes.append(f"board {bi}: parse ended at 0x{p:x}, size field says 0x{end:x}")
        rendered, line_keys = render_cells(cells, records, notes, bi)
        grids[bi] = {"cols": COLS, "rows": ROWS, "palette": PALETTE, "cells": rendered,
                     "line_keys": line_keys}

        objects = []
        for k, rec in enumerate(records):
            x, y = rec["x"], rec["y"]
            inside = 1 <= x <= COLS and 1 <= y <= ROWS
            el, color = cells[(y - 1) * COLS + (x - 1)] if inside else (None, None)
            if not inside:
                notes.append(f"board {bi}: status record {k} at ({x},{y}) outside the grid")
            extra = {
                "element": el, "color": color, "x": x, "y": y,
                "cycle": rec["cycle"], "step": rec["step"],
                "p1": rec["p1"], "p2": rec["p2"], "p3": rec["p3"],
                "follower": rec["follower"], "leader": rec["leader"],
                "under": rec["under"], "ip": rec["ip"],
            }
            if el == 11:
                extra["destination"] = f"board-{rec['p3']}"
            objects.append({
                "id": f"board-{bi}-stat-{k}", "kind": "entity",
                "name": program_name(rec["code"]), "number": k,
                "rect": [x - 1, y - 1, x, y],
                "visible": el != 0,
                "style": {}, "text": "", "icon": None,
                "script": ({"language": "zzt-oop", "text": rec["code"]}
                           if rec["code"] is not None else None),
                "extra": extra,
            })

        ex = props["exits_raw"]
        screens.append({
            "id": f"board-{bi}", "name": name, "number": bi,
            "layers": [], "image": None,
            "objects": objects, "layer_text": {}, "script": None,
            "grid": {"cols": COLS, "rows": ROWS, "cells": f"assets/board-{bi}.json"},
            "extra": {
                "exits": {"north": board_ref(ex[0]), "south": board_ref(ex[1]),
                          "west": board_ref(ex[2]), "east": board_ref(ex[3])},
                "max_shots": props["max_shots"], "dark": props["dark"],
                "message": props["message"], "time_limit": props["time_limit"],
                "enter_xy": props["enter_xy"],
                "unknown": {"prop6": props["prop6"], "prop70_85": props["prop70_85"]},
            },
        })
        assets.append({"id": f"board-{bi}-grid", "kind": "data", "file": f"assets/board-{bi}.json"})
        off = end
    if off != len(d):
        notes.append(f"file: last board ends at 0x{off:x}, file size 0x{len(d):x}")

    ir = {
        "ir_version": 1,
        "program": "zzt",
        "source": {"file": os.path.basename(path), "bytes": len(d)},
        "name": hdr["name"],
        "size": {"width": COLS, "height": ROWS},
        "units": "cells",
        "start_screen": "board-0",
        "script": None,
        "layers": [],
        "screens": screens,
        "assets": assets,
        "notes": notes,
    }
    if any(hdr["flags"]):
        notes.append(f"header: flag slots {hdr['flags']}")
    if _grids is not None:
        _grids.update(grids)
    return ir


def read_with_grids(path):
    grids = {}
    ir = read(path, grids)
    return ir, grids


def write(path, out_dir):
    ir, grids = read_with_grids(path)
    os.makedirs(os.path.join(out_dir, "assets"), exist_ok=True)
    with open(os.path.join(out_dir, "ir.json"), "w", encoding="utf-8") as f:
        json.dump(ir, f, ensure_ascii=False, indent=1)
    for bi, g in grids.items():
        with open(os.path.join(out_dir, "assets", f"board-{bi}.json"), "w", encoding="utf-8") as f:
            json.dump(g, f, separators=(",", ":"))
    return ir


def main(argv):
    if len(argv) != 3:
        print("usage: python reader.py <file.ZZT> <out_dir>", file=sys.stderr)
        return 2
    ir = write(argv[1], argv[2])
    n_obj = sum(len(s["objects"]) for s in ir["screens"])
    print(f"{argv[1]}: {len(ir['screens'])} boards, {n_obj} entities -> {argv[2]}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
