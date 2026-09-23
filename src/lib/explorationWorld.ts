import type { Vector2D } from '@shared/types';
import type { BoostPad, ExplorationState, WorldChest, WorldWall } from '@shared/exploration';

export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 2000;
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const SPAWN = { x: 300, y: 1000 };
export const GATE = { x: 1100, y: 570 };
export const CHARGE_MS = 45000;
export const ANCHOR_SOCKETS = [{ x: 2670, y: 1390 }, { x: 2660, y: 570 }, { x: 1740, y: 1390 }];
export const LANDMARKS = [
  { name: 'ARRIVAL', x: 100, y: 750, width: 580, height: 570, color: '#18343b', neon: '#22d3ee' },
  { name: 'SERVICE LOOP', x: 260, y: 1400, width: 1120, height: 380, color: '#172f38', neon: '#a3e635' },
  { name: 'MACHINERY COURT', x: 1350, y: 650, width: 650, height: 570, color: '#302d37', neon: '#f59e0b' },
  { name: 'MAINTENANCE', x: 350, y: 180, width: 1100, height: 390, color: '#23343b', neon: '#e879f9' },
  { name: 'SIGNAL FIELD', x: 2220, y: 1030, width: 900, height: 800, color: '#18323a', neon: '#f43f5e' },
];
export const COMBO_WINDOW_MS = 3000;
export const COMBO_MILESTONES: [number, string][] = [[10, 'KILLING SPREE'], [25, 'RAMPAGE'], [50, 'GLITCHSTORM'], [100, 'SYSTEM MELTDOWN'], [200, 'GODLIKE.EXE']];
export const CHEST_COSTS = { small: 25, large: 60, shrine: 15 } as const;
export const DIFFICULTY_TIER_MS = 45000;
export const DIFFICULTY_TIERS = [
  { label: 'EASY', color: '#4ade80' }, { label: 'MEDIUM', color: '#a3e635' }, { label: 'HARD', color: '#facc15' },
  { label: 'VERY HARD', color: '#fb923c' }, { label: 'INSANE', color: '#f87171' }, { label: 'IMPOSSIBLE', color: '#f43f5e' },
  { label: 'I SEE YOU', color: '#e879f9' }, { label: "I'M COMING FOR YOU", color: '#c084fc' }, { label: 'HAHAHAHA', color: '#ffffff' },
];
export function difficultyTier(elapsedMs: number) {
  const index = Math.min(DIFFICULTY_TIERS.length - 1, Math.floor(elapsedMs / DIFFICULTY_TIER_MS));
  return { index, ...DIFFICULTY_TIERS[index], progress: index === DIFFICULTY_TIERS.length - 1 ? 1 : (elapsedMs % DIFFICULTY_TIER_MS) / DIFFICULTY_TIER_MS };
}
const CHESTS: Omit<WorldChest, 'cost' | 'opened' | 'uses' | 'openedMs'>[] = [
  { id: 'chest-loop', kind: 'small', position: { x: 560, y: 1520 } },
  { id: 'chest-machine', kind: 'small', position: { x: 1250, y: 860 } },
  { id: 'chest-northeast', kind: 'small', position: { x: 2400, y: 300 } },
  { id: 'chest-south', kind: 'small', position: { x: 950, y: 1860 } },
  { id: 'chest-east', kind: 'small', position: { x: 2960, y: 900 } },
  { id: 'vault-north', kind: 'large', position: { x: 1600, y: 200 } },
  { id: 'vault-south', kind: 'large', position: { x: 2150, y: 1890 } },
  { id: 'shrine-court', kind: 'shrine', position: { x: 1880, y: 1100 } },
  { id: 'shrine-arrival', kind: 'shrine', position: { x: 640, y: 880 } },
];
export const BOOST_PADS: BoostPad[] = [
  { id: 'pad-loop', position: { x: 700, y: 1580 }, angle: 0 },
  { id: 'pad-court', position: { x: 1500, y: 1250 }, angle: 0 },
  { id: 'pad-north', position: { x: 2500, y: 1000 }, angle: -Math.PI / 2 },
  { id: 'pad-maint', position: { x: 1300, y: 250 }, angle: 0 },
  { id: 'pad-arrival', position: { x: 300, y: 1300 }, angle: Math.PI / 2 },
];

const WALLS: WorldWall[] = [
  { id: 'north-rack', x: 500, y: 650, width: 600, height: 100 },
  { id: 'pocket-west', x: 230, y: 160, width: 100, height: 480 },
  { id: 'pocket-south', x: 330, y: 570, width: 710, height: 80 },
  { id: 'gate', x: 1040, y: 570, width: 120, height: 80 },
  { id: 'pocket-tail', x: 1160, y: 570, width: 300, height: 80 },
  { id: 'west-machine', x: 800, y: 1000, width: 360, height: 280 },
  { id: 'central-bank', x: 1460, y: 330, width: 280, height: 320 },
  { id: 'court-cover', x: 1600, y: 860, width: 140, height: 110 },
  { id: 'east-bank', x: 2070, y: 650, width: 140, height: 470 },
  { id: 'south-bank', x: 1300, y: 1700, width: 730, height: 100 },
  { id: 'signal-cover', x: 2260, y: 1690, width: 120, height: 100 },
];

