/* Cell renderer plugin ("cells" units): character-grid screens, e.g. ZZT boards (60x25 cells).
 *
 * Each cell is 8x14 px. A glyph is an 8x14 bitmap mask, taken from (in order):
 *   1. LINE / BOX tables below (double-line walls; drawn as exact pixel patterns)
 *   2. window.CP437_FONT, glyphs harvested from reference screenshots (cp437-font.js)
 *   3. shade/block characters (176-178, 219-223) as pixel patterns / filled rects
 *   4. box-drawing characters 179-218 composed from line segments
 *   5. anything else: the CP437 code mapped to Unicode, drawn once with a monospace canvas font and
 *      thresholded to a crisp 1-bit mask.
 * Masks are cached; drawing writes straight into an ImageData buffer, then one putImageData.
 *
 *   const r = rt.createRenderer(canvas, { cols: 80, rows: 25, palette });
 *   r.cell(col, row, code, fg, bg);   r.text(col, row, 'Health', fg, bg);   r.flush();
 */
(function () {
  'use strict';
  const CW = 8, CH = 14;

  // CP437 -> Unicode (0x00-0xFF)
  const CP437 = (
    '\u0000☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼' +
    ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂' +
    'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»' +
    '░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀' +
    'αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ');
  const UNI = [...CP437];

  // Double-line glyphs used by line walls, as 5 bands: rows 0-4, row 5, row 6, row 7, rows 8-13.
  const V = '..##.##.', E = '........', F = '########';
  const DOUBLE = {
    186: [V, V, V, V, V],                                   // ║ NS
    205: [E, F, E, F, E],                                   // ═ EW
    201: [E, '..######', '..##....', '..##.###', V],        // ╔ SE
    187: [E, '#######.', '.....##.', '####.##.', V],        // ╗ SW
    188: [V, '####.##.', '.....##.', '#######.', E],        // ╝ NW
    200: [V, '..##.###', '..##....', '..######', E],        // ╚ NE
    206: [V, '####.###', E, '####.###', V],                 // ╬ NSEW
    204: [V, '..##.###', '..##....', '..##.###', V],        // ╠ NSE
    185: [V, '####.##.', '.....##.', '####.##.', V],        // ╣ NSW
    202: [V, '####.###', E, F, E],                          // ╩ NEW
    203: [E, F, E, '####.###', V],                          // ╦ SEW
    208: [V, V, V, F, E],                                   // ╨ N end
    210: [E, E, E, F, V],                                   // ╥ S end
    181: ['...##...', '#####...', '...##...', '#####...', '...##...'],  // ╡ W end
    198: ['...##...', '...#####', '...##...', '...#####', '...##...'],  // ╞ E end
  };
  /** Line-wall neighbour key (letters in N,S,E,W order) -> CP437 code. All 16 sets. */
  const LINE_CHAR = {
    '': 249, N: 208, S: 210, NS: 186, W: 181, NW: 188, SW: 187, NSW: 185,
    E: 198, NE: 200, SE: 201, NSE: 204, EW: 205, NEW: 202, SEW: 203, NSEW: 206,
  };

  // Box drawing 179-218: [up, down, left, right], 0 none, 1 single, 2 double
  const BOX = {
    179: [1, 1, 0, 0], 180: [1, 1, 1, 0], 181: [1, 1, 2, 0], 182: [2, 2, 1, 0], 183: [0, 2, 1, 0], 184: [0, 1, 2, 0],
    185: [2, 2, 2, 0], 186: [2, 2, 0, 0], 187: [0, 2, 2, 0], 188: [2, 0, 2, 0], 189: [2, 0, 1, 0], 190: [1, 0, 2, 0],
    191: [0, 1, 1, 0], 192: [1, 0, 0, 1], 193: [1, 0, 1, 1], 194: [0, 1, 1, 1], 195: [1, 1, 0, 1], 196: [0, 0, 1, 1],
    197: [1, 1, 1, 1], 198: [1, 1, 0, 2], 199: [2, 2, 0, 1], 200: [2, 0, 0, 2], 201: [0, 2, 0, 2], 202: [2, 0, 2, 2],
    203: [0, 2, 2, 2], 204: [2, 2, 0, 2], 205: [0, 0, 2, 2], 206: [2, 2, 2, 2], 207: [1, 0, 2, 2], 208: [2, 0, 1, 1],
    209: [0, 1, 2, 2], 210: [0, 2, 1, 1], 211: [2, 0, 0, 1], 212: [1, 0, 0, 2], 213: [0, 1, 0, 2], 214: [0, 2, 0, 1],
    215: [2, 2, 1, 1], 216: [1, 1, 2, 2], 217: [1, 0, 1, 0], 218: [0, 1, 0, 1],
  };

  function fromBands(b) {
    const m = new Uint8Array(CW * CH);
    const rowPat = y => (y < 5 ? b[0] : y === 5 ? b[1] : y === 6 ? b[2] : y === 7 ? b[3] : b[4]);
    for (let y = 0; y < CH; y++) { const p = rowPat(y); for (let x = 0; x < CW; x++) m[y * CW + x] = p[x] === '#' ? 1 : 0; }
    return m;
  }
  function fromHex(h) {
    const m = new Uint8Array(CW * CH);
    for (let y = 0; y < CH; y++) { const v = parseInt(h.substr(y * 2, 2), 16); for (let x = 0; x < CW; x++) m[y * CW + x] = (v >> (7 - x)) & 1; }
    return m;
  }
  function fromFn(f) {
    const m = new Uint8Array(CW * CH);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) m[y * CW + x] = f(x, y) ? 1 : 0;
    return m;
  }
  function boxMask([u, d, l, r]) {
    return fromFn((x, y) => {
      const sv = x === 3 || x === 4, dv = x === 2 || x === 3 || x === 5 || x === 6;
      const sh = y === 7, dh = y === 5 || y === 7;
      if (u && y <= 7 && (u === 1 ? sv : dv)) return true;
      if (d && y >= 5 && (d === 1 ? sv : dv)) return true;
      if (l && x <= 4 && (l === 1 ? sh : dh)) return true;
      if (r && x >= 3 && (r === 1 ? sh : dh)) return true;
      return false;
    });
  }

  let textCanvas = null;
  function fromFont(code) {
    const ch = UNI[code] || '?';
    if (!textCanvas) textCanvas = document.createElement('canvas');
    textCanvas.width = CW * 4; textCanvas.height = CH * 4;
    const g = textCanvas.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#000'; g.fillRect(0, 0, textCanvas.width, textCanvas.height);
    g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.font = `bold ${CH * 4 - 8}px "Consolas", "Courier New", monospace`;
    const w = g.measureText(ch).width || 1;
    g.save(); g.translate(CW * 2, CH * 2 + 2);
    if (w > CW * 4) g.scale(CW * 4 / w, 1);
    g.fillText(ch, 0, 0); g.restore();
    const big = g.getImageData(0, 0, textCanvas.width, textCanvas.height).data;
    return fromFn((x, y) => {   // 4x4 supersampled -> 1 bit
      let s = 0;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) s += big[((y * 4 + j) * textCanvas.width + x * 4 + i) * 4];
      return s / 16 > 100;
    });
  }

  const cache = new Map();
  /** 8x14 mask (Uint8Array of 0/1) for a CP437 code. */
  function glyph(code) {
    if (cache.has(code)) return cache.get(code);
    let m;
    const font = (!window.LEGACY_NO_FONT && window.CP437_FONT) || {};   // ?font=0 disables harvested glyphs
    if (DOUBLE[code]) m = fromBands(DOUBLE[code]);
    else if (font[code] != null) m = fromHex(font[code]);
    else if (code === 0 || code === 32 || code === 255) m = new Uint8Array(CW * CH);
    else if (code === 176) m = fromFn((x, y) => (y % 2 ? x % 4 === 1 : x % 4 === 3));
    else if (code === 177) m = fromFn((x, y) => (x + y) % 2 === 1);
    else if (code === 178) m = fromFn((x, y) => !(y % 2 ? x % 4 === 0 : x % 4 === 2));
    else if (code === 219) m = fromFn(() => true);
    else if (code === 220) m = fromFn((x, y) => y >= 7);
    else if (code === 223) m = fromFn((x, y) => y < 7);
    else if (code === 221) m = fromFn(x => x < 4);
    else if (code === 222) m = fromFn(x => x >= 4);
    else if (BOX[code]) m = boxMask(BOX[code]);
    else m = fromFont(code);
    cache.set(code, m);
    return m;
  }

  function createCellsRenderer(rt, canvas, opts = {}) {
    const cols = opts.cols || (rt.ir.size && rt.ir.size.width) || 60;
    const rows = opts.rows || (rt.ir.size && rt.ir.size.height) || 25;
    canvas.width = cols * CW; canvas.height = rows * CH;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(canvas.width, canvas.height);
    const buf = img.data;
    let palette = opts.palette || [[0, 0, 0], [0, 0, 168], [0, 168, 0], [0, 168, 168], [168, 0, 0], [168, 0, 168],
      [168, 84, 0], [168, 168, 168], [84, 84, 84], [84, 84, 252], [84, 252, 84], [84, 252, 252], [252, 84, 84],
      [252, 84, 252], [252, 252, 84], [252, 252, 252]];
    const W = canvas.width;
    return {
      cols, rows, cellW: CW, cellH: CH, canvas, LINE_CHAR, unicode: UNI,
      setPalette(p) { if (p && p.length >= 16) palette = p; },
      /** Draw one cell. code null -> placeholder (a small hollow box). */
      cell(col, row, code, fg, bg) {
        if (col < 0 || row < 0 || col >= cols || row >= rows) return;
        const m = code == null ? PLACEHOLDER : glyph(code);
        const f = palette[fg & 15], b = palette[bg & 15];
        let p = ((row * CH) * W + col * CW) * 4;
        for (let y = 0; y < CH; y++, p += (W - CW) * 4) {
          for (let x = 0; x < CW; x++, p += 4) {
            const c = m[y * CW + x] ? f : b;
            buf[p] = c[0]; buf[p + 1] = c[1]; buf[p + 2] = c[2]; buf[p + 3] = 255;
          }
        }
      },
      /** Draw a Unicode/ASCII string (characters mapped back to CP437 where possible). */
      text(col, row, str, fg, bg) {
        for (const ch of String(str)) { this.cell(col++, row, toCp437(ch), fg, bg); }
      },
      fill(col, row, w, h, bg) { for (let y = row; y < row + h; y++) for (let x = col; x < col + w; x++) this.cell(x, y, 32, bg, bg); },
      flush() { ctx.putImageData(img, 0, 0); },
    };
  }
  const PLACEHOLDER = fromFn((x, y) => (x === 1 || x === 6) && y >= 3 && y <= 10 || (y === 3 || y === 10) && x >= 1 && x <= 6);
  const REV = new Map(UNI.map((c, i) => [c, i]));
  function toCp437(ch) { return REV.has(ch) ? REV.get(ch) : (ch.charCodeAt(0) < 256 ? ch.charCodeAt(0) : 63); }

  LegacyRuntime.registerRenderer('cells', createCellsRenderer);
  LegacyRuntime.cp437 = { unicode: UNI, toCp437, glyph, LINE_CHAR };
})();
