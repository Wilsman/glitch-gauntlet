import type { Vector2D } from '@shared/types';
import type { ExplorationState, RunStats, StageModifierId, WorldChest, WorldWall } from '@shared/exploration';
import { BIOMES, GATE, generateWorld, regionIndexAt, SPAWN, wallBlocks, WORLD_H, WORLD_W, YARD_LANDMARKS } from './worldGen';
import { STAGE_MODIFIERS } from './stageModifiers';

export const WORLD_WIDTH = WORLD_W;
export const WORLD_HEIGHT = WORLD_H;
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export { BIOMES, GATE, SPAWN, regionIndexAt };
export const LANDMARKS = YARD_LANDMARKS;
export const CHARGE_MS = 45000;
export const COMBO_WINDOW_MS = 3000;
export const COMBO_MILESTONES: [number, string][] = [[10, 'KILLING SPREE'], [25, 'RAMPAGE'], [50, 'GLITCHSTORM'], [100, 'SYSTEM MELTDOWN'], [200, 'GODLIKE.EXE']];
export const CHEST_COSTS = { small: 25, large: 60, shrine: 15 } as const;
export const DIFFICULTY_TIER_MS = 70000;
export const DIFFICULTY_TIERS = [
  { label: 'EASY', color: '#4ade80' }, { label: 'MEDIUM', color: '#a3e635' }, { label: 'HARD', color: '#facc15' },
  { label: 'VERY HARD', color: '#fb923c' }, { label: 'INSANE', color: '#f87171' }, { label: 'IMPOSSIBLE', color: '#f43f5e' },
  { label: 'I SEE YOU', color: '#e879f9' }, { label: "I'M COMING FOR YOU", color: '#c084fc' }, { label: 'HAHAHAHA', color: '#ffffff' },
];
export function difficultyTier(elapsedMs: number) {
  const index = Math.min(DIFFICULTY_TIERS.length - 1, Math.floor(elapsedMs / DIFFICULTY_TIER_MS));
  return { index, ...DIFFICULTY_TIERS[index], progress: index === DIFFICULTY_TIERS.length - 1 ? 1 : (elapsedMs % DIFFICULTY_TIER_MS) / DIFFICULTY_TIER_MS };
}

export function regionAt(world: ExplorationState, p: Vector2D) {
  return world.biomes[regionIndexAt(p)];
}

const freshRun = (): RunStats => ({ stagesCleared: 0, totalKills: 0, bestCombo: 0, items: [], maxTier: 0 });

export interface CreateExplorationOptions {
  stage?: number;
  modifier?: StageModifierId | null;
  elapsedMs?: number;
  run?: RunStats;
}

export function createExploration(seed = 0, opts: CreateExplorationOptions = {}): ExplorationState {
  seed = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) % 100000 : 0;
  const stage = opts.stage ?? 1;
  const modifier = opts.modifier ?? null;
  const gen = generateWorld(seed, { yard: stage === 1, modifier });
  const spawn = gen.spawn;
  const landingRegion = gen.regions[regionIndexAt(spawn)];
  const chestCost = (kind: WorldChest['kind']) => {
    let cost: number = CHEST_COSTS[kind];
    if (modifier === 'goldRush') cost = Math.round(cost * 0.7);
    if (modifier === 'blackMarket' && kind === 'small') cost += 10;
    return cost;
  };
  const landingRegionName = landingRegion?.name || 'UNKNOWN SECTOR';
  return {
    seed, stage, modifier, hasYard: gen.hasYard,
    landing: { ...spawn },
    width: WORLD_W, height: WORLD_H, phase: 'exploring',
    elapsedMs: opts.elapsedMs ?? 0, stageStartMs: opts.elapsedMs ?? 0,
    pressure: 1,
    camera: { x: Math.max(0, Math.min(WORLD_W - VIEW_WIDTH, spawn.x - VIEW_WIDTH / 2)), y: Math.max(0, Math.min(WORLD_H - VIEW_HEIGHT, spawn.y - VIEW_HEIGHT / 2)) },
    walls: gen.walls, visited: [],
    hazards: gen.hazards, doorways: gen.doorways, lamps: gen.lamps, props: gen.props,
    biomes: gen.regions, currentRegionId: landingRegion?.id || '', biomeBanner: null,
    stageBanner: {
      title: `STAGE ${stage} // ${landingRegionName}`,
      subtitle: modifier ? STAGE_MODIFIERS[modifier].name : 'FIND THE GLITCH ANCHOR',
      neon: modifier ? STAGE_MODIFIERS[modifier].color : (landingRegion?.neon || '#22d3ee'),
      ms: 2200,
    },
    results: null, portals: [], pendingModifier: null, warpMs: 0,
    pedestals: gen.landingPedestals.map((spec, k) => ({
      id: `landing-ped-${k}`, kind: spec.kind,
      position: { x: spawn.x + spec.offset.x, y: spawn.y + spec.offset.y },
      taken: false, cost: spec.kind === 'heal' ? 25 : 0,
    })),
    anchor: { position: { ...gen.anchor }, radius: 260, discovered: false, chargeMs: 0, guardianDefeated: false, occupied: false },
    cache: { position: gen.cache || { x: -9999, y: -9999 }, discovered: false, claimed: false },
    elite: { position: gen.elite || { x: -9999, y: -9999 }, discovered: false, started: false, defeated: false, id: 'yard-elite' },
    gateOpen: false, prompt: '', notice: gen.hasYard ? 'Explore the world. Follow the signal.' : `${STAGE_MODIFIERS[modifier!]?.name || 'RIFT'} — find the Glitch Anchor`, noticeMs: 5000,
    momentum: 0, velocity: { x: 0, y: 0 }, slideMs: 0, slideCooldownMs: 0, stationaryMs: 0, established: false, spawnsEnabled: true,
    metrics: { discoveryMs: null, damageTaken: 0, outsideChargeMs: 0, detourRewards: 0, itemsTaken: 0 },
    run: opts.run ? { ...opts.run, items: [...opts.run.items] } : freshRun(),
    chests: gen.chests.map(c => ({ ...c, position: { ...c.position }, cost: chestCost(c.kind), opened: false, uses: 0, openedMs: 0 })),
    pads: gen.pads.map(p => ({ ...p, position: { ...p.position } })), boostMs: 0, boostAngle: 0,
    combo: { count: 0, timerMs: 0, best: 0, milestone: '', milestoneMs: 0 }, kills: 0, hitStopMs: 0, hurtMs: 0, fx: [], itemFeed: [],
  };
}