export function createExploration(seed = 0): ExplorationState {
  seed = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) % 100000 : 0;
  return {
    seed, width: WORLD_WIDTH, height: WORLD_HEIGHT, phase: 'exploring', elapsedMs: 0, pressure: 1,
    camera: { x: 0, y: 640 }, walls: WALLS.map(w => ({ ...w })), visited: [],
    anchor: { position: { ...ANCHOR_SOCKETS[seed % 3] }, radius: 260, discovered: false, chargeMs: 0, guardianDefeated: false, occupied: false },
    cache: { position: { x: 500 + (seed % 2) * 400, y: 350 }, discovered: false, claimed: false },
    elite: { position: { x: 1840, y: 850 }, discovered: false, started: false, defeated: false, id: 'yard-elite' },
    gateOpen: false, rewardClaimed: false, prompt: '', notice: 'Explore the yard. Follow the signal.', noticeMs: 5000,
    momentum: 0, velocity: { x: 0, y: 0 }, slideMs: 0, slideCooldownMs: 0, stationaryMs: 0, established: false, spawnsEnabled: true,
    metrics: { discoveryMs: null, damageTaken: 0, outsideChargeMs: 0, detourRewards: 0 },
    chests: CHESTS.map(c => ({ ...c, position: { ...c.position }, cost: CHEST_COSTS[c.kind], opened: false, uses: 0, openedMs: 0 })),
    pads: BOOST_PADS.map(p => ({ ...p, position: { ...p.position } })), boostMs: 0, boostAngle: 0,
    combo: { count: 0, timerMs: 0, best: 0, milestone: '', milestoneMs: 0 }, kills: 0, hitStopMs: 0, hurtMs: 0, fx: [], itemFeed: [],
  };
}

export const distance = (a: Vector2D, b: Vector2D) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export const activeWalls = (world: ExplorationState) => world.walls.filter(w => w.id !== 'gate' || !world.gateOpen);

export function isWalkable(world: ExplorationState, p: Vector2D, radius = 18) {
  if (p.x < radius || p.y < radius || p.x > world.width - radius || p.y > world.height - radius) return false;
  return !activeWalls(world).some(w => {
    const x = clamp(p.x, w.x, w.x + w.width), y = clamp(p.y, w.y, w.y + w.height);
    return Math.hypot(p.x - x, p.y - y) < radius;
  });
}

export function lineClear(world: ExplorationState, a: Vector2D, b: Vector2D, radius = 4) {
  const steps = Math.max(1, Math.ceil(distance(a, b) / 12));
  for (let i = 0; i <= steps; i++) {
    if (!isWalkable(world, { x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps }, radius)) return false;
  }
  return true;
}

// Bounded substeps prevent tunnelling and preserve sliding along wall faces.
export function moveWorld(world: ExplorationState, from: Vector2D, to: Vector2D, radius = 18): Vector2D {
  const steps = Math.max(1, Math.ceil(distance(from, to) / 8));
  const dx = (to.x - from.x) / steps, dy = (to.y - from.y) / steps;
  const p = { ...from };
  for (let i = 0; i < steps; i++) {
    if (isWalkable(world, { x: p.x + dx, y: p.y }, radius)) p.x += dx;
    if (isWalkable(world, { x: p.x, y: p.y + dy }, radius)) p.y += dy;
  }
  return p;
}

// One reverse breadth-first field per player cell, shared by the capped enemy pack.
export class WorldNavigator {
  private key = '';
  private field = new Int32Array(0);
  private cell = 50;
  waypoint(world: ExplorationState, from: Vector2D, target: Vector2D, radius = 22): Vector2D {
    if (lineClear(world, from, target, radius)) return target;
    const cols = Math.ceil(world.width / this.cell), rows = Math.ceil(world.height / this.cell);
    const index = (p: Vector2D) => clamp(Math.floor(p.y / this.cell), 0, rows - 1) * cols + clamp(Math.floor(p.x / this.cell), 0, cols - 1);
    const point = (id: number) => ({ x: (id % cols + 0.5) * this.cell, y: (Math.floor(id / cols) + 0.5) * this.cell });
    const goal = index(target), key = `${goal}:${world.gateOpen}:${radius}`;
    if (key !== this.key) {
      this.key = key;
      this.field = new Int32Array(cols * rows).fill(-1);
      const queue = [goal]; this.field[goal] = 0;
      for (let head = 0; head < queue.length; head++) {
        const current = queue[head];
        for (const next of [current - cols, current + cols, ...(current % cols ? [current - 1] : []), ...(current % cols < cols - 1 ? [current + 1] : [])]) {
          if (next < 0 || next >= this.field.length || this.field[next] >= 0 || !isWalkable(world, point(next), radius)) continue;
          this.field[next] = this.field[current] + 1; queue.push(next);
        }
      }
    }
    const current = index(from);
    let best = current, cost = this.field[current] < 0 ? Infinity : this.field[current];
    for (const next of [current - cols, current + cols, current - 1, current + 1]) {
      if (next < 0 || next >= this.field.length) continue;
      if (this.field[next] >= 0 && this.field[next] < cost && lineClear(world, from, point(next), radius)) { best = next; cost = this.field[next]; }
    }
    return point(best);
  }
}
