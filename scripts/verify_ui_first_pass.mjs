import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const out = 'output/ui-first-pass';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const shot = async name => {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  console.log(name);
};
const state = async () => JSON.parse(await page.evaluate(() => window.render_game_to_text()));
const advance = async ms => page.evaluate(t => window.advanceTime(t), ms);

try {
  await page.goto('http://localhost:3000');
  await page.locator('#player-name').fill('UI Review');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.evaluate(async () => {
    const { updateProgression } = await import('/src/lib/progressionStorage.ts');
    updateProgression({ lastRunStats: { characterType: 'spray-n-pray', waveReached: 4, enemiesKilled: 82, survivalTimeMs: 196000, isVictory: false } });
  });
  await page.reload();
  await page.waitForTimeout(2400);
  await shot('01-home');
  assert.equal(await page.getByRole('button', { name: 'Host Game', exact: true }).count(), 0);
  assert(await page.getByText('Last run', { exact: true }).isVisible());

  // Exercise overflow and category switching with deterministic leaderboard fixtures.
  await page.route('**/api/leaderboard/*', route => route.fulfill({ json: { success: true, data: {
    entries: Array.from({ length: 8 }, (_, index) => ({ id: index, playerName: `Player ${index + 1}`, characterType: 'spray-n-pray', waveReached: 16 - index, enemiesKilled: 100 - index, survivalTimeMs: 123000, createdAt: Date.now() })),
  } } }));
  await page.getByRole('tab', { name: /Kills/ }).click();
  await page.getByRole('button', { name: 'View top 8' }).click();
  assert.equal(await page.getByText('Player 8', { exact: true }).count(), 1);
  await page.getByRole('button', { name: 'Show top 3' }).click();
  assert.equal(await page.getByText('Player 8', { exact: true }).count(), 0);
  for (const tab of ['Time', 'Speed', 'Wave']) await page.getByRole('tab', { name: new RegExp(tab) }).click();
  await page.unroute('**/api/leaderboard/*');

  await page.setViewportSize({ width: 390, height: 844 });
  await shot('02-home-mobile');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.getByRole('button', { name: 'Play Local', exact: true }).click();
  await page.waitForTimeout(900);
  await shot('03-characters');
  assert(!(await page.getByRole('complementary', { name: 'Weekly leaderboards' }).isVisible()));
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  assert(await page.getByRole('button', { name: 'Start Game', exact: true }).isDisabled());
  assert(await page.getByText(/^Unlock:/).isVisible());
  await shot('03-locked-character');
  await page.keyboard.press('ArrowLeft');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Play Local', exact: true }).click();
  await page.getByRole('button', { name: 'Start Game', exact: true }).click();
  const next = page.locator('[data-map-node-selectable="true"]').first();
  await next.waitFor();
  await page.waitForTimeout(800);
  await shot('04-map');
  assert((await next.boundingBox()).width >= 59);
  await next.focus();
  await shot('05-map-details');
  await page.getByText('Legend', { exact: true }).click();
  assert(await page.getByText('Spend coins here', { exact: true }).isVisible());
  await page.getByText('Legend', { exact: true }).click();
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, -900);
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Centre on player' }).click();
  const box = await next.boundingBox();
  assert(box.y > 160 && box.y + box.height < 800);
  await next.click();
  await page.waitForTimeout(700);
  const before = await state();
  assert.equal(before.mode, 'playing');
  await page.keyboard.down('d');
  await page.waitForTimeout(150);
  await advance(300);
  await page.keyboard.up('d');
  const after = await state();
  assert.notEqual(before.player.x, after.player.x);
  await shot('06-combat');
  fs.writeFileSync(`${out}/combat-state.json`, JSON.stringify(after, null, 2));
  await page.keyboard.press('Escape');
  await shot('07-paused');
  await page.keyboard.press('Escape');
  await page.keyboard.press('\\');
  await page.getByRole('button', { name: 'Stats', exact: true }).click();
  await page.getByRole('button', { name: 'INSTANT LEVEL UP', exact: true }).click();
  await page.keyboard.press('\\');
  await page.waitForTimeout(800);
  await shot('08-upgrades');
  // Cards float continuously; click their visible centre rather than waiting for animation stability.
  const upgradeBox = await page.getByRole('button', { name: /SELECT$/ }).first().boundingBox();
  await page.mouse.click(upgradeBox.x + upgradeBox.width / 2, upgradeBox.y + upgradeBox.height / 2);
  await page.getByText('LEVEL UP!', { exact: true }).waitFor({ state: 'hidden' });
  await page.waitForTimeout(400);
  assert.equal((await state()).mode, 'playing');
  await shot('09-resumed');
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS: menu, responsive layout, leaderboard, selection, map, movement, pause, upgrade');
} finally {
  fs.writeFileSync(`${out}/browser-errors.json`, JSON.stringify(errors, null, 2));
  await browser.close();
}
