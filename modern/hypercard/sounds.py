"""Sampled `snd ` resources -> WAV, so `play "<name>"` can play a stack's own sounds in the browser.

The resource fork container is read with the clean-room reader (`recovered/hypercard/reader.py`,
SPEC 4.8). The `snd ` layout below was worked out on Fishing's `snd ` 16621 "MJW" (110122 bytes),
the only sound in the corpus; it is decoded only when every field checks out, otherwise the app keeps
the placeholder blip:

    format 1:  u16 1, u16 modifier count, modifiers (u16 synth, u32 init) ...
    format 2:  u16 2, u16 reference count
    then:      u16 command count, commands of 8 bytes (u16 cmd, i16 param1, i32 param2)
               cmd 0x8051 (buffer, 0x8000 = param2 is an offset in this resource) -> sound header
    header:    u32 sample pointer (0), u32 sample count, u32 sample rate (16.16 fixed),
               u32 loop start, u32 loop end, u8 encoding (0 = plain 8-bit), u8 base note,
               then the samples: 8-bit unsigned, mono
    MJW:       format 1, 1 modifier (synth 5), 1 command 0x8051 -> header at 20: 110080 samples,
               rate 0x56220000 = 22050 Hz, encoding 0; 20 + 22 + 110080 = 110122 = resource length.
"""
from __future__ import annotations

import importlib.util
import io
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _reader():
    spec = importlib.util.spec_from_file_location("hc_reader", ROOT / "recovered" / "hypercard" / "reader.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def decode_snd(d: bytes):
    """-> (rate, 8-bit unsigned mono samples) or None when the resource is not a plain sampled sound."""
    if len(d) < 4:
        return None
    fmt = struct.unpack_from(">H", d, 0)[0]
    if fmt == 1:
        nmod = struct.unpack_from(">H", d, 2)[0]
        p = 4 + 6 * nmod
    elif fmt == 2:
        p = 4
    else:
        return None
    if p + 2 > len(d):
        return None
    ncmd = struct.unpack_from(">H", d, p)[0]
    p += 2
    for k in range(ncmd):
        if p + 8 * k + 8 > len(d):
            return None
        cmd, _p1, p2 = struct.unpack_from(">HhI", d, p + 8 * k)
        if cmd & 0x7FFF not in (0x51, 0x50):            # bufferCmd / soundCmd
            continue
        h = p2 if cmd & 0x8000 else None
        if h is None or h + 22 > len(d):
            return None
        _ptr, n, rate_fx, _ls, _le, enc, _base = struct.unpack_from(">IIIIIBB", d, h)
        rate = rate_fx / 65536.0
        if enc != 0 or not (1000 <= rate <= 65536) or h + 22 + n > len(d):
            return None
        return rate, d[h + 22:h + 22 + n]
    return None


def to_wav(rate: float, samples: bytes) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(1)                                  # WAV 8-bit is unsigned, like the Mac samples
        w.setframerate(int(round(rate)))
        w.writeframes(samples)
    return buf.getvalue()


def stack_sounds(corpus_dir: Path, stack_file: str) -> dict:
    """{lower name: {"name", "id", "rate", "samples", "wav"}} for every decodable `snd ` of the stack."""
    rsrc = corpus_dir / (Path(stack_file).stem + ".rsrc")
    if not rsrc.exists():
        cands = sorted(corpus_dir.glob("*.rsrc"))
        if len(cands) != 1:
            return {}
        rsrc = cands[0]
    out = {}
    for (typ, rid), r in _reader().read_rsrc(rsrc).items():
        if typ != "snd ":
            continue
        dec = decode_snd(r["data"])
        if not dec:
            continue
        rate, s = dec
        key = (r["name"] or str(rid)).lower()
        out[key] = {"name": r["name"] or str(rid), "id": rid, "rate": rate, "samples": len(s), "wav": to_wav(rate, s)}
    return out
