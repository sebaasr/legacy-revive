/* Pixel renderer plugin ("px" units): bitmap screens with live buttons and fields (HyperCard cards).
 *
 *   const r = rt.createRenderer(hostDiv, {
 *     view: obj => ({ id, kind, name, rect, visible, hilite, enabled, shape, showName, icon, font, size,
 *                     lineHeight, align, style: ['bold',...], lockText, text, runs, scroll, autoHilite }),
 *     pictureVisible: (screenId, layerOrScreenId) => bool,
 *     onPartEvent: (type, objectId, info) => {},   // mouseDown/mouseUp/mouseEnter/mouseLeave/fieldInput/fieldChanged
 *     onCardEvent: (type, info) => {},             // mouseDown/mouseUp on the screen outside any object
 *   });
 *   await r.ready;               // every image decoded
 *   r.drawScreen(screen);        // white, layer images, screen image (canvas), then objects (DOM)
 *   r.refresh();                 // re-apply view() to every object of the current screen
 *   r.hitTest(x, y)              // topmost visible object id at a screen point, or null
 *
 * Images: `window.LEGACY_ASSETS` maps IR paths ("assets/card-1.png") to data URLs (so the app works from
 * file:// and the canvas is never tainted); a plain relative URL is used otherwise.
 *
 * Buttons and fields are real DOM elements over the canvas: fields are editable (contenteditable),
 * selectable, scrollable and readable by screen readers. A 1-bit SVG threshold filter keeps text crisp
 * like a 1987 Mac screen (`?aa=1` turns it off). Classic Mac fonts are mapped to available ones.
 */
