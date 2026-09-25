import { chromium } from 'playwright';
import fs from 'node:fs';
const out = 'output/hud-cleanup';
fs.mkdirSync(out, { recursive: true });
const BASE = process.env.BASE_URL || 'http://localhost:5174';
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => errors.push(String(e)));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const advance = ms => page.evaluate(t => window.advanceTime(t), ms);
try {
  await page.goto(`${BASE}/game/local?playerId=hud-check&character=dash-dynamo&explorationPrototype=1`);
  await page.locator('[data-map-node-selectable="true"]').first().click();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).exploration);
  // move a little so HUD is live
  await page.keyboard.down('ArrowRight'); await advance(1500); await page.waitForTimeout(80); await page.keyboard.up('ArrowRight');
  // hover the settings tab (top-right, centered in the w-80 panel)
  const { width } = page.viewportSize();
  await page.mouse.move(width - 176, 20);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/settings-over-hud.png` });
  // UpgradeModal coverage check (if a level-up is reachable quickly)
  await page.mouse.move(200, 400);
  for (let i = 0; i < 30 && !(await state()).levelingUp; i++) {
    const dirs = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
    await page.keyboard.down(dirs[i % 4]); await advance(800); await page.waitForTimeout(40); await page.keyboard.up(dirs[i % 4]);
  }
  if ((await state()).levelingUp) {
    await page.mouse.move(width - 176, 20); // try to hover settings under modal
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/settings-under-upgrademodal.png` });
  }
} finally {
  console.log('CONSOLE ERRORS:', errors.length ? JSON.stringify(errors.slice(0, 10), null, 2) : 'none');
  await browser.close();
}
