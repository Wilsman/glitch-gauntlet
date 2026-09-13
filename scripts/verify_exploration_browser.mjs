import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out = 'output/exploration-browser';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [], results = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const advance = ms => page.evaluate(t => window.advanceTime(t), ms);
const shot = name => page.screenshot({ path: `${out}/${name}.png` });
const button = text => page.getByRole('button', { name: text, exact: true });
async function choose() {
  if ((await state()).levelingUp) {
    const choices = page.locator('button').filter({ has: page.locator('h3') });
    await choices.first().click({ force: true });
    await page.waitForTimeout(650);
  }
}
async function key(key, duration = 120) { await page.keyboard.down(key); await page.waitForTimeout(duration); await page.keyboard.up(key); await page.waitForTimeout(70); }
async function start(character) {
  await page.goto(`http://localhost:3000/game/local?playerId=browser-prototype&character=${character}&explorationPrototype=1`);
  await page.locator('[data-map-node-selectable="true"]').first().click();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).exploration);
  await page.mouse.move(800, 800);
}
async function controls(action) {
  await key('Backslash'); await button(action).click(); await page.waitForTimeout(100);
}
async function goTo(target) {
  // Drive the real gamepad input path with a synthetic standard controller.
  await page.evaluate(() => {
    window.testPad = { id: 'Prototype verification controller', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.testPad] });
  });
  for (let i = 0; i < 350; i++) {
    await choose(); const s = await state();
    if (Math.hypot(s.player.x - target.x, s.player.y - target.y) < 35) break;
    await page.evaluate(async target => {
      const { WorldNavigator, distance } = await import('/src/lib/explorationWorld.ts');
      window.yardNav ||= new WorldNavigator();
      const s = JSON.parse(window.render_game_to_text());
      const p = { x: s.player.x, y: s.player.y };
      const next = window.yardNav.waypoint(s.exploration, p, target, 22), d = distance(p, next) || 1;
      window.testPad.axes[0] = (next.x - p.x) / d;
      window.testPad.axes[1] = (next.y - p.y) / d;
    }, target);
    await page.waitForTimeout(40); await advance(80);
  }
  await page.evaluate(() => { window.testPad.axes = [0, 0, 0, 0]; }); await page.waitForTimeout(60);
  const s = await state(); assert(Math.hypot(s.player.x - target.x, s.player.y - target.y) < 60, `Could not navigate to ${JSON.stringify(target)}: ${JSON.stringify(s.player)}`);
}
try {
  await start('dash-dynamo');
  const storedBefore = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  await key('ArrowDown', 1000);
  const before = (await state()).player.x;
  await page.keyboard.down('ArrowRight'); await key('Shift'); await page.waitForTimeout(800); await page.keyboard.up('ArrowRight');
  assert((await state()).player.x > before + 180, 'Movement must continue after releasing Shift');
  await shot('01-momentum');
  await key('Escape'); const paused = (await state()).exploration.elapsedMs; await advance(1000); assert.equal((await state()).exploration.elapsedMs, paused);
  await page.getByRole('button', { name: /Resume/i }).click();
  await controls('Go to cache'); await key('e'); assert((await state()).exploration.cache.claimed); await shot('02-cache');
  await controls('Go to anchor'); await key('e');
  assert.equal((await state()).exploration.phase, 'anchorActive'); await shot('03-anchor-active');
  // Capture a real fight, with normal attacks reducing the guardian's health.
  const health = (await state()).boss.health;
  await advance(2000); await choose();
  assert((await state()).boss?.health < health, 'Player attacks must damage the guardian');
  // Enable invulnerability through the existing testing controls for long integration coverage.
  await key('Backslash'); await page.getByRole('button', { name: /^Invulnerability:/ }).click(); await key('Backslash');
  let s = await state();
  for (let i = 0; i < 130 && s.exploration?.phase !== 'exitReady'; i++) {
    await choose(); s = await state();
    if (s.levelingUp) continue;
    // Keep inside the field while using the actual attack/charge systems.
    if (Math.hypot(s.player.x - s.exploration.anchor.position.x, s.player.y - s.exploration.anchor.position.y) > 180) await controls('Go to anchor');
    await advance(1000); await page.waitForTimeout(25); s = await state();
  }
  assert.equal(s.exploration.phase, 'exitReady'); await shot('04-exit-ready');
  await controls('Go to anchor'); await key('e'); await choose(); await key('e');
  assert.equal((await state()).mode, 'mapSelection'); await shot('05-map-return');
  assert.equal(await page.evaluate(() => JSON.stringify({ ...localStorage })), storedBefore);
  results.push('Dynamo keyboard slide, pause, cache, real guardian fight, charge, reward, route return, persistence isolation');
  await start('turret-tina');
  await advance(1100); assert((await state()).exploration.established);
  await goTo({ x: 550, y: 1540 });
  assert(!(await state()).exploration.established, 'Controller movement should end anchoring');
  await goTo({ x: 1500, y: 1490 });
  await shot('06-tina-traversal');
  await controls('Go to anchor');
  await page.evaluate(() => { window.testPad.buttons[7] = { pressed: true, touched: true, value: 1 }; });
  await page.waitForTimeout(120); await page.evaluate(() => { window.testPad.buttons[7] = { pressed: false, touched: false, value: 0 }; });
  assert.equal((await state()).exploration.phase, 'anchorActive');
  assert.equal((await state()).turrets.length, 0, 'RT interaction cannot also deploy turrets');
  await page.evaluate(() => { window.testPad.buttons[2] = { pressed: true, touched: true, value: 1 }; });
  await page.waitForTimeout(120); await page.evaluate(() => { window.testPad.buttons[2] = { pressed: false, touched: false, value: 0 }; });
  assert.equal((await state()).turrets.length, 3, 'Controller ability deploys turrets');
  await advance(1100); await shot('07-tina-established');
  await page.setViewportSize({ width: 1280, height: 800 }); await shot('08-resized');
  await key('f'); assert(await page.evaluate(() => !!document.fullscreenElement)); await key('f'); assert(!(await page.evaluate(() => !!document.fullscreenElement)));
  await key('Backslash'); await page.getByRole('button', { name: /^Invulnerability:/ }).click(); await key('Backslash');
  for (let i = 0; i < 140 && (await state()).exploration.phase !== 'exitReady'; i++) { await choose(); if ((await state()).levelingUp) continue; if (i % 12 === 0) await key('q'); await advance(1000); await page.waitForTimeout(25); }
  assert.equal((await state()).exploration.phase, 'exitReady'); await shot('09-tina-exit-ready');
  await controls('Go to anchor'); await key('e'); await choose(); await key('e'); assert.equal((await state()).mode, 'mapSelection');
  results.push('Tina gamepad traversal, dedicated RT interaction, X deployment, established state, resize/fullscreen and full event completion');
  assert.deepEqual(errors, []);
  fs.writeFileSync(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }));
} catch (error) {
  await shot('failure');
  fs.writeFileSync(`${out}/failure.json`, JSON.stringify({ error: String(error), errors, state: await state() }, null, 2));
  throw error;
} finally { await browser.close(); }
