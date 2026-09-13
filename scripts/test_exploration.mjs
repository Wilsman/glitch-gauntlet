import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto('http://localhost:3000');
  const results = await page.evaluate(async () => {
    const { LocalGameEngine } = await import('/src/lib/LocalGameEngine.ts');
    const { createExploration, isWalkable, moveWorld, WorldNavigator, ANCHOR_SOCKETS, SPAWN, distance } = await import('/src/lib/explorationWorld.ts');
    const { createEnemy } = await import('/shared/enemyConfig.ts');
    const checks = [], timings = [];
    const check = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
    const neutral = { up: false, down: false, left: false, right: false };
    const make = (character = 'dash-dynamo', seed = 0) => {
      const engine = new LocalGameEngine('test', character, 'Prototype test');
      engine.configureExploration(seed);
      engine.selectMapNode(engine.getGameState().runMap.reachableNodeIds[0]);
      engine.gameState.exploration.spawnsEnabled = false;
      engine.debugSetInvulnerability(true);
      return engine;
    };
    const input = (engine, direction, ms) => { engine.updateInput({ ...neutral, ...direction }); engine.advanceTime(ms); };
    const interact = engine => { input(engine, {}, 50); input(engine, { interact: true }, 50); input(engine, {}, 50); };
    const choose = engine => { const options = engine.upgradeChoices.get('test'); if (options?.length) engine.selectUpgrade(options[0].id); };
    const before = JSON.stringify({ ...localStorage });
    for (let seed = 0; seed < 3; seed++) {
      const w = createExploration(seed);
      check(isWalkable(w, w.anchor.position, 260), `Seed ${seed}: clear full anchor field`);
      check(isWalkable(w, { x: w.anchor.position.x + 180, y: w.anchor.position.y - 150 }, 42), `Seed ${seed}: guardian spawn fits`);
      const nav = new WorldNavigator();
      for (const target of [w.anchor.position, w.cache.position, w.elite.position]) {
        let p = { ...SPAWN };
        for (let step = 0; step < 4000 && distance(p, target) > 40; step++) {
          const next = nav.waypoint(w, p, target, 22), d = distance(p, next);
          if (d < 0.1) break;
          p = moveWorld(w, p, { x: p.x + (next.x - p.x) / d * Math.min(12, d), y: p.y + (next.y - p.y) / d * Math.min(12, d) }, 22);
        }
        check(distance(p, target) <= 40, `Seed ${seed}: walking path to ${target.x},${target.y}`);
      }
    }
    let e = make(), w = e.gameState.exploration;
    const stopped = moveWorld(w, { x: 700, y: 1100 }, { x: 1350, y: 1100 });
    check(stopped.x <= 782, 'Swept movement cannot cross a machine');
    input(e, { right: true }, 600);
    check(e.gameState.players[0].position.x > 450 && w.momentum > 0, 'Movement builds momentum');
    e.useBlink(); check(w.slideMs > 0 && w.slideCooldownMs > 0, 'Slide activates with a cooldown');
    e.useBlink(); check(w.slideCooldownMs === 2000, 'Repeated slide cannot reset a running cooldown');
    input(e, {}, 1000); check(w.momentum === 0, 'Stopping drains momentum');
    const straight = make(), diagonal = make();
    input(straight, { down: true }, 400); input(diagonal, { down: true, right: true }, 400);
    check(Math.abs(distance(straight.gameState.players[0].position, SPAWN) - distance(diagonal.gameState.players[0].position, SPAWN)) < 1, 'Keyboard diagonal speed is normalized');
    const analog = make(); input(analog, { analogX: 0.4, analogY: 0 }, 400);
    check(distance(analog.gameState.players[0].position, SPAWN) < distance(straight.gameState.players[0].position, SPAWN) * 0.5, 'Partial analog magnitude is preserved');
    e.setIsPaused(true); const elapsed = w.elapsedMs; e.advanceTime(70000);
    check(w.elapsedMs === elapsed, 'Pause freezes pressure time');
    e.setIsPaused(false);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); e.advanceTime(70000);
    check(w.elapsedMs === elapsed, 'Hidden tab freezes simulation without catch-up');
    delete document.hidden;
    e.debugLevelUp(); e.advanceTime(50); const upgradeElapsed = w.elapsedMs; e.advanceTime(70000);
    check(w.elapsedMs === upgradeElapsed, 'Upgrade selection freezes pressure time'); choose(e);
    e = make(); w = e.gameState.exploration;
    e.debugExploration('cache'); interact(e);
    check(w.cache.claimed && e.gameState.players[0].coins === 30, 'Cache grants its reward');
    interact(e); check(e.gameState.players[0].coins === 30, 'Cache cannot pay twice');
    e.gameState.players[0].position = { x: 1100, y: 700 }; interact(e); check(!w.gateOpen, 'Shortcut cannot open from arrival side');
    e.gameState.players[0].position = { x: 1100, y: 530 }; interact(e); check(w.gateOpen, 'Shortcut opens from maintenance side');
    check(isWalkable(w, { x: 1100, y: 610 }, 18), 'Unlocked gate becomes walkable');
    e.debugExploration('elite'); interact(e); check(e.gameState.enemies.some(enemy => enemy.id === w.elite.id), 'Elite is explicitly activated');
    e.gameState.enemies.find(enemy => enemy.id === w.elite.id).health = 0; e.advanceTime(50); choose(e); e.advanceTime(50);
    check(w.elite.defeated && e.gameState.players[0].coins >= 70, 'Elite defeat grants one reward'); choose(e); const eliteCoins = e.gameState.players[0].coins;
    e.advanceTime(100); check(e.gameState.players[0].coins === eliteCoins, 'Elite does not pay twice');
    e = make(); w = e.gameState.exploration;
    e.debugExploration('anchor'); e.advanceTime(50); check(w.phase === 'exploring' && !e.gameState.boss, 'Discovery alone does not activate anchor');
    interact(e); check(w.phase === 'anchorActive' && e.gameState.boss?.id === 'anchor-guardian', 'Interaction activates guardian and charge');
    e.advanceTime(500); const charged = w.anchor.chargeMs;
    e.gameState.players[0].position = { x: w.anchor.position.x - 400, y: w.anchor.position.y }; e.advanceTime(500);
    check(w.anchor.chargeMs === charged, 'Leaving the field preserves charge');
    e.debugExploration('charge'); e.advanceTime(50); check(w.phase === 'anchorActive', 'Charge alone cannot complete event');
    e.debugExploration('guardian'); e.advanceTime(50); check(w.phase === 'exitReady' && e.gameState.status === 'playing', 'Both conditions prepare exit without ending run');
    const pressureElapsed = w.elapsedMs; e.advanceTime(1000); check(w.elapsedMs === pressureElapsed, 'Completed event stops pressure');
    e.debugExploration('anchor'); interact(e); check(w.rewardClaimed && e.gameState.levelingUpPlayerId === 'test', 'Anchor reward uses upgrade selection'); choose(e);
    interact(e); check(e.gameState.status === 'mapSelection' && e.gameState.runMap.reachableNodeIds.length > 0, 'Exit returns to successors on route map');
    e.selectMapNode(e.gameState.runMap.reachableNodeIds[0]); check(!e.gameState.exploration, 'Only first combat node becomes prototype');
    e.restartExploration('turret-tina', 2); check(e.gameState.exploration.seed === 2 && e.gameState.players[0].characterType === 'turret-tina', 'Testing controls restart with character and seed');
    e.advanceTime(1100); check(e.gameState.exploration.established, 'Tina establishes after holding still');
    e.useAbility(); check(e.gameState.turrets.length === 3, 'Tina deploys three turrets');
    const turret = e.gameState.turrets[0]; turret.attackCooldown = 1000; e.advanceTime(100);
    check(Math.abs(turret.attackCooldown - 870) < 1, 'Established turrets receive derived 30% rate bonus');
    input(e, { right: true }, 100); check(!e.gameState.exploration.established, 'Moving immediately ends established bonus');
    e = make(); e.debugExploration('anchor'); interact(e); e.debugExploration('guardian'); e.advanceTime(50);
    check(e.gameState.exploration.phase === 'anchorActive' && e.gameState.exploration.anchor.guardianDefeated, 'Guardian defeat alone cannot complete event');
    e = make(); e.gameState.exploration.spawnsEnabled = true;
    const t = performance.now(); for (let i = 0; i < 240; i++) { e.advanceTime(1000); choose(e); } timings.push({ scenario: 'four active minutes capped exploration', ms: performance.now() - t });
    check(e.gameState.enemies.length <= 24, 'Exploration enemy count remains capped');
    check(e.gameState.exploration.pressure > 1 && e.gameState.exploration.pressure <= 1.75, 'Pressure rises gradually within cap');
    e = make(); e.debugExploration('anchor'); interact(e); e.gameState.exploration.spawnsEnabled = true;
    for (let i = 0; i < 120; i++) { e.advanceTime(1000); choose(e); if (e.gameState.enemies.length > 40) throw new Error('Event enemy cap exceeded'); }
    check(true, 'Event enemy cap holds over two simulated minutes');
    e = make(); e.debugSetInvulnerability(false); e.damagePlayer(e.gameState.players[0], 10, e.now()); e.advanceTime(50); e.gameState.players[0].health = 0; e.gameState.players[0].status = 'dead'; e.advanceTime(50);
    check(e.gameState.status === 'gameOver', 'Death transitions to game over');
    check(JSON.stringify({ ...localStorage }) === before, 'Prototype writes no saved progression or recap');
    const normal = new LocalGameEngine('ordinary', 'dash-dynamo'); normal.selectMapNode(normal.gameState.runMap.reachableNodeIds[0]);
    check(!normal.gameState.exploration && normal.gameState.encounterWavesTotal > 0, 'Ordinary runs still start arena waves');
    return { checks, timings };
  });
  fs.mkdirSync('output/exploration', { recursive: true });
  fs.writeFileSync('output/exploration/behavior-checks.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
