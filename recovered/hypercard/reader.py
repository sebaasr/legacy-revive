"""Clean-room HyperCard stack reader -> Legacy IR v1.

Written only from specs/hypercard/SPEC.md and docs/legacy-ir.md.
Standard library + Pillow.

Usage: python reader.py <file.stak> <out_dir>
"""
import json
import os
import re
import struct
import sys

from PIL import Image

# --------------------------------------------------------------------------- helpers


def u8(b, o):
    return b[o]


def u16(b, o):
    return struct.unpack_from(">H", b, o)[0]


def i16(b, o):
    return struct.unpack_from(">h", b, o)[0]


def u32(b, o):
    return struct.unpack_from(">I", b, o)[0]


def i32(b, o):
    return struct.unpack_from(">i", b, o)[0]


def cstring(b, o, end=None):
    """Return (bytes, offset after the NUL). Stops at `end` if no NUL found."""
    end = len(b) if end is None else end
    j = b.find(b"\x00", o, end)
    if j < 0:
        return b[o:end], end
    return b[o:j], j + 1


def mac(bs):
    return bs.decode("mac_roman")


class Block:
    __slots__ = ("off", "size", "type", "id", "data")

    def __init__(self, off, size, typ, bid, data):
        self.off, self.size, self.type, self.id, self.data = off, size, typ, bid, data


# --------------------------------------------------------------------------- bitmap codec (SPEC 4.5)

FILTERS = {
    0x89: (0, 0), 0x8A: (0, 1), 0x8B: (0, 2), 0x8C: (1, 0),
    0x8D: (1, 1), 0x8E: (2, 2), 0x8F: (8, 0),
}


