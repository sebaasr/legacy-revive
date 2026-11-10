/* Boot file for a ZZT world app: wires the shared runtime, the cell renderer and the ZZT game layer.
 * Data comes from data.js (window.LEGACY_IR) and scripts.js (window.ZZT_PROGRAMS); no fetch, so the
 * app runs from file:// by double-clicking index.html. */
(function () {
  'use strict';
  const wrap = document.getElementById('wrap');
  if (new URLSearchParams(location.search).get('font') === '0') window.LEGACY_NO_FONT = true;
  const rt = new LegacyRuntime(window.LEGACY_IR, { root: wrap });
  if (rt.shot) document.body.classList.add('shot');
  else document.title = `${rt.ir.name} (ZZT)`;
  const game = new ZztEngine(rt, window.ZZT_PROGRAMS);
  game.mount(wrap);
  window.rt = rt; window.game = game;   // handy from the browser console

  if (!rt.shot) {
    const fit = () => {
      const c = game.canvas;
      const k = Math.max(1, Math.min((innerWidth - 32) / c.width, (innerHeight - 90) / c.height));
      const s = k >= 2 ? Math.floor(k) : k >= 1.5 ? 1.5 : 1;
      wrap.style.width = c.width * s + 'px';
      c.style.width = c.width * s + 'px';
      wrap.style.setProperty('--k', s);
    };
    addEventListener('resize', fit);
    fit();
  }
})();
