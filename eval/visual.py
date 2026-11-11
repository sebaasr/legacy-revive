"""Visual fidelity pass for one target: render every app that has a reference and compare.

Renders one app at a time (one headless Chrome at a time) and writes eval/<target>/visual.json plus
eval/<target>/<sample>/app.png and side.png.

Usage: python eval/visual.py hypercard|zzt
"""
import json
import sys
import tempfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from compare import compare  # noqa: E402
from render import render  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
HC_OFFSETS = {
    "hypercard_fantasylanguagecreat1": "offset=48,51",
    "hypercard_what_is_hypercard_2": "offset=16,40",
    "mark-twain---300-quotations": "offset=144,40",
}
ZZT_REF = {  # output world -> corpus folder (title board of that file)
    "crimring-crimring": "crimring", "dammak-dammak": "dammak", "kingl2-kingl2": "kingl2",
    "lostmonk-lostmonk": "lostmonk", "pyramid-pyramid": "pyramid", "zzttoxic-toxic": "zzttoxic",
}


def crop_compare(ref: Path, app: Path, top: int) -> dict:
    with tempfile.TemporaryDirectory() as d:
        r, a = Path(d) / "r.png", Path(d) / "a.png"
        im = Image.open(ref)
        Image.open(ref).crop((0, top, im.width, im.height)).save(r)
        Image.open(app).convert("RGB").crop((0, top, im.width, im.height)).save(a)
        return compare(r, a)


def main(target: str) -> None:
    out = {}
    samples = sorted(p.name for p in (ROOT / "output" / target).iterdir() if (p / "app" / "index.html").exists())
    for s in samples:
        if target == "hypercard":
            ref = ROOT / "corpus" / "hypercard" / s / "reference.png"
            size, extra = (512, 342), HC_OFFSETS.get(s, "")
        else:
            folder = ZZT_REF.get(s)
            ref = ROOT / "corpus" / "zzt" / folder / "reference.png" if folder else None
            size, extra = (480, 350), ""
        if not ref or not ref.exists():
            out[s] = {"reference": None}
            print(s, "no reference")
            continue
        d = ROOT / "eval" / target / s
        app = render(ROOT / "output" / target / s / "app", d / "app.png", *size, extra)
        r = compare(ref, app, out=d / "side.png")
        r["render_options"] = extra or None
        if s == "hypercard_obliquestrategies":
            r["without_menubar"] = crop_compare(ref, app, 20)
        out[s] = r
        print(s, json.dumps({k: r[k] for k in ("ink_f1", "precision", "recall", "color_match")}))
    (ROOT / "eval" / target / "visual.json").write_text(json.dumps(out, indent=2))


if __name__ == "__main__":
    main(sys.argv[1])
