import type { Vector2D } from '@shared/types';
import type { ExplorationState, RunStats, StageModifierId, WorldChest, WorldWall } from '@shared/exploration';
import { BIOME_PROPS, BIOMES, GATE, generateWorld, regionIndexAt, rng, SPAWN, wallBlocks, WORLD_H, WORLD_W, YARD_LANDMARKS } from './worldGen';
import { rollStageModifiers, STAGE_MODIFIERS } from './stageModifiers';

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

const freshRun = (): RunStats => ({ stagesCleared: 0, totalKills: 0, bestCombo: 0, items: [], maxTier: 0, clearTimesMs: [] });

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
    run: opts.run ? { ...opts.run, items: [...opts.run.items], clearTimesMs: [...opts.run.clearTimesMs] } : freshRun(),
    chests: gen.chests.map(c => ({ ...c, position: { ...c.position }, cost: chestCost(c.kind), opened: false, uses: 0, openedMs: 0 })),
    pads: gen.pads.map(p => ({ ...p, position: { ...p.position } })), boostMs: 0, boostAngle: 0,
    combo: { count: 0, timerMs: 0, best: 0, milestone: '', milestoneMs: 0 }, kills: 0, hitStopMs: 0, hurtMs: 0, fx: [], itemFeed: [],
  };
}

// ---- Glitch Grotto: the safe shop cave between stages ----
// One elliptical cavern inside region 0 (so regionIndexAt still resolves to the single cave region).
export const CAVE = { width: 3200, height: 2400, cx: 1600, cy: 1200, rx: 1150, ry: 800 } as const;
export const CAVE_LAYOUT = {
  entry: { x: CAVE.cx - 820, y: CAVE.cy },
  keeper: { x: CAVE.cx, y: CAVE.cy - 430 },
  shops: [-360, -120, 120, 360].map(dx => ({ x: CAVE.cx + dx, y: CAVE.cy - 150 })),
  heal: { x: CAVE.cx, y: CAVE.cy + 190 },
  shrine: { x: CAVE.cx - 460, y: CAVE.cy + 400 },
  portals: [{ x: CAVE.cx + 800, y: CAVE.cy - 320 }, { x: CAVE.cx + 880, y: CAVE.cy }, { x: CAVE.cx + 800, y: CAVE.cy + 320 }],
};
export const insideCave = (p: Vector2D, scale = 1) => ((p.x - CAVE.cx) / (CAVE.rx * scale)) ** 2 + ((p.y - CAVE.cy) / (CAVE.ry * scale)) ** 2 < 1;

export interface CreateInterludeOptions { stage: number; stageSeed: number; elapsedMs: number; run: RunStats }

