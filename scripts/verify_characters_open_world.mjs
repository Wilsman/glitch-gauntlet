import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Drops every character into a dense open-world biome with a live enemy pack and drives them with real
// keyboard input: move, fire, blink (Shift), ability (Q). Asserts each one moves, deals damage and gets
// kills without page errors, and screenshots them mid-fight.
const base = process.env.BASE_URL || 'http://localhost:5174';
const out = process.env.OUT_DIR || 'output/characters-open-world';
fs.mkdirSync(out, { recursive: true });
const CHARACTERS = ['spray-n-pray', 'boom-bringer', 'glass-cannon-carl', 'pet-pal-percy', 'vampire-vex', 'turret-tina', 'dash-dynamo', 'null-ronin'];
const BIOME_FOR = ['frost', 'foundry', 'bloom', 'marsh', 'void', 'arcade', 'foundry', 'bloom'];
const browser = await chromium.launch({ headless: true });
const report = [];
try {
  for (const [index, character] of CHARACTERS.entries()) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', e => { if (e.type() === 'error' && !/ERR_CERT|Failed to load resource/.test(e.text())) errors.push(e.text()); });
    const engine = (fn, arg) => page.evaluate(fn, arg);
    const advance = ms => page.evaluate(t => window.advanceTime(t), ms);
    await page.goto(`${base}/game/local?playerId=char-${character}&character=${character}&explorationPrototype=1`);
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).exploration?.stage === 1);
    await page.waitForTimeout(600);

    // Teleport to a walkable spot in the target biome and surround the player with a pack.
    const setup = await engine(async ({ biome, character }) => {
      const { isWalkable } = await import('/src/lib/explorationWorld.ts');
      const { createEnemy } = await import('/shared/enemyConfig.ts');
      const e = window.__localEngine(); const s = e.gameState; const w = s.exploration; const p = s.players[0];
      e.debugSetInvulnerability(true);
      w.spawnsEnabled = false;
      const region = w.biomes.find(r => r.biome === biome) || w.biomes.find(r => r.biome !== 'yard');
      let spot = null;
      for (let ring = 0; ring < 40 && !spot; ring++) for (let a = 0; a < 12 && !spot; a++) {
        const c = { x: region.x + region.width / 2 + Math.cos(a / 12 * Math.PI * 2) * ring * 40, y: region.y + region.height / 2 + Math.sin(a / 12 * Math.PI * 2) * ring * 40 };
        if (isWalkable(w, c, 90)) spot = c;
      }
      p.position = { ...spot };
      const types = ['grunt', 'grunt', 'slugger', 'grunt', 'glitch-spider', 'grunt'];
      types.forEach((type, i) => {
        const a = i / types.length * Math.PI * 2;
        s.enemies.push(createEnemy(`pack-${character}-${i}`, { x: spot.x + Math.cos(a) * 220, y: spot.y + Math.sin(a) * 220 }, type, 1));
      });
      return { biome: region.biome, spot, sprite: p.characterType, enemies: s.enemies.length };
    }, { biome: BIOME_FOR[index], character });
    await advance(400);

    // Kite with real keys; tap Space (fire), Shift (blink) and Q (ability) along the way.
    const before = await engine(() => { const s = window.__localEngine().gameState; return { pos: { ...s.players[0].position }, hp: s.enemies.reduce((t, v) => t + v.health, 0), kills: s.exploration.kills }; });
    const keys = ['KeyD', 'KeyS', 'KeyA', 'KeyW'];
    let abilityUsed = false, blinkUsed = false, travelled = 0, last = before.pos;
    for (let step = 0; step < 16; step++) {
      const key = keys[step % keys.length];
      await page.keyboard.down(key);
      await page.keyboard.down('Space');
      if (step === 3) { await page.keyboard.press('ShiftLeft'); blinkUsed = true; }
      if (step === 5) { await page.keyboard.press('KeyQ'); abilityUsed = true; }
      await advance(250);
      await page.keyboard.up('Space');
      await page.keyboard.up(key);
      // Level-ups pause combat; take the first card so the fight keeps going.
      await engine(() => { const e = window.__localEngine(); if (e.gameState.levelingUpPlayerId) { const o = e.getUpgradeOptions(); if (o?.length) e.selectUpgrade(o[0].id); } });
      const pos = await engine(() => ({ ...window.__localEngine().gameState.players[0].position }));
      travelled += Math.hypot(pos.x - last.x, pos.y - last.y); last = pos;
      if (step === 6) await page.screenshot({ path: `${out}/${String(index + 1).padStart(2, '0')}-${character}.png` });
    }
    const after = await engine(() => {
      const s = window.__localEngine().gameState, p = s.players[0];
      return { pos: { ...p.position }, hp: s.enemies.reduce((t, v) => t + v.health, 0), alive: s.enemies.length, kills: s.exploration.kills, ability: p.abilityCooldown ?? null, status: s.status, playerStatus: p.status, character: p.characterType };
    });
    const moved = travelled;
    const entry = { character, biome: setup.biome, moved: Math.round(moved), enemyHpBefore: Math.round(before.hp), enemyHpAfter: Math.round(after.hp), killsGained: after.kills - before.kills, enemiesLeft: after.alive, abilityCooldownAfterQ: after.ability, blinkUsed, abilityUsed, errors };
    report.push(entry);
    assert.equal(after.character, character, `${character}: engine runs the selected character`);
    assert.equal(after.status, 'playing', `${character}: run still playing`);
    assert(moved > 120, `${character}: player moves with keyboard input (${moved})`);
    assert(after.kills > before.kills || after.hp < before.hp - 20, `${character}: deals damage in the open world`);
    assert.deepEqual(errors, [], `${character}: no page errors`);
    await page.close();
  }
} finally {
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
