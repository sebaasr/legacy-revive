"""Translate ZZT-OOP object programs (specs/zzt/SPEC.md section 5) into plain JavaScript.

Each program becomes a small module: an object literal with the object name, a label table and one async
function per *segment*. Segment 0 is the code before the first label; every `:label` line starts a new
segment (duplicate labels get their own segments, which is how `#zap` gives successive replies).
A segment function runs its statements and then

    returns nothing   -> fall through into the next segment (labels do not stop execution)
    return z.END      -> stop, wait for a message           (#end)
    return z.GOTO     -> jump to the segment the engine stored in o.jumpTo (a message to self)
    return z.RESTART  -> jump to segment 0                    (#restart, #bind)
    return z.DIE      -> the object is gone                   (#die, #become)

All game effects are calls on the ZZT game layer `z` (modern/zzt/engine.js); `o` is the running object.
The original source is kept as `//` comments above each statement group. Lines that cannot be translated
become `z.rt.unsupported("cmd", "line")` calls and are counted.

Usage (library): translate_program(text) -> (js_source, stats)
"""
import json
import re

COMMANDS = {
    "end", "bind", "char", "play", "send", "die", "cycle", "restart", "zap", "restore", "put", "if", "take",
    "give", "change", "lock", "unlock", "become", "walk", "endgame", "shoot", "throwstar", "set", "clear",
    "go", "try", "idle",
}
NOARG_COMMANDS = {"end", "die", "restart", "lock", "unlock", "endgame", "idle"}
DIR_BASE = {"n", "s", "e", "w", "north", "south", "east", "west", "i", "idle", "seek", "flow", "rndns", "rndne", "rnd"}
DIR_MOD = {"opp", "cw", "ccw", "rndp"}
COLORS = {"blue", "green", "cyan", "red", "purple", "yellow", "white"}
COUNTERS = {"health", "score", "gems", "ammo", "torches", "energy", "points", "time"}


def js(s) -> str:
    """JS string literal."""
    return json.dumps(s, ensure_ascii=False)


def comment(line: str) -> str:
    return "// " + line.replace("\n", " ") if line.strip() else "//"


def ident(name: str) -> str:
    s = re.sub(r"[^A-Za-z0-9_]", "_", name)
    return s if s and not s[0].isdigit() else "_" + s


class Stats:
    def __init__(self):
        self.lines = 0          # executable source lines (excluding @name, blank, comments)
        self.translated = 0
        self.stubbed = 0
        self.segments = 0
        self.stub_list = []     # (cmd, line)

    def stub(self, cmd, line):
        self.stubbed += 1
        self.stub_list.append((cmd, line))


def parse_dir(words):
    """Parse a direction expression from the front of `words`. Returns (expr_string, rest) or (None, words)."""
    if not words:
        return None, words
    w = words[0].lower()
    if w in DIR_MOD:
        inner, rest = parse_dir(words[1:])
        if inner is None:
            return None, words
        return f"{w} {inner}", rest
    if w in DIR_BASE:
        return w, words[1:]
    return None, words


def parse_kind(words):
    """[color] element  ->  (color|None, element|None, rest)."""
    color = None
    if words and words[0].lower() in COLORS:
        color, words = words[0].lower(), words[1:]
    if not words:
        return color, None, words
    return color, words[0].lower().rstrip("."), words[1:]