export function createInterlude(seed: number, opts: CreateInterludeOptions): ExplorationState {
  seed = Math.abs(Math.trunc(seed)) % 100000;
  const random = rng(seed * 4099 + 11);
  const { cx, cy, rx, ry } = CAVE;
  const L = CAVE_LAYOUT;
  const walls: WorldWall[] = [];
  // Two overlapping boulder rings seal the cavern; the art paints solid rock beyond them.
  const ring = (count: number, pad: number, rMin: number, rMax: number, prefix: string) => {
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2 + random() * 0.04;
      const r = rMin + random() * (rMax - rMin);
      const x = cx + Math.cos(a) * (rx + pad), y = cy + Math.sin(a) * (ry + pad);
      walls.push({ id: `${prefix}-${i}`, x: x - r, y: y - r, width: r * 2, height: r * 2, shape: 'circle' });
    }
  };
  ring(68, 120, 130, 165, 'cave-rim');
  ring(48, 340, 180, 230, 'cave-outer');
  const reserved = [
    { ...L.entry, r: 260 }, { ...L.keeper, r: 200 }, { x: cx, y: cy + 20, r: 520 }, { ...L.shrine, r: 150 },
    ...L.portals.map(p => ({ ...p, r: 240 })),
  ];
  const clear = (p: Vector2D, pad: number) => !reserved.some(k => Math.hypot(p.x - k.x, p.y - k.y) < k.r + pad);
  // Stalagmite clumps line the cave walls without crowding the shop floor.
  for (let c = 0, placed = 0; c < 60 && placed < 9; c++) {
    const a = random() * Math.PI * 2, t = 0.62 + random() * 0.22;
    const center = { x: cx + Math.cos(a) * rx * t, y: cy + Math.sin(a) * ry * t };
    if (!clear(center, 110)) continue;
    placed++;
    for (let k = 0; k < 2 + Math.floor(random() * 2); k++) {
      const r = 28 + random() * 30;
      const x = center.x + (random() - 0.5) * 110, y = center.y + (random() - 0.5) * 90;
      walls.push({ id: `cave-stal-${c}-${k}`, x: x - r, y: y - r, width: r * 2, height: r * 2, shape: 'circle' });
    }
  }
  const lamps: { x: number; y: number; color: string }[] = [];
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2 + 0.1;
    const p = { x: cx + Math.cos(a) * rx * 0.86, y: cy + Math.sin(a) * ry * 0.84 };
    if (clear(p, 20) && !walls.some(w => wallBlocks(w, p, 30))) lamps.push({ ...p, color: i % 3 ? '#fbbf24' : '#f97316' });
  }
  const propKinds = BIOME_PROPS.cave;
  const props = [];
  for (let k = 0; k < 150; k++) {
    const p = { x: cx + (random() * 2 - 1) * rx, y: cy + (random() * 2 - 1) * ry };
    if (!insideCave(p, 0.93) || !clear(p, 30) || walls.some(w => wallBlocks(w, p, 10))) continue;
    props.push({ id: `prop-cave-${k}`, x: p.x, y: p.y, kind: propKinds[Math.floor(random() * propKinds.length)] });
  }
  const mods = rollStageModifiers(opts.stageSeed, opts.stage);
  const hidden = { x: -9999, y: -9999 };
  return {
    seed, stage: opts.stage, modifier: null, hasYard: false, interlude: true,
    landing: { ...L.entry },
    width: CAVE.width, height: CAVE.height, phase: 'portals',
    elapsedMs: opts.elapsedMs, stageStartMs: opts.elapsedMs, pressure: 1,
    camera: { x: clamp(L.entry.x - VIEW_WIDTH / 2, 0, CAVE.width - VIEW_WIDTH), y: clamp(L.entry.y - VIEW_HEIGHT / 2, 0, CAVE.height - VIEW_HEIGHT) },
    walls, visited: [], hazards: [], doorways: [], lamps, props,
    biomes: [{ id: 'cave', biome: 'cave', name: BIOMES.cave.name, x: 0, y: 0, width: CAVE.width, height: CAVE.height, neon: BIOMES.cave.neon, discovered: true }],
    currentRegionId: 'cave', biomeBanner: null,
    stageBanner: { title: 'THE GLITCH GROTTO', subtitle: 'SAFE ZONE', neon: BIOMES.cave.neon, ms: 2200 },
    results: null, pendingModifier: null, warpMs: 0,
    portals: L.portals.map((position, k) => ({ id: `portal-${k}`, position: { ...position }, modifier: mods[k] })),
    pedestals: [
      ...L.shops.map((position, k) => ({ id: `cave-shop-${k}`, kind: 'shop' as const, position: { ...position }, taken: false })),
      { id: 'cave-heal', kind: 'heal', position: { ...L.heal }, taken: false, cost: 25 },
    ],
    anchor: { position: hidden, radius: 260, discovered: false, chargeMs: 0, guardianDefeated: true, occupied: false },
    cache: { position: hidden, discovered: false, claimed: true },
    elite: { position: hidden, discovered: false, started: false, defeated: true, id: 'yard-elite' },
    gateOpen: false, prompt: '', notice: 'A safe pocket between rifts · spend your coins', noticeMs: 5000,
    momentum: 0, velocity: { x: 0, y: 0 }, slideMs: 0, slideCooldownMs: 0, stationaryMs: 0, established: false, spawnsEnabled: false,
    metrics: { discoveryMs: null, damageTaken: 0, outsideChargeMs: 0, detourRewards: 0, itemsTaken: 0 },
    run: { ...opts.run, items: [...opts.run.items], clearTimesMs: [...opts.run.clearTimesMs] },
    chests: [{ id: 'cave-shrine', kind: 'shrine', position: { ...L.shrine }, cost: CHEST_COSTS.shrine, opened: false, uses: 0, openedMs: 0 }],
    pads: [], boostMs: 0, boostAngle: 0,
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
    if (best === current && this.field[current] !== 0) {
      // Hugging an obstacle (or standing in a cell the grid calls blocked): no 4-neighbour is cleanly
      // reachable at full radius. Widen to diagonals and a 2-cell ring with a relaxed line check;
      // moveWorld slides the body around the corner, so this never returns our own cell as a dead end.
      const col = current % cols;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if ((!dx && !dy) || col + dx < 0 || col + dx >= cols) continue;
        const next = current + dy * cols + dx;
        if (next < 0 || next >= this.field.length || this.field[next] < 0 || this.field[next] >= cost) continue;
        if (lineClear(world, from, point(next), Math.max(4, radius / 2))) { best = next; cost = this.field[next]; }
      }
    }
    return point(best);
  }
}