def row_width(l, r):
    return ((r + 31) // 32 - l // 32) * 4


def _hxor(raw, dh):
    """out[x] = raw[x] ^ out[x-dh] over the whole bit string (MSB first)."""
    if dh == 0:
        return raw
    n = len(raw) * 8
    v = int.from_bytes(raw, "big")
    s = dh
    while s < n:
        v ^= v >> s
        s *= 2
    return v.to_bytes(len(raw), "big")


def decode_stream(data, rect, notes=None, where=""):
    """Decode one BMAP stream covering rect (t, l, b, r).

    Returns (rows, W, stats). rows is a list of H bytes objects of length W.
    stats: {'H', 'rows_decoded', 'bytes_used', 'leftover', 'unknown_op'}.
    """
    t, l, b, r = rect
    H = max(0, b - t)
    W = row_width(l, r) if r > l else 0
    rows = []
    buf = bytearray()
    filt = (0, 0)
    pattern = [0xAA, 0x55] * 4
    stats = {"H": H, "W": W, "rows_decoded": 0, "bytes_used": 0, "leftover": 0,
             "unknown_op": None, "partial_buf_rowop": 0, "byte_op_repeat": 0}
    if H == 0 or W == 0:
        stats["leftover"] = len(data)
        return [bytes(W) for _ in range(H)], W, stats
    zeroW = bytes(W)

    def finish(raw):
        dh, dv = filt
        out = _hxor(bytes(raw), dh)
        if dv > 0 and len(rows) >= dv:
            prev = rows[len(rows) - dv]
            out = bytes(a ^ c for a, c in zip(out, prev))
        rows.append(bytes(out))

    i = 0
    n = len(data)
    while i < n and len(rows) < H:
        c = data[i]
        i += 1
        rep = 1
        if 0xA0 <= c <= 0xBF:
            rep = c & 0x1F
            if i >= n:
                break
            c = data[i]
            i += 1
            if c < 0x80 or c >= 0xC0:
                stats["byte_op_repeat"] += 1
        if 0x90 <= c <= 0x9F or c >= 0xF0 or (0xA0 <= c <= 0xBF):
            stats["unknown_op"] = c
            if notes is not None:
                notes.append("bitmap %s: unknown opcode 0x%02X at stream byte %d, decoding stopped"
                             % (where, c, i - 1))
            i -= 1
            break
        if c in (0x87, 0x88) and notes is not None:
            notes.append("bitmap %s: opcode 0x%02X (never seen, meaning guessed) used" % (where, c))
        for _ in range(rep):
            if 0x80 <= c <= 0x87 and buf:
                stats["partial_buf_rowop"] += 1
            if c < 0x80:
                buf += bytes(c & 15) + data[i:i + (c >> 4)]
            elif c >= 0xE0:
                buf += bytes((c & 15) * 16)
            elif c >= 0xC0:
                buf += data[i:i + (c & 31) * 8]
            elif c == 0x80:
                rows.append(bytes(data[i:i + W]).ljust(W, b"\x00"))
            elif c == 0x81:
                rows.append(zeroW)
            elif c == 0x82:
                rows.append(b"\xff" * W)
            elif c == 0x83:
                x = data[i] if i < n else 0
                pattern[len(rows) % 8] = x
                rows.append(bytes([x]) * W)
            elif c == 0x84:
                rows.append(bytes([pattern[len(rows) % 8]]) * W)
            elif c == 0x85:
                rows.append(rows[-1] if rows else zeroW)
            elif c == 0x86:
                rows.append(rows[-2] if len(rows) >= 2 else zeroW)
            elif c == 0x87:
                rows.append(rows[-3] if len(rows) >= 3 else zeroW)
            elif c == 0x88:
                filt = (16, 0)  # guess, see GAPS
            else:
                filt = FILTERS[c]
            while len(buf) >= W and len(rows) < H:
                finish(buf[:W])
                del buf[:W]
        if c < 0x80:
            i += c >> 4
        elif 0xC0 <= c < 0xE0:
            i += (c & 31) * 8
        elif c == 0x80:
            i += W
        elif c == 0x83:
            i += 1
    stats["rows_decoded"] = min(len(rows), H)
    stats["bytes_used"] = min(i, n)
    stats["leftover"] = max(0, n - i)
    rows = rows[:H]
    while len(rows) < H:
        rows.append(zeroW)
    return rows, W, stats


def rows_to_L(rows, W, rect, card_w, card_h, fill=0):
    """Place decoded rows into a card-size 'L' image: 255 where bit = 1."""
    t, l, b, r = rect
    canvas = Image.new("L", (card_w, card_h), fill)
    H = len(rows)
    if H == 0 or W == 0:
        return canvas
    raw = b"".join(rows)
    img = Image.frombytes("1", (W * 8, H), raw).convert("L")  # bit 1 -> 255
    x0 = (l // 32) * 32
    canvas.paste(img, (x0, t))
    return canvas


# --------------------------------------------------------------------------- resource fork (SPEC 4.8)


def read_rsrc(path):
    b = open(path, "rb").read()
    data_off, map_off, data_len, map_len = struct.unpack_from(">IIII", b, 0)
    tl = map_off + u16(b, map_off + 0x18)
    nl = map_off + u16(b, map_off + 0x1A)
    ntypes = u16(b, tl) + 1
    res = {}
    for k in range(ntypes):
        e = tl + 2 + 8 * k
        typ = b[e:e + 4].decode("mac_roman")
        cnt = u16(b, e + 4) + 1
        ref = tl + u16(b, e + 6)
        for j in range(cnt):
            r = ref + 12 * j
            rid = i16(b, r)
            noff = u16(b, r + 2)
            attr = b[r + 4]
            doff = int.from_bytes(b[r + 5:r + 8], "big")
            name = None
            if noff != 0xFFFF:
                ln = b[nl + noff]
                name = mac(b[nl + noff + 1:nl + noff + 1 + ln])
            p = data_off + doff
            ln = u32(b, p)
            res[(typ, rid)] = {"type": typ, "id": rid, "name": name, "attr": attr,
                               "data": b[p + 4:p + 4 + ln]}
    return res


# --------------------------------------------------------------------------- stack parsing


class Stack:
    pass


def parse_part(b, p):
    size = u16(b, p)
    pt = {
        "size": size,
        "id": u16(b, p + 2),
        "kind": b[p + 4],
        "flags_a": b[p + 5],
        "top": i16(b, p + 6), "left": i16(b, p + 8),
        "bottom": i16(b, p + 10), "right": i16(b, p + 12),
        "flags_b": u16(b, p + 14),
        "zero16": u16(b, p + 16),
        "icon": i16(b, p + 18),
        "align": i16(b, p + 20),
        "font": i16(b, p + 22),
        "size_pt": u16(b, p + 24),
        "text_style": u16(b, p + 26),
        "line_height": u16(b, p + 28),
    }
    end = p + size
    name, q = cstring(b, p + 30, end)
    gap = b[q] if q < end else None
    q += 1
    script, q = cstring(b, q, end)
    pt["name_raw"], pt["script_raw"], pt["gap"] = name, script, gap
    pt["computed_size"] = q + (q - p) % 2 - p
    return pt


def parse_content(b, p):
    owner = i16(b, p)
    n = u16(b, p + 2)
    body = b[p + 4:p + 4 + n]
    runs = []
    if n == 0:
        text = b""
    elif body[0] & 0x80:
        L = u16(body, 0) & 0x7FFF
        runs = [(u16(body, k), u16(body, k + 2)) for k in range(2, L, 4)]
        text = body[L:n]
    else:
        text = body[1:n]
    return {"owner": owner, "n": n, "text_raw": text, "runs": runs,
            "size": 4 + n + (n & 1)}


def parse_layer(blk, h, is_card):
    b = blk.data
    o = {"id": blk.id, "is_card": is_card}
    o["bmap"] = i32(b, h + 0)
    o["flags"] = u16(b, h + 4)
    if is_card:
        o["page"] = i32(b, h + 0x10)
        o["bkgd"] = i32(b, h + 0x14)
        base = h + 0x18
        p = h + 0x26
    else:
        o["ncards"] = u32(b, h + 0x08)
        o["next"] = i32(b, h + 0x0C)
        o["prev"] = i32(b, h + 0x10)
        base = h + 0x14
        p = h + 0x22
    o["nparts"] = u16(b, base)
    o["maxpart"] = u16(b, base + 2)
    o["partlen"] = u32(b, base + 4)
    o["ncontents"] = u16(b, base + 8)
    o["contentlen"] = u32(b, base + 10)
    parts = []
    p0 = p
    for _ in range(o["nparts"]):
        pt = parse_part(b, p)
        parts.append(pt)
        if pt["size"] == 0:
            break
        p += pt["size"]
    o["parts_bytes"] = p - p0
    contents = []
    p1 = p
    for _ in range(o["ncontents"]):
        c = parse_content(b, p)
        contents.append(c)
        p += c["size"]
    o["contents_bytes"] = p - p1
    name, p = cstring(b, p)
    script, p = cstring(b, p)
    o["parts"], o["contents"] = parts, contents
    o["name_raw"], o["script_raw"] = name, script
    o["end"] = p
    return o


def parse_bmap(blk, h):
    b = blk.data
    rect = lambda o: (i16(b, o), i16(b, o + 2), i16(b, o + 4), i16(b, o + 6))
    bm = {
        "id": blk.id,
        "w0": u32(b, h), "w1": u32(b, h + 4),
        "card_rect": rect(h + 8),
        "mask_rect": rect(h + 0x10),
        "image_rect": rect(h + 0x18),
        "mask_len": u32(b, h + 0x28),
        "image_len": u32(b, h + 0x2C),
    }
    s = h + 0x30
    bm["mask_data"] = b[s:s + bm["mask_len"]]
    bm["image_data"] = b[s + bm["mask_len"]:s + bm["mask_len"] + bm["image_len"]]
    return bm


def parse_stack(path):
    data = open(path, "rb").read()
    st = Stack()
    st.path = path
    st.data = data
    st.notes = []
    blocks = []
    off = 0
    while off + 12 <= len(data):
        size = u32(data, off)
        typ = data[off + 4:off + 8].decode("latin-1")
        bid = i32(data, off + 8)
        blocks.append(Block(off, size, typ, bid, data[off:off + size]))
        if size == 0:
            st.notes.append("block walk: zero-size block at 0x%X, stopped" % off)
            break
        off += size
    st.walk_end = off
    st.blocks = blocks
    st.by = {(bk.type, bk.id): bk for bk in blocks}
    stak = blocks[0]
    S = stak.data
    st.format = u32(S, 0x10)
    st.h = 16 if st.format >= 9 else 12
    if st.format not in (8, 10):
        st.notes.append("STAK format %d not seen in the spec; header length %d assumed" % (st.format, st.h))
    h = st.h
    st.stak = {
        "size": u32(S, 0), "datasize": u32(S, 0x14),
        "nbkgds": u32(S, 0x24), "first_bkgd": i32(S, 0x28),
        "ncards": u32(S, 0x2C), "first_card": i32(S, 0x30),
        "list_id": i32(S, 0x34), "nfree": u32(S, 0x38), "freebytes": u32(S, 0x3C),
        "prnt_id": i32(S, 0x40),
        "ftbl_id": i32(S, 0x1B0), "stbl_id": i32(S, 0x1B4),
        "card_h": i16(S, 0x1B8), "card_w": i16(S, 0x1BA),
    }
    st.card_h = st.stak["card_h"] or 342
    st.card_w = st.stak["card_w"] or 512
    script, _ = cstring(S, 0x600)
    st.script_raw = script

    # LIST / PAGE
    L = st.by[("LIST", st.stak["list_id"])].data
    st.list = {"npages": u32(L, h), "pagesize": u32(L, h + 4), "ncards": u32(L, h + 8),
               "E": u16(L, h + 0x0C), "W": u16(L, h + 0x10)}
    E = st.list["E"]
    order = []
    st.page_counts = []
    st.page_flags = {}
    for k in range(st.list["npages"]):
        pid = i32(L, 0x30 + 6 * k)
        n = u16(L, 0x34 + 6 * k)
        st.page_counts.append(n)
        P = st.by[("PAGE", pid)].data
        for j in range(n):
            cid = i32(P, 0x18 + j * E)
            order.append(cid)
            st.page_flags[cid] = P[0x18 + j * E + 4]
    st.order = order

    # fonts
    st.fonts = {}
    if st.stak["ftbl_id"] and ("FTBL", st.stak["ftbl_id"]) in st.by:
        F = st.by[("FTBL", st.stak["ftbl_id"])]
        b = F.data
        nf = u32(b, h)
        p = h + 8
        for _ in range(nf):
            fid = u16(b, p)
            name, p = cstring(b, p + 2)
            if p % 2:
                p += 1
            st.fonts[fid] = mac(name)
    st.styles = {}
    if st.stak["stbl_id"] and ("STBL", st.stak["stbl_id"]) in st.by:
        b = st.by[("STBL", st.stak["stbl_id"])].data
        ns = u32(b, h)
        for k in range(ns):
            e = h + 8 + 24 * k
            st.styles[i32(b, e)] = {"font": i16(b, e + 12), "style": i16(b, e + 14),
                                    "size": i16(b, e + 16)}

    # cards / backgrounds
    st.cards = {}
    st.bkgds = {}
    st.bmaps = {}
    for bk in blocks:
        if bk.type == "CARD":
            st.cards[bk.id] = parse_layer(bk, h, True)
        elif bk.type == "BKGD":
            st.bkgds[bk.id] = parse_layer(bk, h, False)
        elif bk.type == "BMAP":
            st.bmaps[bk.id] = parse_bmap(bk, h)
        elif bk.type in ("PRNT", "PRST", "PRFT"):
            st.notes.append("%s block id %d at 0x%X (%d bytes): print settings, not decoded, skipped"
                            % (bk.type, bk.id, bk.off, bk.size))
        elif bk.type not in ("STAK", "MAST", "LIST", "PAGE", "FTBL", "STBL", "FREE", "TAIL"):
            st.notes.append("unknown block type %r id %d at 0x%X skipped" % (bk.type, bk.id, bk.off))

    # background ring
    ring = []
    cur = st.stak["first_bkgd"]
    while cur in st.bkgds and cur not in ring:
        ring.append(cur)
        cur = st.bkgds[cur]["next"]
    for bid in st.bkgds:
        if bid not in ring:
            st.notes.append("BKGD %d not reached from the background ring; appended" % bid)
            ring.append(bid)
    st.ring = ring

    # resource fork
    st.rsrc = None
    rp = os.path.splitext(path)[0] + ".rsrc"
    if os.path.exists(rp):
        try:
            st.rsrc = read_rsrc(rp)
            st.rsrc_path = rp
        except Exception as ex:  # pragma: no cover
            st.notes.append("resource fork %s could not be parsed: %s" % (os.path.basename(rp), ex))
    return st


# --------------------------------------------------------------------------- pictures


def picture_layers(st, bm_id, where):
    """Return (ink L, alpha L, stats list) for a BMAP, card-size. ink 255 = black."""
    bm = st.bmaps.get(bm_id)
    W, H = st.card_w, st.card_h
    if bm is None:
        st.notes.append("%s: BMAP %d missing" % (where, bm_id))
        return None
    img_rows, iw, istats = decode_stream(bm["image_data"], bm["image_rect"], st.notes, where + " image")
    ink = rows_to_L(img_rows, iw, bm["image_rect"], W, H)
    stats = [("image", istats)]
    mr = bm["mask_rect"]
    if bm["mask_len"] > 0:
        m_rows, mw, mstats = decode_stream(bm["mask_data"], mr, st.notes, where + " mask")
        alpha = rows_to_L(m_rows, mw, mr, W, H)
        stats.append(("mask", mstats))
        kind = "mask-stream"
    elif mr == (0, 0, 0, 0):
        alpha = ink.copy()
        kind = "zero-mask-rect"
    else:
        alpha = Image.new("L", (W, H), 0)
        t, l, b, r = mr
        alpha.paste(255, (max(0, l), max(0, t), min(W, r), min(H, b)))
        kind = "opaque-rect"
    return ink, alpha, stats, kind


def composite(st, card_id):
    """Card-size 'L' image (0 black / 255 white) of bkgd picture + card picture."""
    W, H = st.card_w, st.card_h
    out = Image.new("L", (W, H), 255)
    c = st.cards[card_id]
    for bm_id, where in ((st.bkgds[c["bkgd"]]["bmap"], "bkgnd-%d" % c["bkgd"]),
                         (c["bmap"], "card-%d" % card_id)):
        if not bm_id:
            continue
        r = picture_layers(st, bm_id, where)
        if r is None:
            continue
        ink, alpha = r[0], r[1]
        colour = ink.point(lambda v: 255 - v)
        out.paste(colour, (0, 0), alpha)
    return out


# --------------------------------------------------------------------------- IR building

BTN_SHAPES = {0: "transparent", 3: "roundrect"}
FLD_SHAPES = {0: "transparent", 2: "rectangle", 4: "shadow", 7: "scrolling"}
ALIGN = {0: "left", 1: "center", -1: "right"}
KNOWN_A = {1: 0x80 | 0x01, 2: 0x80 | 0x01}
KNOWN_B = {1: 0x8000 | 0x4000, 2: 0}


def script_obj(raw):
    if not raw:
        return None
    return {"language": "hypertalk", "text": mac(raw)}


def build_ir(st, out_dir=None):
    notes = st.notes
    write = out_dir is not None
    if write:
        os.makedirs(os.path.join(out_dir, "assets"), exist_ok=True)
    W, H = st.card_w, st.card_h
    assets = []
    flagnotes = {}
    used_icons = {}

    def font_name(fid):
        if fid in st.fonts:
            return st.fonts[fid]
        return None

    if not st.fonts:
        notes.append("no FTBL (format %d): font names unknown, style.font = null" % st.format)

    def make_object(owner_id, pt, number, content_map, is_card_owner):
        kind = "button" if pt["kind"] == 1 else ("field" if pt["kind"] == 2 else "kind-%d" % pt["kind"])
        oid = "%s/%s-%d" % (owner_id, kind, pt["id"])
        fa, fb = pt["flags_a"], pt["flags_b"]
        sn = fb & 0xFF
        shapes = BTN_SHAPES if pt["kind"] == 1 else FLD_SHAPES
        if sn in shapes:
            shape = shapes[sn]
        else:
            shape = "style-%d" % sn
            flagnotes.setdefault("unknown %s style number %d" % (kind, sn), []).append(oid)
        ua = fa & ~KNOWN_A.get(pt["kind"], 0) & 0xFF
        if pt["kind"] == 2:
            ua &= ~0x01
        ub = (fb & 0xFF00) & ~KNOWN_B.get(pt["kind"], 0)
        if ua:
            flagnotes.setdefault("%s flags A bits 0x%02X set (meaning unknown)" % (kind, ua), []).append(oid)
        if ub:
            flagnotes.setdefault("%s flags B bits 0x%04X set (meaning unknown)" % (kind, ub), []).append(oid)
        if pt["align"] not in ALIGN:
            flagnotes.setdefault("unknown alignment %d" % pt["align"], []).append(oid)
        fname = font_name(pt["font"])
        if fname is None and st.fonts:
            flagnotes.setdefault("font id %d not in FTBL" % pt["font"], []).append(oid)
        style = {"shape": shape, "font": fname, "size": pt["size_pt"],
                 "align": ALIGN.get(pt["align"], "left")}
        if pt["kind"] == 1:
            style["show_name"] = bool(fb & 0x8000)
            style["highlight"] = bool(fb & 0x4000)
            style["locked"] = False
        else:
            style["show_name"] = False
            style["highlight"] = False
            style["locked"] = bool(fa & 0x01)
        runs = []
        text = ""
        if pt["kind"] == 2:
            c = content_map.get(pt["id"])
            if c is not None:
                text = mac(c["text_raw"])
                for off, sid in c["runs"]:
                    s = st.styles.get(sid)
                    if s is None:
                        notes.append("%s: style id %d not in STBL" % (oid, sid))
                        continue
                    f = s["font"] if s["font"] != -1 else pt["font"]
                    runs.append({"start": off, "font": font_name(f), "font_id": f,
                                 "size": s["size"] if s["size"] != -1 else pt["size_pt"],
                                 "style": s["style"] if s["style"] != -1 else pt["text_style"],
                                 "style_id": sid})
        else:
            text = mac(pt["name_raw"])
        icon = None
        if pt["kind"] == 1 and pt["icon"] != 0:
            iid = pt["icon"]
            if st.rsrc and ("ICON", iid) in st.rsrc:
                icon = "assets/icon-%d.png" % iid
                used_icons[iid] = True
            else:
                other = [t for (t, r) in (st.rsrc or {}) if r == iid]
                extra_txt = (" (only %s with that id)" % ",".join(sorted(set(other)))) if other else ""
                why = "not in stack resource fork" if st.rsrc is not None else "stack has no resource fork"
                notes.append("icon %d (%s): %s%s (HyperCard application icon), not exported"
                             % (iid, oid, why, extra_txt))
        show = bool(fb & 0x8000) and pt["kind"] == 1
        extra = {"part_id": pt["id"], "flags_a": fa, "flags_b": fb, "style_number": sn,
                 "text_style": pt["text_style"], "line_height": pt["line_height"],
                 "font_id": pt["font"], "icon_id": pt["icon"],
                 "enabled": not (pt["kind"] == 1 and fa & 0x01),
                 "runs": runs, "icon_top_offset": -6 if show else 0}
        return {
            "id": oid, "kind": kind, "name": mac(pt["name_raw"]), "number": number,
            "rect": [pt["left"], pt["top"], pt["right"], pt["bottom"]],
            "visible": not (fa & 0x80),
            "style": style, "text": text, "icon": icon,
            "script": script_obj(pt["script_raw"]), "extra": extra,
        }

    # ---------- layers
    layers = []
    for bid in st.ring:
        bg = st.bkgds[bid]
        lid = "bkgnd-%d" % bid
        part_ids = {p["id"]: p for p in bg["parts"]}
        cmap = {}
        for c in bg["contents"]:
            if c["owner"] > 0 and c["owner"] in part_ids and part_ids[c["owner"]]["kind"] == 2:
                cmap[c["owner"]] = c
            else:
                notes.append("%s: content record owner %d has no matching background field, ignored"
                             % (lid, c["owner"]))
        objs = [make_object(lid, p, k + 1, cmap, False) for k, p in enumerate(bg["parts"])]
        img = "assets/%s.png" % lid
        if write:
            im = Image.new("L", (W, H), 255)
            if bg["bmap"]:
                r = picture_layers(st, bg["bmap"], lid)
                if r:
                    im.paste(r[0].point(lambda v: 255 - v), (0, 0), r[1])
            im.convert("1").save(os.path.join(out_dir, img))
        assets.append({"id": lid, "kind": "image", "file": img, "width": W, "height": H})
        layers.append({"id": lid, "name": mac(bg["name_raw"]), "image": img, "objects": objs,
                       "script": script_obj(bg["script_raw"])})

    # ---------- screens
    screens = []
    stale = 0
    for num, cid in enumerate(st.order, 1):
        cd = st.cards[cid]
        sid = "card-%d" % cid
        lid = "bkgnd-%d" % cd["bkgd"]
        bg = st.bkgds[cd["bkgd"]]
        cparts = {p["id"]: p for p in cd["parts"]}
        bparts = {p["id"]: p for p in bg["parts"]}
        cmap = {}
        layer_text = {}
        for c in cd["contents"]:
            o = c["owner"]
            if o < 0 and -o in cparts and cparts[-o]["kind"] == 2:
                cmap[-o] = c
            elif o > 0 and o in bparts and bparts[o]["kind"] == 2:
                layer_text["%s/field-%d" % (lid, o)] = mac(c["text_raw"])
            else:
                stale += 1
        objs = [make_object(sid, p, k + 1, cmap, True) for k, p in enumerate(cd["parts"])]
        img = None
        if cd["bmap"]:
            img = "assets/%s.png" % sid
            if write:
                r = picture_layers(st, cd["bmap"], sid)
                if r:
                    ink, alpha = r[0], r[1]
                    g = ink.point(lambda v: 255 - v)
                    Image.merge("RGBA", (g, g, g, alpha)).save(os.path.join(out_dir, img))
            assets.append({"id": sid, "kind": "image", "file": img, "width": W, "height": H})
        screens.append({"id": sid, "name": mac(cd["name_raw"]), "number": num, "layers": [lid],
                        "image": img, "objects": objs, "layer_text": layer_text,
                        "script": script_obj(cd["script_raw"]), "grid": None})
    if stale:
        notes.append("%d stale content records (owner part does not exist) ignored" % stale)

    # ---------- icons
    for iid in sorted(used_icons):
        f = "assets/icon-%d.png" % iid
        if write:
            d = st.rsrc[("ICON", iid)]["data"]
            bits = Image.frombytes("1", (32, 32), bytes(d[:128]).ljust(128, b"\0")).convert("L")
            black = Image.new("L", (32, 32), 0)
            Image.merge("RGBA", (black, black, black, bits)).save(os.path.join(out_dir, f))
        assets.append({"id": "icon-%d" % iid, "kind": "image", "file": f, "width": 32, "height": 32})

    # ---------- resource-fork notes
    if st.rsrc:
        types = {}
        for (t, r) in st.rsrc:
            types.setdefault(t, []).append(r)
        for t in ("icl4", "icl8", "ics4", "ics8"):
            if t in types:
                notes.append("resource fork: %d %s colour icon(s) skipped (no palette)" % (len(types[t]), t))
        for t in ("XCMD", "XFCN"):
            if t in types:
                names = [st.rsrc[(t, r)]["name"] or str(r) for r in sorted(types[t])]
                notes.append("resource fork: %s code resources present, cannot run: %s" % (t, ", ".join(names)))
        if "snd " in types:
            names = [st.rsrc[("snd ", r)]["name"] or str(r) for r in sorted(types["snd "])]
            notes.append("resource fork: snd resources not decoded: %s" % ", ".join(names))
        notes.append("resource fork types: " + ", ".join("%s(%d)" % (t, len(v)) for t, v in sorted(types.items())))

    for k, v in sorted(flagnotes.items()):
        notes.append("%s: %d part(s), e.g. %s" % (k, len(v), ", ".join(v[:3])))

    # sounds referenced by scripts
    snds = set()
    alltext = [st.script_raw] + [c["script_raw"] for c in st.cards.values()] + \
              [b["script_raw"] for b in st.bkgds.values()] + \
              [p["script_raw"] for o in list(st.cards.values()) + list(st.bkgds.values()) for p in o["parts"]]
    for s in alltext:
        for m in re.finditer(rb'(?i)\bplay\s+"([^"\r]*)"', s):
            snds.add(mac(m.group(1)))
    for s in sorted(snds):
        found = st.rsrc and any(r.get("name") and r["name"].lower() == s.lower()
                                for (t, _), r in st.rsrc.items() if t == "snd ")
        notes.append('sound "%s" played by a script: %s' % (
            s, "snd resource present but not decoded" if found else "not in the stack's resource fork"))

    name = os.path.basename(st.path)
    if name.lower().endswith(".stak"):
        name = name[:-5]
    ir = {
        "ir_version": 1,
        "program": "hypercard",
        "source": {"file": os.path.basename(st.path), "bytes": len(st.data)},
        "name": name,
        "size": {"width": W, "height": H},
        "units": "px",
        "start_screen": "card-%d" % st.stak["first_card"],
        "script": script_obj(st.script_raw),
        "layers": layers,
        "screens": screens,
        "assets": assets,
        "notes": notes,
    }
    return ir


def read(path, out_dir=None):
    """Read a .stak file and return the Legacy IR dict. Writes assets if out_dir is given."""
    return build_ir(parse_stack(path), out_dir)


def main(argv):
    if len(argv) != 3:
        print("usage: python reader.py <file.stak> <out_dir>")
        return 2
    src, out = argv[1], argv[2]
    os.makedirs(out, exist_ok=True)
    ir = read(src, out)
    with open(os.path.join(out, "ir.json"), "w", encoding="utf-8") as f:
        json.dump(ir, f, ensure_ascii=False, indent=1)
    print("%s: %d layers, %d screens, %d assets, %d notes"
          % (ir["name"], len(ir["layers"]), len(ir["screens"]), len(ir["assets"]), len(ir["notes"])))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
