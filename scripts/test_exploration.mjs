import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto(process.env.BASE_URL || 'http://localhost:5173');
  const results = await page.evaluate(async () => {
    const { LocalGameEngine } = await import('/src/lib/LocalGameEngine.ts');
    const { createExploration, isWalkable, moveWorld, WorldNavigator, SPAWN, GATE, distance } = await import('/src/lib/explorationWorld.ts');
    const { computeRank, rollStageModifiers } = await import('/src/lib/stageModifiers.ts');
    const { createEnemy } = await import('/shared/enemyConfig.ts');
    const checks = [], timings = [];
    const check = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
    const neutral = { up: false, down: false, left: false, right: false };
    const make = (character = 'dash-dynamo', seed = 0) => {
      const engine = new LocalGameEngine('test', character, 'Prototype test');
      engine.configureExploration(seed);
      check(engine.gameState.status === 'playing' && !!engine.gameState.exploration && engine.gameState.exploration.stage === 1, 'Prototype drops straight into Stage 1');
      check(engine.gameState.status !== 'mapSelection', 'Prototype never shows the route map');
      engine.gameState.exploration.spawnsEnabled = false;
      engine.debugSetInvulnerability(true);
      return engine;
    };
    const input = (engine, direction, ms) => { engine.updateInput({ ...neutral, ...direction }); engine.advanceTime(ms); };
    const interact = engine => { input(engine, {}, 50); input(engine, { interact: true }, 50); input(engine, {}, 50); };
    const choose = engine => { const options = engine.upgradeChoices.get('test'); if (options?.length) engine.selectUpgrade(options[0].id); };
    const before = JSON.stringify({ ...localStorage });

    // BFS over the 50px walk grid; returns a predicate over world points.
    const reachableSet = (w, origin = SPAWN) => {
      const cell = 50, cols = Math.ceil(w.width / cell), rows = Math.ceil(w.height / cell);
      const seen = new Uint8Array(cols * rows);
      const start = Math.floor(origin.y / cell) * cols + Math.floor(origin.x / cell);
      const q = [start]; seen[start] = 1;
      for (let h = 0; h < q.length; h++) {
        const cur = q[h];
        for (const n of [cur - cols, cur + cols, ...(cur % cols ? [cur - 1] : []), ...(cur % cols < cols - 1 ? [cur + 1] : [])]) {
          if (n < 0 || n >= seen.length || seen[n]) continue;
          if (isWalkable(w, { x: (n % cols + 0.5) * cell, y: (Math.floor(n / cols) + 0.5) * cell }, 22)) { seen[n] = 1; q.push(n); }
        }
      }
      return { cols, seen, has: p => !!seen[Math.floor(p.y / cell) * cols + Math.floor(p.x / cell)], count: q.length };
    };

    for (let seed = 0; seed < 3; seed++) {
      const w = createExploration(seed);
      check(w.width === 12800 && w.height === 7200, `Seed ${seed}: world is 12800x7200`);
      check(w.biomes.length === 12 && w.biomes.every(b => b.biome && b.name), `Seed ${seed}: 12 biome regions`);
      check(w.doorways.length >= 15, `Seed ${seed}: doorway network generated (${w.doorways.length})`);
      check(w.doorways.every(d => Math.max(d.width, d.height) >= 280), `Seed ${seed}: doorways at least 280px wide`);
      const reach = reachableSet(w);
      check(reach.count > w.width * w.height / (50 * 50) * 0.5, `Seed ${seed}: majority of the world is reachable`);
      for (const [i, d] of w.doorways.entries()) check(reach.has({ x: d.x + d.width / 2, y: d.y + d.height / 2 }), `Seed ${seed}: doorway ${i} reachable`);
      check(reach.has(w.anchor.position), `Seed ${seed}: anchor reachable`);
      for (const c of w.chests) { if (c.secret) continue; check(reach.has(c.position), `Seed ${seed}: ${c.id} reachable`); }
      // Secret pockets stay sealed until their cracked wall breaks.
      const secretChests = w.chests.filter(c => c.secret);
      const cracked = w.walls.filter(x => x.cracked);
      check(cracked.length >= 1 && cracked.every(x => (x.hp ?? 0) > 0), `Seed ${seed}: secret rooms have cracked walls (${cracked.length})`);
      for (const c of secretChests) check(!reach.has(c.position), `Seed ${seed}: secret chest ${c.id} sealed before wall breaks`);
      for (const wall of cracked) {
        const saved = w.walls;
        w.walls = saved.filter(x => x !== wall);
        const open = reachableSet(w);
        const pocket = { x: wall.x + wall.width / 2, y: wall.y + wall.height / 2 };
        const inner = { x: pocket.x + Math.sign(w.width / 2 - pocket.x || 1) * 0, y: pocket.y };
        const nearby = secretChests.filter(c => distance(c.position, pocket) < 400);
        for (const c of nearby) check(open.has(c.position), `Seed ${seed}: pocket reachable after ${wall.id} breaks`);
        check(open.has(inner), `Seed ${seed}: cracked-wall gap reachable after ${wall.id} breaks`);
        w.walls = saved;
      }
      for (const p of w.pads) check(reach.has(p.position), `Seed ${seed}: ${p.id} reachable`);
      check(isWalkable(w, w.anchor.position, 260), `Seed ${seed}: clear full anchor field`);
      check(isWalkable(w, { x: w.anchor.position.x + 180, y: w.anchor.position.y - 150 }, 42), `Seed ${seed}: guardian spawn fits`);
      const anchorRegion = w.biomes[Math.floor(w.anchor.position.y / 2400) * 4 + Math.floor(w.anchor.position.x / 3200)];
      check(anchorRegion && anchorRegion.biome !== 'yard', `Seed ${seed}: anchor placed outside the yard`);
      // Hazards never overlap doorways, chests, pads, spawn or the anchor clearing.
      for (const h of w.hazards) {
        check(!w.doorways.some(d => Math.hypot(d.x + d.width / 2 - h.x, d.y + d.height / 2 - h.y) < h.radius + Math.max(d.width, d.height) / 2), `Seed ${seed}: ${h.id} clear of doorways`);
        check(!w.chests.some(c => distance(c.position, h) < h.radius + 30), `Seed ${seed}: ${h.id} clear of chests`);
        check(!w.pads.some(p => distance(p.position, h) < h.radius + 30), `Seed ${seed}: ${h.id} clear of pads`);
        check(distance(h, SPAWN) > h.radius + 60 && distance(h, w.anchor.position) > h.radius + 200, `Seed ${seed}: ${h.id} clear of spawn/anchor`);
      }
      // Determinism.
      const again = createExploration(seed);
      check(JSON.stringify(again.walls) === JSON.stringify(w.walls) && JSON.stringify(again.hazards) === JSON.stringify(w.hazards) && JSON.stringify(again.chests) === JSON.stringify(w.chests), `Seed ${seed}: generation is deterministic`);
      const nav = new WorldNavigator();
      for (const target of [w.anchor.position, w.cache.position, w.elite.position]) {
        let p = { ...SPAWN };
        for (let step = 0; step < 9000 && distance(p, target) > 40; step++) {
          const next = nav.waypoint(w, p, target, 22), d = distance(p, next);
          if (d < 0.1) break;
          p = moveWorld(w, p, { x: p.x + (next.x - p.x) / d * Math.min(12, d), y: p.y + (next.y - p.y) / d * Math.min(12, d) }, 22);
        }
        check(distance(p, target) <= 40, `Seed ${seed}: walking path to ${Math.round(target.x)},${Math.round(target.y)}`);
      }

      // Stage >= 2 variant: no yard, a clear rift-landing pad, reachable from the pad.
      const w2 = createExploration(seed, { stage: 2, modifier: 'treasure' });
      check(!w2.hasYard, `Seed ${seed}: stage-2 world drops the yard`);
      check(w2.stage === 2 && w2.modifier === 'treasure', `Seed ${seed}: stage-2 world carries stage and modifier`);
      check(isWalkable(w2, w2.landing, 22) && isWalkable(w2, { x: w2.landing.x + 190, y: w2.landing.y }, 22), `Seed ${seed}: rift landing pad is clear`);
      check(w2.pedestals.filter(ped => ped.kind === 'treasure').length === 3, `Seed ${seed}: treasure modifier lays 3 legendary pedestals`);
      const reach2 = reachableSet(w2, w2.landing);
      check(reach2.has(w2.anchor.position), `Seed ${seed}: stage-2 anchor reachable from landing pad`);
      check(w2.doorways.every(d => reach2.has({ x: d.x + d.width / 2, y: d.y + d.height / 2 })), `Seed ${seed}: stage-2 doorways reachable`);
    }

    let e = make(), w = e.gameState.exploration;
    const stopped = moveWorld(w, { x: 700, y: 3700 }, { x: 1350, y: 3700 });
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
    e.gameState.players[0].position = { x: GATE.x, y: GATE.y + 130 }; interact(e); check(!w.gateOpen, 'Shortcut cannot open from arrival side');
    e.gameState.players[0].position = { x: GATE.x, y: GATE.y - 40 }; interact(e); check(w.gateOpen, 'Shortcut opens from maintenance side');
    check(isWalkable(w, { x: GATE.x, y: GATE.y + 40 }, 18), 'Unlocked gate becomes walkable');
    e.debugExploration('elite'); interact(e); check(e.gameState.enemies.some(enemy => enemy.id === w.elite.id), 'Elite is explicitly activated');
    e.gameState.enemies.find(enemy => enemy.id === w.elite.id).health = 0; e.advanceTime(50); choose(e); e.advanceTime(50);
    check(w.elite.defeated && e.gameState.players[0].coins >= 70, 'Elite defeat grants one reward'); choose(e); const eliteCoins = e.gameState.players[0].coins;
    e.advanceTime(100); check(e.gameState.players[0].coins === eliteCoins, 'Elite does not pay twice');
    e = make(); w = e.gameState.exploration;
    for (const chest of w.chests) check(isWalkable(w, chest.position, 22), `Chest ${chest.id} sits on walkable floor`);
    for (const pad of w.pads) check(isWalkable(w, pad.position, 22), `Boost pad ${pad.id} sits on walkable floor`);
    const player = e.gameState.players[0], chest = w.chests.find(c => c.kind === 'small');
    player.position = { ...chest.position }; player.coins = 10; interact(e);
    check(!chest.opened && player.coins === 10, 'Chest cannot open without enough coins');
    player.coins = 40; const items = player.collectedUpgrades?.length || 0; interact(e);
    check(chest.opened && player.coins === 15 && (player.collectedUpgrades?.length || 0) === items + 1 && w.itemFeed.length === 1, 'Chest charges coins and grants an item instantly');
    interact(e); check(player.coins === 15, 'Opened chest cannot pay twice');
    const vault = w.chests.find(c => c.kind === 'large'); player.position = { ...vault.position }; player.coins = 60; interact(e);
    check(['legendary', 'boss'].includes(w.itemFeed[0].rarity), 'Legendary vault grants a legendary or boss item');
    const shrine = w.chests.find(c => c.kind === 'shrine'); player.position = { ...shrine.position }; player.coins = 15; interact(e);
    check(player.coins === 0 && shrine.cost > 15, 'Shrine of Chance charges and escalates its price');
    player.position = { x: w.pads[0].position.x + 20, y: w.pads[0].position.y }; input(e, { left: true }, 50);
    check(w.boostMs === 0, 'Boost pad ignores players travelling against its arrow');
    player.position = { ...w.pads[0].position }; input(e, { right: true }, 50);
    check(w.boostMs > 0 && w.momentum === 1, 'Boost pad launches the player and fills momentum');
    e.advanceTime(1000); const enemyForCombo = createEnemy('combo-test', { x: player.position.x + 40, y: player.position.y }, 'grunt', 1);
    enemyForCombo.health = 0; e.gameState.enemies.push(enemyForCombo); e.advanceTime(50);
    check(w.kills === 1 && w.combo.count === 1 && w.combo.timerMs > 0, 'Kills start a combo window');
    e.advanceTime(3200); check(w.combo.count === 0 && w.combo.best === 1, 'Combo expires after its window');
    w.elapsedMs = 360000; const { difficultyTier } = await import('/src/lib/explorationWorld.ts');
    check(difficultyTier(w.elapsedMs).label === 'IMPOSSIBLE', 'Difficulty ladder escalates with stage time');

    // Hazard effects: sludge slows, warp speeds up, ice slows the turn, lava burns.
    e = make(); w = e.gameState.exploration;
    const hz = kind => w.hazards.find(h => h.kind === kind);
    const travel = (from, ms) => { e.gameState.players[0].position = { ...from }; w.velocity = { x: 0, y: 0 }; input(e, { right: true }, ms); return distance(e.gameState.players[0].position, from); };
    const open = { x: SPAWN.x, y: SPAWN.y - 200 };
    const baseTravel = travel(open, 400);
    const sludge = hz('sludge'), warp = hz('warp'), ice = hz('ice'), lava = hz('lava');
    check(!!sludge && !!warp && !!ice && !!lava, 'World contains every hazard kind');
    const sludgeTravel = travel({ x: sludge.x, y: sludge.y }, 400);
    check(sludgeTravel < baseTravel * 0.75, `Sludge slows movement (${Math.round(sludgeTravel)} < ${Math.round(baseTravel)})`);
    const warpTravel = travel({ x: warp.x, y: warp.y }, 400);
    check(warpTravel > baseTravel * 1.15, `Warp current speeds movement (${Math.round(warpTravel)} > ${Math.round(baseTravel)})`);
    e.gameState.players[0].position = { x: ice.x, y: ice.y }; w.velocity = { x: 0, y: 0 };
    input(e, { right: true }, 60); const iceVelX = w.velocity.x; input(e, { up: true }, 60); const iceVelY = Math.abs(w.velocity.y);
    e.gameState.players[0].position = { ...open }; w.velocity = { x: 0, y: 0 };
    input(e, { right: true }, 60); input(e, { up: true }, 60); const dryVelY = Math.abs(w.velocity.y);
    check(iceVelX > 0 && iceVelY < dryVelY * 0.7, 'Ice reduces steering responsiveness');
    e.debugSetInvulnerability(false);
    const p2 = e.gameState.players[0]; p2.position = { x: lava.x, y: lava.y }; w.velocity = { x: 0, y: 0 };
    const hp = p2.health; input(e, {}, 1400);
    check(p2.health < hp, 'Lava burns while standing inside');
    e.debugSetInvulnerability(true);

    // Biome discovery grants +5 coins once and raises the banner.
    e = make(); w = e.gameState.exploration;
    const far = w.biomes.find(b => b.id !== w.currentRegionId && !b.discovered);
    const coins0 = e.gameState.players[0].coins || 0;
    e.gameState.players[0].position = { x: far.x + far.width / 2, y: far.y + far.height / 2 };
    e.advanceTime(50);
    check(far.discovered && (e.gameState.players[0].coins || 0) === coins0 + 5 && w.biomeBanner?.name === far.name, 'Entering a biome grants +5 coins and a banner');
    e.gameState.players[0].position = { ...SPAWN }; e.advanceTime(50);
    e.gameState.players[0].position = { x: far.x + far.width / 2, y: far.y + far.height / 2 }; e.advanceTime(50);
    check((e.gameState.players[0].coins || 0) === coins0 + 5, 'Biome discovery pays only once');

    e = make(); w = e.gameState.exploration;
    e.debugExploration('anchor'); e.advanceTime(50); check(w.phase === 'exploring' && !e.gameState.boss, 'Discovery alone does not activate anchor');
    interact(e); check(w.phase === 'anchorActive' && e.gameState.boss?.id === 'anchor-guardian', 'Interaction activates guardian and charge');
    check(e.gameState.boss.maxHealth === 1000, 'Stage 1 guardian health is 1000');
    e.advanceTime(500); const charged = w.anchor.chargeMs;
    e.gameState.players[0].position = { x: w.anchor.position.x - 400, y: w.anchor.position.y }; e.advanceTime(500);
    check(w.anchor.chargeMs === charged, 'Leaving the field preserves charge');
    e.debugExploration('charge'); e.advanceTime(50); check(w.phase === 'anchorActive', 'Charge alone cannot complete event');
    e.debugExploration('guardian'); e.advanceTime(400); // guardian hit-stop (~260ms) freezes ticks briefly
    check(w.phase === 'pedestals' && e.gameState.status === 'playing', 'Stabilised anchor opens the boss relic phase');
    const bossPeds = w.pedestals.filter(p => p.kind === 'boss');
    check(bossPeds.length === 3 && bossPeds.every(p => p.option), 'Three boss relic pedestals appear');
    check(bossPeds.every(p => ['legendary', 'boss', 'void', 'lunar'].includes(p.option.rarity)), 'Boss relics roll from high rarities');
    // Walking onto a pedestal takes exactly one item and collapses the others.
    const itemsBefore = e.gameState.players[0].collectedUpgrades?.length || 0;
    e.debugExploration('pedestal'); e.advanceTime(500);
    check(w.pedestals.every(p => p.taken), 'Taking one relic collapses the other pedestals');
    check((e.gameState.players[0].collectedUpgrades?.length || 0) === itemsBefore + 1, 'Pedestal grants exactly one item');
    check(w.phase === 'results' && !!w.results, 'Stage-clear results splash follows the relic claim');
    const expectedRank = computeRank({ kills: w.kills, bestCombo: w.combo.best, items: w.metrics.itemsTaken, damageTaken: Math.round(w.metrics.damageTaken), seconds: Math.round((w.elapsedMs - w.stageStartMs) / 1000) });
    check(w.results.rank === expectedRank && w.results.bonus === { S: 60, A: 40, B: 25, C: 15, D: 5 }[expectedRank], `Rank ${w.results.rank} matches the score formula and pays its bonus`);
    // Results expire into three distinct rift portals.
    e.advanceTime(4500);
    check(w.phase === 'portals' && w.portals.length === 3, 'Three rift portals open after results');
    check(new Set(w.portals.map(p => p.modifier)).size === 3, 'Rift portals offer three distinct modifiers');
    check(JSON.stringify(rollStageModifiers(w.seed, w.stage)) === JSON.stringify(w.portals.map(p => p.modifier)), 'Portal modifiers are seeded');
    // Walking into a portal warps to the next stage with carry-over.
    const carry = { elapsed: w.elapsedMs, coins: e.gameState.players[0].coins, level: e.gameState.players[0].level, items: w.run.items.length, seed: w.seed };
    const chosen = w.portals[0].modifier;
    e.debugExploration('portal'); e.advanceTime(300);
    check(w.warpMs > 0 || e.gameState.exploration !== w, 'Entering a portal starts the warp');
    e.advanceTime(1200);
    const w3 = e.gameState.exploration;
    check(w3 && w3 !== w && w3.stage === 2, 'Portal commit generates Stage 2');
    check(w3.modifier === chosen, 'Chosen modifier applies to the next stage');
    check(w3.seed === carry.seed + 101, 'Stage 2 uses baseSeed + stage * 101');
    check(!w3.hasYard, 'Stage 2 lands in a biome region, not the yard');
    check(w3.elapsedMs >= carry.elapsed, 'Difficulty clock carries over');
    check(w3.run.stagesCleared === 1 && w3.run.items.length === carry.items, 'Run stats carry over');
    check(e.gameState.players[0].level === carry.level, 'Player level carries over');
    e.debugExploration('anchor'); interact(e);
    check(e.gameState.boss?.maxHealth === 1600, 'Stage 2 guardian health scales to 1600');
    e.restartExploration('turret-tina', 2); check(e.gameState.exploration.seed === 2 && e.gameState.exploration.stage === 1 && e.gameState.players[0].characterType === 'turret-tina', 'Testing controls restart with character and seed');
    e.advanceTime(1100); check(e.gameState.exploration.established, 'Tina establishes after holding still');
    e.useAbility(); check(e.gameState.turrets.length === 3, 'Tina deploys three turrets');
    const turret = e.gameState.turrets[0]; turret.attackCooldown = 1000; e.advanceTime(100);
    check(Math.abs(turret.attackCooldown - 870) < 1, 'Established turrets receive derived 30% rate bonus');
    input(e, { right: true }, 100); check(!e.gameState.exploration.established, 'Moving immediately ends established bonus');
    e = make(); e.debugExploration('anchor'); interact(e); e.debugExploration('guardian'); e.advanceTime(200);
    check(e.gameState.exploration.phase === 'anchorActive' && e.gameState.exploration.anchor.guardianDefeated, 'Guardian defeat alone cannot complete event');
    e = make(); e.gameState.exploration.spawnsEnabled = true;
    const t = performance.now(); for (let i = 0; i < 240; i++) { e.advanceTime(1000); choose(e); } timings.push({ scenario: 'four active minutes capped exploration', ms: performance.now() - t });
    check(e.gameState.enemies.length <= 55, 'Exploration enemy count remains capped');
    check(e.gameState.exploration.pressure > 1 && e.gameState.exploration.pressure <= 3.5, 'Pressure rises gradually within cap');
    check(e.gameState.exploration.kills > 0 && e.gameState.exploration.combo.best > 0, 'Kills feed the combo counter');
    e = make(); e.debugExploration('anchor'); interact(e); e.gameState.exploration.spawnsEnabled = true;
    for (let i = 0; i < 120; i++) { e.advanceTime(1000); choose(e); if (e.gameState.enemies.length > 80) throw new Error('Event enemy cap exceeded'); }
    check(true, 'Event enemy cap holds over two simulated minutes');
    // Modifier effects.
    e = make(); e.advanceStage('goldRush'); let w4 = e.gameState.exploration;
    check(w4.modifier === 'goldRush' && w4.chests.find(c => c.kind === 'small').cost === Math.round(25 * 0.7), 'Gold Rush cuts chest and shrine costs by 30%');
    e.advanceStage('blackMarket'); w4 = e.gameState.exploration;
    check(w4.chests.find(c => c.kind === 'small').cost === 35, 'Black Market raises small chest cost by $10');
    check(w4.pedestals.filter(p => p.kind === 'shop').length === 4 && w4.pedestals.some(p => p.kind === 'heal'), 'Black Market lays 4 shop pedestals and a heal pedestal');
    e.advanceStage('bloodMoon'); w4 = e.gameState.exploration;
    const plainVaults = createExploration(w4.seed, { stage: 2 }).chests.filter(c => c.kind === 'large').length;
    check(w4.chests.filter(c => c.kind === 'large').length === plainVaults + 2, 'Blood Moon adds two extra legendary vaults');
    e.advanceStage('darkness'); w4 = e.gameState.exploration;
    check(w4.modifier === 'darkness', 'Curse of the Dark flag reaches the world for screen FX');
    const darkChest = w4.chests.find(c => c.kind === 'small' && !c.secret), darkPlayer = e.gameState.players[0];
    darkPlayer.position = { ...darkChest.position }; darkPlayer.coins = 500;
    const feedBefore = w4.itemFeed.length; interact(e);
    check(w4.itemFeed.length === feedBefore + 2, 'Darkness chests drop two items');
    // Horde Night: coin drops x1.25 vs a plain stage.
    const coinValueFor = engine => { const s = engine.gameState; const dead = createEnemy('coin-test', { x: s.players[0].position.x + 40, y: s.players[0].position.y }, 'grunt', 1); dead.health = 0; s.enemies.push(dead); const n = s.xpOrbs.length; engine.advanceTime(50); const orb = s.xpOrbs.slice(n).find(o => o.kind === 'coin'); return orb?.value || 0; };
    const plainCoins = coinValueFor(e);
    e.advanceStage('hordeNight'); w4 = e.gameState.exploration;
    check(Math.abs(coinValueFor(e) - Math.round(plainCoins * 1.25)) <= 1, 'Horde Night multiplies coin drops by 1.25');
    // Overclock: player speed x1.15 measured on the clear landing pad.
    const travelFor = engine => { const s = engine.gameState; s.players[0].position = { ...s.exploration.landing }; s.exploration.velocity = { x: 0, y: 0 }; engine.updateInput({ ...neutral, right: true }); engine.advanceTime(200); return distance(s.players[0].position, s.exploration.landing); };
    const hordeTravel = travelFor(e);
    e.advanceStage('overclock'); w4 = e.gameState.exploration;
    check(travelFor(e) > hordeTravel * 1.08, 'Overclock raises player speed by 15%');
    // Secret rooms: projectiles chip cracked walls; at 0 hp the pocket opens and pays out.
    e = make(); w = e.gameState.exploration;
    const crackedWall = w.walls.find(x => x.cracked);
    const coinsBefore = e.gameState.players[0].coins || 0;
    const wallCenter = { x: crackedWall.x + crackedWall.width / 2, y: crackedWall.y + crackedWall.height / 2 };
    for (let i = 0; i < 14 && w.walls.includes(crackedWall); i++) {
      e.gameState.projectiles.push({ id: `pw-${i}`, position: { x: wallCenter.x, y: wallCenter.y - crackedWall.height / 2 - 8 }, velocity: { x: 0, y: 16 }, ownerId: 'test', damage: 5, radius: 3 });
      e.advanceTime(60);
    }
    check(!w.walls.includes(crackedWall), 'Cracked wall breaks after enough projectile hits');
    check((e.gameState.players[0].coins || 0) === coinsBefore + 10, 'Breaking a secret wall pays +10 coins');
    const openReach = reachableSet(w);
    for (const c of w.chests.filter(c => c.secret && distance(c.position, wallCenter) < 400)) check(openReach.has(c.position), 'Secret pocket is reachable once the wall breaks');

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
