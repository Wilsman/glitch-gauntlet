import type { Vector2D } from '@shared/types';
import type { ExplorationState, WorldWall } from '@shared/exploration';

export const WORLD_WIDTH = 3200;
export const WORLD_HEIGHT = 2000;
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const SPAWN = { x: 300, y: 1000 };
export const GATE = { x: 1100, y: 570 };
export const CHARGE_MS = 45000;
export const ANCHOR_SOCKETS = [{ x: 2670, y: 1390 }, { x: 2660, y: 570 }, { x: 1740, y: 1390 }];
export const LANDMARKS = [
  { name: 'ARRIVAL', x: 100, y: 750, width: 580, height: 570, color: '#18343b' },
  { name: 'SERVICE LOOP', x: 260, y: 1400, width: 1120, height: 380, color: '#172f38' },
  { name: 'MACHINERY COURT', x: 1350, y: 650, width: 650, height: 570, color: '#302d37' },
  { name: 'MAINTENANCE', x: 350, y: 180, width: 1100, height: 390, color: '#23343b' },
  { name: 'SIGNAL FIELD', x: 2220, y: 1030, width: 900, height: 800, color: '#18323a' },
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
