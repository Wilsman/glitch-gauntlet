import { chromium } from 'playwright';
const base = process.env.BASE_URL || 'http://localhost:5174';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
await page.goto(`${base}/game/local?playerId=fps&character=dash-dynamo&explorationPrototype=1`);
await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).exploration?.stage === 1);
await page.waitForTimeout(1000);
// Drive diagonally across chunk borders while counting animation frames.
await page.keyboard.down('d'); await page.keyboard.down('s');
const fps = await page.evaluate(() => new Promise(resolve => {
  let frames = 0; const t0 = performance.now();
  const tick = () => { frames++; if (performance.now() - t0 < 5000) requestAnimationFrame(tick); else resolve(frames / 5); };
  requestAnimationFrame(tick);
}));
await page.keyboard.up('d'); await page.keyboard.up('s');
console.log(JSON.stringify({ fps: Math.round(fps * 10) / 10, errors }));
await browser.close();
