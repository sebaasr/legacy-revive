"""Build one HyperCard stack app: output/hypercard/<stack>/app/ (called by modern/build.py hypercard ...).

    index.html   open by double-click (no server, no build step)
    runtime/     shared Legacy Revive runtime (+ render-pixels.js, the bitmap renderer)
    engine.js    HyperCard layer (object model, message path, HyperTalk built-ins)
    app.js       boot code;  hypercard.css  page, window and dialog styles
    data.js      the IR (window.LEGACY_IR) and every image as a data URL (window.LEGACY_ASSETS)
    scripts.js   every HyperTalk script translated to JavaScript (window.HC_SCRIPTS)
    assets/      the IR's PNGs (for developers; the app itself uses the data URLs)
    MIGRATION.md / stats.json
"""
import base64
import html
import json
import re
import shutil
from collections import Counter, defaultdict
from pathlib import Path

from sounds import stack_sounds
from translator import collect_handler_names, js_str, translate_script

HERE = Path(__file__).resolve().parent
SHIMS = HERE / "shims"


def shim_catalog():
    """Library shims {lower stack name: file} and reconstructed XCMDs {lower name: (name, file)}."""
    libs, xcmds = {}, {}
    for f in sorted(SHIMS.glob("*.js")) if SHIMS.exists() else []:
        t = f.read_text(encoding="utf-8")
        for m in re.finditer(r"HC_SHIMS \|\| \{\}\)\['([^']+)'\]", t):
            libs[m.group(1).lower()] = f
        if "HC_XCMDS" in t:
            for m in re.finditer(r"^  (?:async )?(\w+)\(E, \$", t, re.M):
                xcmds[m.group(1).lower()] = (m.group(1), f)
    return libs, xcmds


def xcmd_docs():
    """{lower name: its doc comment, one line} from the reconstructed XCMDs in shims/xcmds.js."""
    f = SHIMS / "xcmds.js"
    if not f.exists():
        return {}
    t = f.read_text(encoding="utf-8")
    out = {}
    for m in re.finditer(r"/\*\*(.*?)\*/\s*\n\s*(?:async )?(\w+)\(E, \$", t, re.S):
        out[m.group(2).lower()] = " ".join(x.strip().lstrip("*").strip() for x in m.group(1).splitlines()).strip()
    return out


def shims_for(texts, externals):
    """Shim files a stack needs: libraries it `start using`, XCMD reconstructions it calls."""
    libs, xcmds = shim_catalog()
    used_libs = []
    for t in texts:
        for m in re.finditer(r'start\s+using\s+(?:stack\s+)?"([^"]+)"', t, re.I):
            n = m.group(1).lower()
            if n in libs and n not in used_libs:
                used_libs.append(n)
    used_x = sorted({e for e in externals if e.lower() in xcmds})
    files = [libs[n] for n in used_libs] + sorted({xcmds[x.lower()][1] for x in used_x})
    return used_libs, used_x, list(dict.fromkeys(files))


def script_owners(ir):
    """[(owner_js, owner_label, text)] for every non-empty script, in stack order."""
    out = []
    if ir.get("script") and ir["script"]["text"].strip():
        out.append(("H.STACK", "stack script", ir["script"]["text"]))
    for l in ir["layers"]:
        if l.get("script") and l["script"]["text"].strip():
            out.append((js_str(l["id"]), f"background {l['id']} \"{l['name']}\"", l["script"]["text"]))
        for o in l["objects"]:
            if o.get("script") and o["script"]["text"].strip():
                out.append((js_str(o["id"]), f"{o['id']} \"{o['name']}\"", o["script"]["text"]))
    for s in ir["screens"]:
        if s.get("script") and s["script"]["text"].strip():
            out.append((js_str(s["id"]), f"card {s['id']} \"{s['name']}\"", s["script"]["text"]))
        for o in s["objects"]:
            if o.get("script") and o["script"]["text"].strip():
                out.append((js_str(o["id"]), f"{o['id']} \"{o['name']}\"", o["script"]["text"]))
    return out


