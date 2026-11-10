/* Pixel renderer plugin ("px" units) -- PLACEHOLDER for the HyperCard target.
 *
 * The HyperCard Modernizer run will implement this file. Contract (same shape as render-cells.js):
 *
 *   LegacyRuntime.registerRenderer('pixels', (rt, canvas, opts) => renderer)
 *
 *   renderer.drawScreen(screen)   draw screen.layers (each layer's image + objects), then the
 *                                 screen's own image, then its objects (buttons, fields) -- see
 *                                 docs/legacy-ir.md "Layer and Screen". Image paths are relative to
 *                                 the app folder; for file:// use, embed them in data.js as data URLs.
 *   renderer.hitTest(x, y)        topmost visible object id under a point, so the game layer can
 *                                 rt.send('mouseUp', id) through the shared message hierarchy.
 *
 * Until then this stub draws a grey screen with the screen name so the runtime fails visibly.
 */
(function () {
  'use strict';
  if (LegacyRuntime.renderers.pixels) return;
  LegacyRuntime.registerRenderer('pixels', (rt, canvas) => {
    canvas.width = (rt.ir.size && rt.ir.size.width) || 512;
    canvas.height = (rt.ir.size && rt.ir.size.height) || 342;
    const ctx = canvas.getContext('2d');
    return {
      drawScreen(screen) {
        ctx.fillStyle = '#ccc'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000'; ctx.font = '12px monospace';
        ctx.fillText(`render-pixels.js not implemented yet: ${screen && screen.id}`, 8, 20);
      },
      hitTest() { return null; },
    };
  });
})();
