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
  for (let i = 0; i < 8 && (await state()).levelingUp; i++) {
    const choices = page.locator('button').filter({ has: page.locator('h3') });
    if (await choices.count() === 0) { await page.waitForTimeout(250); continue; }
    await choices.first().click({ force: true });
    await page.waitForTimeout(650);
  }
}
async function key(key, duration = 120) { await page.keyboard.down(key); await page.waitForTimeout(duration); await page.keyboard.up(key); await page.waitForTimeout(70); }
async function start(character) {
  await page.goto(`${process.env.BASE_URL || 'http://localhost:5173'}/game/local?playerId=browser-prototype&character=${character}&explorationPrototype=1`);
  // The Glitch Loop drops straight into Stage 1 — no route map is shown.
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).exploration?.stage === 1);
  await page.mouse.move(800, 800);
}
async function controls(action) {
  await key('Backslash'); await button(action).click(); await page.waitForTimeout(100);
}
// Drive the real gamepad input path with a synthetic standard controller.
const ensurePad = () => page.evaluate(() => {
  window.testPad ||= { id: 'Prototype verification controller', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.testPad] });
});
async function goTo(target) {
  await ensurePad();
  let lastDist = Infinity, stalled = 0, strafe = 0;
  for (let i = 0; i < 500; i++) {
    await choose(); const s = await state();
    const dist = Math.hypot(s.player.x - target.x, s.player.y - target.y);
    if (dist < 35) break;
    if (lastDist - dist < 3) stalled++; else stalled = 0;
    lastDist = dist;
    // If blocked (enemy body, wall corner), strafe around a perpendicular detour briefly.
    const goal = stalled > 25 ? (stalled = 0, strafe = 20, {
      x: target.x + (target.y - s.player.y || 1) * 0.8,
      y: target.y - (target.x - s.player.x || 1) * 0.8,
    }) : target;
    if (strafe > 0) { strafe--; }
    await page.evaluate(async target => {
      const { WorldNavigator, distance } = await import('/src/lib/explorationWorld.ts');
      window.yardNav ||= new WorldNavigator();
      const s = JSON.parse(window.render_game_to_text());
      const p = { x: s.player.x, y: s.player.y };
      const next = window.yardNav.waypoint(s.exploration, p, target, 22), d = distance(p, next) || 1;
      window.testPad.axes[0] = (next.x - p.x) / d;
      window.testPad.axes[1] = (next.y - p.y) / d;
    }, strafe > 0 ? goal : target);
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
  await controls('Go to anchor');
  for (let i = 0; i < 5 && (await state()).exploration.phase !== 'anchorActive'; i++) { await choose(); await key('e'); }
  assert.equal((await state()).exploration.phase, 'anchorActive'); await shot('03-anchor-active');
  // Capture a real fight, with normal attacks reducing the guardian's health.
  const health = (await state()).boss.health;
  await advance(2000); await choose();
  assert((await state()).boss?.health < health, 'Player attacks must damage the guardian');
  // Enable invulnerability through the existing testing controls for long integration coverage.
  await key('Backslash'); await page.getByRole('button', { name: /^Invulnerability:/ }).click(); await key('Backslash');
  let s = await state();
  const phaseLog = [];
  for (let i = 0; i < 130 && s.exploration?.phase !== 'pedestals'; i++) {
    await choose(); s = await state();
    phaseLog.push({ i, phase: s.exploration?.phase, stage: s.exploration?.stage, hp: s.player?.health, mode: s.mode, charge: Math.round(s.exploration?.anchor?.chargeMs || 0) });
    if (s.levelingUp) continue;
    // Keep inside the field while using the actual attack/charge systems.
    if (Math.hypot(s.player.x - s.exploration.anchor.position.x, s.player.y - s.exploration.anchor.position.y) > 180) await controls('Go to anchor');
    await advance(1000); await page.waitForTimeout(25); s = await state();
  }
  fs.writeFileSync(`${out}/phase-log.json`, JSON.stringify(phaseLog, null, 1));
  assert.equal(s.exploration.phase, 'pedestals'); await shot('04-boss-pedestals');
  const rtInteract = async () => {
    await ensurePad();
    await page.evaluate(() => { window.testPad.buttons[7] = { pressed: true, touched: true, value: 1 }; });
    await page.waitForTimeout(300);
    await page.evaluate(() => { window.testPad.buttons[7] = { pressed: false, touched: false, value: 0 }; });
  };
  // Walk onto a boss pedestal -> results splash -> rift portals -> Stage 2.
  await page.evaluate(() => window.__localEngine().debugExploration('pedestal'));
  await advance(200);
  assert.equal((await state()).exploration.phase, 'results'); await shot('05-stage-clear');
  for (let i = 0; i < 8 && (await state()).exploration.phase === 'results'; i++) { await rtInteract(); await choose(); await advance(600); }
  assert.equal((await state()).exploration.phase, 'portals');
  assert.equal((await state()).exploration.portals.length, 3); await shot('06-rift-portals');
  await page.evaluate(() => window.__localEngine().debugExploration('portal'));
  await advance(1400);
  assert.equal((await state()).exploration.stage, 2); await shot('07-stage-2-arrival');
  assert.equal(await page.evaluate(() => JSON.stringify({ ...localStorage })), storedBefore);
  results.push('Dynamo keyboard slide, pause, cache, real guardian fight, charge, boss relic, rift portal to stage 2, persistence isolation');
  await start('turret-tina');
  await advance(1100); assert((await state()).exploration.established);
  await goTo({ x: 550, y: 4140 });
  assert(!(await state()).exploration.established, 'Controller movement should end anchoring');
  await goTo({ x: 1500, y: 4090 });
  await shot('06-tina-traversal');
  await controls('Go to anchor');
  for (let i = 0; i < 4 && (await state()).exploration.phase !== 'anchorActive'; i++) {
    await choose();
    await page.evaluate(() => { window.testPad.buttons[7] = { pressed: true, touched: true, value: 1 }; });
    await page.waitForTimeout(160); await page.evaluate(() => { window.testPad.buttons[7] = { pressed: false, touched: false, value: 0 }; });
    await page.waitForTimeout(100);
  }
  assert.equal((await state()).exploration.phase, 'anchorActive');
  assert.equal((await state()).turrets.length, 0, 'RT interaction cannot also deploy turrets');
  await page.evaluate(() => { window.testPad.buttons[2] = { pressed: true, touched: true, value: 1 }; });
  await page.waitForTimeout(120); await page.evaluate(() => { window.testPad.buttons[2] = { pressed: false, touched: false, value: 0 }; });
  assert.equal((await state()).turrets.length, 3, 'Controller ability deploys turrets');
  await advance(1100); await shot('07-tina-established');
  await page.setViewportSize({ width: 1280, height: 800 }); await shot('08-resized');
  await key('f'); await page.waitForTimeout(300); assert(await page.evaluate(() => !!document.fullscreenElement)); await key('f'); await page.waitForTimeout(300); assert(!(await page.evaluate(() => !!document.fullscreenElement)));
  await key('Backslash'); await page.getByRole('button', { name: /^Invulnerability:/ }).click(); await key('Backslash');
  for (let i = 0; i < 140 && (await state()).exploration.phase !== 'pedestals'; i++) { await choose(); if ((await state()).levelingUp) continue; if (i % 12 === 0) await key('q'); await advance(1000); await page.waitForTimeout(25); }
  assert.equal((await state()).exploration.phase, 'pedestals'); await shot('09-tina-pedestals');
  await page.evaluate(() => window.__localEngine().debugExploration('pedestal'));
  await advance(200);
  assert.equal((await state()).exploration.phase, 'results');
  results.push('Tina gamepad traversal, dedicated RT interaction, X deployment, established state, resize/fullscreen and full event completion');
  assert.deepEqual(errors, []);
  fs.writeFileSync(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ results, errors }));
} catch (error) {
  await shot('failure');
  fs.writeFileSync(`${out}/failure.json`, JSON.stringify({ error: String(error), errors, state: await state() }, null, 2));
  throw error;
} finally { await browser.close(); }