def build_hypercard(stack: str, root: Path, runtime_files) -> dict:
    src = root / "output" / "hypercard" / stack / "ir"
    app = root / "output" / "hypercard" / stack / "app"
    ir = json.loads((src / "ir.json").read_text(encoding="utf-8"))
    if app.exists():
        shutil.rmtree(app)
    (app / "runtime").mkdir(parents=True)
    for f in runtime_files:
        shutil.copy(root / "modern" / "runtime" / f, app / "runtime" / f)
    for f in ("engine.js", "app.js", "hypercard.css"):
        shutil.copy(HERE / f, app / f)
    if (src / "assets").exists():
        shutil.copytree(src / "assets", app / "assets")

    # ---- data.js ------------------------------------------------------------------------------
    assets = {}
    for p in sorted((src / "assets").glob("*.png")) if (src / "assets").exists() else []:
        assets["assets/" + p.name] = "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode()
    # the stack's own sampled sounds (`snd ` resources in its resource fork), as WAV data URLs
    sounds = stack_sounds(root / "corpus" / "hypercard" / stack, ir["source"]["file"])
    sound_urls = {k: "data:audio/wav;base64," + base64.b64encode(v["wav"]).decode() for k, v in sounds.items()}
    if sounds:
        (app / "sounds").mkdir()
        for v in sounds.values():
            (app / "sounds" / f"snd-{v['id']}.wav").write_bytes(v["wav"])
    (app / "data.js").write_text(
        f"// Legacy IR for {ir['name']} ({ir['source']['file']}), generated by modern/build.py. Do not edit.\n"
        "window.LEGACY_IR = " + json.dumps(ir, ensure_ascii=False, separators=(",", ":")) + ";\n"
        "window.LEGACY_ASSETS = " + json.dumps(assets, separators=(",", ":")) + ";\n"
        "window.HC_SOUNDS = " + json.dumps(sound_urls, separators=(",", ":")) + ";\n", encoding="utf-8")

    # ---- scripts.js ---------------------------------------------------------------------------
    owners = script_owners(ir)
    on_names, fn_names = collect_handler_names([t for _, _, t in owners])
    distinct = {}                 # text -> index
    users = defaultdict(list)
    for owner_js, label, text in owners:
        if text not in distinct:
            distinct[text] = len(distinct)
        users[distinct[text]].append((owner_js, label))
    tot = Counter()
    stubs = Counter()
    stub_lines = []
    externals = set()
    parts = [
        f"// HyperTalk scripts of {ir['name']} ({ir['source']['file']}), translated to JavaScript by",
        "// modern/hypercard/translator.py. Each original line is kept as a // comment above its translation.",
        "// One function per distinct script; it registers the script's handlers on the owner it is given.",
        "// API: see engine.js (H.*). Rebuilding overwrites this file (see MIGRATION.md to customise).",
        "window.HC_SCRIPTS = function (H) {",
        "'use strict';",
        "",
    ]
    calls = []
    for text, idx in distinct.items():
        js, st = translate_script(text, "owner", on_names, fn_names, ind=1)
        us = users[idx]
        shown = "; ".join(lbl for _, lbl in us[:3]) + (f"; ... ({len(us)} owners)" if len(us) > 3 else "")
        parts.append(f"// ---- script {idx}: {shown}")
        parts.append(f"function script{idx}(owner) {{")
        parts.extend(js if js else ["  // (no handlers: the script only holds comments or text)"])
        parts.append("}")
        parts.append("")
        for owner_js, label in us:
            calls.append(f"script{idx}({owner_js});  // {label}")
        tot["lines"] += st.lines
        tot["translated"] += st.translated
        tot["stubbed"] += st.stubbed
        tot["handlers"] += st.handlers
        tot["outside"] += st.outside
        externals |= st.externals
        for cmd, line in st.stub_list:
            stubs[cmd] += 1
            stub_lines.append((cmd, line))
    parts.append("// ---- attach scripts to their owners")
    parts.extend(calls)
    parts.append("};")
    (app / "scripts.js").write_text("\n".join(parts) + "\n", encoding="utf-8")

    # ---- compatibility shims (libraries missing from the corpus, reconstructed XCMDs) -----------
    used_libs, used_x, shim_files = shims_for([t for _, _, t in owners], externals)
    if shim_files:
        (app / "shims").mkdir()
        for f in shim_files:
            shutil.copy(f, app / "shims" / f.name)
    lib_funcs = {m.group(1).lower() for f in shim_files if "HC_SHIMS" in f.read_text(encoding="utf-8")
                 for m in re.finditer(r"^    (\w+)\(", f.read_text(encoding="utf-8"), re.M)}
    shim_tags = "".join(f'<script src="shims/{f.name}" charset="utf-8"></script>\n' for f in shim_files)
    # a call to a reconstructed XCMD is no longer a stub: count those lines as translated
    shimmed = {x.lower() for x in used_x}
    moved = [(c, l) for c, l in stub_lines if c.lower() in shimmed]
    if moved:
        stub_lines = [(c, l) for c, l in stub_lines if c.lower() not in shimmed]
        for c, _ in moved:
            stubs[c] -= 1
        stubs = +stubs
        tot["stubbed"] -= len(moved)
        tot["translated"] += len(moved)

    # ---- index.html ---------------------------------------------------------------------------
    title = html.escape(ir["name"])
    (app / "index.html").write_text(f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="runtime/runtime.css">
<link rel="stylesheet" href="hypercard.css">
</head>
<body>
<div id="app">
  <header>{title} &middot; {html.escape(ir['source']['file'])} &middot; HyperCard stack modernized by Legacy Revive
    &middot; click buttons, type in fields, arrow keys change cards</header>
  <div id="wrap"></div>
</div>
<script src="runtime/runtime.js" charset="utf-8"></script>
<script src="runtime/render-pixels.js" charset="utf-8"></script>
<script src="data.js" charset="utf-8"></script>
<script src="engine.js" charset="utf-8"></script>
{shim_tags}<script src="scripts.js" charset="utf-8"></script>
<script src="app.js" charset="utf-8"></script>
</body>
</html>
""", encoding="utf-8")

    # ---- stats + MIGRATION.md -----------------------------------------------------------------
    objs = [o for l in ir["layers"] for o in l["objects"]] + [o for s in ir["screens"] for o in s["objects"]]
    missing_icons = [o for o in objs if o["kind"] == "button" and o["extra"].get("icon_id") and not o.get("icon")]
    shapes = Counter((o["kind"], o["style"]["shape"]) for o in objs)
    stats = {
        "stack": stack, "name": ir["name"], "cards": len(ir["screens"]), "backgrounds": len(ir["layers"]),
        "buttons": sum(o["kind"] == "button" for o in objs), "fields": sum(o["kind"] == "field" for o in objs),
        "scripts": len(owners), "distinct_scripts": len(distinct), "handlers": tot["handlers"],
        "lines": tot["lines"], "lines_translated": tot["translated"], "lines_stubbed": tot["stubbed"],
        "lines_outside_handlers": tot["outside"],
        "stubs_by_command": dict(stubs.most_common()), "stub_lines": [f"{c}: {l}" for c, l in stub_lines],
        "undefined_handlers": sorted(e for e in externals if e not in used_x and e.lower() not in lib_funcs),
        "library_shims": used_libs, "reconstructed_xcmds": used_x,
        "unavailable_icons": [f"{o['id']} (icon {o['extra']['icon_id']})" for o in missing_icons],
        "card_size": [ir["size"]["width"], ir["size"]["height"]],
        "sounds": [f"snd {v['id']} \"{v['name']}\": {v['samples']} samples at {v['rate']:.0f} Hz (sounds/snd-{v['id']}.wav)"
                   for v in sounds.values()],
    }
    (app / "stats.json").write_text(json.dumps(stats, indent=2, ensure_ascii=False), encoding="utf-8")
    (app / "MIGRATION.md").write_text(migration_md(ir, stats, shapes), encoding="utf-8")
    return stats


def shim_md(st) -> str:
    """MIGRATION.md section on compatibility shims and reconstructed externals."""
    out = []
    if st["library_shims"]:
        out.append("")
        out.append("### Compatibility shims for missing library stacks (NOT recovered: written by hand)")
        out.append("")
        for n in st["library_shims"]:
            out.append(f"- `start using stack \"{n}\"`: that stack is not in the corpus. `shims/` re-implements the "
                       "functions the scripts call from it (see the comment at the top of the shim file for what each "
                       "does and how it was checked). The engine puts it on the message path after the stack.")
    if st["reconstructed_xcmds"]:
        out.append("")
        out.append("### Reconstructed XCMDs/XFCNs (NOT recovered: behaviour inferred from the calling scripts)")
        out.append("")
        out.append("External code resources are not in the IR. `shims/xcmds.js` re-implements these in JavaScript "
                   "from how the scripts use them; each entry documents the call sites it is based on. They run only "
                   "when no HyperTalk handler of that name exists (HyperCard tries externals last).")
        out.append("")
        docs = xcmd_docs()
        for x in st["reconstructed_xcmds"]:
            out.append(f"- `{x}`: {docs.get(x.lower(), '')}".rstrip(": "))
    return chr(10).join(out) + (chr(10) if out else "")


def migration_md(ir, st, shapes) -> str:
    pct = 100 * st["lines_translated"] / st["lines"] if st["lines"] else 100.0
    stub_cmd_rows = "\n".join(f"| `{c}` | {n} |" for c, n in st["stubs_by_command"].items()) or "| (none) | 0 |"
    sound_rows = "\n".join(f"- {x}" for x in st.get("sounds", [])) or "- (no `snd ` resources in this stack)"
    stub_rows = "\n".join(f"- `{l}`" for l in st["stub_lines"]) or "- (none)"
    ext = ", ".join(f"`{x}`" for x in st["undefined_handlers"]) or "none"
    icons = "\n".join(f"- {x}" for x in st["unavailable_icons"]) or "- (none)"
    shape_rows = "\n".join(f"| {k} | `{s}` | {n} |" for (k, s), n in sorted(shapes.items()))
    small = ir["size"]["width"] < 512 or ir["size"]["height"] < 342
    return f"""# Migration notes: {ir['name']} ({ir['source']['file']})

Generated by `python modern/build.py hypercard {st['stack']}` from `output/hypercard/{st['stack']}/ir/` (Legacy IR v1).
Open `index.html` directly (double-click). Options: `?card=N` (or a card name) starts on another card,
`?zoom=2` enlarges the window, `?aa=1` keeps anti-aliased text, `?shot=1` draws only the start card at (0,0)
after running the start-up handlers without waiting or showing dialogs (used by `eval/render.py`), and
`?shot=1&offset=x,y` puts the card window on a 512x342 desktop at that position.
{"The card is " + str(ir['size']['width']) + "x" + str(ir['size']['height']) + ", smaller than the 512x342 screen, so it is drawn at its own size." if small else ""}

## What was converted

| item | count |
|---|---|
| cards (screens) | {st['cards']} |
| backgrounds (layers) | {st['backgrounds']} |
| buttons / fields | {st['buttons']} / {st['fields']} |
| scripts (owners with a script) / distinct texts | {st['scripts']} / {st['distinct_scripts']} |
| handlers translated (`on` + `function`, distinct scripts) | {st['handlers']} |
| statement lines inside handlers | {st['lines']} |
| lines translated | {st['lines_translated']} ({pct:.1f}%) |
| lines stubbed (`H.unsupported`) | {st['lines_stubbed']} |
| lines outside handlers (banners, credits; ignored as HyperCard does) | {st['lines_outside_handlers']} |

Handlers called but defined nowhere in this stack (XCMDs/XFCNs or handlers of another stack): {ext}.
They are translated as normal calls; at run time `H.call` finds no handler and reports
`[unsupported] handler ...` in the console (counted in `rt.stubReport()`).
{shim_md(st)}
### Files
- `scripts.js`: every script, one JS function per distinct script text, each HyperTalk handler an
  `async function` registered with `H.on(owner, "mouseUp", ...)` / `H.fn(owner, "getRow", ...)`. The original
  HyperTalk line is a `//` comment above each translation.
- `engine.js`: the HyperCard layer: object model (cards, backgrounds, buttons, fields, per-card background
  field text), message path (part -> card -> background -> stack -> built-in default, `pass`, `send`),
  navigation and recent cards, chunk expressions, properties, globals, `answer`/`ask` dialogs, `find`,
  `sort`, `select`, `click at`, `play` (WebAudio notes), `speak` (speech synthesis), visual effects.
- `runtime/render-pixels.js`: draws white, the background picture, the card picture on a canvas, then
  buttons and fields as real DOM elements (fields are contenteditable, selectable, scrollable).
- `data.js`: the IR plus every PNG as a data URL; `assets/` has the same PNGs for reference.

### Part styles drawn

| kind | style | count |
|---|---|---|
{shape_rows}

`style-N` values the spec left open are drawn with HyperCard's own numbering (buttons 1 opaque,
2 rectangle, 4 shadow, 5 check box, 6 radio button, 8 standard; field 1 opaque). Flag B bit 0x2000 is
taken as auto-hilite and the low nibble of its high byte as the button family (radio groups).