(function () {
  'use strict';
  if (LegacyRuntime.renderers.pixels && LegacyRuntime.renderers.pixels.full) return;

  const FONTS = {
    chicago: ['"Chicago", "ChicagoFLF", "Segoe UI", Tahoma, Arial, sans-serif', 'bold'],
    charcoal: ['"Charcoal", "Segoe UI", Tahoma, Arial, sans-serif', 'bold'],
    geneva: ['Geneva, Tahoma, Verdana, "DejaVu Sans", sans-serif', null],
    'new york': ['"New York", Georgia, "Times New Roman", serif', null],
    times: ['"Times New Roman", Times, serif', null],
    palatino: ['"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif', null],
    helvetica: ['Helvetica, Arial, sans-serif', null],
    'n helvetica narrow': ['"Arial Narrow", "Helvetica Narrow", Arial, sans-serif', null],
    courier: ['"Courier New", Courier, monospace', null],
    monaco: ['Monaco, "Lucida Console", Consolas, monospace', null],
  };
  function fontFor(name, kind) {
    const n = String(name || (kind === 'button' ? 'Chicago' : 'Geneva')).toLowerCase();
    if (FONTS[n]) return FONTS[n];
    const k = Object.keys(FONTS).find(f => n.startsWith(f));
    if (k) return FONTS[k];
    return [`"${name}", Geneva, Verdana, sans-serif`, null];
  }
  function styleCss(el, styles, baseWeight) {
    const s = new Set(styles || []);
    el.style.fontWeight = s.has('bold') || baseWeight === 'bold' ? 'bold' : 'normal';
    el.style.fontStyle = s.has('italic') ? 'italic' : 'normal';
    el.style.textDecoration = s.has('underline') ? 'underline' : 'none';
    el.style.letterSpacing = s.has('condense') ? '-1px' : s.has('extend') ? '1px' : '';
    el.classList.toggle('lr-outline', s.has('outline') || s.has('shadow'));
    el.classList.toggle('lr-shadow', s.has('shadow'));
  }

  function installFilter() {
    if (document.getElementById('lr-1bit')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.innerHTML = '<filter id="lr-1bit" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">' +
      '<feComponentTransfer><feFuncR type="discrete" tableValues="0 0 1"/><feFuncG type="discrete" tableValues="0 0 1"/>' +
      '<feFuncB type="discrete" tableValues="0 0 1"/><feFuncA type="discrete" tableValues="0 1 1"/></feComponentTransfer></filter>';
    document.body.appendChild(svg);
  }

  /** Map a character offset in an element's text to a DOM (node, offset). */
  function locate(el, offset) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n, left = offset, last = null;
    while ((n = walker.nextNode())) {
      last = n;
      if (left <= n.data.length) return [n, left];
      left -= n.data.length;
    }
    return last ? [last, last.data.length] : [el, 0];
  }
  function offsetOf(el, node, off) {
    const r = document.createRange();
    r.selectNodeContents(el);
    try { r.setEnd(node, off); } catch (e) { return 0; }
    return r.toString().length;
  }

  class PixelRenderer {
    constructor(rt, host, opts = {}) {
      this.rt = rt;
      this.opts = opts;
      this.W = (rt.ir.size && rt.ir.size.width) || 512;
      this.H = (rt.ir.size && rt.ir.size.height) || 342;
      if (host instanceof HTMLCanvasElement) { this.canvas = host; host = host.parentElement; }
      this.root = document.createElement('div');
      this.root.className = 'lr-px';
      this.root.style.width = this.W + 'px';
      this.root.style.height = this.H + 'px';
      if (!this.canvas) this.canvas = document.createElement('canvas');
      this.canvas.width = this.W; this.canvas.height = this.H;
      this.canvas.className = 'lr-px-canvas';
      // HyperCard layering: background picture (canvas) < background parts < card picture < card parts.
      // All of it except the background canvas sits in `parts`, which carries the 1-bit filter.
      this.parts = document.createElement('div');
      this.parts.className = 'lr-parts';
      this.bgParts = document.createElement('div');
      this.bgParts.className = 'lr-layer';
      this.cardCanvas = document.createElement('canvas');
      this.cardCanvas.width = this.W; this.cardCanvas.height = this.H;
      this.cardCanvas.className = 'lr-px-canvas lr-card-pict';
      this.cardParts = document.createElement('div');
      this.cardParts.className = 'lr-layer';
      this.parts.append(this.bgParts, this.cardCanvas, this.cardParts);
      this.inv = document.createElement('div');
      this.inv.className = 'lr-inv';
      this.root.append(this.canvas, this.parts, this.inv);
      host.appendChild(this.root);
      if (rt.params.get('aa') !== '1') { installFilter(); this.parts.classList.add('lr-crisp'); }
      this.ctx = this.canvas.getContext('2d');
      this.cctx = this.cardCanvas.getContext('2d');
      this.els = new Map();      // object id -> {el, inv, label, img, text}
      this.order = [];           // object ids, back to front
      this.screen = null;
      this.images = new Map();
      this.ready = this._preload();
      this._bindCard();
    }

    // ---- images --------------------------------------------------------------------------------
    src(path) { const A = window.LEGACY_ASSETS || {}; return A[path] || path; }
    image(path) {
      if (!path) return null;
      if (!this.images.has(path)) {
        const im = new Image();
        im.src = this.src(path);
        this.images.set(path, im);
      }
      return this.images.get(path);
    }
    /** Decode the images of the start screen and the icons (other screens decode on demand and are
     *  repainted when ready, so big stacks do not delay the first frame). */
    _preload() {
      const paths = new Set();
      const s0 = this.rt.screen(this.rt.ir.start_screen) || this.rt.ir.screens[0];
      for (const lid of (s0 && s0.layers) || []) { const l = this.rt.layers.get(lid); if (l && l.image) paths.add(l.image); }
      if (s0 && s0.image) paths.add(s0.image);
      for (const a of this.rt.ir.assets || []) if (a.kind === 'image' && /icon/.test(a.id)) paths.add(a.file);
      return Promise.all([...paths].map(p => {
        const im = this.image(p);
        return im.decode ? im.decode().catch(() => null) : new Promise(r => { im.onload = im.onerror = r; });
      }));
    }

    // ---- screens --------------------------------------------------------------------------------
    paint(screen) {
      const c = this.ctx;
      c.imageSmoothingEnabled = false;
      c.fillStyle = '#fff';
      c.fillRect(0, 0, this.W, this.H);
      const vis = this.opts.pictureVisible || (() => true);
      const pics = [];
      for (const lid of screen.layers || []) {
        const l = this.rt.layers.get(lid);
        if (l && l.image && vis(screen.id, lid)) pics.push(this.image(l.image));
      }
      const cardPic = screen.image && vis(screen.id, screen.id) ? this.image(screen.image) : null;
      const pending = pics.concat(cardPic ? [cardPic] : []).filter(im => !(im.complete && im.naturalWidth));
      if (pending.length) {
        // repaint this screen once its pictures are decoded
        Promise.all(pending.map(im => (im.decode ? im.decode().catch(() => null) : null)))
          .then(() => { if (this.screen === screen) this.paint(screen); });
      }
      for (const im of pics) if (im.complete && im.naturalWidth) c.drawImage(im, 0, 0);
      this.cctx.clearRect(0, 0, this.W, this.H);
      if (cardPic && cardPic.complete && cardPic.naturalWidth) { this.cctx.imageSmoothingEnabled = false; this.cctx.drawImage(cardPic, 0, 0); }
    }

    drawScreen(screen) {
      this.screen = screen;
      this.paint(screen);
      this.bgParts.textContent = '';
      this.cardParts.textContent = '';
      this.inv.textContent = '';
      this.els.clear();
      this.order = [];
      const objs = [];
      for (const lid of screen.layers || []) { const l = this.rt.layers.get(lid); if (l) objs.push(...(l.objects || [])); }
      objs.push(...(screen.objects || []));
      for (const o of objs) this._create(o);
      this.refresh();
    }

    refresh() {
      if (!this.screen) return;
      for (const id of this.order) this._apply(this.els.get(id));
    }

    // ---- objects --------------------------------------------------------------------------------
    _create(o) {
      const rec = { o, last: {} };
      const el = document.createElement(o.kind === 'button' ? 'button' : 'div');
      el.className = 'lr-part lr-' + o.kind;
      el.dataset.id = o.id;
      if (o.kind === 'button') {
        el.type = 'button';
        rec.img = document.createElement('img');
        rec.img.className = 'lr-icon';
        rec.img.alt = '';
        rec.label = document.createElement('span');
        rec.label.className = 'lr-label';
        el.append(rec.img, rec.label);
      } else {
        rec.text = document.createElement('div');
        rec.text.className = 'lr-text';
        el.appendChild(rec.text);
      }
      const inv = document.createElement('div');
      inv.className = 'lr-hilite';
      rec.el = el; rec.inv = inv;
      (this.rt.layers.has(o.id.split('/')[0]) ? this.bgParts : this.cardParts).appendChild(el);
      this.inv.appendChild(inv);
      this.els.set(o.id, rec);
      this.order.push(o.id);
      this._bindPart(rec);
    }

    _apply(rec) {
      const v = this.opts.view ? this.opts.view(rec.o) : rec.o;
      rec.v = v;
      const { el, inv } = rec;
      const [l, t, r, b] = v.rect;
      Object.assign(el.style, { left: l + 'px', top: t + 'px', width: Math.max(0, r - l) + 'px', height: Math.max(0, b - t) + 'px' });
      el.style.display = v.visible ? '' : 'none';
      const shape = String(v.shape || 'transparent').toLowerCase();
      el.dataset.shape = shape;
      const [family, weight] = fontFor(v.font, v.kind);
      el.style.fontFamily = family;
      el.style.fontSize = (v.size || 12) + 'px';
      el.style.textAlign = v.align === 'right' ? 'right' : v.align === 'center' ? 'center' : 'left';
      styleCss(el, v.style, weight);
      if (v.kind === 'button') this._applyButton(rec, v, shape);
      else this._applyField(rec, v, shape);
      // highlight = inverted rectangle (drawn by an overlay that inverts what is under it)
      const inverted = v.visible && v.kind === 'button' && (v.hilite || rec.pressed) &&
        !['checkbox', 'radiobutton', 'style-5', 'style-6'].includes(shape);
      Object.assign(inv.style, { left: l + 'px', top: t + 'px', width: Math.max(0, r - l) + 'px', height: Math.max(0, b - t) + 'px',
        display: inverted ? 'block' : 'none' });
      inv.dataset.shape = shape;
    }

    _applyButton(rec, v, shape) {
      const { el, img, label } = rec;
      el.disabled = false;
      el.classList.toggle('lr-disabled', !v.enabled);
      el.setAttribute('aria-disabled', v.enabled ? 'false' : 'true');
      el.setAttribute('aria-label', v.name || 'button');
      el.classList.toggle('lr-checked', !!v.hilite);
      const showName = v.showName || ['checkbox', 'radiobutton', 'style-5', 'style-6'].includes(shape);
      label.textContent = showName ? v.name : '';
      label.style.display = showName ? '' : 'none';
      const hasIcon = !!v.icon;
      if (hasIcon) {
        img.src = this.src(v.icon);
        img.style.display = '';
      } else img.style.display = 'none';
      const iconSlot = hasIcon || !!(v.iconId && v.iconId !== 0);
      el.classList.toggle('lr-has-icon', iconSlot);
      const lh = v.lineHeight || 16;
      el.style.lineHeight = lh + 'px';
      // layout like HyperCard: icon centred (moved up when the name is shown), name under it
      const [l, t, r, b] = v.rect;
      const w = r - l, h = b - t;
      const border = ['transparent', 'opaque', 'checkbox', 'radiobutton'].includes(shape) ? 0 : 1;
      const iconTop = Math.floor((h - 32) / 2) + (showName ? (v.iconTopOffset != null ? v.iconTopOffset : -6) : 0) - border;
      img.style.left = (Math.floor((w - 32) / 2) - border) + 'px';
      img.style.top = iconTop + 'px';
      label.style.top = (iconSlot && showName ? iconTop + 32 : Math.floor((h - lh) / 2) - border) + 'px';
      label.style.height = lh + 'px';
      if (iconSlot && showName) {
        // HyperCard draws the names of icon buttons in 9-point Geneva
        label.style.fontFamily = fontFor('Geneva', 'field')[0];
        label.style.fontSize = '9px';
        label.style.fontWeight = 'normal';
        label.style.lineHeight = '12px';
        label.style.height = '12px';
      } else {
        label.style.fontFamily = label.style.fontSize = label.style.fontWeight = label.style.lineHeight = '';
      }
    }

    _applyField(rec, v, shape) {
      const { el, text } = rec;
      const editable = !v.lockText;
      if (el.isContentEditable !== editable) el.contentEditable = editable ? 'plaintext-only' : 'false';
      if (el.contentEditable === 'plaintext-only' && !el.isContentEditable && editable) el.contentEditable = 'true';
      el.tabIndex = editable ? 0 : -1;
      el.setAttribute('role', 'textbox');
      el.setAttribute('aria-multiline', 'true');
      el.setAttribute('aria-readonly', editable ? 'false' : 'true');
      const lh = PixelRenderer.lineHeight(v.font, v.size || 12, v.lineHeight || 16);
      el.style.lineHeight = lh + 'px';
      // Put the first baseline where QuickDraw puts it (about 3/4 of the line height below the line top)
      // instead of where CSS centres the font in the line box.
      const [fam] = fontFor(v.font, 'field');
      const m = PixelRenderer.metrics(`${el.style.fontWeight} ${v.size || 12}px ${fam}`);
      const cssBase = (lh - (m.asc + m.desc)) / 2 + m.asc;
      text.style.marginTop = Math.round(PixelRenderer.macAscent(v.font, v.size || 12, lh) - cssBase) + 'px';
      const key = v.text + '\u0000' + JSON.stringify(v.runs || []);
      if (rec.lastText !== key && !(document.activeElement === el && this._domText(rec) === v.text)) {
        rec.lastText = key;
        text.textContent = '';
        if (v.runs && v.runs.length > 1) {
          for (let i = 0; i < v.runs.length; i++) {
            const r = v.runs[i], end = i + 1 < v.runs.length ? v.runs[i + 1].start : v.text.length;
            if (end <= r.start) continue;
            const span = document.createElement('span');
            span.textContent = v.text.slice(r.start, end);
            const [fam, w] = fontFor(r.font || v.font, 'field');
            span.style.fontFamily = fam;
            if (r.size) span.style.fontSize = r.size + 'px';
            styleCss(span, PixelRenderer.styleNames(r.style), w);
            text.appendChild(span);
          }
        } else {
          text.textContent = v.text;
        }
        if (v.text.endsWith('\n')) text.appendChild(document.createElement('br'));
      }
      if (shape === 'scrolling' && v.scroll != null && rec.lastScroll !== v.scroll) { el.scrollTop = v.scroll; rec.lastScroll = v.scroll; }
    }

    static metrics(font) {
      const cache = PixelRenderer._m || (PixelRenderer._m = new Map());
      if (!cache.has(font)) {
        const c = (PixelRenderer._mc || (PixelRenderer._mc = document.createElement('canvas'))).getContext('2d');
        c.font = font;
        const t = c.measureText('Hxgy');
        cache.set(font, { asc: t.fontBoundingBoxAscent || 0, desc: t.fontBoundingBoxDescent || 0 });
      }
      return cache.get(font);
    }

    static styleNames(bits) {
      const b = (bits || 0) >> 8;
      return ['bold', 'italic', 'underline', 'outline', 'shadow', 'condense', 'extend'].filter((_, i) => b & (1 << i));
    }

    _domText(rec) { return (rec.text.innerText || '').replace(/\r/g, '').replace(/\n$/, ''); }

    // ---- input ---------------------------------------------------------------------------------
    point(ev) {
      const r = this.root.getBoundingClientRect();
      const k = r.width / this.W || 1;
      return { x: Math.round((ev.clientX - r.left) / k), y: Math.round((ev.clientY - r.top) / k) };
    }

    _isBackdrop(t) { return [this.canvas, this.parts, this.bgParts, this.cardParts, this.cardCanvas, this.root].includes(t); }

    _bindCard() {
      const send = (type, ev) => { if (this.opts.onCardEvent) this.opts.onCardEvent(type, this.point(ev)); };
      let down = false;
      this.root.addEventListener('pointerdown', ev => {
        if (!this._isBackdrop(ev.target)) return;
        down = true;
        if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
        send('mouseDown', ev);
      });
      this.root.addEventListener('pointerup', ev => {
        if (!down) return;
        down = false;
        if (!this._isBackdrop(ev.target)) return;
        send('mouseUp', ev);
      });
    }

    _bindPart(rec) {
      const { el, o } = rec;
      const fire = (type, info) => { if (this.opts.onPartEvent) this.opts.onPartEvent(type, o.id, info); };
      el.addEventListener('pointerenter', () => fire('mouseEnter'));
      el.addEventListener('pointerleave', () => fire('mouseLeave'));
      if (o.kind === 'button') {
        el.addEventListener('pointerdown', ev => {
          if (!rec.v || !rec.v.enabled || ev.button !== 0) return;
          ev.preventDefault();
          el.setPointerCapture(ev.pointerId);
          rec.pressed = !!rec.v.autoHilite && !['checkbox', 'radiobutton', 'style-5', 'style-6'].includes(String(rec.v.shape));
          this._apply(rec);
          fire('mouseDown', this.point(ev));
        });
        el.addEventListener('pointerup', ev => {
          if (!rec.v || !rec.v.enabled || ev.button !== 0) return;
          const wasPressed = rec.pressed;
          rec.pressed = false;
          this._apply(rec);
          const r = el.getBoundingClientRect();
          const inside = ev.clientX >= r.left && ev.clientX < r.right && ev.clientY >= r.top && ev.clientY < r.bottom;
          if (inside) fire('mouseUp', this.point(ev));
          void wasPressed;
        });
        el.addEventListener('keydown', ev => {
          if ((ev.key === 'Enter' || ev.key === ' ') && rec.v && rec.v.enabled) { ev.preventDefault(); ev.stopPropagation(); fire('mouseDown', {}); fire('mouseUp', {}); }
        });
        return;
      }
      // fields: locked fields get mouse messages (with the clicked chunk); unlocked fields are edited
      el.addEventListener('pointerdown', ev => {
        if (!rec.v || !rec.v.lockText) return;
        if (ev.offsetX > el.clientWidth) return;   // scrollbar
        const p = this.point(ev);
        fire('mouseDown', Object.assign(p, { chunk: this.chunkAt(o.id, p.x, p.y) }));
      });
      el.addEventListener('pointerup', ev => {
        if (!rec.v || !rec.v.lockText) return;
        if (ev.offsetX > el.clientWidth) return;
        const p = this.point(ev);
        fire('mouseUp', Object.assign(p, { chunk: this.chunkAt(o.id, p.x, p.y) }));
      });
      el.addEventListener('input', () => { rec.dirty = true; fire('fieldInput', { text: this._domText(rec) }); });
      el.addEventListener('blur', () => { if (rec.dirty) { rec.dirty = false; fire('fieldChanged', {}); } });
      el.addEventListener('scroll', () => { rec.lastScroll = el.scrollTop; });
    }

    hitTest(x, y) {
      for (let i = this.order.length - 1; i >= 0; i--) {
        const rec = this.els.get(this.order[i]);
        const v = rec.v;
        if (!v || !v.visible) continue;
        const [l, t, r, b] = v.rect;
        if (x >= l && x < r && y >= t && y < b) return v.id;
      }
      return null;
    }

    /** The word/line under a point in a field, as HyperCard's clickChunk/clickLine/clickText. */
    chunkAt(id, x, y) {
      const rec = this.els.get(id);
      if (!rec || !rec.text) return { chunk: '', line: '', text: '' };
      const r = this.root.getBoundingClientRect();
      const k = r.width / this.W || 1;
      const cx = r.left + x * k, cy = r.top + y * k;
      let off = -1;
      const cr = document.caretRangeFromPoint ? document.caretRangeFromPoint(cx, cy) : null;
      if (cr && rec.text.contains(cr.startContainer)) off = offsetOf(rec.text, cr.startContainer, cr.startOffset);
      const text = rec.v ? rec.v.text : '';
      const owner = id.startsWith('card-') ? 'card' : 'bkgnd';
      const num = this._partNumber(id);
      const fname = `${owner} field ${num}`;
      if (off < 0 || !text) return { chunk: '', line: '', text: '' };
      let s = off, e = off;
      while (s > 0 && !/\s/.test(text[s - 1])) s--;
      while (e < text.length && !/\s/.test(text[e])) e++;
      if (s === e) return { chunk: '', line: `line ${text.slice(0, off).split('\n').length} of ${fname}`, text: '' };
      return { chunk: `char ${s + 1} to ${e} of ${fname}`, line: `line ${text.slice(0, off).split('\n').length} of ${fname}`, text: text.slice(s, e) };
    }
    _partNumber(id) {
      const owner = id.split('/')[0];
      const objs = (this.rt.layers.get(owner) || this.rt.screens.get(owner) || { objects: [] }).objects.filter(o => o.kind === 'field');
      return objs.findIndex(o => o.id === id) + 1;
    }

    // ---- text editing helpers used by HyperTalk commands ---------------------------------------
    focusedFieldId() {
      const a = document.activeElement;
      return a && a.classList && a.classList.contains('lr-field') && this.parts.contains(a) ? a.dataset.id : null;
    }
    insertText(t) {
      const id = this.focusedFieldId();
      if (!id) return false;
      document.execCommand('insertText', false, t);
      const rec = this.els.get(id);
      rec.dirty = true;
      if (this.opts.onPartEvent) this.opts.onPartEvent('fieldInput', id, { text: this._domText(rec) });
      return true;
    }
    selectRange(id, start, end) {
      const rec = this.els.get(id);
      if (!rec || !rec.text) return;
      if (rec.el.isContentEditable) rec.el.focus({ preventScroll: true });
      const [n1, o1] = locate(rec.text, start), [n2, o2] = locate(rec.text, end);
      const range = document.createRange();
      try { range.setStart(n1, o1); range.setEnd(n2, o2); } catch (e) { return; }
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    selectAll() {
      const id = this.focusedFieldId();
      if (id) { const rec = this.els.get(id); this.selectRange(id, 0, (rec.v && rec.v.text.length) || 0); }
    }
    placeCaret(id, x, y, extend) {
      const rec = this.els.get(id);
      if (!rec) return;
      const r = this.root.getBoundingClientRect();
      const k = r.width / this.W || 1;
      const cr = document.caretRangeFromPoint && document.caretRangeFromPoint(r.left + x * k, r.top + y * k);
      if (!cr || !rec.el.contains(cr.startContainer)) return;
      rec.el.focus({ preventScroll: true });
      const sel = window.getSelection();
      if (extend && sel.rangeCount) sel.extend(cr.startContainer, cr.startOffset);
      else { sel.removeAllRanges(); sel.addRange(cr); }
    }
    selectedLine() {
      const id = this.focusedFieldId();
      const sel = window.getSelection();
      if (!id || !sel.rangeCount) return '';
      const rec = this.els.get(id);
      const off = offsetOf(rec.text, sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
      const n = this._domText(rec).slice(0, off).split('\n').length;
      return `line ${n} of ${id.startsWith('card-') ? 'card' : 'bkgnd'} field ${this._partNumber(id)}`;
    }
    focusNextField() {
      const ids = this.order.filter(id => { const r = this.els.get(id); return r.o.kind === 'field' && r.v && r.v.visible && !r.v.lockText; });
      if (!ids.length) return;
      const cur = this.focusedFieldId();
      const next = ids[(ids.indexOf(cur) + 1) % ids.length];
      const rec = this.els.get(next);
      rec.el.focus();
      this.selectRange(next, 0, (rec.v.text || '').length);
    }
    commitFields() {
      const a = document.activeElement;
      if (a && this.parts.contains(a)) a.blur();
    }

    // ---- effects -------------------------------------------------------------------------------
    setCursor(css) { this.root.style.cursor = css; }
    invert(on) { this.root.classList.toggle('lr-inverted', !!on); }

    /** Draw the next screen with a visual effect (approximation of HyperCard's `visual effect`). */
    transition(draw, effect) {
      const e = String(effect || '').toLowerCase();
      const speed = /very\s+fast/.test(e) ? 150 : /fast/.test(e) ? 300 : /very\s+slow/.test(e) ? 1400 : /slow/.test(e) ? 900 : 500;
      // snapshot of the old screen: canvas copy + cloned objects
      const shot = document.createElement('div');
      shot.className = 'lr-shot';
      const c = document.createElement('canvas');
      c.width = this.W; c.height = this.H;
      c.getContext('2d').drawImage(this.canvas, 0, 0);
      const pc = this.parts.cloneNode(true);
      pc.querySelector('canvas').getContext('2d').drawImage(this.cardCanvas, 0, 0);
      shot.append(c, pc, this.inv.cloneNode(true));
      draw();
      if (/to black|to grey|to gray|to inverse/.test(e)) shot.style.background = '#000';
      this.root.appendChild(shot);
      let from = 'inset(0 0 0 0)', to = 'inset(0 0 0 0)', opacity = null, transform = null;
      if (/dissolve|venetian|checkerboard|to black/.test(e) || !e) opacity = true;
      else if (/wipe left/.test(e)) to = 'inset(0 100% 0 0)';
      else if (/wipe right/.test(e)) to = 'inset(0 0 0 100%)';
      else if (/wipe up/.test(e)) to = 'inset(0 0 100% 0)';
      else if (/wipe down/.test(e)) to = 'inset(100% 0 0 0)';
      else if (/scroll left/.test(e)) transform = 'translateX(-100%)';
      else if (/scroll right/.test(e)) transform = 'translateX(100%)';
      else if (/scroll up/.test(e)) transform = 'translateY(-100%)';
      else if (/scroll down/.test(e)) transform = 'translateY(100%)';
      else if (/iris close|zoom close|zoom in/.test(e)) { from = 'circle(75% at 50% 50%)'; to = 'circle(0% at 50% 50%)'; }
      else if (/iris open|zoom open|zoom out/.test(e)) { from = 'inset(0 0 0 0)'; to = 'inset(50% 50% 50% 50%)'; }
      else if (/barn door open/.test(e)) to = 'inset(0 50% 0 50%)';
      else if (/barn door close/.test(e)) to = 'inset(0 0 0 0)';
      else if (/stretch from bottom/.test(e)) to = 'inset(0 0 100% 0)';
      else if (/stretch from top/.test(e)) to = 'inset(100% 0 0 0)';
      else if (/stretch from center|shrink/.test(e)) to = 'inset(50% 0 50% 0)';
      else opacity = true;
      const kf = opacity ? [{ opacity: 1 }, { opacity: 0 }] : transform ? [{ transform: 'none' }, { transform }] : [{ clipPath: from }, { clipPath: to }];
      return new Promise(res => {
        const anim = shot.animate(kf, { duration: speed, easing: 'linear', fill: 'forwards' });
        anim.onfinish = () => { shot.remove(); res(); };
        setTimeout(() => { if (shot.isConnected) { shot.remove(); res(); } }, speed + 200);
      });
    }

    /** A small HyperCard-style message box under the card (`put x` with no destination). */
    setMessageBox(visible, text) {
      const host = this.opts.msgHost;
      if (!host) return;
      if (!this.msg) {
        this.msg = document.createElement('div');
        this.msg.className = 'lr-msgbox';
        host.appendChild(this.msg);
      }
      this.msg.style.display = visible && !this.rt.shot ? '' : 'none';
      this.msg.textContent = text;
    }
  }

  /** Baseline of the first line below the line top, per classic Mac font (ascent/size ratios fitted on
   *  the reference screenshots; unknown fonts use 3/4 of the line height). */
  PixelRenderer.ASCENT = { courier: 0.77, palatino: 1.2, helvetica: 0.85, times: 0.95, chicago: 1.0, geneva: 1.0 };
  /** Fonts whose lines are drawn at their natural height rather than the stored text height (fitted on
   *  Mark Twain's screenshot: Palatino 12 lines are 14 px apart although the field says 16). */
  PixelRenderer.NATURAL_LINE = { palatino: 14 / 12 };
  PixelRenderer.lineHeight = (font, size, lh) => {
    const n = String(font || '').toLowerCase();
    const k = Object.keys(PixelRenderer.NATURAL_LINE).find(f => n.startsWith(f));
    return k ? Math.min(lh, Math.round(size * PixelRenderer.NATURAL_LINE[k])) : lh;
  };
  PixelRenderer.macAscent = (font, size, lh) => {
    const n = String(font || 'geneva').toLowerCase();
    const k = Object.keys(PixelRenderer.ASCENT).find(f => n.startsWith(f) || n.includes(f));
    return k ? size * PixelRenderer.ASCENT[k] : lh * 0.75;
  };
  const factory = (rt, host, opts) => new PixelRenderer(rt, host, opts);
  factory.full = true;
  LegacyRuntime.registerRenderer('pixels', factory);
  window.PixelRenderer = PixelRenderer;
})();
