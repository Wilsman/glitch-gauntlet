import type { GameState, InputState, Player, Vector2D } from '@shared/types';
import type { ExplorationState } from '@shared/exploration';
import { createEnemy } from '@shared/enemyConfig';
import { createBoss } from '@shared/bossConfig';
import { CHARGE_MS, GATE, VIEW_HEIGHT, VIEW_WIDTH, clamp, distance, isWalkable, lineClear, moveWorld } from './explorationWorld';

export class ExplorationStage {
  private spawnMs = 4500;
  private serial = 0;
  private wasInteract = false;
  private lastVitality: number | null = null;
  private pending: { position: Vector2D; remainingMs: number }[] = [];

  private observeVitals(world: ExplorationState, player: Player) {
    const vitality = player.health + (player.shield || 0);
    if (this.lastVitality !== null && vitality < this.lastVitality) {
      world.momentum *= 0.3;
      world.metrics.damageTaken += this.lastVitality - vitality;
    }
    this.lastVitality = vitality;
  }

  slide(world: ExplorationState, player: Player) {
    if (player.characterType !== 'dash-dynamo' || world.slideCooldownMs > 0) return;
    world.slideMs = 450; world.slideCooldownMs = 2000;
  }

  move(world: ExplorationState, player: Player, input: InputState, delta: number) {
    let x = input.analogX || 0, y = input.analogY || 0;
    if (Math.hypot(x, y) < 0.1) { x = Number(input.right) - Number(input.left); y = Number(input.down) - Number(input.up); }
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) { x /= magnitude; y /= magnitude; }
    const moving = magnitude > 0.1;
    world.slideCooldownMs = Math.max(0, world.slideCooldownMs - delta);
    world.slideMs = Math.max(0, world.slideMs - delta);
    this.observeVitals(world, player);
    if (player.characterType === 'dash-dynamo') world.momentum = clamp(world.momentum + delta * (moving ? 1 / 2000 : -1 / 650), 0, 1);
    else world.momentum = 0;
    world.stationaryMs = moving ? 0 : world.stationaryMs + delta;
    world.established = player.characterType === 'turret-tina' && world.stationaryMs >= 1000;
    const speed = player.speed * (1 + world.momentum * 0.5) * (world.slideMs > 0 ? 1.35 : 1) * (player.isAbilityActive && player.characterType === 'dash-dynamo' ? 2 : 1);
    const steering = world.slideMs > 0 ? Math.min(1, delta / 150) : Math.min(1, delta / 55);
    world.velocity.x += (x * speed - world.velocity.x) * steering;
    world.velocity.y += (y * speed - world.velocity.y) * steering;
    if (!moving && world.slideMs <= 0) world.velocity = { x: 0, y: 0 };
    const old = player.position;
    player.position = moveWorld(world, old, { x: old.x + world.velocity.x * delta / (1000 / 60), y: old.y + world.velocity.y * delta / (1000 / 60) }, 18);
    if (moving && distance(old, player.position) < 0.5) world.momentum = Math.max(0, world.momentum - delta / 350);
  }

  private notice(world: ExplorationState, text: string) { world.notice = text; world.noticeMs = 4000; }

  update(state: GameState, delta: number, reward: () => void, exit: () => void) {
    const world = state.exploration, player = state.players[0];
    if (!world) return;
    this.observeVitals(world, player);
    if (player.status !== 'alive') return;
    world.noticeMs = Math.max(0, world.noticeMs - delta);
    if (world.phase !== 'exitReady') world.elapsedMs += delta;
    world.pressure = Math.min(1.75, 1 + Math.max(0, world.elapsedMs - 60000) / 60000 * 0.15);
    const targetCamera = { x: clamp(player.position.x - VIEW_WIDTH / 2, 0, world.width - VIEW_WIDTH), y: clamp(player.position.y - VIEW_HEIGHT / 2, 0, world.height - VIEW_HEIGHT) };
    for (const axis of ['x', 'y'] as const) {
      const difference = targetCamera[axis] - world.camera[axis];
      if (Math.abs(difference) > 32) world.camera[axis] += (difference - Math.sign(difference) * 32) * Math.min(1, delta / 90);
      world.camera[axis] = clamp(world.camera[axis], 0, world[axis === 'x' ? 'width' : 'height'] - (axis === 'x' ? VIEW_WIDTH : VIEW_HEIGHT));
    }
    const columns = 32;
    const visited = new Set(world.visited);
    for (let row = Math.max(0, Math.floor(player.position.y / 100) - 3); row <= Math.min(19, Math.floor(player.position.y / 100) + 3); row++) {
      for (let col = Math.max(0, Math.floor(player.position.x / 100) - 4); col <= Math.min(31, Math.floor(player.position.x / 100) + 4); col++) visited.add(row * columns + col);
    }
    world.visited = [...visited];
    for (const point of [world.anchor, world.cache, world.elite]) if (distance(point.position, player.position) < 500) point.discovered = true;
    if (world.anchor.discovered && world.metrics.discoveryMs === null) world.metrics.discoveryMs = world.elapsedMs;
    const pressed = !!player.lastInput?.interact && !this.wasInteract;
    this.wasInteract = !!player.lastInput?.interact;
    world.prompt = '';
    if (world.phase === 'exploring') {
      if (distance(player.position, world.cache.position) < 85 && !world.cache.claimed) {
        world.prompt = 'Open maintenance cache';
        if (pressed) { world.cache.claimed = true; player.coins = (player.coins || 0) + 30; player.health = Math.min(player.maxHealth, player.health + player.maxHealth / 5); world.metrics.detourRewards++; this.notice(world, 'Cache recovered · +30 coins · +1 heart'); }
      } else if (!world.gateOpen && distance(player.position, GATE) < 110) {
        world.prompt = player.position.y < GATE.y ? 'Unlock return shortcut' : 'Shortcut opens from the maintenance side';
        if (pressed && player.position.y < GATE.y) { world.gateOpen = true; this.notice(world, 'Return shortcut unlocked'); }
      } else if (distance(player.position, world.elite.position) < 100 && !world.elite.started) {
        world.prompt = 'Challenge the elite · upgrade reward';
        if (pressed) {
          world.elite.started = true;
          const elite = createEnemy(world.elite.id, { ...world.elite.position }, 'tank-bot', 1);
          elite.health = elite.maxHealth = 420; state.enemies.push(elite);
          this.notice(world, 'Elite awakened');
        }
      } else if (distance(player.position, world.anchor.position) < 100) {
        world.prompt = 'Activate the Glitch Anchor';
        if (pressed) {
          world.phase = 'anchorActive'; this.pending = []; this.spawnMs = 1500;
          const position = { x: world.anchor.position.x + 180, y: world.anchor.position.y - 150 };
          state.boss = createBoss('anchor-guardian', position, 'berserker', 1);
          state.boss.health = state.boss.maxHealth = 1000;
          state.boss.attackCooldown = 1800;
          this.notice(world, 'Stay inside the signal field and defeat its guardian');
        }
      }
    }
    if (world.elite.started && !world.elite.defeated && !state.levelingUpPlayerId && !state.enemies.some(e => e.id === world.elite.id)) {
      world.elite.defeated = true; player.coins = (player.coins || 0) + 40; world.metrics.detourRewards++;
      this.notice(world, 'Elite defeated · +40 coins · choose an upgrade'); reward();
    }
    if (world.phase === 'anchorActive') {
      world.anchor.occupied = distance(player.position, world.anchor.position) <= world.anchor.radius;
      if (world.anchor.occupied) world.anchor.chargeMs = Math.min(CHARGE_MS, world.anchor.chargeMs + delta);
      else world.metrics.outsideChargeMs += delta;
      if (world.anchor.guardianDefeated && world.anchor.chargeMs >= CHARGE_MS) {
        world.phase = 'exitReady'; this.pending = [];
        if (state.enemies.some(e => e.id === world.elite.id)) world.elite.started = false;
        state.enemies = []; state.projectiles = []; state.bossProjectiles = []; state.shockwaveRings = []; state.hazards = []; state.fireTrails = []; state.explosions = [];
        this.notice(world, 'Signal stable · return to the anchor for your reward');
      }
    }
    if (world.phase === 'exitReady' && distance(player.position, world.anchor.position) < 100) {
      world.prompt = world.rewardClaimed ? 'Return to the route map' : 'Claim anchor upgrade';
      if (pressed && !state.levelingUpPlayerId) {
        if (!world.rewardClaimed) { world.rewardClaimed = true; reward(); }
        else { exit(); return; }
      }
    }
    if (world.phase === 'exitReady' || !world.spawnsEnabled) { this.pending = []; world.spawnWarnings = []; return; }
    const cap = world.phase === 'anchorActive' ? 40 : 24;
    this.spawnMs -= delta;
    if (this.spawnMs <= 0) {
      this.spawnMs = (world.phase === 'anchorActive' ? 2000 : 3800) / world.pressure;
      for (let i = 0; i < 2 && state.enemies.length + this.pending.length < cap; i++) {
        const angle = (this.serial++ * 2.399963 + world.seed) % (Math.PI * 2);
        const position = { x: player.position.x + Math.cos(angle) * 780, y: player.position.y + Math.sin(angle) * 500 };
        const camera = world.camera;
        const outsideView = position.x < camera.x - 30 || position.x > camera.x + VIEW_WIDTH + 30 || position.y < camera.y - 30 || position.y > camera.y + VIEW_HEIGHT + 30;
        if (outsideView && distance(position, player.position) > 450 && isWalkable(world, position, 25)) this.pending.push({ position, remainingMs: 900 });
      }
    }
    this.pending = this.pending.filter(spawn => {
      spawn.remainingMs -= delta;
      if (spawn.remainingMs > 0) return true;
      if (distance(spawn.position, player.position) > 260 && state.enemies.length < cap && isWalkable(world, spawn.position, 25)) state.enemies.push(createEnemy(`yard-${this.serial++}`, spawn.position, this.serial % 4 === 0 ? 'slugger' : 'grunt', 1));
      return false;
    });
    world.spawnWarnings = this.pending.map(p => ({ ...p, position: { ...p.position } }));
  }

  canTarget(world: ExplorationState, from: Vector2D, to: Vector2D, range = 600) { return distance(from, to) <= range && lineClear(world, from, to); }
}
