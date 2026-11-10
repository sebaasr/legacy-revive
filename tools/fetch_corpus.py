"""Download HyperCard stacks from the Internet Archive and extract them from their HFS disk images.

Each Internet Archive item in the `hypercardstacks` collection ships a classic Mac HFS disk image
(`disk.img`) and an emulator screenshot of the stack's first card (`00_screenshot.png`). This script
downloads both, walks the HFS volume, and writes every HyperCard stack (file type 'STAK') to
corpus/<id>/ with its data fork, resource fork and Finder metadata.

Usage: python tools/fetch_corpus.py [ids...]   (defaults to CORPUS below)
"""
import json
import sys
import urllib.request
from pathlib import Path

import machfs

ROOT = Path(__file__).resolve().parent.parent
CORPUS_DIR = ROOT / "corpus" / "hypercard"

CORPUS = [
    "hypercard_obliquestrategies",
    "hypercard_hyper-wordle",
    "game-genie-encoder-decoder",
    "mark-twain---300-quotations",
    "hypercard_inigo_gets_out",
    "hypercard_what_is_hypercard_2",
    "fishing-animation",
    "hypercard_fantasylanguagecreat1",
    "patients-v15",
    "cthulhucard",
]


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "legacy-revive-research/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def walk(folder, path=()):
    for name, item in folder.items():
        if isinstance(item, machfs.Folder):
            yield from walk(item, path + (name,))
        else:
            yield path + (name,), item


def safe(name: bytes | str) -> str:
    if isinstance(name, bytes):
        name = name.decode("mac_roman")
    return "".join(c if c.isalnum() or c in " ._-" else "_" for c in name).strip()


def extract(item_id: str) -> dict:
    out = CORPUS_DIR / item_id
    out.mkdir(parents=True, exist_ok=True)
    meta = json.loads(fetch(f"https://archive.org/metadata/{item_id}"))
    title = meta.get("metadata", {}).get("title", item_id)

    img_path = out / "disk.img"
    if not img_path.exists():
        img_path.write_bytes(fetch(f"https://archive.org/download/{item_id}/disk.img"))
    shot = out / "reference.png"
    if not shot.exists():
        try:
            shot.write_bytes(fetch(f"https://archive.org/download/{item_id}/00_screenshot.png"))
        except Exception as e:  # some items have no screenshot
            print(f"  no screenshot: {e}")

    vol = machfs.Volume()
    vol.read(img_path.read_bytes())
    stacks = []
    for path, f in walk(vol):
        if f.type != b"STAK":
            continue
        name = safe(path[-1])
        (out / f"{name}.stak").write_bytes(f.data)
        if f.rsrc:
            (out / f"{name}.rsrc").write_bytes(f.rsrc)
        stacks.append({
            "name": path[-1] if isinstance(path[-1], str) else path[-1].decode("mac_roman"),
            "path": "/".join(p if isinstance(p, str) else p.decode("mac_roman") for p in path),
            "file": f"{name}.stak",
            "data_bytes": len(f.data),
            "rsrc_bytes": len(f.rsrc or b""),
            "creator": f.creator.decode("mac_roman"),
        })
    info = {"id": item_id, "title": title, "source": f"https://archive.org/details/{item_id}", "stacks": stacks}
    (out / "item.json").write_text(json.dumps(info, indent=2), encoding="utf-8")
    return info


if __name__ == "__main__":
    ids = sys.argv[1:] or CORPUS
    for i in ids:
        try:
            info = extract(i)
            print(f"{i}: {len(info['stacks'])} stack(s) " + ", ".join(f"{s['name']} ({s['data_bytes']} B)" for s in info["stacks"]))
        except Exception as e:
            print(f"{i}: FAILED {type(e).__name__}: {e}")
