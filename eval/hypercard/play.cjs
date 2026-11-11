// Headless play test for the HyperCard apps: clicks every visible button on the start card, and on
// every card those clicks reach (depth 2), dismissing dialogs, and records JavaScript errors.
//   node eval/hypercard/play.cjs [stack ...]      -> eval/hypercard/play.json
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '..', 'node_modules', 'playwright-core'));
const ROOT = path.resolve(__dirname, '..', '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function settle(page, ms = 600) {
  // dismiss dialogs (answer/ask) until none is open
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(ms / 3);
    const open = await page.evaluate(() => !!document.querySelector('.lr-dialog'));
    if (!open) break;
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(ms / 3);
}

async function buttons(page) {
  return page.evaluate(() => [...document.querySelectorAll('.lr-button')]
    .filter(b => b.offsetParent !== null && getComputedStyle(b).display !== 'none')
    .map(b => { const r = b.getBoundingClientRect(); return { id: b.dataset.id, x: r.left + r.width / 2, y: r.top + r.height / 2 }; }));
}

async function playStack(browser, stack) {
  const url = 'file:///' + path.join(ROOT, 'output', 'hypercard', stack, 'app', 'index.html').replace(/\\/g, '/');
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  const open = async (card) => {
    await page.goto(url + (card ? '?card=' + encodeURIComponent(card) : ''));
    await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 15000 }).catch(() => errors.push('boot timeout'));
    await settle(page, 900);
  };
  await open();
  const start = await page.evaluate(() => engine.current.id);
  const startNumber = await page.evaluate(() => engine.cardIndex.get(engine.current.id) + 1);
  const visited = new Set([start]);
  const clicks = [];
  const queue = [{ card: start, number: startNumber, depth: 0 }];
  while (queue.length) {
    const { card, number, depth } = queue.shift();
    await open(String(number));
    const btns = await buttons(page);
    for (const b of btns) {
      await open(String(number));
      const before = errors.length;
      await page.mouse.click(b.x, b.y);
      await settle(page, 1200);
      const after = await page.evaluate(() => ({ card: engine.current.id, number: engine.cardIndex.get(engine.current.id) + 1, errs: engine.errors.slice() }));
      clicks.push({ on: card, button: b.id, to: after.card, newErrors: errors.slice(before), scriptErrors: after.errs });
      if (!visited.has(after.card) && depth < 1) { visited.add(after.card); queue.push({ card: after.card, number: after.number, depth: depth + 1 }); }
    }
  }
  const stubs = await page.evaluate(() => rt.stubReport());
  await page.close();
  return { stack, start, cardsReached: [...visited], clicks: clicks.length,
           jsErrors: [...new Set(errors)], scriptErrors: [...new Set(clicks.flatMap(c => c.scriptErrors))],
           runtimeStubs: stubs.map(s => `${s.cmd}: ${s.line}`), detail: clicks };
}

(async () => {
  const stacks = process.argv.slice(2).length ? process.argv.slice(2)
    : fs.readdirSync(path.join(ROOT, 'output', 'hypercard')).filter(d => fs.existsSync(path.join(ROOT, 'output', 'hypercard', d, 'app', 'index.html')));
  const browser = await chromium.launch({ executablePath: CHROME });
  const out = [];
  for (const s of stacks) {
    const r = await playStack(browser, s);
    out.push(r);
    console.log(`${s}: ${r.clicks} clicks, ${r.cardsReached.length} cards reached, ${r.jsErrors.length} JS errors, ${r.scriptErrors.length} script errors`);
    for (const e of r.jsErrors.concat(r.scriptErrors)) console.log('   ', e.slice(0, 300));
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'play.json'), JSON.stringify(out, null, 2));
})();
