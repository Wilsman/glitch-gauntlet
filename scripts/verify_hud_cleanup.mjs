import { chromium } from 'playwright';
import fs from 'node:fs';
const out = 'output/hud-cleanup';
fs.mkdirSync(out, { recursive: true });
const BASE = process.env.BASE_URL || 'http://localhost:5174';
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => errors.push(String(e)));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const advance = ms => page.evaluate(t => window.advanceTime(t), ms);
const shot = name => page.screenshot({ path: `${out}/${name}.png` });
async function choose() {
  for (let i = 0; i < 8 && (await state()).levelingUp; i++) {
    const choices = page.locator('button').filter({ has: page.locator('h3') });
    if (await choices.count() === 0) { await page.waitForTimeout(250); continue; }
    await choices.first().click({ force: true });
    await page.waitForTimeout(500);
  }
}
async function startExploration(character) {
  await page.goto(`${BASE}/game/local?playerId=hud-check&character=${character}&explorationPrototype=1`);
  await page.locator('[data-map-node-selectable="true"]').first().click();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).exploration);
}
async function roam(seconds = 4) {
  const dirs = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
  for (let i = 0; i < seconds; i++) {
    const d = dirs[i % dirs.length];
    await page.keyboard.down(d);
    await advance(700); await page.waitForTimeout(60);
    await page.keyboard.up(d);
    await choose();
  }
}
const tag = () => `${page.viewportSize().width}x${page.viewportSize().height}`;
try {
  // --- Exploration: Dynamo ---
  await startExploration('dash-dynamo');
  await roam(5);
  await shot(`exploration-dynamo-${tag()}`);
  // hover items strip (top-left)
  await page.mouse.move(60, 30); await page.waitForTimeout(400);
  await shot(`exploration-items-hover-${tag()}`);
  // hover stats tab (right edge, ~60%)
  await page.mouse.move(page.viewportSize().width - 4, page.viewportSize().height * 0.6);
  await page.waitForTimeout(500);
  await shot(`exploration-stats-hover-${tag()}`);
  await page.mouse.move(960, 500);

  // --- Exploration: Tina ---
  await startExploration('turret-tina');
  await advance(1200); await page.waitForTimeout(100); // stand still -> established
  await roam(2);
  await shot(`exploration-tina-${tag()}`);

  // --- Arena mode ---
  await page.goto(`${BASE}/game/local?playerId=hud-check&character=spray-n-pray`);
  const node = page.locator('[data-map-node-selectable="true"]').first();
  if (await node.count()) await node.click();
  await page.waitForTimeout(500);
  await roam(6);
  await shot(`arena-${tag()}`);

  // --- 1280x720 pass ---
  await page.setViewportSize({ width: 1280, height: 720 });
  await startExploration('dash-dynamo');
  await roam(4);
  await shot(`exploration-dynamo-${tag()}`);
  await page.mouse.move(60, 30); await page.waitForTimeout(400);
  await shot(`exploration-items-hover-${tag()}`);
  await page.mouse.move(page.viewportSize().width - 4, page.viewportSize().height * 0.6);
  await page.waitForTimeout(500);
  await shot(`exploration-stats-hover-${tag()}`);
  await startExploration('turret-tina');
  await advance(1200); await page.waitForTimeout(100);
  await roam(2);
  await shot(`exploration-tina-${tag()}`);
  await page.goto(`${BASE}/game/local?playerId=hud-check&character=spray-n-pray`);
  const node2 = page.locator('[data-map-node-selectable="true"]').first();
  if (await node2.count()) await node2.click();
  await page.waitForTimeout(500);
  await roam(5);
  await shot(`arena-${tag()}`);
} finally {
  console.log('CONSOLE ERRORS:', errors.length ? JSON.stringify(errors.slice(0, 10), null, 2) : 'none');
  await browser.close();
}