### Buttons whose icon is a HyperCard application icon (not in the stack, drawn as nothing, still clickable)
{icons}

## What was stubbed

| command | lines |
|---|---|
{stub_cmd_rows}

{stub_rows}

Each stub calls `H.unsupported(cmd, line)`: logged once in the console and counted in `rt.stubReport()`.
Run-time stubs (not visible in the counts above): `play "<name>"` of a sound that is not in this stack's
resource fork (a short blip is played and `the sound` is "done" after it), `go home` / other stacks,
`start using` a stack that has no shim, and properties the engine does not know.

## Sounds
{sound_rows}
Sampled `snd ` resources of the stack are decoded at build time (`modern/hypercard/sounds.py`) into WAV
files (`sounds/`, and as data URLs in `data.js`); `play "<name>"` plays them with an `Audio` element and
`the sound` is the name until it ends.

## Known limitations
- Painting: the line, rectangle, text and eraser tools draw on the card picture (`drag`, `click at` +
  `type`, `doMenu "Clear Picture"`); brush, spray, bucket, oval and polygon tools do not. Patterns are
  black (12), white (1) or a 50% gray for every other number.
- Menus made by scripts (`create menu`, `put ... into menu ... with menuMsgs`, `enable/disable/delete menu`,
  `reset menubar`) appear in a bar above the card window; single menu items cannot be enabled/disabled.