class ProgramTranslator:
    def __init__(self, text: str):
        self.text = text
        self.lines = text.split("\r")
        if self.lines and self.lines[-1] == "":
            self.lines.pop()
        self.stats = Stats()
        self.labels = {}  # name -> [segment index]
        self.name = ""
        self.name_line = None
        for i, l in enumerate(self.lines):
            if l.strip() == "":
                continue
            if l.startswith("@"):
                self.name, self.name_line = l[1:].strip(), i
            break
        # segment boundaries
        self.segments = [{"label": None, "start": 0, "end": None, "offset": 0}]
        off = 0
        for i, l in enumerate(self.lines):
            if l.startswith(":") and i != self.name_line:
                label = (l[1:].split() or [""])[0].split("'")[0].lower()
                self.segments[-1]["end"] = i
                self.labels.setdefault(label, []).append(len(self.segments))
                self.segments.append({"label": label, "start": i + 1, "end": None, "offset": off, "line": l})
            off += len(l) + 1
        self.segments[-1]["end"] = len(self.lines)
        # byte offset where each line starts, to map a saved `ip` to a segment
        self.line_offsets = []
        off = 0
        for l in self.lines:
            self.line_offsets.append(off)
            off += len(l) + 1

    def has_label(self, name):
        return name.lower() in self.labels

    # ---- commands ---------------------------------------------------------------------------------
    def command(self, body: str, line: str, ind: str):
        """Translate a command (text after '#', or an #if action). Returns list of JS lines or None (stub)."""
        m = re.match(r"\s*([A-Za-z]+)(.*)$", body)
        if not m:
            return None
        word, rest = m.group(1).lower(), m.group(2)
        args = rest.split()
        # send shorthand: #target:label or #label
        if word not in COMMANDS or (rest.startswith(":")):
            target_label = body.strip()
            if re.fullmatch(r"[A-Za-z0-9_]+(:[A-Za-z0-9_]+)?", target_label):
                return self.send(target_label, ind)
            return None
        if word == "end":
            return [f"{ind}return z.END;"]
        if word == "restart":
            return [f"{ind}return z.RESTART;"]
        if word == "die":
            return [f"{ind}return z.die(o);"]
        if word == "endgame":
            return [f"{ind}z.endgame(o);"]
        if word in ("lock", "unlock"):
            return [f"{ind}o.locked = {str(word == 'lock').lower()};"]
        if word == "idle":
            return [f"{ind}await z.idle(o);"]
        if word == "char":
            if args and args[0].isdigit():
                return [f"{ind}z.setChar(o, {int(args[0])});"]
            return None
        if word == "cycle":
            if args and args[0].isdigit():
                return [f"{ind}o.cycle = {max(1, int(args[0]))};"]
            return None
        if word == "bind":
            if args:
                return [f"{ind}return z.bind(o, {js(args[0])});"]
            return None
        if word == "play":
            return [f"{ind}z.play({js(rest.strip())});"]
        if word == "send":
            if args:
                return self.send(args[0], ind)
            return None
        if word in ("zap", "restore"):
            if args:
                return [f"{ind}z.{word}(o, {js(args[0])});"]
            return None
        if word in ("set", "clear"):
            if args:
                return [f"{ind}z.rt.{'setFlag' if word == 'set' else 'clearFlag'}({js(args[0].lower())});"]
            return None
        if word in ("give", "take"):
            if len(args) >= 2 and args[1].lstrip("-").isdigit():
                counter, n = args[0].lower(), int(args[1])
                if word == "give":
                    return [f"{ind}z.give({js(counter)}, {n});"]
                if len(args) >= 3:
                    rest_cmd = " ".join(args[2:])
                    act = self.action(rest_cmd, line, ind + "  ")
                    if act is None:
                        return None
                    return [f"{ind}if (!z.take({js(counter)}, {n})) {{"] + act + [f"{ind}}}"]
                return [f"{ind}z.take({js(counter)}, {n});"]
            return None
        if word in ("go", "walk", "shoot", "throwstar"):
            d, extra = parse_dir(args)
            if d is None or extra:
                return None
            if word == "go":
                return [f"{ind}await z.step(o, {js(d)});"]
            if word == "walk":
                return [f"{ind}z.walk(o, {js(d)});"]
            return [f"{ind}z.shoot(o, {js(d)}, {str(word == 'throwstar').lower()});"]
        if word == "try":
            d, extra = parse_dir(args)
            if d is None:
                return None
            if not extra:
                return [f"{ind}await z.tryStep(o, {js(d)});"]
            act = self.action(" ".join(extra), line, ind + "  ")
            if act is None:
                return None
            return [f"{ind}if (!(await z.tryStep(o, {js(d)}))) {{"] + act + [f"{ind}}}"]
        if word == "put":
            d, extra = parse_dir(args)
            color, el, extra = parse_kind(extra)
            if d is None or el is None or extra:
                return None
            return [f"{ind}z.put(o, {js(d)}, {js(color)}, {js(el)});"]
        if word == "become":
            color, el, extra = parse_kind(args)
            if el is None or extra:
                return None
            return [f"{ind}return z.become(o, {js(color)}, {js(el)});"]
        if word == "change":
            c1, e1, extra = parse_kind(args)
            c2, e2, extra = parse_kind(extra)
            if e1 is None or e2 is None or extra:
                return None
            return [f"{ind}z.change({js(c1)}, {js(e1)}, {js(c2)}, {js(e2)});"]
        if word == "if":
            return self.if_command(args, line, ind)
        return None

    def send(self, target_label: str, ind: str):
        if ":" in target_label:
            target, label = target_label.split(":", 1)
        else:
            target, label = "self", target_label
        return [f"{ind}if (await z.send(o, {js(target.lower())}, {js(label.lower())})) return z.GOTO;"]

    def action(self, text: str, line: str, ind: str):
        """An #if/#take/#try action: one word = label (or a no-arg command), else a command."""
        words = text.split()
        if not words:
            return None
        if len(words) == 1:
            w = words[0]
            if w.lower() in NOARG_COMMANDS and not self.has_label(w):
                return self.command(w, line, ind)
            if w.startswith("#"):
                return self.command(w[1:], line, ind)
            if re.fullmatch(r"[A-Za-z0-9_]+(:[A-Za-z0-9_]+)?", w):
                return self.send(w, ind)
            return None
        t = text.strip()
        return self.command(t[1:] if t.startswith("#") else t, line, ind)

    def condition(self, words):
        """Returns (js_expr, rest) or (None, words)."""
        if not words:
            return None, words
        w = words[0].lower()
        if w == "not":
            c, rest = self.condition(words[1:])
            return (f"!({c})", rest) if c else (None, words)
        if w in ("contact", "alligned", "aligned", "energized"):
            return f"z.test(o, {js('aligned' if w == 'alligned' else w)})", words[1:]
        if w == "blocked":
            d, rest = parse_dir(words[1:])
            if d is None:
                return None, words
            return f"z.blocked(o, {js(d)})", rest
        if w == "any":
            color, el, rest = parse_kind(words[1:])
            if el is None:
                return None, words
            return f"z.any({js(color)}, {js(el)})", rest
        if re.fullmatch(r"[A-Za-z0-9_]+", w):
            return f"z.rt.hasFlag({js(w)})", words[1:]
        return None, words

    def if_command(self, args, line, ind):
        cond, rest = self.condition(args)
        if cond is None:
            return None
        while rest and rest[0].lower() == "then":   # `then` is optional; `then then` occurs
            rest = rest[1:]
        if not rest:
            return None
        act = self.action(" ".join(rest), line, ind + "  ")
        if act is None:
            return None
        return [f"{ind}if ({cond}) {{"] + act + [f"{ind}}}"]

    # ---- movement ---------------------------------------------------------------------------------
    def movement(self, line: str, ind: str):
        out = []
        toks = re.findall(r"([/?])([^/?]*)", line.strip())
        for i, (kind, word) in enumerate(toks):
            word = word.strip()
            if not word:
                continue  # stray trailing '/'
            d, extra = parse_dir(word.split())
            if d is None or extra:
                return None
            if d in ("i", "idle"):
                out.append(f"{ind}await z.idle(o);")
            elif kind == "/":
                out.append(f"{ind}await z.step(o, {js(d)});")
            else:
                out.append(f"{ind}await z.tryStep(o, {js(d)});")
        return out

    # ---- text -------------------------------------------------------------------------------------
    def text_group(self, group, ind):
        items = []
        for l in group:
            if l.startswith("!") and ";" in l:
                label, txt = l[1:].split(";", 1)
                items.append({"choice": label.strip().lower(), "text": txt})
            elif l.startswith("$"):
                items.append({"text": l[1:], "align": "center"})
            else:
                items.append(l)
        while items and items[-1] == "":
            items.pop()
        has_choice = any(isinstance(x, dict) and "choice" in x for x in items)
        arr = "[" + ", ".join(js(x) for x in items) + "]"
        if has_choice:
            return [f"{ind}if (await z.say(o, {arr})) return z.GOTO;"]
        return [f"{ind}await z.say(o, {arr});"]

    # ---- segments ---------------------------------------------------------------------------------
    def segment(self, seg):
        out = []
        ind = "    "
        lines = self.lines[seg["start"]:seg["end"]]
        i = 0
        while i < len(lines):
            l = lines[i]
            idx = seg["start"] + i
            first = l[:1]
            if idx == self.name_line or (first == "@"):
                out.append(ind + comment(l))
                i += 1
                continue
            if first == "'":
                out.append(ind + comment(l))
                i += 1
                continue
            if first == "#":
                self.stats.lines += 1
                code = self.command(l[1:].rstrip(), l, ind) if l[1:].strip() else None
                out.append(ind + comment(l))
                if code is None:
                    word = (re.match(r"#\s*([A-Za-z]*)", l).group(1) or "#").lower()
                    self.stats.stub(word, l)
                    out.append(f"{ind}z.rt.unsupported({js('#' + word)}, {js(l)});")
                else:
                    self.stats.translated += 1
                    out += code
                i += 1
                continue
            if first in "/?":
                self.stats.lines += 1
                code = self.movement(l, ind)
                out.append(ind + comment(l))
                if code is None:
                    self.stats.stub("move", l)
                    out.append(f"{ind}z.rt.unsupported(\"move\", {js(l)});")
                else:
                    self.stats.translated += 1
                    out += code
                i += 1
                continue
            if l.strip() == "":
                # blank lines only matter inside a text group
                i += 1
                continue
            # text group: text, $, ! and blank lines until a command/label/movement line
            group = []
            j = i
            while j < len(lines):
                t = lines[j]
                if t[:1] in ("#", "/", "?", ":", "'", "@"):
                    break
                group.append(t)
                j += 1
            n = sum(1 for t in group if t.strip())
            self.stats.lines += n
            self.stats.translated += n
            for t in group:
                out.append(ind + comment(t))
            out += self.text_group(group, ind)
            i = j
        return out

    def translate(self, var: str) -> str:
        """JS source assigning the program module to `var`."""
        bind = None
        for l in self.lines:   # a program whose first statement is `#bind name` reuses that program
            if not l.strip() or l.startswith(("@", "'")):
                continue
            m = re.match(r"#bind\s+(\S+)", l.strip(), re.I)
            bind = m.group(1).lower() if m else None
            break
        parts = [f"{var} = {{", f"  name: {js(self.name)},", f"  bind: {js(bind)},",
                 "  labels: {" + ", ".join(f"{js(k)}: {v}" for k, v in self.labels.items()) + "},",
                 f"  offsets: {[s['offset'] for s in self.segments]},",
                 "  segments: ["]
        used = {}
        for n, seg in enumerate(self.segments):
            base = "start" if seg["label"] is None else "on_" + ident(seg["label"])
            used[base] = used.get(base, 0) + 1
            fname = base if used[base] == 1 else f"{base}_{used[base]}"
            body = self.segment(seg)
            self.stats.segments += 1
            head = []
            if seg["label"] is not None:
                head.append("    " + comment(seg["line"]))
            parts.append(f"  async function {fname}(o, z) {{")
            parts += head + body
            parts.append("  },")
        parts.append("  ],")
        parts.append("};")
        return "\n".join(parts)


def translate_program(text: str, var: str):
    t = ProgramTranslator(text)
    src = t.translate(var)
    return src, t.stats


if __name__ == "__main__":
    import sys
    demo = sys.stdin.read().replace("\n", "\r") if not sys.stdin.isatty() else (
        "@Manager\r#end\r:talk\rHi Jason!\r\r$Hello Mr. Roberts.\r#zap talk\r#end\r:talk\r#play T-DEGACBEFD\rGo away!\r#end\r")
    src, st = translate_program(demo, "P[0]")
    print(src)
    print(f"// lines {st.lines} translated {st.translated} stubbed {st.stubbed}", st.stub_list)
