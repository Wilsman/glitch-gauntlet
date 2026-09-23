import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
fs.mkdirSync('output/exploration', { recursive: true });
try {
  await page.goto('http://localhost:5173/game/local?playerId=prototype-smoke&character=dash-dynamo&explorationPrototype=1');
  await page.locator('[data-map-node-selectable="true"]').first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'output/exploration/arrival.png' });
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(1400); await page.keyboard.up('ArrowDown');
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(100); console.log('right input', await page.evaluate(() => JSON.parse(window.render_game_to_text()).input)); await page.keyboard.press('Shift'); await page.waitForTimeout(1600); await page.keyboard.up('ArrowRight');
  await page.screenshot({ path: 'output/exploration/movement.png' });
  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  fs.writeFileSync('output/exploration/state.json', JSON.stringify(state, null, 2));
  console.log(JSON.stringify({ mode: state.mode, world: state.exploration?.phase, camera: state.exploration?.camera, errors }));
} finally { await browser.close(); }
if (errors.length) process.exitCode = 1;
