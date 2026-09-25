import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.env.BASE_URL || 'http://localhost:5174';
const out = process.env.OUT_DIR || 'output/playground-overhaul';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const advance = ms => page.evaluate(t => window.advanceTime(t), ms);
const shot = async name => { await page.waitForTimeout(120); await page.screenshot({ path: `${out}/${name}.png` }); };
const engine = fn => page.evaluate(fn);
const log = [];
async function choose() {
  for (let i = 0; i < 6 && (await state()).levelingUp; i++) {
    await page.locator('button').filter({ has: page.locator('h3') }).first().click({ force: true });
    await page.waitForTimeout(650);
  }
}
try {
  await page.goto(`${base}/game/local?playerId=overhaul-check&character=dash-dynamo&explorationPrototype=1`);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).exploration?.stage === 1);
  await page.waitForTimeout(900);
  await shot('01-arrival');

  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(700);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1600);
  await page.keyboard.up('ArrowDown'); await page.keyboard.up('ArrowRight');
  let s = await state(); log.push({ step: 'move', player: s.player, momentum: s.exploration.momentum, boost: s.exploration.boostMs });
  await shot('02-momentum');

  // Boost pad: stand on the arrival pad and verify the launch.
  await engine(() => { const e = window.__localEngine(); const p = e.gameState.players[0]; p.position = { x: 300, y: 3900 }; e.debugSetInvulnerability(true); });
  await page.keyboard.down('ArrowDown'); await advance(150); await page.waitForTimeout(80);
  s = await state(); log.push({ step: 'boost', boostMs: s.exploration.boostMs, y: s.player.y });
  await page.waitForTimeout(250);
  await shot('03-boost');
  await page.keyboard.up('ArrowDown');

  // Chest: grant coins, open a small chest and the legendary vault.
  await engine(() => { const e = window.__localEngine(); const p = e.gameState.players[0]; p.coins = 200; p.position = { x: 560, y: 4070 }; });
  await advance(100);
  await page.keyboard.down('KeyE'); await advance(60); await page.keyboard.up('KeyE'); await advance(60);
  s = await state(); log.push({ step: 'chest', coins: s.exploration && s.player, chest: s.exploration.chests.find(c => c.id === 'chest-loop'), feed: s.exploration.itemFeed.map(i => i.title) });
  await shot('04-chest-open');
  await engine(() => { const e = window.__localEngine(); const p = e.gameState.players[0]; const vault = e.gameState.exploration.chests.find(c => c.kind === 'large'); p.coins = 200; if (vault) p.position = { ...vault.position }; });
  await advance(100);
  await page.keyboard.down('KeyE'); await advance(60); await page.keyboard.up('KeyE'); await advance(200);
  s = await state(); log.push({ step: 'vault', chest: s.exploration.chests.find(c => c.kind === 'large'), feed: s.exploration.itemFeed.map(i => `${i.rarity}:${i.title}`) });
  await shot('05-vault');

  // Horde + combo: spawn a dense pack around the player and let auto-fire chew through it.
  await engine(async () => {
    const e = window.__localEngine();
    const { createEnemy } = await import('/shared/enemyConfig.ts');
    const p = e.gameState.players[0]; p.position = { x: 1700, y: 3700 };
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; e.gameState.enemies.push(createEnemy(`combo-${i}`, { x: p.position.x + Math.cos(a) * 170, y: p.position.y + Math.sin(a) * 120 }, i % 3 ? 'grunt' : 'glitch-spider', 1)); }
    const elite = createEnemy('elite-demo', { x: p.position.x + 120, y: p.position.y - 150 }, 'slugger', 2);
    elite.eliteAffix = 'blazing'; elite.health = elite.maxHealth = 600; e.gameState.enemies.push(elite);
    p.projectileDamage = 60; p.multiShot = 4; p.xpToNextLevel = 999999;
  });
  await advance(300);
  await shot('06-horde');
  for (let i = 0; i < 40; i++) { await advance(100); s = await state(); if (s.exploration.combo.count >= 10 && s.exploration.combo.milestoneMs > 1500) break; }
  s = await state(); log.push({ step: 'combo', combo: s.exploration.combo, kills: s.exploration.kills, fx: s.exploration.fx.length });
  await shot('07-combo');
  await engine(() => { const p = window.__localEngine().gameState.players[0]; p.xpToNextLevel = 20; p.xp = 45; });
  await advance(100); await page.waitForTimeout(400);
  await shot('07b-levelup-modal');
  await choose(); await advance(200);
  s = await state(); log.push({ step: 'levels', level: s.player.level, levelingUp: s.levelingUp });
  await shot('07c-levelup-nova');

  // Advance difficulty clock and show the anchor event.
  await choose();
  await engine(() => { const e = window.__localEngine(); const w = e.gameState.exploration; w.elapsedMs = 150000; e.debugExploration('anchor'); });
  for (let i = 0; i < 6 && (await state()).exploration.phase === 'exploring'; i++) {
    await choose(); await advance(60);
    await page.keyboard.down('KeyE'); await page.waitForTimeout(150); await page.keyboard.up('KeyE'); await page.waitForTimeout(80); await advance(60);
  }
  await engine(() => { const w = window.__localEngine().gameState.exploration; w.spawnsEnabled = true; });
  for (let i = 0; i < 8; i++) { await advance(300); await choose(); }
  s = await state(); log.push({ step: 'anchor', phase: s.exploration.phase, pressure: s.exploration.pressure, enemies: s.exploration && s.boss, elites: null });
  await shot('08-anchor-event');
  const enemies = await engine(() => window.__localEngine().gameState.enemies.map(e => ({ type: e.type, elite: e.eliteAffix || null })));
  log.push({ step: 'roster', count: enemies.length, elites: enemies.filter(e => e.elite).length, types: [...new Set(enemies.map(e => e.type))] });
  fs.writeFileSync(`${out}/log.json`, JSON.stringify({ log, errors }, null, 2));
  console.log(JSON.stringify({ log, errors }, null, 2));
} finally { await browser.close(); }
if (errors.length) process.exitCode = 1;
