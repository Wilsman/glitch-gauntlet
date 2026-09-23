import type { Enemy, EnemyType, GameState, InputState, Player, UpgradeOption, Vector2D } from '@shared/types';
import type { ExplorationState, WorldChest, WorldFx } from '@shared/exploration';
import { createEnemy } from '@shared/enemyConfig';
import { createBoss } from '@shared/bossConfig';
import { CHARGE_MS, COMBO_MILESTONES, COMBO_WINDOW_MS, GATE, VIEW_HEIGHT, VIEW_WIDTH, clamp, difficultyTier, distance, isWalkable, lineClear, moveWorld } from './explorationWorld';

export interface ExplorationHooks {
  reward: () => void;
  exit: () => void;
  grantItem: (tier: WorldChest['kind']) => UpgradeOption | null;
}

const RARITY_COLORS: Record<string, string> = { common: '#e2e8f0', uncommon: '#4ade80', legendary: '#f87171', boss: '#facc15', lunar: '#60a5fa', void: '#c084fc' };
const AFFIXES = { blazing: '#fb923c', overloading: '#38bdf8', glacial: '#e0f2fe' } as const;
const ENEMY_COLORS: Partial<Record<EnemyType, string>> = { grunt: '#facc15', slugger: '#fb923c', 'glitch-spider': '#f0abfc', bomber: '#f97316', splitter: '#a855f7', 'mini-splitter': '#c084fc', 'neon-pulse': '#22d3ee', 'orbit-drone': '#7dd3fc', 'tank-bot': '#94a3b8', 'leech-beacon': '#86efac' };

function roster(tier: number): EnemyType[] {
  return ['grunt', 'grunt', ...(tier >= 1 ? ['slugger', 'bomber'] as EnemyType[] : []), ...(tier >= 2 ? ['glitch-spider', 'splitter'] as EnemyType[] : []), ...(tier >= 3 ? ['neon-pulse', 'orbit-drone'] as EnemyType[] : []), ...(tier >= 4 ? ['tank-bot', 'leech-beacon'] as EnemyType[] : [])];
}

export class ExplorationStage {
  private spawnMs = 3500;
  private serial = 0;
  private fxSerial = 0;
  private wasInteract = false;
  private queuedInteract = false;
  private lastVitality: number | null = null;
  private lastLevel: number | null = null;
  private pending: { position: Vector2D; remainingMs: number; type: EnemyType; elite: boolean }[] = [];

  private observeVitals(world: ExplorationState, player: Player) {
    const vitality = player.health + (player.shield || 0);
    if (this.lastVitality !== null && vitality < this.lastVitality) {
      world.momentum *= 0.3;
      world.metrics.damageTaken += this.lastVitality - vitality;
      world.hurtMs = 380;
    }
    this.lastVitality = vitality;
  }

  fx(world: ExplorationState, kind: WorldFx['kind'], position: Vector2D, color: string, maxMs: number, size: number, text?: string) {
    if (world.fx.length >= 70) world.fx.shift();
    world.fx.push({ id: this.fxSerial++, kind, position: { ...position }, color, ms: maxMs, maxMs, size, text });
  }

  private shake(state: GameState, intensity: number, duration: number) {
    if ((state.screenShake?.intensity || 0) > intensity && (state.simulationTime || 0) - (state.screenShake?.startTime || 0) < (state.screenShake?.duration || 0)) return;
    state.screenShake = { intensity, duration, startTime: state.simulationTime || 0 };
  }