- Files are a virtual disk in the browser's localStorage (per stack); closing a file the script wrote
  also downloads it. Printing (`open printing`, `print field`, `close printing`) opens the browser's
  print dialog. External code resources (XCMD/XFCN) cannot run: see the shims section above.
- `set script` and `do` of a string built at run time cannot be translated (no HyperTalk interpreter in
  the page).
- Classic Mac bitmap fonts are replaced by system fonts (Chicago -> bold sans-serif, Geneva -> Verdana,
  ...), thresholded to 1-bit; line breaks inside fields can differ from the original. Chicago at 24 or 36
  points is drawn as the 12-point text scaled 2x / 3x with whole pixels, as the Mac's Font Manager did.
- Visual effects are CSS approximations (dissolve = fade, wipe/scroll/iris/stretch = clip animations).
- `the environment` is "development", `the version` is "2.41".

## How to add a feature
- **New HyperTalk command**: add a `c_<command>` method to `HandlerTranslator` in
  `modern/hypercard/translator.py` that emits `H.myCommand(...)`, add `myCommand` to the `H` object built in
  `HyperCardEngine._api()` (`modern/hypercard/engine.js`), then `python modern/build.py hypercard all`.
- **New built-in function**: add it to `H.f` in `engine.js` and its name to `BUILTIN_FUNCS` (or `THE_FUNCS`
  for `the <name>`) in `translator.py`.
- **Replace an XCMD or change a handler by hand**: register your own JS after `scripts.js` in `index.html`,
  e.g. `engine.H.fn(LegacyRuntime.DOCUMENT, "bin2dec", async ($, s) => parseInt(s, 2));` -- handlers on the
  stack are found by every object through the message path.
- **New part style**: add CSS for `.lr-button[data-shape=<style>]` / `.lr-field[data-shape=<style>]` in
  `runtime/runtime.css`.
"""
