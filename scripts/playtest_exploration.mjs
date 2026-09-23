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
      e.configureExploration(0); e.selectMapNode(e.gameState.runMap.reachableNodeIds[0]);
      const nav = new WorldNavigator();
      let cacheDone = !detour, interactionDown = false;
      const frames = [];
      for (let step = 0; step < 7200; step++) {
        const s = e.gameState, p = s.players[0], w = s.exploration;
        if (s.status === 'gameOver' || w.phase === 'exitReady') break;
        if (s.levelingUpPlayerId) {
          const options = e.getUpgradeOptions();
          const preferred = options.find(o => o.type === 'maxHealth') || options.find(o => o.type === 'projectileDamage') || options[0];
          e.selectUpgrade(preferred.id);
        }
        let goal = !cacheDone ? w.cache.position : w.anchor.position;
        let interact = false;
        if (!cacheDone && distance(p.position, goal) < 70) { interact = !interactionDown; cacheDone = w.cache.claimed; }
        if (cacheDone && w.phase === 'exploring' && distance(p.position, w.anchor.position) < 80) interact = !interactionDown;
        let speed = 1;
        if (w.phase === 'anchorActive') {
          const angle = w.elapsedMs / 1700;
          goal = { x: w.anchor.position.x + Math.cos(angle) * 175, y: w.anchor.position.y + Math.sin(angle) * 175 };
          if (character === 'turret-tina') {
            const imminent = (s.boss && distance(p.position, s.boss.position) < 130) || s.enemies.some(v => distance(v.position, p.position) < 85) || s.shockwaveRings?.some(r => Math.abs(distance(p.position, r.position) - r.radius) < 65);
            if (!imminent) speed = 0;
            if (!p.abilityCooldown || p.abilityCooldown <= 0) e.useAbility();
          } else if ((!p.abilityCooldown || p.abilityCooldown <= 0) && p.health < p.maxHealth * 0.6) e.useAbility();
        }
        const next = nav.waypoint(w, p.position, goal), d = distance(next, p.position) || 1;
        e.updateInput({ ...neutral, analogX: speed * (next.x - p.position.x) / d, analogY: speed * (next.y - p.position.y) / d, interact });
        interactionDown = interact;
        const t = performance.now(); e.advanceTime(50); frames.push(performance.now() - t);
      }
      const s = e.gameState, w = s.exploration;
      frames.sort((a, b) => a - b);
      runs.push({ character, route: detour ? 'cache detour' : 'direct', outcome: s.status === 'gameOver' ? 'defeated' : w.phase, activeSeconds: Math.round(w.elapsedMs / 1000), health: s.players[0].health, level: s.players[0].level, guardianHealth: s.boss?.health || 0, chargePercent: Math.round(w.anchor.chargeMs / 450), ...w.metrics, simulationP95Ms: frames[Math.floor(frames.length * 0.95)] });
    }
    return runs;
  });
  fs.mkdirSync('output/exploration', { recursive: true });
  fs.writeFileSync('output/exploration/playtest-runs.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