  // Presses during hit-stop are latched so a quick tap is not swallowed by the freeze.
  trackInteractDuringFreeze(held: boolean) {
    if (held && !this.wasInteract) this.queuedInteract = true;
    this.wasInteract = held;
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
    world.boostMs = Math.max(0, world.boostMs - delta);
    this.observeVitals(world, player);
    if (player.characterType === 'dash-dynamo') world.momentum = clamp(world.momentum + delta * (moving || world.boostMs > 0 ? 1 / 2000 : -1 / 650), 0, 1);
    else world.momentum = 0;
    world.stationaryMs = moving ? 0 : world.stationaryMs + delta;
    world.established = player.characterType === 'turret-tina' && world.stationaryMs >= 1000;
    const speed = player.speed * (1 + world.momentum * 0.5) * (world.slideMs > 0 ? 1.35 : 1) * (player.isAbilityActive && player.characterType === 'dash-dynamo' ? 2 : 1);
    const boosting = world.boostMs > 0;
    const targetX = boosting ? Math.cos(world.boostAngle) * speed * 2.6 + x * speed * 0.7 : x * speed;
    const targetY = boosting ? Math.sin(world.boostAngle) * speed * 2.6 + y * speed * 0.7 : y * speed;
    const steering = boosting ? Math.min(1, delta / 70) : world.slideMs > 0 ? Math.min(1, delta / 150) : Math.min(1, delta / 55);
    world.velocity.x += (targetX - world.velocity.x) * steering;
    world.velocity.y += (targetY - world.velocity.y) * steering;
    if (!moving && world.slideMs <= 0 && !boosting) world.velocity = { x: 0, y: 0 };
    const old = player.position;
    player.position = moveWorld(world, old, { x: old.x + world.velocity.x * delta / (1000 / 60), y: old.y + world.velocity.y * delta / (1000 / 60) }, 18);
    if (moving && distance(old, player.position) < 0.5) world.momentum = Math.max(0, world.momentum - delta / 350);
  }

  private notice(world: ExplorationState, text: string) { world.notice = text; world.noticeMs = 4000; }

  onKill(state: GameState, dead: Enemy, player: Player | null) {
    const world = state.exploration;
    if (!world || !player) return;
    const combo = world.combo;
    world.kills++;
    combo.count++; combo.timerMs = COMBO_WINDOW_MS; combo.best = Math.max(combo.best, combo.count);
    player.xp += Math.round(dead.xpValue * Math.min(1, combo.count / 50));
    const color = dead.eliteAffix ? AFFIXES[dead.eliteAffix] : ENEMY_COLORS[dead.type] || '#facc15';
    this.fx(world, 'burst', dead.position, color, 420, dead.eliteAffix ? 70 : 34);
    const milestone = COMBO_MILESTONES.find(([count]) => count === combo.count);
    if (milestone) {
      combo.milestone = milestone[1]; combo.milestoneMs = 2000;
      player.coins = (player.coins || 0) + Math.round(milestone[0] / 2);
      this.fx(world, 'ring', player.position, '#facc15', 700, 320);
      this.fx(world, 'text', { x: player.position.x, y: player.position.y + 55 }, '#facc15', 1300, 22, `+$${Math.round(milestone[0] / 2)}`);
      world.hitStopMs = Math.max(world.hitStopMs, 60);
      this.shake(state, 6, 220);
    }
    if (dead.eliteAffix) {
      player.coins = (player.coins || 0) + 8;
      this.fx(world, 'ring', dead.position, color, 650, 190);
      this.fx(world, 'text', { x: dead.position.x, y: dead.position.y - 40 }, color, 1400, 22, 'ELITE SLAIN +$8');
      world.hitStopMs = Math.max(world.hitStopMs, 90);
      this.shake(state, 9, 260);
    }
  }

  onGuardianDefeated(state: GameState, position: Vector2D) {
    const world = state.exploration;
    if (!world) return;
    world.hitStopMs = 260;
    this.shake(state, 18, 700);
    this.fx(world, 'ring', position, '#f43f5e', 900, 520);
    this.fx(world, 'ring', position, '#ffffff', 600, 300);
    this.fx(world, 'beam', position, '#f43f5e', 1400, 120);
    this.fx(world, 'text', { x: position.x, y: position.y - 80 }, '#fecdd3', 2000, 34, 'GUARDIAN DELETED');
  }

