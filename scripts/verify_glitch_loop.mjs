import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.BASE_URL || 'http://localhost:5174';
const out = process.env.OUT_DIR || 'output/glitch-loop';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const advance = ms => page.evaluate(t => window.advanceTime(t), ms);
const shot = async name => { await page.waitForTimeout(150); await page.screenshot({ path: `${out}/${name}.png` }); };
const engine = (fn, arg) => page.evaluate(fn, arg);
// Choices never auto-take: stand on one, then tap interact to confirm.
async function pressE() {
  await page.keyboard.down('KeyE'); await page.waitForTimeout(140); await page.keyboard.up('KeyE'); await advance(80);
}
async function choose() {
  for (let i = 0; i < 6 && (await state()).levelingUp; i++) {
    await page.locator('button').filter({ has: page.locator('h3') }).first().click({ force: true });
    await page.waitForTimeout(650);
  }
}
try {
  await page.goto(`${base}/game/local?playerId=loop-check&character=dash-dynamo&explorationPrototype=1`);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).exploration?.stage === 1);
  assert.equal(await page.locator('[data-map-node-selectable]').count(), 0, 'route map must not appear');
  await engine(() => window.__localEngine().debugSetInvulnerability(true));
  await page.waitForTimeout(700);
  await shot('01-stage1-start');

  // Drive to pedestals: activate anchor, kill guardian, charge.
  await engine(() => { const e = window.__localEngine(); e.debugExploration('anchor'); });
  for (let i = 0; i < 6 && (await state()).exploration.phase === 'exploring'; i++) {
    await choose(); await advance(60);
    await page.keyboard.down('KeyE'); await page.waitForTimeout(140); await page.keyboard.up('KeyE'); await advance(80);
  }
  assert.equal((await state()).exploration.phase, 'anchorActive');
  await engine(() => { const e = window.__localEngine(); e.debugExploration('guardian'); e.debugExploration('charge'); });
  await advance(300);
  assert.equal((await state()).exploration.phase, 'pedestals');
  await shot('02-boss-pedestals');

  await engine(() => window.__localEngine().debugExploration('pedestal'));
  await advance(250);
  assert.equal((await state()).exploration.phase, 'pedestals', 'standing on a relic must not auto-take it');
  await shot('02b-relic-focused');
  await pressE();
  assert.equal((await state()).exploration.phase, 'results');
  await shot('03-results-rank');
  for (let i = 0; i < 8 && (await state()).exploration.phase === 'results'; i++) await advance(600);
  assert.equal((await state()).exploration.phase, 'portals');
  await shot('04-rift-portals');

  // Boss rift -> the Glitch Grotto shop cave.
  await engine(() => window.__localEngine().debugExploration('portal'));
  await advance(150);
  await pressE();
  await advance(1200);
  let s = await state();
  assert(s.exploration.interlude, 'boss rift leads to the Glitch Grotto');
  assert.equal(s.exploration.stage, 1);
  assert.equal(s.exploration.portals.length, 3, 'grotto offers three exit rifts');
  assert(s.exploration.pedestals.some(p => p.kind === 'shop'), 'grotto has shop stock');
  await page.waitForTimeout(300);
  await shot('05a-grotto');

  // Grotto exit rift -> warp -> stage 2 arrival card.
  await engine(() => window.__localEngine().debugExploration('portal'));
  await advance(150);
  await pressE();
  await advance(150);
  await shot('05-warp-flash');
  await advance(1200);
  s = await state();
  assert.equal(s.exploration.stage, 2);
  await shot('06-stage2-arrival');
  const modifier = s.exploration.modifier;
  assert(modifier, 'stage 2 carries a modifier');

  // Modifier landings: treasure + black market + darkness.
  for (const mod of ['treasure', 'blackMarket']) {
    await engine(m => window.__localEngine().advanceStage(m), mod);
    await advance(400); await page.waitForTimeout(300);
    await shot(`07-${mod}-landing`);
  }
  await engine(() => window.__localEngine().advanceStage('darkness'));
  await advance(400); await page.waitForTimeout(300);
  s = await state(); assert.equal(s.exploration.modifier, 'darkness');
  await shot('08-darkness');

  // Cracked secret wall: chip it with shots until SECRET FOUND.
  await engine(() => window.__localEngine().advanceStage(null));
  await advance(200);
  const cracked = await engine(() => {
    const e = window.__localEngine(); const w = e.gameState.exploration;
    const wall = w.walls.find(x => x.cracked);
    if (!wall) return null;
    const c = { x: wall.x + wall.width / 2, y: wall.y + wall.height / 2 };
    e.gameState.players[0].position = { x: c.x, y: c.y - wall.height / 2 - 140 };
    return { id: wall.id, hp: wall.hp, center: c };
  });
  assert(cracked, 'a cracked secret wall exists');
  await advance(300); await page.waitForTimeout(200);
  await shot('09-cracked-wall');
  await engine(c => {
    const e = window.__localEngine(); const w = e.gameState.exploration;
    const wall = w.walls.find(x => x.id === c.id);
    for (let i = 0; i < 14 && w.walls.includes(wall); i++) {
      e.gameState.projectiles.push({ id: `sv-${i}`, position: { x: c.center.x, y: c.center.y - wall.height / 2 - 8 }, velocity: { x: 0, y: 16 }, ownerId: e.gameState.players[0].id, damage: 5, radius: 3 });
      e.advanceTime(60);
    }
    e.gameState.players[0].position = { x: c.center.x, y: c.center.y - wall.height / 2 - 140 };
  }, cracked);
  await advance(200);
  s = await state();
  assert(!s.exploration.walls.some(x => x.id === cracked.id), 'cracked wall destroyed');
  await shot('10-secret-found');

  // Run summary screen on death.
  await engine(() => { const e = window.__localEngine(); e.debugSetInvulnerability(false); const p = e.gameState.players[0]; p.health = 0; p.status = 'dead'; });
  await advance(300); await page.waitForTimeout(300);
  assert.equal((await state()).mode, 'gameOver');
  assert(await page.locator('[data-testid="prototype-run-summary"]').isVisible(), 'run summary not shown');
  await shot('11-run-summary');

  fs.writeFileSync(`${out}/log.json`, JSON.stringify({ errors }, null, 2));
  console.log(JSON.stringify({ errors }, null, 2));
} catch (error) {
  await shot('failure');
  fs.writeFileSync(`${out}/failure.json`, JSON.stringify({ error: String(error), errors }, null, 2));
  console.error(error);
  process.exitCode = 1;
} finally { await browser.close(); }
if (errors.length) process.exitCode = 1;