export const distance = (a: Vector2D, b: Vector2D) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export const activeWalls = (world: ExplorationState) => world.walls.filter(w => w.id !== 'gate' || !world.gateOpen);

// ---- Spatial hash over the wall array so point queries only test nearby walls ----
const WALL_BUCKET = 400;
const wallIndexCache = new WeakMap<WorldWall[], Map<number, WorldWall[]>>();
function wallIndex(walls: WorldWall[]) {
  let index = wallIndexCache.get(walls);
  if (index) return index;
  index = new Map();
  for (const wall of walls) {
    const x0 = Math.floor(wall.x / WALL_BUCKET), x1 = Math.floor((wall.x + wall.width) / WALL_BUCKET);
    const y0 = Math.floor(wall.y / WALL_BUCKET), y1 = Math.floor((wall.y + wall.height) / WALL_BUCKET);
    for (let bx = x0; bx <= x1; bx++) for (let by = y0; by <= y1; by++) {
      const key = by * 4096 + bx;
      const list = index.get(key);
      if (list) list.push(wall); else index.set(key, [wall]);
    }
  }
  wallIndexCache.set(walls, index);
  return index;
}

export function wallsNear(world: ExplorationState, p: Vector2D, radius = 0) {
  const index = wallIndex(world.walls);
  const out: WorldWall[] = [];
  const seen = new Set<WorldWall>();
  for (let bx = Math.floor((p.x - radius) / WALL_BUCKET); bx <= Math.floor((p.x + radius) / WALL_BUCKET); bx++) {
    for (let by = Math.floor((p.y - radius) / WALL_BUCKET); by <= Math.floor((p.y + radius) / WALL_BUCKET); by++) {
      for (const wall of index.get(by * 4096 + bx) || []) {
        if (!seen.has(wall)) { seen.add(wall); out.push(wall); }
      }
    }
  }
  return out;
}

export function isWalkable(world: ExplorationState, p: Vector2D, radius = 18) {
  if (p.x < radius || p.y < radius || p.x > world.width - radius || p.y > world.height - radius) return false;
  return !wallsNear(world, p, radius).some(w => (w.id !== 'gate' || !world.gateOpen) && wallBlocks(w, p, radius));
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

// Walkability grids are cached per (walls array, gate state, radius) so the BFS stays cheap on the huge map.
// Replacing world.walls (e.g. a cracked secret wall breaking) re-keys this automatically.
const walkGridCache = new WeakMap<WorldWall[], Map<string, Uint8Array>>();
function walkGrid(world: ExplorationState, cell: number, radius: number) {
  const key = `${cell}:${radius}:${world.gateOpen ? 1 : 0}`;
  let perWorld = walkGridCache.get(world.walls);
  if (!perWorld) { perWorld = new Map(); walkGridCache.set(world.walls, perWorld); }
  const cached = perWorld.get(key);
  if (cached) return cached;
  const cols = Math.ceil(world.width / cell), rows = Math.ceil(world.height / cell);
  const grid = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      grid[row * cols + col] = isWalkable(world, { x: (col + 0.5) * cell, y: (row + 0.5) * cell }, radius) ? 1 : 0;
    }
  }
  perWorld.set(key, grid);
  return grid;
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
      const grid = walkGrid(world, this.cell, radius);
      this.field = new Int32Array(cols * rows).fill(-1);
      const queue = new Int32Array(cols * rows);
      let head = 0, tail = 0;
      queue[tail++] = goal; this.field[goal] = 0;
      while (head < tail) {
        const current = queue[head++];
        for (const next of [current - cols, current + cols, ...(current % cols ? [current - 1] : []), ...(current % cols < cols - 1 ? [current + 1] : [])]) {
          if (next < 0 || next >= this.field.length || this.field[next] >= 0 || !grid[next]) continue;
          this.field[next] = this.field[current] + 1; queue[tail++] = next;
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
