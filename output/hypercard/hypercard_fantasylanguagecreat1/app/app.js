/* Boot file for a HyperCard stack app: wires the shared runtime, the pixel renderer and the HyperCard
 * engine. Data comes from data.js (window.LEGACY_IR, window.LEGACY_ASSETS) and scripts.js
 * (window.HC_SCRIPTS); no fetch, so index.html opens by double-click from file://.
 *
 * URL options: ?card=N|name start on another card · ?shot=1 draw the start card only (for screenshots)
 *              &offset=x,y place the card window on a 512x342 desktop · ?aa=1 keep anti-aliased text
 *              ?zoom=2 enlarge the window
 */
(function () {
  'use strict';
  const wrap = document.getElementById('wrap');
  const rt = new LegacyRuntime(window.LEGACY_IR, { root: wrap });
  const ir = rt.ir;
  const offset = (rt.params.get('offset') || '').split(',').map(Number);
  const hasOffset = rt.shot && offset.length === 2 && offset.every(n => Number.isFinite(n));
  if (rt.shot) document.body.classList.add('shot');
  else document.title = `${ir.name} (HyperCard)`;

  // window: title bar + card area (the renderer draws inside .hc-card)
  const desk = document.createElement('div');
  desk.className = 'hc-desk';
  const win = document.createElement('div');
  win.className = 'hc-window';
  const title = document.createElement('div');
  title.className = 'hc-titlebar';
  const tspan = document.createElement('span');
  tspan.textContent = ir.name;
  title.appendChild(tspan);
  const cardDiv = document.createElement('div');
  cardDiv.className = 'hc-card';
  win.append(title, cardDiv);
  desk.appendChild(win);
  wrap.appendChild(desk);
  if (rt.shot && !hasOffset) win.classList.add('no-title');
  if (hasOffset) { win.style.left = (offset[0] - 1) + 'px'; win.style.top = (offset[1] - 19) + 'px'; }
  const under = document.createElement('div');
  under.className = 'hc-under';
  wrap.appendChild(under);

  const engine = new HyperCardEngine(rt, window.HC_SCRIPTS);
  const renderer = rt.createRenderer(cardDiv, {
    view: o => engine.partView(o),
    pictureVisible: (cardId, layerId) => engine.pictureVisible(cardId, layerId),
    onPartEvent: (type, id, info) => engine.onPartEvent(type, id, info),
    onCardEvent: (type, info) => engine.onCardEvent(type, info),
    msgHost: under,
  });
  engine.renderer = renderer;
  engine.dialogHost = win;
  engine.flashHost = win;
  window.rt = rt; window.engine = engine;    // handy from the browser console

  if (!rt.shot) {
    const z = Number(rt.params.get('zoom')) || 1;
    if (z !== 1) win.style.zoom = z;
    const track = e => {
      const p = renderer.point(e);
      engine.mouse.x = p.x; engine.mouse.y = p.y;
      engine.keys.shift = e.shiftKey; engine.keys.alt = e.altKey; engine.keys.ctrl = e.ctrlKey; engine.keys.meta = e.metaKey;
    };
    addEventListener('pointermove', track);
    addEventListener('pointerdown', e => { track(e); engine.mouse.down = true; engine.mouse.clicked = true; });
    addEventListener('pointerup', e => { track(e); engine.mouse.down = false; });
    addEventListener('keyup', e => { engine.keys.shift = e.shiftKey; engine.keys.alt = e.altKey; engine.keys.ctrl = e.ctrlKey; engine.keys.meta = e.metaKey; });
    addEventListener('keydown', e => {
      engine.keys.shift = e.shiftKey; engine.keys.alt = e.altKey; engine.keys.ctrl = e.ctrlKey; engine.keys.meta = e.metaKey;
      if (engine.onKey(e)) { e.preventDefault(); e.stopPropagation(); }
    });
  }
  engine.start();
})();
