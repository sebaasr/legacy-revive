"""HyperTalk -> JavaScript translator (Legacy Revive, HyperCard target).

Input: the text of one HyperCard script (stack, background, card or part). Output: JavaScript that
registers one async function per handler on its owner through the HyperCard engine API `H`
(modern/hypercard/engine.js), e.g.

    // on mouseUp
    H.on(owner, "mouseUp", async function mouseUp($) {
      // go next card
      await H.go($, {rel: "next"});
    });

Every original line is kept as a `//` comment above its translation. Anything that cannot be
translated becomes `H.unsupported("<command>", "<original line>")` and is counted.

Structure:
  * `logical_lines()`  strips `--` comments, joins `¬` continuations, splits into handlers.
  * `tokenize()`       a real tokenizer (strings, numbers, words, operators).
  * `ExprParser`       recursive-descent expression parser (HyperTalk precedence), producing JS.
  * `HandlerTranslator` statement/block parser (if/else chains, repeat, commands) producing JS.

The generated code only calls `H.*` (see engine.js); values are HyperTalk-style strings/numbers.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

# --------------------------------------------------------------------------------------------------
# Lexical layer
# --------------------------------------------------------------------------------------------------

OPS = ["&&", "<>", "<=", ">=", "&", "=", "<", ">", "≠", "≤", "≥", "+", "-", "*", "/", "^", "(", ")", ","]
OP_NORM = {"≠": "<>", "≤": "<=", "≥": ">="}


@dataclass
class Tok:
    kind: str          # 'str' | 'num' | 'word' | 'op'
    val: str
    pos: int

    @property
    def low(self):
        return self.val.lower() if self.kind == "word" else None


def tokenize(line: str) -> list[Tok]:
    toks, i, n = [], 0, len(line)
    while i < n:
        c = line[i]
        if c.isspace():
            i += 1
            continue
        if c == '"':
            j = line.find('"', i + 1)
            if j < 0:
                j = n
            toks.append(Tok("str", line[i + 1:j], i))
            i = j + 1
            continue
        if c.isdigit() or (c == "." and i + 1 < n and line[i + 1].isdigit()):
            m = re.match(r"\d*\.?\d+(?:[eE][+-]?\d+)?|\d+\.", line[i:])
            toks.append(Tok("num", m.group(0), i))
            i += len(m.group(0))
            continue
        if c.isalpha() or c == "_":
            j = i
            while j < n and (line[j].isalnum() or line[j] == "_"):
                j += 1
            toks.append(Tok("word", line[i:j], i))
            i = j
            continue
        for op in OPS:
            if line.startswith(op, i):
                toks.append(Tok("op", OP_NORM.get(op, op), i))
                i += len(op)
                break
        else:
            toks.append(Tok("op", c, i))   # stray character (#, :, ; ...)
            i += 1
    return toks


def strip_comment(line: str) -> str:
    inq = False
    for i, c in enumerate(line):
        if c == '"':
            inq = not inq
        elif not inq and line.startswith("--", i):
            return line[:i]
    return line


@dataclass
class LLine:
    text: str            # code (comment removed, continuations joined)
    orig: str            # original physical line(s), for the // comment
    toks: list = field(default_factory=list)


def logical_lines(script: str) -> list[LLine]:
    phys = script.replace("\r\n", "\r").replace("\n", "\r").split("\r")
    out, i = [], 0
    while i < len(phys):
        code = strip_comment(phys[i])
        origs = [phys[i].rstrip()]
        while code.rstrip().endswith("¬") and i + 1 < len(phys):
            i += 1
            code = code.rstrip()[:-1] + " " + strip_comment(phys[i])
            origs.append(phys[i].strip())
        i += 1
        if code.strip():
            out.append(LLine(code.strip(), " ".join(o.strip() for o in origs), tokenize(code.strip())))
    return out


@dataclass
class Handler:
    kind: str            # 'on' | 'function'
    name: str
    params: list
    lines: list          # LLine body
    header: LLine
    footer: LLine | None


def split_handlers(script: str):
    """-> (handlers, outside_line_count). Text outside on/function ... end blocks is ignored."""
    hs, outside = [], 0
    lines = logical_lines(script)
    i = 0
    while i < len(lines):
        t = lines[i].toks
        if len(t) >= 2 and t[0].low in ("on", "function") and t[1].kind == "word":
            name = t[1].val
            params = [x.val for x in t[2:] if x.kind == "word"]
            body, j, footer = [], i + 1, None
            while j < len(lines):
                tj = lines[j].toks
                if len(tj) >= 2 and tj[0].low == "end" and tj[1].low == name.lower():
                    footer = lines[j]
                    break
                if len(tj) >= 2 and tj[0].low in ("on", "function") and tj[1].kind == "word" and j > i:
                    # a new handler starts without `end` for the previous one
                    break
                body.append(lines[j])
                j += 1
            hs.append(Handler(t[0].low, name, params, body, lines[i], footer))
            i = j + 1 if footer else j
        else:
            outside += 1
            i += 1
    return hs, outside


# --------------------------------------------------------------------------------------------------
# Vocabulary
# --------------------------------------------------------------------------------------------------

JS_RESERVED = set("""break case catch class const continue debugger default delete do else enum export extends
false finally for function if import in instanceof new null return super switch this throw true try typeof var
void while with yield let static implements interface package private protected public await async arguments
eval undefined NaN Infinity H $ Math String Number Object Array window document""".split())

CHUNK_WORDS = {"char": "char", "chars": "char", "character": "char", "characters": "char",
               "word": "word", "words": "word", "item": "item", "items": "item", "line": "line", "lines": "line"}
ORDINALS = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6, "seventh": 7,
            "eighth": 8, "ninth": 9, "tenth": 10, "last": "last", "any": "any", "middle": "middle",
            "mid": "middle"}
CONSTANTS = {"empty": '""', "return": '"\\n"', "cr": None, "linefeed": '"\\n"', "quote": '"\\""',
             "space": '" "', "tab": '"\\t"', "comma": '","', "colon": '":"', "formfeed": '"\\f"',
             "true": "true", "false": "false", "zero": "0", "one": "1", "two": "2", "three": "3",
             "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
             "pi": "Math.PI", "up": '"up"', "down": '"down"', "enter": None}
# words that end an expression (never unquoted literals)
STOP_WORDS = {"into", "after", "before", "then", "else", "of", "to", "from", "by", "with", "and", "or",
              "is", "contains", "div", "mod", "times", "in", "at", "for", "without", "down", "until",
              "while", "end", "not", "there"}

BUILTIN_FUNCS = {n.lower(): n for n in """abs annuity atan average charToNum compound cos exp exp1 exp2 length ln ln1
log2 max min numToChar offset param paramCount params random round sin sqrt sum tan trunc value""".split()}
THE_FUNCS = {n.lower(): n for n in """date time seconds secs ticks clickLoc clickH clickV clickChunk clickLine
clickText mouse mouseClick mouseLoc mouseH mouseV optionKey shiftKey commandKey cmdKey capsLockKey sound result
version foundChunk foundText foundLine foundField selectedLine selectedText selectedChunk selectedField
selection userLevel textHeight textFont textSize textStyle textAlign stacks environment target lockScreen
lockMessages cursor screenRect systemVersion tool diskSpace heapSpace stackSpace menus windows paramCount params
editBkgnd language numberFormat powerKeys userModify lineSize pattern filled centered grid
multiple dragSpeed blindTyping traceDelay messageWatcher variableWatcher scriptEditor longWindowTitles
address""".split()}
PROPS = {n.lower(): n for n in """name id number visible hilite highlight hilight rect rectangle loc location left
top right bottom width height topLeft botRight bottomRight textStyle textFont textSize textHeight textAlign
style lockText enabled icon script showName autoHilite scroll freeSize size cantDelete cantModify family
showLines wideMargins autoTab dontWrap sharedText sharedHilite owner marked showPict dontSearch
lockMessages userLevel cursor lockScreen""".split()}
GLOBAL_PROPS = {n.lower(): n for n in """cursor lockScreen lockMessages lockRecent userLevel editBkgnd lineSize
pattern filled centered grid multiple textFont textSize textHeight textAlign textStyle dragSpeed blindTyping
powerKeys userModify numberFormat language traceDelay messageWatcher variableWatcher scriptEditor
longWindowTitles brush polySides multiSpace""".split()}

OBJ_START = {"card", "cd", "background", "bkgnd", "bg", "field", "fld", "button", "btn", "me", "target",
             "this", "msg", "message", "stack", "next", "prev", "previous", "fields", "flds", "buttons",
             "btns", "cards", "cds", "window", "hypercard", "home", "titlebar", "menubar", "picture", "pict"}
PART_WORDS = {"field": "field", "fld": "field", "fields": "field", "flds": "field",
              "button": "button", "btn": "button", "buttons": "button", "btns": "button"}
LAYER_WORDS = {"card": "card", "cd": "card", "background": "bg", "bkgnd": "bg", "bg": "bg"}

COMMANDS = set("""put get set go repeat if exit pass return global answer ask send do show hide visual lock
unlock play wait beep add subtract multiply divide delete choose select type click drag doMenu find sort
push pop open close read write print reset create enable disable start stop speak flash next edit
palette picture convert mark unmark import export arrowKey""".lower().split())

# tools the engine can paint with (engine.js PAINT_TOOLS); other tools stay stubs
PAINT_TOOLS = {"browse", "line", "rectangle", "rect", "text", "eraser", "select"}
KNOWN_MENU_ITEMS = {"quit hypercard", "copy text", "select all", "clear picture", "compact stack", "next",
                    "prev", "previous", "first", "last", "back", "home", "help", "find...", "message",
                    "new card", "delete card"}


class Unsupported(Exception):
    def __init__(self, cmd, why=""):
        super().__init__(f"{cmd}: {why}")
        self.cmd = cmd


def js_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


# --------------------------------------------------------------------------------------------------
# Token stream
# --------------------------------------------------------------------------------------------------

class TS:
    EOF = Tok("eof", "", -1)

    def __init__(self, toks, raw=""):
        self.t, self.i, self.raw = toks, 0, raw

    def peek(self, k=0):
        j = self.i + k
        return self.t[j] if j < len(self.t) else TS.EOF

    def w(self, k=0):
        return self.peek(k).low

    def op(self, k=0):
        p = self.peek(k)
        return p.val if p.kind == "op" else None

    def at(self, *words):
        return self.w() in words

    def take(self, *words):
        if self.w() in words:
            self.i += 1
            return True
        return False

    def take_op(self, *ops):
        if self.op() in ops:
            self.i += 1
            return True
        return False

    def next(self):
        tk = self.peek()
        self.i += 1
        return tk

    def eof(self):
        return self.i >= len(self.t)

    def at_end(self):
        """End of a statement: end of line or an `else` belonging to a one-line if."""
        return self.eof() or self.w() == "else"

    def rest_raw(self):
        if self.eof():
            return ""
        end = len(self.raw)
        for k in range(self.i, len(self.t)):
            if self.t[k].low == "else":
                end = self.t[k].pos
                break
        s = self.raw[self.peek().pos:end].strip()
        while not self.at_end():
            self.i += 1
        return s


# --------------------------------------------------------------------------------------------------
# Expressions
# --------------------------------------------------------------------------------------------------

@dataclass
class E:
    js: str
    kind: str = "any"     # 'bool' | 'num' | 'str' | 'any'


def is_atomic(js: str) -> bool:
    """True if `js` needs no parentheses as an operand (no top-level space outside strings/brackets)."""
    depth, q = 0, None
    i = 0
    while i < len(js):
        c = js[i]
        if q:
            if c == "\\":
                i += 1
            elif c == q:
                q = None
        elif c in "\"'`":
            q = c
        elif c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
        elif c == " " and depth == 0:
            return False
        i += 1
    return True


def as_bool(e: E) -> str:
    return e.js if e.kind == "bool" else f"H.bool({e.js})"


def as_num(e: E) -> str:
    return e.js if e.kind == "num" else f"H.num({e.js})"


class ExprParser:
    """Recursive descent over a TS. `ctx` is the HandlerTranslator (variable scopes, call targets)."""

    def __init__(self, ctx):
        self.ctx = ctx

    # ---- precedence levels ---------------------------------------------------------------------
    def expr(self, ts, level="or") -> E:
        return getattr(self, "p_" + level)(ts)

    def p_or(self, ts):
        a = self.p_and(ts)
        while ts.at("or"):
            ts.next()
            b = self.p_and(ts)
            a = E(f"({as_bool(a)} || {as_bool(b)})", "bool")
        return a

    def p_and(self, ts):
        a = self.p_eq(ts)
        while ts.at("and"):
            ts.next()
            b = self.p_eq(ts)
            a = E(f"({as_bool(a)} && {as_bool(b)})", "bool")
        return a

    def p_eq(self, ts):
        a = self.p_rel(ts)
        while True:
            if ts.op() == "=":
                ts.next()
                a = E(f"H.eq({a.js}, {self.p_rel(ts).js})", "bool")
            elif ts.op() == "<>":
                ts.next()
                a = E(f"!H.eq({a.js}, {self.p_rel(ts).js})", "bool")
            elif ts.at("is"):
                ts.next()
                neg = ts.take("not")
                if ts.take("in"):
                    b = self.p_rel(ts)
                    js = f"H.contains({b.js}, {a.js})"
                elif ts.take("within"):
                    b = self.p_rel(ts)
                    js = f"H.within({a.js}, {b.js})"
                elif ts.at("a", "an") and ts.w(1) in ("number", "integer", "point", "rect", "rectangle",
                                                         "date", "logical", "boolean"):
                    ts.next()
                    typ = ts.next().low
                    js = f"H.isA({a.js}, {js_str(typ)})"
                else:
                    b = self.p_rel(ts)
                    js = f"H.eq({a.js}, {b.js})"
                a = E(("!" + js) if neg else js, "bool")
            else:
                return a

    def p_rel(self, ts):
        a = self.p_concat(ts)
        while True:
            o = ts.op()
            if o in ("<", ">", "<=", ">="):
                ts.next()
                b = self.p_concat(ts)
                fn = {"<": "lt", ">": "gt", "<=": "le", ">=": "ge"}[o]
                a = E(f"H.{fn}({a.js}, {b.js})", "bool")
            elif ts.at("contains"):
                ts.next()
                b = self.p_concat(ts)
                a = E(f"H.contains({a.js}, {b.js})", "bool")
            else:
                return a

    def p_concat(self, ts):
        a = self.p_add(ts)
        parts = None
        while ts.op() in ("&", "&&"):
            o = ts.next().val
            b = self.p_add(ts)
            if parts is None:
                parts = [a.js]
            if o == "&&":
                parts.append('" "')
            parts.append(b.js)
        if parts is None:
            return a
        return E(f"H.cat({', '.join(parts)})", "str")

    def p_add(self, ts):
        a = self.p_mul(ts)
        while ts.op() in ("+", "-"):
            o = ts.next().val
            b = self.p_mul(ts)
            a = E(f"{as_num(a)} {o} {as_num(b)}", "num")
        return a

    def p_mul(self, ts):
        a = self.p_pow(ts)
        while ts.op() in ("*", "/") or ts.at("div", "mod"):
            o = ts.next()
            b = self.p_pow(ts)
            if o.kind == "op":
                a = E(f"{self.paren(as_num(a))} {o.val} {self.paren(as_num(b))}", "num")
            else:
                a = E(f"H.{o.low}({a.js}, {b.js})", "num")
        return a

    @staticmethod
    def paren(js):
        return js if is_atomic(js) else f"({js})"

    def p_pow(self, ts):
        a = self.p_unary(ts)
        while ts.op() == "^":
            ts.next()
            b = self.p_unary(ts)
            a = E(f"({as_num(a)} ** {as_num(b)})", "num")
        return a

    def p_unary(self, ts):
        if ts.at("not"):
            ts.next()
            return E(f"!{as_bool(self.p_unary(ts))}", "bool")
        if ts.op() == "-":
            ts.next()
            b = self.p_unary(ts)
            return E(f"-{as_num(b)}", "num")
        if ts.op() == "+":
            ts.next()
            return self.p_unary(ts)
        if ts.at("there") and ts.w(1) == "is":
            ts.next(); ts.next()
            neg = ts.take("not") or False
            if ts.take("no"):
                neg = True
            ts.take("a", "an")
            if ts.take("menu"):
                js = f"H.hasMenu({self.factor(ts).js})"
                return E(("!" + js) if neg else js, "bool")
            ref = self.objref(ts)
            if ref is None:
                raise Unsupported("there is", "unknown object")
            js = f"H.exists(() => {ref})"
            return E(("!" + js) if neg else js, "bool")
        return self.factor(ts)

    # ---- factors -------------------------------------------------------------------------------
    def factor(self, ts) -> E:
        tk = ts.peek()
        if tk.kind == "eof":
            raise Unsupported("expression", "unexpected end of line")
        if tk.kind == "num":
            ts.next()
            v = tk.val
            if v.endswith("."):
                v = v[:-1]
            return E(str(float(v)) if "." in v and not v.replace(".", "").isdigit() else
                     (v.lstrip("0") or "0") if "." not in v else ("0" + v if v.startswith(".") else v), "num")
        if tk.kind == "str":
            ts.next()
            return E(js_str(tk.val), "str")
        if tk.kind == "op":
            if tk.val == "(":
                ts.next()
                e = self.expr(ts)
                if not ts.take_op(")"):
                    raise Unsupported("expression", "missing )")
                return E(e.js if is_atomic(e.js) else f"({e.js})", e.kind)
            raise Unsupported("expression", f"unexpected {tk.val!r}")
        w = tk.low
        # the ...
        if w in ("long", "short", "abbreviated", "abbrev", "abbr") and ts.w(1) in ("name", "id", "date", "time"):
            return self.the_expr(ts)
        if w == "the":
            ts.next()
            return self.the_expr(ts)
        # chunk expressions
        if w in CHUNK_WORDS and w not in ("words", "lines", "items", "chars", "characters"):
            return self.chunk_expr(ts)
        if w in ORDINALS and ts.w(1) in CHUNK_WORDS:
            return self.chunk_expr(ts)
        if w == "number" and ts.w(1) in ("of", "in"):
            ts.next(); ts.next()
            return self.number_of(ts)
        # function-style "name of factor"
        if w in BUILTIN_FUNCS and ts.w(1) == "of":
            ts.next(); ts.next()
            arg = self.factor(ts)
            return E(f"H.f.{BUILTIN_FUNCS[w]}({arg.js})", "num" if w != "value" else "any")
        if w in PROPS and ts.w(1) == "of" and w not in self.ctx.locals_low:
            save = ts.i
            ts.next(); ts.next()
            ref = self.objref(ts)
            if ref is not None:
                return E(f"H.prop({ref}, {js_str(PROPS[w])})")
            ts.i = save
        # function call name(args)
        if ts.op(1) == "(" and w not in OBJ_START and w not in CONSTANTS:
            ts.next(); ts.next()
            args = []
            if not ts.take_op(")"):
                while True:
                    args.append(self.expr(ts).js)
                    if ts.take_op(")"):
                        break
                    if not ts.take_op(","):
                        raise Unsupported("expression", "bad argument list")
            return self.call_function(tk.val, args)
        # objects as values
        if w in OBJ_START or (w in ORDINALS and ts.w(1) in OBJ_START):
            if w in ("me", "target"):
                ts.next()
                return E(f"H.value(H.{w}($))")
            ref = self.objref(ts)
            if ref is not None:
                return E(f"H.value({ref})")
            if w in ("msg", "message"):
                pass
        if w == "it":
            ts.next()
            return E("it")
        if w in ("selection",):
            ts.next()
            return E("H.f.selection()")
        if w == "param" or w == "paramcount" or w == "params":
            ts.next()
            return E(f"H.f.{BUILTIN_FUNCS[w]}($)")
        # variables
        if w in self.ctx.globals_low:
            ts.next()
            return E(self.ctx.gname(tk.val))
        if w in self.ctx.locals_low:
            ts.next()
            self.ctx.note_use(tk.val, "r")
            return E(self.ctx.lname(tk.val))
        if w in CONSTANTS and CONSTANTS[w] is not None:
            ts.next()
            v = CONSTANTS[w]
            return E(v, "bool" if v in ("true", "false") else "num" if v[0].isdigit() else "str")
        if w in ("cr",):
            ts.next()
            return E('"\\n"', "str")
        if w in STOP_WORDS:
            raise Unsupported("expression", f"unexpected word {tk.val!r}")
        # unquoted literal: a word that is not a variable stands for itself
        ts.next()
        self.ctx.note_use(tk.val, "r")
        return E(js_str(tk.val), "str")

    def call_function(self, name, args):
        low = name.lower()
        if low in self.ctx.user_functions:
            return E(f"await H.call($, {js_str(name)}, [{', '.join(args)}], 'function')")
        if low in BUILTIN_FUNCS:
            canon = BUILTIN_FUNCS[low]
            if low in ("param", "paramcount", "params"):
                return E(f"H.f.{canon}(${', ' if args else ''}{', '.join(args)})")
            return E(f"H.f.{canon}({', '.join(args)})", "any" if low == "value" else "num")
        self.ctx.note_external(name)
        return E(f"await H.call($, {js_str(name)}, [{', '.join(args)}], 'function')")

    def the_expr(self, ts) -> E:
        w = ts.w()
        if w is None:
            raise Unsupported("the", "nothing after 'the'")
        if w in CHUNK_WORDS or (w in ORDINALS and ts.w(1) in CHUNK_WORDS):
            return self.chunk_expr(ts)
        if w == "number" and ts.w(1) in ("of", "in"):
            ts.next(); ts.next()
            return self.number_of(ts)
        if w == "target" and ts.w(1) != "of":
            ts.next()
            return E("H.f.target($)")
        mod = None
        if w in ("long", "short", "abbreviated", "abbrev", "abbr", "english") and ts.w(1) is not None:
            mod = {"abbrev": "abbreviated", "abbr": "abbreviated"}.get(w, w)
            ts.next()
            w = ts.w()
        if w is None:
            raise Unsupported("the", "incomplete")
        if ts.w(1) == "of":
            if w in BUILTIN_FUNCS:
                ts.next(); ts.next()
                arg = self.factor(ts)
                return E(f"H.f.{BUILTIN_FUNCS[w]}({arg.js})", "any" if w == "value" else "num")
            save = ts.i
            ts.next(); ts.next()
            ref = self.objref(ts)
            if ref is not None:
                pname = (mod + " " if mod else "") + PROPS.get(w, ts.t[save].val)
                if w not in PROPS:
                    self.ctx.note_runtime_prop(w)
                return E(f"H.prop({ref}, {js_str(pname)})")
            ts.i = save
            raise Unsupported(f"the {w} of", "unknown object")
        ts.next()
        if w in THE_FUNCS:
            canon = THE_FUNCS[w]
            if canon == "target":
                return E("H.f.target($)")
            arg = js_str(mod) if mod else ""
            if canon in ("params", "paramCount"):
                return E(f"H.f.{canon}($)")
            return E(f"H.f.{canon}({arg})")
        if w in GLOBAL_PROPS:
            return E(f"H.getGlobal({js_str(GLOBAL_PROPS[w])})")
        raise Unsupported(f"the {w}", "unknown function")

    def number_of(self, ts) -> E:
        w = ts.w()
        if w in ("chars", "characters", "words", "items", "lines"):
            ts.next()
            if not ts.take("in", "of"):
                raise Unsupported("number of", "expected in/of")
            src = self.chunk_operand(ts)
            return E(f"H.count({js_str(CHUNK_WORDS[w])}, {src.js})", "num")
        if w in ("cards", "cds"):
            ts.next()
            if ts.take("in", "of"):
                bg = self.objref(ts)
                return E(f"H.countCards({bg})", "num")
            return E("H.countCards()", "num")
        if w in ("backgrounds", "bkgnds", "bgs"):
            ts.next()
            return E("H.countBackgrounds()", "num")
        if w in ("marked",) and ts.w(1) in ("cards", "cds"):
            ts.next(); ts.next()
            return E("0", "num")
        layer = None
        save = ts.i
        if w in LAYER_WORDS and ts.w(1) in ("fields", "flds", "buttons", "btns"):
            layer = LAYER_WORDS[w]
            ts.next()
            w = ts.w()
        if w in ("fields", "flds", "buttons", "btns"):
            ts.next()
            card = "null"
            if ts.take("of", "in"):
                card = self.objref(ts) or "null"
            return E(f"H.countParts($, {js_str(layer or ('bg' if PART_WORDS[w] == 'field' else 'card'))}, "
                     f"{js_str(PART_WORDS[w])}, {card})", "num")
        ts.i = save
        ref = self.objref(ts)
        if ref is None:
            raise Unsupported("number of", "unknown")
        return E(f"H.prop({ref}, \"number\")", "num")

    # ---- chunks --------------------------------------------------------------------------------
    def chunk_specs(self, ts):
        """Parse `[ordinal] type [N [to M]] of` repeatedly. Returns JS list (innermost first)."""
        specs = []
        while True:
            w = ts.w()
            if w in ORDINALS and ts.w(1) in CHUNK_WORDS:
                ts.next()
                typ = CHUNK_WORDS[ts.next().low]
                o = ORDINALS[w]
                specs.append(f"[{js_str(typ)}, {js_str(o) if isinstance(o, str) else o}]")
            elif w in CHUNK_WORDS:
                ts.next()
                typ = CHUNK_WORDS[w]
                if ts.w() in ORDINALS and isinstance(ORDINALS[ts.w()], str):
                    a = js_str(ORDINALS[ts.next().low])
                else:
                    a = self.expr(ts).js
                if ts.take("to"):
                    b = self.expr(ts).js
                    specs.append(f"[{js_str(typ)}, {a}, {b}]")
                else:
                    specs.append(f"[{js_str(typ)}, {a}]")
            else:
                break
            if not ts.take("of", "in"):
                raise Unsupported("chunk", "expected 'of'")
            if ts.w() == "the" and (ts.w(1) in CHUNK_WORDS or (ts.w(1) in ORDINALS and ts.w(2) in CHUNK_WORDS)):
                ts.next()
        specs.reverse()
        return "[" + ", ".join(specs) + "]"

    def chunk_operand(self, ts) -> E:
        return self.factor(ts)

    def chunk_expr(self, ts) -> E:
        specs = self.chunk_specs(ts)
        src = self.chunk_operand(ts)
        return E(f"H.chunk({src.js}, {specs})")

    # ---- object references ---------------------------------------------------------------------
    def part_key(self, ts):
        if ts.take("id"):
            return f"{{id: {self.factor(ts).js}}}"
        w = ts.w()
        if w in ORDINALS:
            ts.next()
            o = ORDINALS[w]
            return f"{{ord: {js_str(o) if isinstance(o, str) else o}}}"
        tk = ts.peek()
        nxt = ts.peek(1)
        if tk.kind == "word" and tk.low not in ("the", "me", "it") and (
                nxt.kind == "eof" or (nxt.kind == "op" and nxt.val != "(") or nxt.low in STOP_WORDS):
            # a lone word names the part (or is a variable holding the name): `cd fld Word`
            ts.next()
            if tk.low in self.ctx.globals_low:
                return self.ctx.gname(tk.val)
            self.ctx.note_use(tk.val, "r")
            if tk.low in self.ctx.locals_low:
                return self.ctx.lname(tk.val)
            return js_str(tk.val)
        return self.factor(ts).js

    def card_desc(self, ts, allow_bare=False):
        """After the word `card`: [id N | ordinal | N | "name" | expr] [of|in background X]."""
        parts = []
        if ts.take("id"):
            parts.append(f"id: {self.factor(ts).js}")
        elif ts.eof() or ts.at("of", "in", "with", "else", "is", "and", "or", "then", "to", "into", "after", "before"):
            parts.append('rel: "this"')
        else:
            parts.append(f"key: {self.factor(ts).js}")
        bg = self.bg_suffix(ts)
        if bg:
            parts.append(f"bg: {bg}")
        return "{" + ", ".join(parts) + "}"

    def bg_suffix(self, ts):
        if ts.at("of", "in") and (ts.w(1) in ("background", "bkgnd", "bg", "this")):
            if ts.w(1) == "this" and ts.w(2) not in ("background", "bkgnd", "bg"):
                return None
            ts.next()
            if ts.take("this"):
                ts.next()
                return '{rel: "this"}'
            ts.next()
            return self.bg_desc(ts)
        return None

    def bg_desc(self, ts):
        if ts.take("id"):
            return f"{{id: {self.factor(ts).js}}}"
        if ts.eof() or ts.at("else", "then", "with"):
            return '{rel: "this"}'
        return f"{{key: {self.factor(ts).js}}}"

    def remote_card(self, ts):
        """Optional `of card X` / `of this card` after a part reference."""
        if ts.at("of", "in") and ts.w(1) in ("card", "cd"):
            ts.next(); ts.next()
            return f"H.card($, {self.card_desc(ts)})"
        if ts.at("of", "in") and ts.w(1) == "this" and ts.w(2) in ("card", "cd"):
            ts.next(); ts.next(); ts.next()
            return "H.card($, {rel: \"this\"})"
        return None

    def objref(self, ts):
        """Parse an object reference; return JS for an object handle, or None (stream unchanged)."""
        save = ts.i
        w = ts.w()
        try:
            if w == "the" and ts.w(1) == "target":
                ts.next(); ts.next()
                return "H.target($)"
            if w in ("me", "target"):
                ts.next()
                return f"H.{w}($)"
            if w in ("msg", "message"):
                ts.next()
                ts.take("box", "window")
                return "H.msgBox()"
            if w == "card" and ts.w(1) == "window":
                ts.next(); ts.next()
                return "H.cardWindow()"
            if w == "this":
                ts.next()
                x = ts.w()
                if x in ("card", "cd"):
                    ts.next()
                    return 'H.card($, {rel: "this"})'
                if x in ("background", "bkgnd", "bg"):
                    ts.next()
                    return 'H.bg($, {rel: "this"})'
                if x == "stack":
                    ts.next()
                    return "H.stack()"
                ts.i = save
                return None
            if w == "stack":
                ts.next()
                if ts.at_end() or ts.at("is", "then", "and", "or", "to"):
                    return "H.stack()"
                return f"H.stack({self.factor(ts).js})"
            # ordinal part / card: `last button`, `first card`
            if w in ORDINALS and (ts.w(1) in PART_WORDS or ts.w(1) in LAYER_WORDS):
                o = ORDINALS[w]
                ordjs = js_str(o) if isinstance(o, str) else str(o)
                ts.next()
                layer = None
                if ts.w() in LAYER_WORDS and ts.w(1) in PART_WORDS:
                    layer = LAYER_WORDS[ts.next().low]
                if ts.w() in PART_WORDS:
                    kind = PART_WORDS[ts.next().low]
                    rc = self.remote_card(ts)
                    return f"H.part($, {js_str(layer) if layer else 'null'}, {js_str(kind)}, {{ord: {ordjs}}}{', ' + rc if rc else ''})"
                if ts.w() in ("card", "cd"):
                    ts.next()
                    bg = self.bg_suffix(ts)
                    rel = {1: "first", "last": "last", "any": "any", "middle": "middle"}.get(o)
                    d = f'rel: "{rel}"' if rel else f"key: {o}"
                    return f"H.card($, {{{d}{', bg: ' + bg if bg else ''}}})"
                if ts.w() in ("background", "bkgnd", "bg"):
                    ts.next()
                    return f"H.bg($, {{key: {ordjs}}})"
                ts.i = save
                return None
            if w in ("next", "prev", "previous") and ts.w(1) in ("card", "cd", "background", "bkgnd", "bg"):
                rel = "next" if w == "next" else "prev"
                ts.next()
                if ts.take("card", "cd"):
                    bg = self.bg_suffix(ts)
                    return f"H.card($, {{rel: \"{rel}\"{', bg: ' + bg if bg else ''}}})"
                ts.next()
                return f"H.bg($, {{rel: \"{rel}\"}})"
            layer = None
            if w in LAYER_WORDS and ts.w(1) in PART_WORDS:
                layer = LAYER_WORDS[w]
                ts.next()
                w = ts.w()
            if w in PART_WORDS and w in ("field", "fld", "button", "btn"):
                ts.next()
                kind = PART_WORDS[w]
                key = self.part_key(ts)
                rc = self.remote_card(ts)
                return f"H.part($, {js_str(layer) if layer else 'null'}, {js_str(kind)}, {key}{', ' + rc if rc else ''})"
            if layer is not None:
                ts.i = save
                return None
            if w in ("card", "cd"):
                ts.next()
                return f"H.card($, {self.card_desc(ts)})"
            if w in ("background", "bkgnd", "bg"):
                ts.next()
                return f"H.bg($, {self.bg_desc(ts)})"
        except Unsupported:
            ts.i = save
            raise
        ts.i = save
        return None


# --------------------------------------------------------------------------------------------------
# Statements
# --------------------------------------------------------------------------------------------------

@dataclass
class Stats:
    lines: int = 0
    translated: int = 0
    stubbed: int = 0
    handlers: int = 0
    outside: int = 0
    stub_list: list = field(default_factory=list)       # (cmd, line)
    externals: set = field(default_factory=set)          # called handler names not defined anywhere


class HandlerTranslator:
    def __init__(self, h: Handler, user_handlers: set, user_functions: set, owner_var="owner"):
        self.h = h
        self.user_handlers = user_handlers        # lowercase names of all `on` handlers in the stack
        self.user_functions = user_functions      # lowercase names of all `function` handlers
        self.locals_low = {}                      # lower -> JS name
        self.globals_low = set()
        self.out = []
        self.stats = Stats()
        self.ex = ExprParser(self)
        self.loop_n = 0
        self.line_stub = None
        self.collect = True
        self.owner_var = owner_var
        self._externals = set()
        self.first_use = {}                       # lower -> ("r"|"w", original spelling)

    # ---- names ---------------------------------------------------------------------------------
    @staticmethod
    def safe(name):
        n = re.sub(r"\W", "_", name)
        if not n or n[0].isdigit():
            n = "v_" + n
        if n in JS_RESERVED:
            n = n + "_"
        return n

    def lname(self, name):
        return self.locals_low[name.lower()]

    def gname(self, name):
        return f"H.g.{self.safe(name.lower())}"

    def note_use(self, name, how):
        """Record whether a name is first read ("r") or first written ("w") in the handler's text.
        HyperTalk reads a variable that was never assigned as its own name (the literal fallback), so a
        local whose first use is a read starts with its name instead of empty."""
        self.first_use.setdefault(name.lower(), (how, name))

    def declare_local(self, name):
        low = name.lower()
        self.note_use(name, "w")
        if low in self.globals_low:
            return
        if low not in self.locals_low:
            self.locals_low[low] = self.safe(name)

    def note_external(self, name):
        self._externals.add(name)

    def note_runtime_prop(self, name):
        pass

    # ---- output --------------------------------------------------------------------------------
    def emit(self, ind, s):
        self.out.append("  " * ind + s)

    def comment(self, ind, line: LLine):
        self.emit(ind, "// " + line.orig.strip())

    def stub(self, ind, cmd, line: LLine):
        self.emit(ind, f"H.unsupported({js_str(cmd)}, {js_str(line.text)});")
        self.line_stub = cmd

    # ---- driver --------------------------------------------------------------------------------
    def translate(self):
        # Pass 1 collects variables (so a name read before its first `put` is still a variable);
        # pass 2 generates the code.
        for p in self.h.params:
            self.declare_local(p)
        self.collect = True
        self._run()
        self.collect = False
        self.out = []
        self.stats = Stats()
        self._externals = set()
        self.loop_n = 0
        self._run()
        self.stats.externals = set(self._externals)
        return self.out, self.stats

    def _run(self):
        self.lines = self.h.lines
        self.i = 0
        self.block(2, lambda t: False)

    def block(self, ind, stop):
        while self.i < len(self.lines):
            ln = self.lines[self.i]
            if stop(ln.toks):
                return True
            self.line(ind)
        return False

    def count_line(self, ln, stub_cmd):
        self.stats.lines += 1
        if stub_cmd:
            self.stats.stubbed += 1
            self.stats.stub_list.append((stub_cmd, ln.text))
        else:
            self.stats.translated += 1

    def line(self, ind):
        """Translate the statement starting on line self.i (may consume several lines)."""
        ln = self.lines[self.i]
        self.comment(ind, ln)
        ts = TS(ln.toks, ln.text)
        self.line_stub = None
        start_len = len(self.out)
        start_i = self.i
        snap = (self.stats.lines, self.stats.translated, self.stats.stubbed, len(self.stats.stub_list))
        try:
            consumed = self.stmt(ts, ind, ln)
            if not consumed:
                if not ts.eof():
                    raise Unsupported(ln.toks[0].low or "?", f"unparsed tail: {ts.peek().val}")
                self.i += 1
                self.count_line(ln, self.line_stub)
        except Unsupported as e:
            del self.out[start_len:]
            self.i = start_i
            self.stats.lines, self.stats.translated, self.stats.stubbed = snap[:3]
            del self.stats.stub_list[snap[3]:]
            cmd = e.cmd if e.cmd else (ln.toks[0].val if ln.toks else "?")
            self.stub(ind, cmd.lower() if " " not in cmd else cmd, ln)
            self.i += 1
            self.count_line(ln, self.line_stub)

    def end_line(self, ln):
        """`end if` / `end repeat` / `else` lines: counted as translated."""
        self.count_line(ln, None)

    def is_line(self, toks, *words):
        return len(toks) >= len(words) and all(toks[k].low == w for k, w in enumerate(words))

    # ---- statements ----------------------------------------------------------------------------
    def stmt(self, ts, ind, ln) -> bool:
        """Returns True if the statement consumed its line(s) itself (block statements)."""
        w = ts.w()
        if w == "if":
            ts.next()
            self.do_if(ts, ind, ln)
            return True
        if w == "repeat":
            ts.next()
            self.do_repeat(ts, ind, ln)
            return True
        self.simple(ts, ind)
        return False

    def inline_stmt(self, ts, ind, ln):
        """A statement after `then`/`else` on the same line. Returns True if it consumed lines."""
        w = ts.w()
        if w not in ("if", "repeat"):
            start = len(self.out)
            try:
                self.simple(ts, ind)
            except Unsupported as e:
                del self.out[start:]
                cmd = e.cmd if e.cmd else (w or "?")
                self.emit(ind, f"H.unsupported({js_str(cmd)}, {js_str(ln.text)});")
                self.line_stub = cmd
                while not ts.at_end():
                    ts.next()
            return False
        if w == "if":
            ts.next()
            self.do_if(ts, ind, ln)
            return True
        if w == "repeat":
            ts.next()
            self.do_repeat(ts, ind, ln)
            return True
        self.simple(ts, ind)
        return False

    def cond(self, ts, stop_then=True):
        e = self.ex.expr(ts)
        return as_bool(e)

    def do_if(self, ts, ind, ln, chained=False, need_end=False):
        """Handles every if form of SPEC 5.5. Returns True if an `end if` was consumed."""
        hdr_stub = None
        try:
            c = self.cond(ts)
        except Unsupported as e:
            hdr_stub = "if"
            c = f"H.unsupported(\"if\", {js_str(ln.text)})"
            while not ts.eof() and ts.w() != "then":
                ts.next()
        if not ts.take("then"):
            if not ts.eof():
                raise Unsupported("if", "expected then")
            # `then` on the next line
            if self.i + 1 < len(self.lines) and self.is_line(self.lines[self.i + 1].toks, "then"):
                self.count_line(ln, None)
                self.i += 1
                ln = self.lines[self.i]
                self.comment(ind, ln)
                ts = TS(ln.toks, ln.text)
                ts.next()
            else:
                raise Unsupported("if", "missing then")
        self.emit(ind, (f"}} else if ({c}) {{" if chained else f"if ({c}) {{"))
        closed = False
        if ts.eof():
            # block then
            self.count_line(ln, hdr_stub)
            self.i += 1
            is_block = True
            found = self.block(ind + 1, lambda t: self.is_line(t, "else") or self.is_line(t, "end", "if"))
            if not found:
                self.emit(ind, "}")
                return False
            if self.is_line(self.lines[self.i].toks, "end", "if"):
                self.comment(ind, self.lines[self.i])
                self.end_line(self.lines[self.i])
                self.i += 1
                self.emit(ind, "}")
                return True
        else:
            is_block = False
            line_stub_before = self.line_stub
            self.line_stub = hdr_stub
            consumed = self.inline_stmt(ts, ind + 1, ln)
            if not consumed:
                if ts.take("else"):
                    # if c then s else t   (all on one line)
                    self.emit(ind, "} else {")
                    c2 = self.inline_stmt(ts, ind + 1, ln)
                    if not c2:
                        if not ts.eof():
                            raise Unsupported("if", "unparsed tail")
                        self.i += 1
                        self.count_line(ln, self.line_stub)
                    self.emit(ind, "}")
                    return False
                if not ts.eof():
                    raise Unsupported("if", f"unparsed tail: {ts.peek().val}")
                self.i += 1
                self.count_line(ln, self.line_stub)
            self.line_stub = line_stub_before
        # an `else` line may follow
        if self.i < len(self.lines) and self.is_line(self.lines[self.i].toks, "else"):
            eln = self.lines[self.i]
            self.comment(ind, eln)
            ets = TS(eln.toks, eln.text)
            ets.next()
            if ets.eof():
                self.end_line(eln)
                self.i += 1
                self.emit(ind, "} else {")
                found = self.block(ind + 1, lambda t: self.is_line(t, "end", "if"))
                if found:
                    self.comment(ind, self.lines[self.i])
                    self.end_line(self.lines[self.i])
                    self.i += 1
                self.emit(ind, "}")
                return True
            if ets.w() == "if":
                ets.next()
                return self.do_if(ets, ind, eln, chained=True, need_end=need_end or is_block)
            # else S (one line, S may be a block statement such as repeat)
            self.emit(ind, "} else {")
            self.line_stub = None
            consumed = self.inline_stmt(ets, ind + 1, eln)
            if not consumed:
                if not ets.eof():
                    raise Unsupported("else", "unparsed tail")
                self.i += 1
                self.count_line(eln, self.line_stub)
            closed = False
        if (need_end or is_block) and not closed and self.i < len(self.lines) \
                and self.is_line(self.lines[self.i].toks, "end", "if"):
            self.comment(ind, self.lines[self.i])
            self.end_line(self.lines[self.i])
            self.i += 1
            closed = True
        self.emit(ind, "}")
        return closed

    def do_repeat(self, ts, ind, ln):
        self.loop_n += 1
        tick = "await H.tick();"
        save = ts.i
        try:
            head = self.repeat_head(ts)
            hdr_stub = None
        except Unsupported:
            head = f"while (H.unsupported(\"repeat\", {js_str(ln.text)})) {{"
            hdr_stub = "repeat"
            while not ts.eof():
                ts.next()
        self.emit(ind, head)
        self.emit(ind + 1, tick)
        self.count_line(ln, hdr_stub)
        self.i += 1
        found = self.block(ind + 1, lambda t: self.is_line(t, "end", "repeat"))
        if found:
            self.comment(ind, self.lines[self.i])
            self.end_line(self.lines[self.i])
            self.i += 1
        self.emit(ind, "}")

    def repeat_head(self, ts):
        if ts.eof() or ts.at("forever"):
            ts.take("forever")
            head = "while (true) {"
        elif ts.at("until"):
            ts.next()
            head = f"while (!{self.paren_bool(self.cond(ts))}) {{"
        elif ts.at("while"):
            ts.next()
            head = f"while ({self.cond(ts)}) {{"
        elif ts.at("with"):
            ts.next()
            var = ts.next()
            if var.kind != "word":
                raise Unsupported("repeat", "bad loop variable")
            self.declare_local(var.val)
            vjs = self.gname(var.val) if var.low in self.globals_low else self.lname(var.val)
            if not ts.take_op("="):
                raise Unsupported("repeat", "expected =")
            a = self.ex.expr(ts)
            down = ts.take("down")
            if not ts.take("to"):
                raise Unsupported("repeat", "expected to")
            b = self.ex.expr(ts)
            head = f"for ({vjs} of H.range({a.js}, {b.js}{', -1' if down else ''})) {{"
        else:
            ts.take("for")
            n = self.ex.expr(ts)
            ts.take("times", "time")
            head = f"for (let n{self.loop_n} = {as_num(n)}; n{self.loop_n} > 0; n{self.loop_n}--) {{"
        if not ts.eof():
            raise Unsupported("repeat", "unparsed tail")
        return head

    @staticmethod
    def paren_bool(js):
        return js if re.fullmatch(r"[\w.$]+(\(.*\))?", js) and js.count("(") <= 1 else f"({js})"

    # ---- containers ----------------------------------------------------------------------------
    def container(self, ts, create=True):
        """-> ('var', jsname) | ('ref', js) with chunks JS list (innermost first) or None."""
        chunks = None
        if ts.w() in CHUNK_WORDS or (ts.w() in ORDINALS and ts.w(1) in CHUNK_WORDS) or \
                (ts.w() == "the" and (ts.w(1) in CHUNK_WORDS or ts.w(1) in ORDINALS)):
            ts.take("the")
            chunks = self.ex.chunk_specs(ts)
        w = ts.w()
        tk = ts.peek()
        if w == "it":
            ts.next()
            self.declare_local("it")     # `put ... into it` declares it like `get` does
            return ("var", "it"), chunks
        if w == "the" and ts.w(1) == "selection" or w == "selection":
            ts.take("the")
            ts.next()
            return ("ref", "H.selection()"), chunks
        if w == "menu":
            raise Unsupported("menu", "menus are not supported")
        ref = self.ex.objref(ts)
        if ref is not None:
            return ("ref", ref), chunks
        if tk.kind == "word" and w not in STOP_WORDS and (w not in CONSTANTS or CONSTANTS[w] is None):
            ts.next()
            if w in self.globals_low:
                return ("var", self.gname(tk.val)), chunks
            self.note_use(tk.val, "w")
            if create:
                self.declare_local(tk.val)
            if w not in self.locals_low:
                raise Unsupported("container", tk.val)
            return ("var", self.lname(tk.val)), chunks
        raise Unsupported("container", f"not a container: {tk.val}")

    def read_container(self, c, chunks):
        kind, js = c
        base = js if kind == "var" else f"H.value({js})"
        return f"H.chunk({base}, {chunks})" if chunks else base

    def write_container(self, c, chunks, value_js, mode="into"):
        kind, js = c
        if kind == "var":
            if not chunks and mode == "into":
                return f"{js} = {value_js};"
            return f"{js} = H.put({js}, {value_js}, {js_str(mode)}{', ' + chunks if chunks else ''});"
        return f"H.putInto({js}, {value_js}, {js_str(mode)}{', ' + chunks if chunks else ''});"

    # ---- simple commands -----------------------------------------------------------------------
    def simple(self, ts, ind):
        tk = ts.peek()
        w = tk.low
        if tk.kind != "word":
            raise Unsupported("?", "statement does not start with a word")
        fn = getattr(self, "c_" + w, None)
        if fn is not None and w in COMMANDS:
            ts.next()
            fn(ts, ind)
            return
        # user handler call: name arg, arg ...
        ts.next()
        args = self.arg_list(ts)
        if w not in self.user_handlers and w not in self.user_functions:
            self._externals.add(tk.val)
            self.line_stub = tk.val
            self.emit(ind, f"await H.call($, {js_str(tk.val)}, [{', '.join(args)}]);  // not defined in this stack (XCMD or other stack)")
            return
        self.emit(ind, f"await H.call($, {js_str(tk.val)}, [{', '.join(args)}]);")

    def arg_list(self, ts):
        args = []
        if ts.at_end():
            return args
        while True:
            args.append(self.ex.expr(ts).js)
            if not ts.take_op(","):
                break
        return args

    def expr_list_joined(self, ts):
        parts = [self.ex.expr(ts).js]
        while ts.take_op(","):
            parts.append(self.ex.expr(ts).js)
        if len(parts) == 1:
            return parts[0]
        return "H.cat(" + ', ",", '.join(parts) + ")"

    # put
    def c_put(self, ts, ind):
        v = self.ex.expr(ts)
        if ts.at_end():
            self.emit(ind, f"H.putInto(H.msgBox(), {v.js}, \"into\");")
            return
        mode = ts.next().low
        if mode not in ("into", "after", "before"):
            raise Unsupported("put", f"unknown preposition {mode}")
        if ts.at("menu"):
            ts.next()
            name = self.ex.factor(ts).js
            msgs = "null"
            if ts.take("with"):
                if not ts.take("menumsgs", "menumessages", "menumsg", "menumessage"):
                    raise Unsupported("put into menu", "expected menuMsgs")
                msgs = self.ex.expr(ts).js
            self.emit(ind, f"H.putIntoMenu({name}, {v.js}, {js_str(mode)}, {msgs});")
            return
        c, chunks = self.container(ts)
        self.emit(ind, self.write_container(c, chunks, v.js, mode))

    def c_get(self, ts, ind):
        v = self.ex.expr(ts)
        self.declare_local("it")
        self.emit(ind, f"it = {v.js};")

    def arith(self, ts, ind, op, prep):
        if op in ("add", "subtract"):
            v = self.ex.expr(ts)
            if not ts.take(prep):
                raise Unsupported(op, f"expected {prep}")
            c, chunks = self.container(ts)
        else:
            c, chunks = self.container(ts)
            if not ts.take(prep):
                raise Unsupported(op, f"expected {prep}")
            v = self.ex.expr(ts)
        cur = self.read_container(c, chunks)
        sym = {"add": "+", "subtract": "-", "multiply": "*", "divide": "/"}[op]
        self.emit(ind, self.write_container(c, chunks, f"H.num({cur}) {sym} {as_num(v)}"))

    def c_add(self, ts, ind): self.arith(ts, ind, "add", "to")
    def c_subtract(self, ts, ind): self.arith(ts, ind, "subtract", "from")
    def c_multiply(self, ts, ind): self.arith(ts, ind, "multiply", "by")
    def c_divide(self, ts, ind): self.arith(ts, ind, "divide", "by")

    def c_delete(self, ts, ind):
        if ts.take("menu"):
            self.emit(ind, f"H.deleteMenu({self.ex.expr(ts).js});")
            return
        if not (ts.w() in CHUNK_WORDS or ts.w() in ORDINALS or ts.w() == "the"):
            raise Unsupported("delete", "only chunks can be deleted")
        c, chunks = self.container(ts, create=False)
        if not chunks:
            raise Unsupported("delete", "only chunks can be deleted")
        kind, js = c
        if kind == "var":
            self.emit(ind, f"{js} = H.del({js}, {chunks});")
        else:
            self.emit(ind, f"H.deleteIn({js}, {chunks});")

    def c_global(self, ts, ind):
        names = []
        while not ts.at_end():
            tk = ts.next()
            if tk.kind == "word":
                self.globals_low.add(tk.low)
                self.locals_low.pop(tk.low, None)
                names.append(self.gname(tk.val))
            ts.take_op(",")
        self.emit(ind, f"/* shared: {', '.join(names)} */")

    def c_set(self, ts, ind):
        ts.take("the")
        mod = None
        if ts.at("long", "short", "abbreviated") and ts.w(1) == "name":
            mod = ts.next().low
        ptk = ts.next()
        if ptk.kind != "word":
            raise Unsupported("set", "expected a property")
        p = ptk.low
        if ts.take("of"):
            ref = self.ex.objref(ts)
            if ref is None:
                raise Unsupported(f"set {p}", "unknown object (chunk properties are not supported)")
            if not ts.take("to"):
                raise Unsupported("set", "expected to")
            v = self.expr_list_joined(ts)
            if p == "script":
                raise Unsupported("set script", "scripts cannot be changed at run time")
            self.emit(ind, f"H.setProp({ref}, {js_str(PROPS.get(p, ptk.val))}, {v});")
            return
        if not ts.take("to"):
            raise Unsupported("set", "expected to")
        v = self.expr_list_joined(ts)
        if p not in GLOBAL_PROPS:
            raise Unsupported(f"set {p}", "unknown global property")
        self.emit(ind, f"H.setGlobal({js_str(GLOBAL_PROPS[p])}, {v});")

    # go
    def go_dest(self, ts):
        w = ts.w()
        if w in ("next", "prev", "previous", "first", "last", "any", "middle", "mid") and \
                (ts.w(1) in (None, "card", "cd", "else") or ts.w(1) in ("in", "of")):
            o = {"previous": "prev", "mid": "middle"}.get(w, w)
            ts.next()
            ts.take("card", "cd")
            bg = self.ex.bg_suffix(ts)
            return f"{{rel: \"{o}\"{', bg: ' + bg if bg else ''}}}"
        if w == "back":
            ts.next()
            return '"back"'
        if w == "home":
            ts.next()
            return '"home"'
        if w == "this" and ts.w(1) in ("card", "cd"):
            ts.next(); ts.next()
            return '{rel: "this"}'
        if w in ORDINALS and ts.w(1) in ("card", "cd"):
            o = ORDINALS[w]
            ts.next(); ts.next()
            rel = {1: "first", "last": "last", "any": "any", "middle": "middle"}.get(o)
            bg = self.ex.bg_suffix(ts)
            d = f'rel: "{rel}"' if rel else f"key: {o}"
            return "{" + d + (f", bg: {bg}" if bg else "") + "}"
        if w in ("card", "cd"):
            ts.next()
            return self.ex.card_desc(ts)
        if w in ("background", "bkgnd", "bg"):
            ts.next()
            return f"{{rel: \"first\", bg: {self.ex.bg_desc(ts)}}}"
        if w == "stack":
            ts.next()
            return f"{{stack: {self.ex.factor(ts).js}}}"
        # go "name" / go <expr>: a card name or a stack name
        return f"{{key: {self.ex.factor(ts).js}}}"

    def c_go(self, ts, ind):
        ts.take("to")
        d = self.go_dest(ts)
        if ts.take("in"):
            # `in a new window`, `in this stack`: window placement is not modelled
            while not ts.at_end() and not ts.at("with"):
                ts.next()
        if ts.take("with"):
            ts.take("visual")
            ts.take("effect")
            eff = ts.rest_raw()
            self.emit(ind, f"H.visual({js_str(eff)});")
        if d == '"home"':
            self.emit(ind, "await H.goHome($);")
        elif d == '"back"':
            self.emit(ind, "await H.goBack($);")
        else:
            self.emit(ind, f"await H.go($, {d});")

    def c_push(self, ts, ind):
        ts.take("this", "recent")
        ts.take("card", "cd")
        self.emit(ind, "H.pushCard();")

    def c_pop(self, ts, ind):
        ts.take("card", "cd")
        if ts.take("into", "after", "before"):
            raise Unsupported("pop", "pop card into is not supported")
        self.emit(ind, "await H.popCard($);")

    # flow
    def c_exit(self, ts, ind):
        if ts.take("repeat"):
            self.emit(ind, "break;")
        elif ts.take("to"):
            ts.next()
            self.emit(ind, "throw H.ABORT;")
        else:
            ts.next()
            self.emit(ind, "return;")

    def c_next(self, ts, ind):
        if not ts.take("repeat"):
            raise Unsupported("next", "expected repeat")
        self.emit(ind, "continue;")

    def c_pass(self, ts, ind):
        ts.next()
        self.emit(ind, "return H.PASS;")

    def c_return(self, ts, ind):
        if ts.at_end():
            self.emit(ind, "return;")
        else:
            self.emit(ind, f"return {self.ex.expr(ts).js};")

    def c_send(self, ts, ind):
        # message: a bare word (send mouseUp to ...) or an expression ("keyDown " & x)
        tk = ts.peek()
        if tk.kind == "word" and (ts.w(1) in (None, "to", "else")):
            ts.next()
            msg = js_str(tk.val)
        else:
            msg = self.ex.expr(ts).js
        target = "null"
        if ts.take("to"):
            if ts.take("hypercard"):
                target = '"hypercard"'
            else:
                ref = self.ex.objref(ts)
                if ref is None:
                    raise Unsupported("send", "unknown target")
                target = ref
        self.emit(ind, f"await H.send($, {msg}, {target});")

    def c_do(self, ts, ind):
        tk = ts.peek()
        if tk.kind == "word" and ts.w(1) in (None, "else") and tk.low not in self.locals_low \
                and tk.low not in self.globals_low and tk.low != "it":
            ts.next()
            if tk.low not in self.user_handlers:
                self._externals.add(tk.val)
                self.line_stub = tk.val
            self.emit(ind, f"await H.call($, {js_str(tk.val)}, []);")
            return
        e = self.ex.expr(ts)
        self.line_stub = "do (built string)"
        self.emit(ind, f"await H.doScript($, {e.js});")

    # dialogs
    def c_answer(self, ts, ind):
        if ts.at("file", "folder", "program"):
            raise Unsupported(f"answer {ts.w()}", "file dialogs are not supported")
        msg = self.ex.expr(ts)
        btns = []
        if ts.take("with"):
            btns.append(self.ex.expr(ts, "eq").js)
            while ts.take("or"):
                btns.append(self.ex.expr(ts, "eq").js)
        self.declare_local("it")
        self.emit(ind, f"it = await H.answer({msg.js}{', [' + ', '.join(btns) + ']' if btns else ''});")

    def c_ask(self, ts, ind):
        if ts.at("file"):
            raise Unsupported("ask file", "file dialogs are not supported")
        pw = ts.take("password")
        msg = self.ex.expr(ts)
        dflt = '""'
        if ts.take("with"):
            dflt = self.ex.expr(ts).js
        self.declare_local("it")
        self.emit(ind, f"it = await H.ask({msg.js}, {dflt}{', true' if pw else ''});")

    # show / hide
    def show_hide(self, ts, ind, verb):
        w = ts.w()
        if w in ("menubar", "titlebar"):
            ts.next()
            self.emit(ind, f"H.{verb}Bar({js_str(w)});")
            return
        if w in ("all", "marked") or (w == "cards" or (w and ts.w(1) == "cards")):
            raise Unsupported(f"{verb} cards", "card animation is not supported")
        if w in ("picture", "pict") or (w in ("card", "cd", "background", "bkgnd", "bg") and ts.w(1) in ("picture", "pict")):
            layer = "card"
            if w in ("background", "bkgnd", "bg"):
                layer = "bg"
            if ts.w() not in ("picture", "pict"):
                ts.next()
            ts.next()
            self.emit(ind, f"H.setPicture({js_str(layer)}, {str(verb == 'show').lower()});")
            return
        if w == "groups":
            raise Unsupported(f"{verb} groups", "")
        ref = self.ex.objref(ts)
        if ref is None:
            raise Unsupported(verb, "unknown object")
        at = ""
        if ts.take("at"):
            at = ", " + self.expr_list_joined(ts)
        self.emit(ind, f"H.{verb}({ref}{at});")

    def c_show(self, ts, ind): self.show_hide(ts, ind, "show")
    def c_hide(self, ts, ind): self.show_hide(ts, ind, "hide")

    def c_enable(self, ts, ind):
        if ts.take("menu"):
            self.emit(ind, f"H.enableMenu({self.ex.expr(ts).js}, true);")
            return
        if ts.at("menuitem"):
            raise Unsupported("enable menuItem", "menu items cannot be enabled one by one")
        ref = self.ex.objref(ts)
        if ref is None:
            raise Unsupported("enable", "unknown object")
        self.emit(ind, f"H.setProp({ref}, \"enabled\", true);")

    def c_disable(self, ts, ind):
        if ts.take("menu"):
            self.emit(ind, f"H.enableMenu({self.ex.expr(ts).js}, false);")
            return
        if ts.at("menuitem"):
            raise Unsupported("disable menuItem", "menu items cannot be disabled one by one")
        ref = self.ex.objref(ts)
        if ref is None:
            raise Unsupported("disable", "unknown object")
        self.emit(ind, f"H.setProp({ref}, \"enabled\", false);")

    # effects, sound, timing
    def c_visual(self, ts, ind):
        ts.take("effect")
        self.emit(ind, f"H.visual({js_str(ts.rest_raw())});")

    def c_lock(self, ts, ind):
        if ts.take("screen"):
            self.emit(ind, "H.lockScreen();")
        elif ts.take("messages"):
            self.emit(ind, "H.setGlobal(\"lockMessages\", true);")
        elif ts.take("recent"):
            self.emit(ind, "/* lock recent: no recent-cards window here */")
        else:
            raise Unsupported("lock", "unknown")

    def c_unlock(self, ts, ind):
        if ts.take("screen"):
            eff = ""
            if ts.take("with"):
                ts.take("visual")
                ts.take("effect")
                eff = js_str(ts.rest_raw())
            self.emit(ind, f"await H.unlockScreen({eff});")
        elif ts.take("messages"):
            self.emit(ind, "H.setGlobal(\"lockMessages\", false);")
        elif ts.take("recent"):
            self.emit(ind, "/* unlock recent */")
        else:
            raise Unsupported("unlock", "unknown")

    def c_play(self, ts, ind):
        if ts.take("stop"):
            self.emit(ind, "H.playStop();")
            return
        tk = ts.peek()
        if tk.kind == "str":
            ts.next()
            name = js_str(tk.val)
        elif tk.kind == "word" and tk.low in self.locals_low:
            ts.next()
            name = self.lname(tk.val)
        elif tk.kind == "word":
            ts.next()
            name = js_str(tk.val)
        else:
            raise Unsupported("play", "expected a sound name")
        tempo = "null"
        if ts.take("tempo"):
            tempo = self.ex.factor(ts).js
        notes = '""'
        if not ts.at_end():
            if ts.peek().kind == "word" and ts.w(1) in (None, "else") and ts.w() in self.locals_low:
                notes = self.lname(ts.next().val)
            elif ts.peek().kind == "str" and ts.w(1) in (None, "else"):
                notes = js_str(ts.next().val)
            else:
                notes = js_str(ts.rest_raw())
        self.emit(ind, f"H.play({name}, {tempo}, {notes});")

    def c_wait(self, ts, ind):
        if ts.take("until"):
            self.emit(ind, f"await H.waitUntil(async () => {self.cond(ts)});")
            return
        if ts.take("while"):
            self.emit(ind, f"await H.waitUntil(async () => !{self.paren_bool(self.cond(ts))});")
            return
        ts.take("for")
        n = self.ex.expr(ts)
        unit = "ticks"
        if ts.at("seconds", "second", "secs", "sec"):
            ts.next()
            unit = "seconds"
        elif ts.at("ticks", "tick"):
            ts.next()
        self.emit(ind, f"await H.wait({as_num(n)}{' * 60' if unit == 'seconds' else ''});")

    def c_beep(self, ts, ind):
        n = "1" if ts.at_end() else as_num(self.ex.expr(ts))
        self.emit(ind, f"H.beep({n});")

    def c_flash(self, ts, ind):
        n = "2" if ts.at_end() else as_num(self.ex.expr(ts))
        self.emit(ind, f"await H.flash({n});")

    def c_speak(self, ts, ind):
        e = self.ex.expr(ts)
        voice = '""'
        if ts.take("with"):
            voice = js_str(ts.rest_raw())
        self.emit(ind, f"H.speak({e.js}, {voice});")

    def c_choose(self, ts, ind):
        tk = ts.next()
        tool = tk.val if tk.kind in ("word", "str") else ""
        ts.take("tool")
        t = tool.lower().replace(" tool", "")
        if t not in PAINT_TOOLS:
            self.line_stub = "choose " + t + " tool"
        self.emit(ind, f"H.choose({js_str(t)});")

    def c_doMenu(self, ts, ind):
        e = self.ex.expr(ts)
        if ts.take_op(","):
            self.ex.expr(ts)
        lit = None
        try:
            lit = json.loads(e.js)
        except Exception:
            pass
        if isinstance(lit, str) and lit.lower() not in KNOWN_MENU_ITEMS:
            self.line_stub = f"doMenu {lit}"
        self.emit(ind, f"await H.doMenu($, {e.js});")
    c_domenu = c_doMenu

    def c_click(self, ts, ind):
        if not ts.take("at"):
            raise Unsupported("click", "expected at")
        x = self.ex.expr(ts).js
        y = "null"
        if ts.take_op(","):
            y = self.ex.expr(ts).js
        keys = []
        if ts.take("with"):
            while not ts.at_end():
                tk = ts.next()
                if tk.kind == "word":
                    keys.append(tk.low)
                ts.take_op(",")
        self.emit(ind, f"await H.clickAt($, {x}, {y}{', ' + json.dumps(keys) if keys else ''});")

    def c_type(self, ts, ind):
        e = self.ex.expr(ts)
        if ts.take("with"):
            ts.rest_raw()
        self.emit(ind, f"await H.type($, {e.js});")

    def c_select(self, ts, ind):
        if ts.take("empty"):
            self.emit(ind, "H.select(null);")
            return
        where = "on"
        if ts.at("before", "after"):
            where = ts.next().low
        if ts.take("text"):
            ts.take("of", "in")
            ref = self.ex.objref(ts)
            if ref is None:
                raise Unsupported("select", "unknown field")
            self.emit(ind, f"H.select({ref}, null, {js_str(where)});")
            return
        if ts.at("the") and ts.w(1) in ("clickchunk", "foundchunk", "selectedchunk"):
            e = self.ex.expr(ts)
            self.emit(ind, f"H.selectChunk({e.js});")
            return
        c, chunks = self.container(ts, create=False)
        if c[0] != "ref":
            raise Unsupported("select", "only field text can be selected")
        self.emit(ind, f"H.select({c[1]}, {chunks or 'null'}, {js_str(where)});")

    def c_find(self, ts, ind):
        mode = "normal"
        if ts.at("whole", "string", "word", "words", "chars", "normal"):
            mode = ts.next().low
        e = self.ex.expr(ts)
        ref = "null"
        if ts.take("in"):
            ref = self.ex.objref(ts) or "null"
        self.emit(ind, f"await H.find($, {e.js}, {js_str(mode)}, {ref});")

    def c_sort(self, ts, ind):
        if ts.at("by") or ts.at("cards", "card", "this", "stack", "background", "bkgnd", "bg", "ascending",
                                "descending", "text", "numeric", "international", "datetime", "dateTime"):
            return self.sort_cards(ts, ind)
        typ = "line"
        if ts.at("lines", "items") and ts.w(1) == "of":
            typ = CHUNK_WORDS[ts.next().low]
            ts.next()
        c, chunks = self.container(ts, create=False)
        if chunks:
            raise Unsupported("sort", "sorting a chunk is not supported")
        order, kind = "ascending", "text"
        while not ts.at_end():
            w = ts.next().low
            if w in ("ascending", "descending"):
                order = w
            elif w in ("numeric", "text", "international", "datetime"):
                kind = w
            elif w == "by":
                raise Unsupported("sort by", "sort by expression is not supported")
        cur = self.read_container(c, None)
        self.emit(ind, self.write_container(c, None, f"H.sort({cur}, {js_str(typ)}, {js_str(order)}, {js_str(kind)})"))

    def sort_cards(self, ts, ind):
        """sort [cards [of] [this stack | this background | bkgnd X]] [ascending|descending] [kind] by expr:
        the key expression is evaluated on every card (as HyperCard does) inside an arrow function."""
        bg = "null"
        ts.take("the")
        ts.take("cards", "card")
        ts.take("of", "in")
        if ts.take("this"):
            if ts.take("background", "bkgnd", "bg"):
                bg = '{rel: "this"}'
            else:
                ts.take("stack")
        elif ts.take("stack"):
            pass
        elif ts.at("background", "bkgnd", "bg"):
            ts.next()
            bg = f"{{key: {self.ex.factor(ts).js}}}"
        order, kind = "ascending", "text"
        while not ts.at_end() and not ts.at("by"):
            w = ts.next().low
            if w in ("ascending", "descending"):
                order = w
            elif w in ("numeric", "text", "international", "datetime"):
                kind = w
            else:
                raise Unsupported("sort cards", f"unexpected {w}")
        if not ts.take("by"):
            raise Unsupported("sort cards", "expected by")
        key = self.ex.expr(ts).js
        self.emit(ind, f"await H.sortCards($, async () => {key}, {js_str(order)}, {js_str(kind)}, {bg});")

    # files: a virtual file system (localStorage) with a download when a written file is closed
    def c_open(self, ts, ind):
        if ts.take("file"):
            self.emit(ind, f"H.openFile({self.ex.expr(ts).js});")
            return
        if ts.take("printing"):
            ts.take("with")
            self.line_stub = None
            self.emit(ind, "H.openPrinting();")
            return
        raise Unsupported("open " + (ts.w() or ""), "applications are not available")

    def c_close(self, ts, ind):
        if ts.at("card") and ts.w(1) == "window":
            raise Unsupported("close card window", "")
        if ts.take("file"):
            self.emit(ind, f"await H.closeFile({self.ex.expr(ts).js});")
            return
        if ts.take("printing"):
            self.emit(ind, "await H.closePrinting();")
            return
        raise Unsupported("close " + (ts.w() or ""), "")

    def c_read(self, ts, ind):
        if not ts.take("from") or not ts.take("file"):
            raise Unsupported("read", "expected read from file")
        f = self.ex.expr(ts).js
        count, until = "null", "null"
        if ts.take("for"):
            count = self.ex.expr(ts).js
        elif ts.take("until"):
            until = self.ex.expr(ts).js
        self.declare_local("it")
        self.emit(ind, f"it = H.readFile({f}, {count}, {until});")

    def c_write(self, ts, ind):
        v = self.ex.expr(ts).js
        if not ts.take("to") or not ts.take("file"):
            raise Unsupported("write", "expected write ... to file")
        self.emit(ind, f"H.writeFile({self.ex.expr(ts).js}, {v});")

    def c_print(self, ts, ind):
        if ts.at("card", "cd") and (ts.w(1) is None or ts.w(1) in ("else",)):
            ts.next()
            self.emit(ind, "await H.printCard();")
            return
        ref = self.ex.objref(ts)
        if ref is None:
            raise Unsupported("print", "only fields and the card can be printed")
        self.emit(ind, f"await H.printText(H.value({ref}));")

    # things the browser cannot do (painting, external stacks)
    def _stub(self, name):
        def f(ts, ind):
            raise Unsupported(name, "not available in a browser")
        return f

    def c_drag(self, ts, ind):
        """drag from <point> to <point> [with keys]: a point is one expression ("x,y") or two (x, y)."""
        if not ts.take("from"):
            raise Unsupported("drag", "expected drag from")

        def point():
            a = self.ex.expr(ts).js
            if ts.take_op(","):
                return f"H.cat({a}, \",\", {self.ex.expr(ts).js})"
            return a
        p1 = point()
        if not ts.take("to"):
            raise Unsupported("drag", "expected to")
        p2 = point()
        if ts.take("with"):
            ts.rest_raw()
            ts.i = len(ts.t)
        self.emit(ind, f"await H.drag($, {p1}, {p2});")

    def c_reset(self, ts, ind):
        if ts.take("paint"):
            self.emit(ind, "H.resetPaint();")
            return
        if ts.take("menubar"):
            self.emit(ind, "H.resetMenubar();")
            return
        raise Unsupported("reset " + (ts.w() or ""), "")

    def c_create(self, ts, ind):
        if ts.take("menu"):
            self.emit(ind, f"H.createMenu({self.ex.expr(ts).js});")
            return
        raise Unsupported("create " + (ts.w() or ""), "")
    def c_start(self, ts, ind):
        # `start using stack "lib"`: the engine puts a compatibility shim for that library on the message
        # path when one exists in modern/hypercard/shims/ (otherwise it reports the stack as unavailable)
        if not ts.take("using"):
            raise Unsupported("start " + (ts.w() or ""), "")
        ts.take("stack")
        e = self.ex.expr(ts)
        self.emit(ind, f"H.startUsing({e.js});")

    def c_stop(self, ts, ind):
        if not ts.take("using"):
            raise Unsupported("stop " + (ts.w() or ""), "")
        ts.take("stack")
        e = self.ex.expr(ts)
        self.emit(ind, f"H.stopUsing({e.js});")
    def c_edit(self, ts, ind): raise Unsupported("edit", "")
    def c_palette(self, ts, ind): raise Unsupported("palette", "")
    def c_picture(self, ts, ind): raise Unsupported("picture", "")
    def c_convert(self, ts, ind): raise Unsupported("convert", "")
    def c_mark(self, ts, ind): raise Unsupported("mark", "")
    def c_unmark(self, ts, ind): raise Unsupported("unmark", "")
    def c_import(self, ts, ind): raise Unsupported("import", "")
    def c_export(self, ts, ind): raise Unsupported("export", "")

    def c_arrowkey(self, ts, ind):
        e = self.ex.expr(ts)
        self.emit(ind, f"await H.send($, H.cat(\"arrowKey \", {e.js}), null);")


# --------------------------------------------------------------------------------------------------
# Whole scripts
# --------------------------------------------------------------------------------------------------

def collect_handler_names(scripts):
    on, fn = set(), set()
    for s in scripts:
        hs, _ = split_handlers(s)
        for h in hs:
            (on if h.kind == "on" else fn).add(h.name.lower())
    return on, fn


def translate_script(text: str, owner_js: str, user_handlers: set, user_functions: set, ind=1):
    """Translate one script. Returns (js_lines, Stats). `owner_js` is a JS expression for the owner id."""
    hs, outside = split_handlers(text)
    total = Stats(outside=outside)
    out = []
    for h in hs:
        ht = HandlerTranslator(h, user_handlers, user_functions)
        body, st = ht.translate()
        params = ", ".join(["$"] + [HandlerTranslator.safe(p) for p in h.params])
        reg = "on" if h.kind == "on" else "fn"
        fname = HandlerTranslator.safe(h.name)
        out.append("  " * ind + f"// {h.header.orig.strip()}")
        out.append("  " * ind + f"H.{reg}({owner_js}, {js_str(h.name)}, async function {fname}({params}) {{")
        plow = {p.lower() for p in h.params}
        decl, lit = [], []
        for k, v in ht.locals_low.items():
            if k in plow:
                continue
            how, orig = ht.first_use.get(k, ("w", k))
            if how == "r" and k != "it":
                decl.append(f"{v} = {js_str(orig)}")
                lit.append(orig)
            else:
                decl.append(f"{v} = \"\"")
        if decl:
            out.append("  " * (ind + 1) + "let " + ", ".join(decl) + ";")
        if lit:
            out.append("  " * (ind + 1) + f"// read before any put: HyperTalk uses the name itself ({', '.join(lit)})")
        out.extend(body)
        out.append("  " * ind + "});")
        if h.footer:
            out.append("  " * ind + f"// {h.footer.orig.strip()}")
        total.lines += st.lines
        total.translated += st.translated
        total.stubbed += st.stubbed
        total.stub_list += st.stub_list
        total.externals |= st.externals
        total.handlers += 1
    return out, total


if __name__ == "__main__":
    import sys
    src = open(sys.argv[1], encoding="utf-8").read()
    on, fn = collect_handler_names([src])
    js, st = translate_script(src, '"owner"', on, fn)
    print("\n".join(js))
    print(f"// lines {st.lines}, translated {st.translated}, stubbed {st.stubbed}", file=sys.stderr)
