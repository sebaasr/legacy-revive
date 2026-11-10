"""Download community-made ZZT worlds from the Museum of ZZT (museumofzzt.com).

Only third-party worlds are used. Epic's own ZZT distribution (ZZT.EXE and the bundled worlds) is
excluded because its license forbids reverse engineering it. For each world this writes
corpus/zzt/<name>/ with the .ZZT files from the zip, the Museum's title-screen image as reference.png,
and item.json.

Usage: python tools/fetch_zzt.py
"""
import io
import json
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "corpus" / "zzt"
UA = {"User-Agent": "legacy-revive-research/1.0"}

# (search title, zip filename) for community worlds released 1991-1992
WORLDS = [
    ("Smiley Guy", "zzttoxic.zip"),
    ("The Lost Monkeys", "lostmonk.zip"),
    ("The Lost Pyramid", "pyramid.zip"),
    ("Realm of Dammak", "dammak.zip"),
    ("Castle of King Lucius", "kingl2.zip"),
    ("Crime Ring", "crimring.zip"),
]


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def find(title: str, filename: str) -> dict:
    q = urllib.parse.urlencode({"title": title})
    for f in json.loads(get(f"https://museumofzzt.com/api/v1/search/files/?{q}"))["data"]["results"]:
        if f["filename"].lower() == filename.lower():
            return f
    raise LookupError(filename)


if __name__ == "__main__":
    for title, filename in WORLDS:
        f = find(title, filename)
        if "Official" in f["genres"]:
            print(f"skip {filename}: official Epic release")
            continue
        dest = OUT / Path(filename).stem.lower()
        dest.mkdir(parents=True, exist_ok=True)
        z = zipfile.ZipFile(io.BytesIO(get(f"https://museumofzzt.com/zgames/{f['letter']}/{filename}")))
        worlds = []
        for info in z.infolist():
            if info.filename.upper().endswith(".ZZT"):
                name = Path(info.filename).name
                (dest / name).write_bytes(z.read(info))
                worlds.append({"file": name, "bytes": info.file_size})
        if f.get("screenshot"):
            (dest / "reference.png").write_bytes(get(f"https://museumofzzt.com/static/{f['screenshot']}"))
        item = {"title": f["title"], "author": f["author"], "release_date": f["release_date"],
                "source": f"https://museumofzzt.com/file/view/{Path(filename).stem}/",
                "reference": "Museum of ZZT title-screen render", "worlds": worlds}
        (dest / "item.json").write_text(json.dumps(item, indent=2), encoding="utf-8")
        print(f"{filename}: {f['title']} by {', '.join(f['author'])} -> {[w['file'] for w in worlds]}")
