"""Visual fidelity metric: compare a rendered screen with the reference screenshot of the original.

Classic Mac screens are 1-bit, so both images are reduced to "ink" (dark pixels). Fonts and anti-aliasing
differ between a 1987 Mac and a modern browser, so a pixel counts as matched when the other image has ink
within `tol` pixels of it.

- precision: share of the app's ink that is near ink in the reference (nothing invented)
- recall:    share of the reference's ink that is near ink in the app (nothing missing)
- ink_f1:    harmonic mean of the two (the headline score, 0..1)
- pixel_agreement: plain share of identical 1-bit pixels (inflated by white space, reported for context)

Usage: python eval/compare.py <reference.png> <rendered.png> [<side_by_side_out.png>]
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


def ink(path: Path, size=None) -> Image.Image:
    im = Image.open(path).convert("L")
    if size and im.size != size:
        im = im.crop((0, 0, *size)) if im.width >= size[0] and im.height >= size[1] else im.resize(size)
    return im.point(lambda v: 255 if v < 128 else 0, "L")  # 255 = ink


def count(im: Image.Image) -> int:
    return im.histogram()[255]


def compare(ref_path: Path, app_path: Path, tol: int = 1, out: Path | None = None) -> dict:
    ref = ink(ref_path)
    app = ink(app_path, ref.size)
    k = 2 * tol + 1
    ref_near = ref.filter(ImageFilter.MaxFilter(k))
    app_near = app.filter(ImageFilter.MaxFilter(k))
    app_ink, ref_ink = count(app), count(ref)
    precision = count(ImageChops.multiply(app, ref_near)) / app_ink if app_ink else (1.0 if not ref_ink else 0.0)
    recall = count(ImageChops.multiply(ref, app_near)) / ref_ink if ref_ink else 1.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    same = ref.width * ref.height - count(ImageChops.difference(ref, app))
    # colour-aware check for colour programs: share of pixels whose RGB values are close (max channel diff <= 48)
    ref_rgb = Image.open(ref_path).convert("RGB")
    app_rgb = Image.open(app_path).convert("RGB").crop((0, 0, *ref.size))
    diff_max = ImageChops.difference(ref_rgb, app_rgb).convert("L", (1 / 3, 1 / 3, 1 / 3, 0))
    close = sum(diff_max.histogram()[:17])  # mean channel diff <= 16
    result = {
        "ink_f1": round(f1, 4), "precision": round(precision, 4), "recall": round(recall, 4),
        "pixel_agreement": round(same / (ref.width * ref.height), 4),
        "color_match": round(close / (ref.width * ref.height), 4),
        "ref_ink": ref_ink, "app_ink": app_ink,
    }
    if out:
        # reference | app | diff (black = matched, red = missing in app, blue = extra in app)
        w, h = ref.size
        missing = ImageChops.subtract(ref, app_near)
        extra = ImageChops.subtract(app, ref_near)
        matched = ImageChops.multiply(ref, app_near)
        diff = Image.merge("RGB", [
            ImageChops.invert(ImageChops.add(matched, extra)),
            ImageChops.invert(ImageChops.add(ImageChops.add(matched, missing), extra)),
            ImageChops.invert(ImageChops.add(matched, missing)),
        ])
        sheet = Image.new("RGB", (w * 3 + 16, h), "white")
        sheet.paste(Image.open(ref_path).convert("RGB").crop((0, 0, w, h)), (0, 0))
        sheet.paste(Image.open(app_path).convert("RGB").crop((0, 0, w, h)), (w + 8, 0))
        sheet.paste(diff, (2 * w + 16, 0))
        out.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(out)
    return result


if __name__ == "__main__":
    out = Path(sys.argv[3]) if len(sys.argv) > 3 else None
    print(json.dumps(compare(Path(sys.argv[1]), Path(sys.argv[2]), out=out), indent=2))
