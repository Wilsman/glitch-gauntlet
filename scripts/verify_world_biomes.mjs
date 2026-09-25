import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.env.BASE_URL || 'http://localhost:5174';
const out = process.env.OUT_DIR || 'output/world-biomes';
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
try {
  await page.goto(`${base}/game/local?playerId=biome-check&character=dash-dynamo&explorationPrototype=1`);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).exploration?.stage === 1);
  await page.waitForTimeout(800);
  await engine(() => { const e = window.__localEngine(); e.debugSetInvulnerability(true); e.gameState.exploration.spawnsEnabled = true; });
  await shot('00-spawn-yard');

  // Teleport into each region; one screenshot per distinct biome.
  const seen = new Set(['yard']);
  for (let i = 0; i < 12; i++) {
    const info = await engine(idx => {
      const e = window.__localEngine(); const w = e.gameState.exploration;
      const r = w.biomes[idx];
      e.gameState.players[0].position = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      return { id: r.id, biome: r.biome, name: r.name };
    }, i);
    if (seen.has(info.biome)) continue;
    seen.add(info.biome);
    await advance(600); // let the camera settle and packs spawn in
    await page.waitForTimeout(400);
    await shot(`biome-${info.biome}`);
    // Also capture a seeded RANDOM walkable point in the region to judge density.
    const randomPoint = await engine(idx => {
      const e = window.__localEngine(); const w = e.gameState.exploration;
      const r = w.biomes[idx];
      return import('/src/lib/explorationWorld.ts').then(({ isWalkable }) => {
        let s = idx * 31 + 7;
        const rand = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
        for (let a = 0; a < 80; a++) {
          const p = { x: r.x + 120 + rand() * (r.width - 240), y: r.y + 120 + rand() * (r.height - 240) };
          if (isWalkable(w, p, 22)) { e.gameState.players[0].position = p; return p; }
        }
        return null;
      });
    }, i);
    if (randomPoint) { await advance(500); await page.waitForTimeout(300); await shot(`random-${info.biome}`); }
    await advance(300);
  }

  // Biome-entry banner: jump into a fresh region and capture the banner mid-flight.
  const bannerRegion = await engine(() => {
    const e = window.__localEngine(); const w = e.gameState.exploration;
    const r = w.biomes.find(b => !b.discovered);
    if (!r) return null;
    e.gameState.players[0].position = { x: r.x + 200, y: r.y + r.height / 2 };
    return r.name;
  });
  if (bannerRegion) {
    await advance(80);
    await shot('banner-entry');
  }

  // One shot per hazard kind, player standing at the hazard edge.
  for (const kind of ['ice', 'lava', 'sludge', 'warp']) {
    const found = await engine(k => {
      const e = window.__localEngine(); const w = e.gameState.exploration;
      const h = w.hazards.find(hz => hz.kind === k);
      if (!h) return false;
      e.gameState.players[0].position = { x: h.x - h.radius * 0.4, y: h.y };
      return true;
    }, kind);
    if (!found) { errors.push(`no ${kind} hazard`); continue; }
    await advance(500); await page.waitForTimeout(250);
    await shot(`hazard-${kind}`);
  }

  // Minimap after roaming a few regions.
  await shot('minimap-panel');

  // Full map overlay after exploring several regions.
  await page.keyboard.press('m');
  await page.waitForTimeout(300);
  await shot('full-map');
  await page.keyboard.press('m');
  await page.waitForTimeout(150);
  const closed = await page.evaluate(() => !document.querySelector('[data-testid="exploration-fullmap"]'));
  if (!closed) errors.push('map overlay did not close');

  fs.writeFileSync(`${out}/log.json`, JSON.stringify({ errors }, null, 2));
  console.log(JSON.stringify({ errors }, null, 2));
} finally { await browser.close(); }
if (errors.length) process.exitCode = 1;
