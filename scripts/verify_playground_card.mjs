import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const out = 'output/playground-card';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

try {
  await page.goto('http://localhost:3001');
  const nameInput = page.locator('#player-name');
  if (await nameInput.isVisible()) {
    await nameInput.fill('UI Review');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  }
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}/01-home.png`, fullPage: true });

  const card = page.getByRole('button', { name: /THE PLAYGROUND/ });
  assert(await card.isVisible(), 'playground card not visible');
  assert.equal(await page.getByRole('button', { name: 'Open Map Prototype', exact: true }).count(), 0, 'old menu button still present');
  await card.hover();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/02-hover.png`, fullPage: true });

  // Playtest now opens character select first, with every operator unlocked
  await card.click();
  await page.getByText('SELECT CHARACTER').waitFor({ timeout: 5000 });
  await page.waitForTimeout(800);
  assert(await page.getByText('Beta playtest — all operators unlocked').isVisible(), 'playtest unlock badge missing');
  assert.equal(await page.getByText('Locked', { exact: true }).count(), 0, 'locked overlays still shown');
  await page.screenshot({ path: `${out}/03-character-select.png`, fullPage: true });

  // Keyboard-browse to a normally-locked operator (index 4: Vampire Vex) and deploy it
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(350);
  }
  const start = page.getByRole('button', { name: 'Start Game', exact: true });
  assert(await start.isEnabled(), 'Start Game disabled for locked operator');
  await page.screenshot({ path: `${out}/03b-locked-operator.png`, fullPage: true });
  await page.keyboard.press('Enter');

  await page.waitForURL(/explorationPrototype=1/, { timeout: 10000 });
  console.log('navigated:', page.url());
  assert.match(page.url(), /character=vampire-vex/, 'selected character not in URL');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/04-prototype.png` });

  assert.deepEqual(errors, [], 'console/page errors');
  console.log('OK');
} finally {
  if (errors.length) console.log('ERRORS:', errors);
  await browser.close();
}