  private makeElite(enemy: Enemy) {
    const affixes = Object.keys(AFFIXES) as (keyof typeof AFFIXES)[];
    enemy.eliteAffix = affixes[this.serial % affixes.length];
    enemy.health = enemy.maxHealth = Math.round(enemy.maxHealth * (enemy.eliteAffix === 'overloading' ? 5 : 3.5));
    enemy.damage = Math.round(enemy.damage * 1.5);
    enemy.xpValue *= 4;
    if (enemy.eliteAffix === 'blazing') enemy.speed = enemy.baseSpeed = enemy.speed * 1.3;
    if (enemy.eliteAffix === 'glacial') enemy.speed = enemy.baseSpeed = enemy.speed * 0.85;
  }

  private levelNova(state: GameState, world: ExplorationState, player: Player) {
    this.fx(world, 'ring', player.position, '#a78bfa', 800, 300);
    this.fx(world, 'ring', player.position, '#ffffff', 500, 180);
    this.fx(world, 'text', { x: player.position.x, y: player.position.y - 95 }, '#ddd6fe', 1500, 30, 'LEVEL UP!');
    this.shake(state, 8, 300);
    for (const enemy of state.enemies) {
      const d = distance(enemy.position, player.position);
      if (d > 280 || d < 1) continue;
      const push = 140 * (1 - d / 320);
      enemy.position = moveWorld(world, enemy.position, { x: enemy.position.x + (enemy.position.x - player.position.x) / d * push, y: enemy.position.y + (enemy.position.y - player.position.y) / d * push }, 18);
      enemy.health -= player.projectileDamage * 3;
      enemy.lastHitTimestamp = state.simulationTime;
      enemy.lastDamagedByPlayerId = player.id;
    }
  }

  private useChest(state: GameState, world: ExplorationState, player: Player, chest: WorldChest, hooks: ExplorationHooks) {
    player.coins = (player.coins || 0) - chest.cost;
    if (chest.kind === 'shrine') {
      chest.cost = Math.round(chest.cost * 1.5);
      if (Math.random() >= 0.45) {
        this.fx(world, 'text', { x: chest.position.x, y: chest.position.y - 60 }, '#94a3b8', 1400, 20, 'THE SHRINE MOCKS YOU');
        this.fx(world, 'ring', chest.position, '#64748b', 500, 90);
        return;
      }
      chest.uses++;
      if (chest.uses >= 2) { chest.opened = true; chest.openedMs = 0; }
    } else { chest.opened = true; chest.openedMs = 0; }
    const item = hooks.grantItem(chest.kind);
    if (!item) return;
    const color = RARITY_COLORS[item.rarity] || '#ffffff';
    world.metrics.detourRewards++;
    world.itemFeed.unshift({ id: this.fxSerial++, title: item.title, emoji: item.emoji || '?', rarity: item.rarity, description: item.description, ms: 4500 });
    world.itemFeed = world.itemFeed.slice(0, 4);
    this.fx(world, 'beam', chest.position, color, 1200, chest.kind === 'large' ? 90 : 60);
    this.fx(world, 'ring', chest.position, color, 700, chest.kind === 'large' ? 260 : 170);
    this.fx(world, 'text', { x: chest.position.x, y: chest.position.y - 70 }, color, 1800, 22, `${item.emoji || ''} ${item.title}`);
    world.hitStopMs = Math.max(world.hitStopMs, chest.kind === 'large' ? 120 : 50);
    this.shake(state, chest.kind === 'large' ? 12 : 5, 300);
  }

