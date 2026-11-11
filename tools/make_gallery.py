"""Build index.html at the project root: every recovered program, original vs modernized, with links.

Reads corpus/<target>/*/item.json, eval/<target>/results.json and the eval screenshots. Opens offline.
Usage: python tools/make_gallery.py
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

TARGETS = {
    "hypercard": ("HyperCard", "Apple, 1987–2004 · card stacks scripted in HyperTalk", "HyperTalk"),
    "zzt": ("ZZT", "Epic MegaGames, 1991 · MS-DOS text-mode worlds scripted in ZZT-OOP", "ZZT-OOP"),
}


def load(p: Path, default):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def corpus_folder(target: str, sample: str) -> Path:
    """output/zzt/<folder>-<stem> -> corpus/zzt/<folder>; hypercard uses the same name."""
    if target == "zzt":
        return ROOT / "corpus" / "zzt" / sample.split("-")[0]
    return ROOT / "corpus" / "hypercard" / sample


def card(target: str, sample: str, r: dict) -> str:
    folder = corpus_folder(target, sample)
    item = load(folder / "item.json", {})
    title = item.get("title") or sample
    ref = folder / "reference.png"
    shot = ROOT / "eval" / target / sample / "app.png"
    app = ROOT / "output" / target / sample / "app" / "index.html"
    rel = lambda p: p.relative_to(ROOT).as_posix()
    imgs = ""
    if ref.exists():
        imgs += f'<figure><img src="{rel(ref)}" alt="Original {html.escape(title)}"><figcaption>Original (emulator)</figcaption></figure>'
    if shot.exists():
        imgs += f'<figure><img src="{rel(shot)}" alt="Modernized {html.escape(title)}"><figcaption>Modernized (browser)</figcaption></figure>'
    beh = r.get("behavioral") or {}
    beh_txt = f"{beh.get('pass', '?')}/{beh.get('total', '?')}" if isinstance(beh, dict) else str(beh)
    m = r.get("maintainability") or {}
    lines_txt = f"{m.get('lines_translated', '?')}/{m.get('lines', '?')}"
    vis = r.get("visual") or {}
    vis_val = (vis.get("color_match") if target == "zzt" else vis.get("ink_f1")) if isinstance(vis, dict) else vis
    vis_txt = f"{vis_val:.3f}" if isinstance(vis_val, (int, float)) else "n/a"
    src = item.get("source", "")
    return f"""<article>
  <h3>{html.escape(title)}</h3>
  <div class="pair">{imgs or '<p class="muted">No reference screenshot for this file.</p>'}</div>
  <dl><div><dt>Visual</dt><dd>{vis_txt}</dd></div><div><dt>Scenarios</dt><dd>{beh_txt}</dd></div>
      <div><dt>Script lines translated</dt><dd>{lines_txt}</dd></div></dl>
  <p class="links"><a href="{rel(app)}">Open modernized app</a> · <a href="{rel(app.parent / 'MIGRATION.md')}">MIGRATION.md</a>{f' · <a href="{html.escape(src)}">Source archive</a>' if src else ''}</p>
</article>"""


def main():
    sections = []
    for target, (name, blurb, lang) in TARGETS.items():
        results = load(ROOT / "eval" / target / "results.json", {})
        samples = results.get("samples", results) if isinstance(results, dict) else {}
        if isinstance(samples, list):
            samples = {s.get("sample", s.get("name")): s for s in samples}
        apps = sorted(p.parent.parent.name for p in (ROOT / "output" / target).glob("*/app/index.html"))
        cards = "\n".join(card(target, s, samples.get(s, {})) for s in apps)
        sections.append(f'<section><h2>{name}</h2><p class="muted">{blurb}. {len(apps)} programs recovered and modernized; {lang} translated to JavaScript.</p><div class="grid">{cards}</div></section>')
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Legacy Revive</title>
<style>
:root {{ --bg:#fff; --fg:#111; --muted:#666; --line:#ddd; --accent:#0a58ca; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#111; --fg:#eee; --muted:#aaa; --line:#333; --accent:#7ab0ff; }} }}
body {{ margin:0; background:var(--bg); color:var(--fg); font:15px/1.5 system-ui, sans-serif; }}
main {{ max-width:1200px; margin:0 auto; padding:24px 16px 64px; }}
h1 {{ margin:0 0 4px; }} h2 {{ margin-top:40px; border-bottom:1px solid var(--line); padding-bottom:4px; }}
h3 {{ margin:0 0 8px; font-size:16px; }}
.muted {{ color:var(--muted); }}
.grid {{ display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 520px), 1fr)); gap:16px; }}
article {{ border:1px solid var(--line); border-radius:8px; padding:12px; }}
.pair {{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }}
figure {{ margin:0; }} img {{ width:100%; image-rendering:pixelated; border:1px solid var(--line); display:block; }}
figcaption {{ font-size:12px; color:var(--muted); }}
dl {{ display:flex; gap:20px; margin:10px 0 4px; }} dt {{ font-size:12px; color:var(--muted); }} dd {{ margin:0; font-weight:600; }}
a {{ color:var(--accent); }}
</style></head>
<body><main>
<h1>Legacy Revive</h1>
<p class="muted">A multi-agent pipeline that reverse engineers abandoned software from its files alone, writes a specification,
rebuilds a reader from that specification in a clean room, and turns each program into a maintainable web app.
Each card shows the original (screenshot from an emulator) next to the modernized version rendered in a browser.</p>
{''.join(sections)}
</main></body></html>
"""
    (ROOT / "index.html").write_text(page, encoding="utf-8")
    print(ROOT / "index.html")


if __name__ == "__main__":
    main()
