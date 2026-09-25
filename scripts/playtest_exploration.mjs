import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto(process.env.BASE_URL || 'http://localhost:5173');
  const results = await page.evaluate(async () => {
    const { LocalGameEngine } = await import('/src/lib/LocalGameEngine.ts');
    const { WorldNavigator, distance } = await import('/src/lib/explorationWorld.ts');
    const runs = [];
    const neutral = { up: false, down: false, left: false, right: false };
    for (const character of ['dash-dynamo', 'turret-tina']) for (const detour of [false, true]) {
      const e = new LocalGameEngine('playtest', character);
      e.configureExploration(0);
      const nav = new WorldNavigator();
      let cacheDone = !detour, interactionDown = false, lastStage = 1;
      const frames = [];
      for (let step = 0; step < 20000; step++) {
        const s = e.gameState, p = s.players[0], w = s.exploration;
        if (!w) break;
        if (s.status === 'gameOver' || w.run.stagesCleared >= 2) break;
        if (w.stage !== lastStage) { lastStage = w.stage; cacheDone = !detour || !w.hasYard ? true : cacheDone; }
        if (s.levelingUpPlayerId) {
          const options = e.getUpgradeOptions();
          const preferred = options.find(o => o.type === 'maxHealth') || options.find(o => o.type === 'projectileDamage') || options[0];
          e.selectUpgrade(preferred.id);
        }
        let goal = w.anchor.position, interact = false, speed = 1;
        if (w.phase === 'exploring') {
          if (!cacheDone && w.hasYard && !w.cache.claimed) goal = w.cache.position;
          if (!cacheDone && distance(p.position, goal) < 70) { interact = !interactionDown; cacheDone = w.cache.claimed; }
          if (cacheDone && distance(p.position, w.anchor.position) < 80) interact = !interactionDown;
          // Detour to an affordable chest when it's near the route — items are the power curve.
          const chest = w.chests.find(c => !c.opened && (c.cost || 0) <= (p.coins || 0) && distance(c.position, p.position) < 400);
          if (chest) { if (distance(chest.position, p.position) < 80) interact = !interactionDown; else goal = chest.position; }
        } else if (w.phase === 'anchorActive') {
          const angle = w.elapsedMs / 1700;
          goal = { x: w.anchor.position.x + Math.cos(angle) * 200, y: w.anchor.position.y + Math.sin(angle) * 200 };
          const threatened = (s.boss && distance(p.position, s.boss.position) < 150) || s.enemies.some(v => distance(v.position, p.position) < 100) || s.shockwaveRings?.some(r => Math.abs(distance(p.position, r.position) - r.radius) < 70);
          if (character === 'turret-tina') {
            if (!threatened) speed = 0;
            if (!p.abilityCooldown || p.abilityCooldown <= 0) e.useAbility();
          } else {
            if ((!p.abilityCooldown || p.abilityCooldown <= 0) && p.health < p.maxHealth * 0.75) e.useAbility();
            if (threatened && !w.slideCooldownMs) e.useBlink();
          }
        } else if (w.phase === 'pedestals') {
          const pedestal = w.pedestals.find(v => v.kind === 'boss' && !v.taken);
          if (pedestal) goal = pedestal.position;
        } else if (w.phase === 'results') {
          interact = !interactionDown;
        } else if (w.phase === 'portals') {
          if (w.portals.length) goal = w.portals[0].position;
        }
        const next = nav.waypoint(w, p.position, goal), d = distance(next, p.position) || 1;
        e.updateInput({ ...neutral, analogX: speed * (next.x - p.position.x) / d, analogY: speed * (next.y - p.position.y) / d, interact });
        interactionDown = interact;
        const t = performance.now(); e.advanceTime(50); frames.push(performance.now() - t);
      }
      const s = e.gameState, w = s.exploration;
      frames.sort((a, b) => a - b);
      runs.push({ character, route: detour ? 'cache detour' : 'direct', outcome: s.status === 'gameOver' ? 'defeated' : `stage ${w?.stage ?? '?'} ${w?.phase}`, stagesCleared: w?.run.stagesCleared ?? 0, activeSeconds: Math.round((w?.elapsedMs || 0) / 1000), health: s.players[0].health, level: s.players[0].level, guardianHealth: s.boss?.health || 0, chargePercent: Math.round((w?.anchor.chargeMs || 0) / 450), ...(w?.metrics || {}), simulationP95Ms: frames[Math.floor(frames.length * 0.95)] });
    }
    return runs;
  });
  fs.mkdirSync('output/exploration', { recursive: true });
  fs.writeFileSync('output/exploration/playtest-runs.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  const failures = results.filter(r => r.stagesCleared < 2);
  if (failures.length) { console.error(`FAIL: ${failures.length} run(s) did not clear 2 stages`); process.exitCode = 1; }
} finally { await browser.close(); }