  update(state: GameState, delta: number, hooks: ExplorationHooks) {
    const world = state.exploration, player = state.players[0];
    if (!world) return;
    this.observeVitals(world, player);
    if (player.status !== 'alive') return;
    world.noticeMs = Math.max(0, world.noticeMs - delta);
    world.hurtMs = Math.max(0, world.hurtMs - delta);
    world.fx = world.fx.filter(fx => (fx.ms -= delta) > 0);
    world.itemFeed = world.itemFeed.filter(item => (item.ms -= delta) > 0);
    world.chests.forEach(chest => { if (chest.opened) chest.openedMs += delta; });
    const combo = world.combo;
    combo.milestoneMs = Math.max(0, combo.milestoneMs - delta);
    if (combo.count > 0 && (combo.timerMs -= delta) <= 0) combo.count = 0;
    if (this.lastLevel !== null && player.level > this.lastLevel) this.levelNova(state, world, player);
    this.lastLevel = player.level;
    if (world.phase !== 'exitReady') world.elapsedMs += delta;
    const tier = difficultyTier(world.elapsedMs).index;
    world.pressure = Math.min(3.5, 1 + world.elapsedMs / 60000 * 0.35);
    const look = world.boostMs > 0 ? 18 : 10;
    const targetCamera = { x: clamp(player.position.x + world.velocity.x * look - VIEW_WIDTH / 2, 0, world.width - VIEW_WIDTH), y: clamp(player.position.y + world.velocity.y * look - VIEW_HEIGHT / 2, 0, world.height - VIEW_HEIGHT) };
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
    // Pads only fire when travelling with their arrow, so two-way corridors never bounce the player backwards.
    const pad = world.boostMs < 350 && world.pads.find(p => distance(p.position, player.position) < 46 && world.velocity.x * Math.cos(p.angle) + world.velocity.y * Math.sin(p.angle) > 0.5);
    if (pad) {
      world.boostMs = 650; world.boostAngle = pad.angle;
      if (player.characterType === 'dash-dynamo') world.momentum = 1;
      this.fx(world, 'ring', pad.position, '#22d3ee', 450, 110);
      this.fx(world, 'text', { x: pad.position.x, y: pad.position.y - 50 }, '#a5f3fc', 800, 20, 'BOOST!');
    }
    const pressed = (!!player.lastInput?.interact && !this.wasInteract) || this.queuedInteract;
    this.wasInteract = !!player.lastInput?.interact;
    this.queuedInteract = false;
    world.prompt = '';
    const chest = world.chests.find(c => !c.opened && distance(c.position, player.position) < 80);
    if (chest) {
      const coins = Math.floor(player.coins || 0);
      const label = chest.kind === 'shrine' ? `Shrine of Chance · $${chest.cost}` : chest.kind === 'large' ? `Open legendary vault · $${chest.cost}` : `Open chest · $${chest.cost}`;
      world.prompt = coins >= chest.cost ? label : `${label} · need $${chest.cost - coins} more`;
      if (pressed && coins >= chest.cost) this.useChest(state, world, player, chest, hooks);
    } else if (world.phase === 'exploring') {
      if (distance(player.position, world.cache.position) < 85 && !world.cache.claimed) {
        world.prompt = 'Open maintenance cache';
        if (pressed) { world.cache.claimed = true; player.coins = (player.coins || 0) + 30; player.health = Math.min(player.maxHealth, player.health + player.maxHealth / 5); world.metrics.detourRewards++; this.notice(world, 'Cache recovered · +30 coins · +1 heart'); this.fx(world, 'ring', world.cache.position, '#5eead4', 600, 160); }
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
          this.fx(world, 'ring', world.elite.position, '#f59e0b', 700, 220);
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
          this.fx(world, 'beam', world.anchor.position, '#22d3ee', 1600, 140);
          this.fx(world, 'ring', world.anchor.position, '#22d3ee', 900, world.anchor.radius);
          world.hitStopMs = 120;
          this.shake(state, 12, 450);
        }
      }
    }
    if (world.elite.started && !world.elite.defeated && !state.levelingUpPlayerId && !state.enemies.some(e => e.id === world.elite.id)) {
      world.elite.defeated = true; player.coins = (player.coins || 0) + 40; world.metrics.detourRewards++;
      this.notice(world, 'Elite defeated · +40 coins · choose an upgrade'); hooks.reward();
    }
    if (world.phase === 'anchorActive') {
      world.anchor.occupied = distance(player.position, world.anchor.position) <= world.anchor.radius;
      if (world.anchor.occupied) world.anchor.chargeMs = Math.min(CHARGE_MS, world.anchor.chargeMs + delta);
      else world.metrics.outsideChargeMs += delta;
      if (world.anchor.guardianDefeated && world.anchor.chargeMs >= CHARGE_MS) {
        world.phase = 'exitReady'; this.pending = [];
        if (state.enemies.some(e => e.id === world.elite.id)) world.elite.started = false;
        state.enemies.forEach(e => this.fx(world, 'burst', e.position, '#a7f3d0', 500, 30));
        state.enemies = []; state.projectiles = []; state.bossProjectiles = []; state.shockwaveRings = []; state.hazards = []; state.fireTrails = []; state.explosions = [];
        this.fx(world, 'ring', world.anchor.position, '#86efac', 1200, 900);
        this.notice(world, 'Signal stable · return to the anchor for your reward');
      }
    }
    if (world.phase === 'exitReady' && distance(player.position, world.anchor.position) < 100) {
      world.prompt = world.rewardClaimed ? 'Return to the route map' : 'Claim anchor upgrade';
      if (pressed && !state.levelingUpPlayerId) {
        if (!world.rewardClaimed) { world.rewardClaimed = true; hooks.reward(); }
        else { hooks.exit(); return; }
      }
    }
    if (world.phase === 'exitReady' || !world.spawnsEnabled) { this.pending = []; world.spawnWarnings = []; return; }
    state.enemies = state.enemies.filter(e => e.id === world.elite.id || e.eliteAffix || distance(e.position, player.position) < 1500);
    const active = world.phase === 'anchorActive';
    const cap = active ? 80 : 55;
    this.spawnMs -= delta;
    if (this.spawnMs <= 0) {
      this.spawnMs = (active ? 1700 : 3000) / world.pressure;
      const types = roster(tier);
      const camera = world.camera;
      for (let attempt = 0; attempt < 4; attempt++) {
        const angle = (this.serial++ * 2.399963 + world.seed) % (Math.PI * 2);
        const center = { x: player.position.x + Math.cos(angle) * 780, y: player.position.y + Math.sin(angle) * 500 };
        const outsideView = center.x < camera.x - 30 || center.x > camera.x + VIEW_WIDTH + 30 || center.y < camera.y - 30 || center.y > camera.y + VIEW_HEIGHT + 30;
        if (!outsideView || distance(center, player.position) <= 450 || !isWalkable(world, center, 25)) continue;
        const type = types[this.serial % types.length];
        const size = 2 + Math.floor(tier / 2) + (active ? 1 : 0) + (this.serial % 2);
        const elite = tier >= 1 && Math.random() < 0.06 + tier * 0.03;
        for (let i = 0; i < size && state.enemies.length + this.pending.length < cap; i++) {
          const offset = { x: center.x + Math.cos(i * 2.1) * (i ? 46 : 0), y: center.y + Math.sin(i * 2.1) * (i ? 46 : 0) };
          if (isWalkable(world, offset, 25) && lineClear(world, center, offset, 20)) this.pending.push({ position: offset, remainingMs: 900, type, elite: elite && i === 0 });
        }
        break;
      }
    }
    this.pending = this.pending.filter(spawn => {
      spawn.remainingMs -= delta;
      if (spawn.remainingMs > 0) return true;
      if (distance(spawn.position, player.position) > 260 && state.enemies.length < cap && isWalkable(world, spawn.position, 25)) {
        const enemy = createEnemy(`yard-${this.serial++}`, spawn.position, spawn.type, 1 + tier * 0.5);
        if (spawn.elite) this.makeElite(enemy);
        state.enemies.push(enemy);
      }
      return false;
    });
    world.spawnWarnings = this.pending.map(p => ({ position: { ...p.position }, remainingMs: p.remainingMs }));
  }

  canTarget(world: ExplorationState, from: Vector2D, to: Vector2D, range = 600) { return distance(from, to) <= range && lineClear(world, from, to); }
}
