import type { BiomeId, BoostPad, StageModifierId, WorldHazard, WorldProp, WorldRegion, WorldWall } from '@shared/exploration';
import type { EnemyType, Vector2D } from '@shared/types';

// Deterministic RNG (mulberry32-style); no Math.random anywhere in generation.
export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const REGION_COLS = 4;
export const REGION_ROWS = 3;
export const REGION_W = 3200;
export const REGION_H = 2400;
export const WORLD_W = REGION_COLS * REGION_W; // 12800
export const WORLD_H = REGION_ROWS * REGION_H; // 7200
export const YARD_COL = 0;
export const YARD_ROW = 1;
export const YARD_INDEX = YARD_ROW * REGION_COLS + YARD_COL;
// Authored yard is 3200x2000 centred inside its region with a 200px margin band.
export const YARD_OY = YARD_ROW * REGION_H + 200; // 2600

export const SPAWN = { x: 300, y: 1000 + YARD_OY };
export const GATE = { x: 1100, y: 570 + YARD_OY };

export interface BiomeDef {
  name: string;
  neon: string;
  floorA: string;
  floorB: string;
  speckle: string;
  hazard: WorldHazard['kind'] | null;
  roster: EnemyType[];
}

export const BIOMES: Record<BiomeId, BiomeDef> = {
  yard: { name: 'BROKEN CIRCUIT YARD', neon: '#22d3ee', floorA: '#101b2e', floorB: '#0a1220', speckle: '#38bdf8', hazard: null, roster: ['grunt', 'slugger', 'glitch-spider'] },
  frost: { name: 'CRYO SERVER FARM', neon: '#7dd3fc', floorA: '#16293f', floorB: '#0d1c30', speckle: '#bae6fd', hazard: 'ice', roster: ['orbit-drone', 'grunt', 'glitch-spider'] },
  foundry: { name: 'MAGMA FOUNDRY', neon: '#fb923c', floorA: '#2a1c15', floorB: '#180f0a', speckle: '#fdba74', hazard: 'lava', roster: ['bomber', 'slugger', 'tank-bot'] },
  bloom: { name: 'NEON BLOOM JUNGLE', neon: '#a3e635', floorA: '#17270e', floorB: '#0b1807', speckle: '#bef264', hazard: null, roster: ['splitter', 'grunt', 'leech-beacon'] },
  marsh: { name: 'TOXIC DATA MARSH', neon: '#2dd4bf', floorA: '#12302b', floorB: '#0a1e1a', speckle: '#5eead4', hazard: 'sludge', roster: ['slugger', 'splitter', 'leech-beacon'] },
  void: { name: 'VOID RIFT', neon: '#c084fc', floorA: '#1d1136', floorB: '#0e0722', speckle: '#d8b4fe', hazard: 'warp', roster: ['neon-pulse', 'glitch-spider', 'orbit-drone'] },
  arcade: { name: 'ARCADE DISTRICT', neon: '#f472b6', floorA: '#221030', floorB: '#130820', speckle: '#f9a8d4', hazard: null, roster: ['grunt', 'bomber', 'neon-pulse'] },
};

// Non-colliding decor baked into chunk art; clustered so every camera shows biome character.
const BIOME_PROPS: Record<Exclude<BiomeId, 'yard'>, string[]> = {
  frost: ['snowdrift', 'icecrystal', 'cabletray', 'frostcrate', 'snowdrift', 'icecrystal'],
  foundry: ['conveyor', 'pipe', 'anvil', 'slag', 'embercrack', 'pipe', 'slag'],
  bloom: ['mushroom', 'vine', 'flowerbed', 'fern', 'mushroom', 'flowerbed'],
  marsh: ['reeds', 'lily', 'wrecksm', 'puddle', 'reeds', 'puddle'],
  void: ['stardust', 'rift', 'shardfrag', 'stardust', 'rift'],
  arcade: ['lane', 'crosswalk', 'sign', 'cabinet', 'vending', 'reflect', 'sign'],
};

// ---- Authored Broken Circuit Yard (local coords, y += YARD_OY in the world) ----
export const YARD_LANDMARKS = [
  { name: 'ARRIVAL', x: 100, y: 750 + YARD_OY, width: 580, height: 570, color: '#18343b', neon: '#22d3ee' },
  { name: 'SERVICE LOOP', x: 260, y: 1400 + YARD_OY, width: 1120, height: 380, color: '#172f38', neon: '#a3e635' },
  { name: 'MACHINERY COURT', x: 1350, y: 650 + YARD_OY, width: 650, height: 570, color: '#302d37', neon: '#f59e0b' },
  { name: 'MAINTENANCE', x: 350, y: 180 + YARD_OY, width: 1100, height: 390, color: '#23343b', neon: '#e879f9' },
  { name: 'SIGNAL FIELD', x: 2220, y: 1030 + YARD_OY, width: 900, height: 800, color: '#18323a', neon: '#f43f5e' },
];

const YARD_WALLS: WorldWall[] = [
  { id: 'north-rack', x: 500, y: 650 + YARD_OY, width: 600, height: 100 },
  { id: 'pocket-west', x: 230, y: 160 + YARD_OY, width: 100, height: 480 },
  { id: 'pocket-south', x: 330, y: 570 + YARD_OY, width: 710, height: 80 },
  { id: 'gate', x: 1040, y: 570 + YARD_OY, width: 120, height: 80 },
  { id: 'pocket-tail', x: 1160, y: 570 + YARD_OY, width: 300, height: 80 },
  { id: 'west-machine', x: 800, y: 1000 + YARD_OY, width: 360, height: 280 },
  { id: 'central-bank', x: 1460, y: 330 + YARD_OY, width: 280, height: 320 },
  { id: 'court-cover', x: 1600, y: 860 + YARD_OY, width: 140, height: 110 },
  { id: 'east-bank', x: 2070, y: 650 + YARD_OY, width: 140, height: 470 },
  { id: 'south-bank', x: 1300, y: 1700 + YARD_OY, width: 730, height: 100 },
  { id: 'signal-cover', x: 2260, y: 1690 + YARD_OY, width: 120, height: 100 },
];

const YARD_CHESTS = [
  { id: 'chest-loop', kind: 'small' as const, position: { x: 560, y: 1520 + YARD_OY } },
  { id: 'chest-machine', kind: 'small' as const, position: { x: 1250, y: 860 + YARD_OY } },
  { id: 'chest-northeast', kind: 'small' as const, position: { x: 2400, y: 300 + YARD_OY } },
  { id: 'chest-south', kind: 'small' as const, position: { x: 950, y: 1860 + YARD_OY } },
  { id: 'chest-east', kind: 'small' as const, position: { x: 2960, y: 900 + YARD_OY } },
  { id: 'shrine-court', kind: 'shrine' as const, position: { x: 1880, y: 1100 + YARD_OY } },
  { id: 'shrine-arrival', kind: 'shrine' as const, position: { x: 640, y: 880 + YARD_OY } },
];

const YARD_PADS: BoostPad[] = [
  { id: 'pad-loop', position: { x: 700, y: 1580 + YARD_OY }, angle: 0 },
  { id: 'pad-court', position: { x: 1500, y: 1250 + YARD_OY }, angle: 0 },
  { id: 'pad-north', position: { x: 2500, y: 1000 + YARD_OY }, angle: -Math.PI / 2 },
  { id: 'pad-maint', position: { x: 1300, y: 250 + YARD_OY }, angle: 0 },
  { id: 'pad-arrival', position: { x: 300, y: 1300 + YARD_OY }, angle: Math.PI / 2 },
];

interface Rect { x: number; y: number; width: number; height: number }
interface KeepCircle { x: number; y: number; r: number }

const circleRectOverlap = (r: Rect, cx: number, cy: number, rad: number) => {
  const x = Math.max(r.x, Math.min(r.x + r.width, cx));
  const y = Math.max(r.y, Math.min(r.y + r.height, cy));
  return Math.hypot(cx - x, cy - y) < rad;
};

const rectsOverlap = (a: Rect, b: Rect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

// True when a circle at p would intersect the wall (rect or circle footprint).
export function wallBlocks(wall: WorldWall, p: Vector2D, radius: number) {
  if (wall.shape === 'circle') {
    const cx = wall.x + wall.width / 2, cy = wall.y + wall.height / 2;
    return Math.hypot(p.x - cx, p.y - cy) < radius + wall.width / 2;
  }
  return circleRectOverlap(wall, p.x, p.y, radius);
}

// True when the wall's footprint touches a circle.
function footprintHitsCircle(w: WorldWall, cx: number, cy: number, r: number) {
  if (w.shape === 'circle') return Math.hypot(w.x + w.width / 2 - cx, w.y + w.height / 2 - cy) < r + w.width / 2;
  return circleRectOverlap(w, cx, cy, r);
}

// True when the wall's footprint keeps at least `pad` px from every rect and every other wall.
function footprintClear(w: WorldWall, rects: Rect[], pad: number, others: WorldWall[]) {
  const grown: Rect = { x: w.x - pad, y: w.y - pad, width: w.width + pad * 2, height: w.height + pad * 2 };
  const isCircle = w.shape === 'circle';
  const cx = w.x + w.width / 2, cy = w.y + w.height / 2, r = w.width / 2;
  for (const rect of rects) if (isCircle ? circleRectOverlap(rect, cx, cy, r + pad) : rectsOverlap(grown, rect)) return false;
  for (const o of others) {
    if (o.shape === 'circle') { if (footprintHitsCircle(w, o.x + o.width / 2, o.y + o.height / 2, o.width / 2 + pad)) return false; }
    else if (isCircle ? circleRectOverlap(o, cx, cy, r + pad) : rectsOverlap(grown, o)) return false;
  }
  return true;
}

export interface LandingPedestalSpec { kind: 'treasure' | 'shop' | 'heal'; offset: Vector2D }

export interface GeneratedWorld {
  walls: WorldWall[];
  hazards: WorldHazard[];
  chests: { id: string; kind: 'small' | 'large' | 'shrine'; position: Vector2D; secret?: boolean }[];
  pads: BoostPad[];
  regions: WorldRegion[];
  anchor: Vector2D;
  doorways: Rect[];
  lamps: { x: number; y: number; color: string }[];
  props: WorldProp[];
  spawn: Vector2D;
  landing: Vector2D | null;
  landingPedestals: LandingPedestalSpec[];
  cache: Vector2D | null;
  elite: Vector2D | null;
  hasYard: boolean;
  secretWalls: string[];
}

export interface WorldGenOptions { yard?: boolean; modifier?: StageModifierId | null }

const regionRect = (i: number): Rect => ({ x: (i % REGION_COLS) * REGION_W, y: Math.floor(i / REGION_COLS) * REGION_H, width: REGION_W, height: REGION_H });
export const regionIndexAt = (p: Vector2D) => Math.min(REGION_ROWS - 1, Math.max(0, Math.floor(p.y / REGION_H))) * REGION_COLS + Math.min(REGION_COLS - 1, Math.max(0, Math.floor(p.x / REGION_W)));

export function generateWorld(seed: number, opts: WorldGenOptions = {}): GeneratedWorld {
  const hasYard = opts.yard !== false;
  const modifier = opts.modifier || null;
  const random = rng(seed * 7919 + 17);
  const pick = <T,>(arr: T[]) => arr[Math.floor(random() * arr.length)];

  // ---- Region graph: seeded spanning tree plus extra loops ----
  const adjacent: [number, number][] = [];
  for (let r = 0; r < REGION_ROWS; r++) for (let c = 0; c < REGION_COLS; c++) {
    if (c < REGION_COLS - 1) adjacent.push([r * REGION_COLS + c, r * REGION_COLS + c + 1]);
    if (r < REGION_ROWS - 1) adjacent.push([r * REGION_COLS + c, (r + 1) * REGION_COLS + c]);
  }
  const inTree = new Set([YARD_INDEX]);
  const tree: [number, number][] = [];
  while (inTree.size < REGION_COLS * REGION_ROWS) {
    const options = adjacent.filter(([a, b]) => inTree.has(a) !== inTree.has(b));
    const edge = options[Math.floor(random() * options.length)];
    tree.push(edge); inTree.add(edge[0]); inTree.add(edge[1]);
  }
  const treeSet = new Set(tree.map(([a, b]) => `${a}-${b}`));
  const extras = adjacent.filter(([a, b]) => !treeSet.has(`${a}-${b}`));
  for (let i = extras.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [extras[i], extras[j]] = [extras[j], extras[i]]; }
  const connected = [...tree, ...extras.slice(0, 4)];
  const connectedSet = new Set(connected.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));

  // ---- Biome assignment: every biome appears at least once ----
  const biomePool: BiomeId[] = hasYard
    ? ['frost', 'foundry', 'bloom', 'marsh', 'void', 'arcade', 'frost', 'foundry', 'bloom', 'marsh', 'void']
    : ['frost', 'foundry', 'bloom', 'marsh', 'void', 'arcade', 'frost', 'foundry', 'bloom', 'marsh', 'void', 'arcade'];
  for (let i = biomePool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [biomePool[i], biomePool[j]] = [biomePool[j], biomePool[i]]; }
  const regions: WorldRegion[] = [];
  let poolIndex = 0;
  for (let i = 0; i < REGION_COLS * REGION_ROWS; i++) {
    const rect = regionRect(i);
    const biome: BiomeId = hasYard && i === YARD_INDEX ? 'yard' : biomePool[poolIndex++];
    regions.push({ id: `r${i}`, biome, name: BIOMES[biome].name, ...rect, neon: BIOMES[biome].neon, discovered: false });
  }

  // ---- Landing region: the yard on stage 1, a seeded non-anchor region later ----
  const landingIndex = hasYard ? YARD_INDEX : Math.floor(random() * regions.length);
  const landingRect = regionRect(landingIndex);
  const landing = hasYard ? { ...SPAWN } : { x: landingRect.x + REGION_W / 2, y: landingRect.y + REGION_H / 2 };

  // ---- Doorways + border walls ----
  const walls: WorldWall[] = hasYard ? YARD_WALLS.map(w => ({ ...w })) : [];
  const doorways: Rect[] = [];
  const corridors: Rect[] = [];
  const BORDER = 80;
  const wallSegment = (vertical: boolean, fixed: number, from: number, to: number) => {
    if (to - from < 4) return;
    walls.push(vertical
      ? { id: `border-${walls.length}`, x: fixed - BORDER / 2, y: from, width: BORDER, height: to - from }
      : { id: `border-${walls.length}`, x: from, y: fixed - BORDER / 2, width: to - from, height: BORDER });
  };
  for (const [a, b] of adjacent) {
    const ra = regionRect(a), rb = regionRect(b);
    const vertical = ra.y === rb.y; // same row -> vertical boundary
    const fixed = vertical ? ra.x + REGION_W : ra.y + REGION_H;
    const lo = vertical ? ra.y : ra.x;
    const hi = vertical ? ra.y + REGION_H : ra.x + REGION_W;
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    const doorCount = connectedSet.has(key) ? 2 : 0;
    const gaps: [number, number][] = [];
    for (const fraction of doorCount ? [0.32, 0.68] : []) {
      let center = 0, placed = false;
      for (let attempt = 0; attempt < 30 && !placed; attempt++) {
        center = lo + 350 + (fraction + (random() - 0.5) * 0.12) * (hi - lo - 700);
        // Yard doorways must sit on walkable yard floor on both sides of the boundary.
        const yardSide = hasYard && (a === YARD_INDEX || b === YARD_INDEX);
        if (yardSide) {
          const inside = vertical ? { x: fixed + (a === YARD_INDEX ? -160 : 160), y: center } : { x: center, y: fixed + (a === YARD_INDEX ? -160 : 160) };
          if (YARD_WALLS.some(w => wallBlocks(w, inside, 120))) continue;
        }
        placed = true;
      }
      const half = 170;
      gaps.push([center - half, center + half]);
      const door: Rect = vertical ? { x: fixed - BORDER / 2, y: center - half, width: BORDER, height: half * 2 } : { x: center - half, y: fixed - BORDER / 2, width: half * 2, height: BORDER };
      doorways.push(door);
      corridors.push(vertical
        ? { x: fixed - BORDER / 2 - 300, y: center - half - 110, width: BORDER + 600, height: half * 2 + 220 }
        : { x: center - half - 110, y: fixed - BORDER / 2 - 300, width: half * 2 + 220, height: BORDER + 600 });
    }
    let cursor = lo;
    for (const [g0, g1] of gaps.sort((p, q) => p[0] - q[0])) { wallSegment(vertical, fixed, cursor, g0); cursor = g1; }
    wallSegment(vertical, fixed, cursor, hi);
  }

  // ---- Anchor region: graph distance >= 2 from the landing ----
  const distanceFromLanding = new Map<number, number>([[landingIndex, 0]]);
  const queue = [landingIndex];
  while (queue.length) {
    const current = queue.shift()!;
    for (const [a, b] of connected) {
      const next = a === current ? b : b === current ? a : -1;
      if (next >= 0 && !distanceFromLanding.has(next)) { distanceFromLanding.set(next, distanceFromLanding.get(current)! + 1); queue.push(next); }
    }
  }
  const anchorCandidates = regions.map((_, i) => i).filter(i => (distanceFromLanding.get(i) || 0) >= 2);
  const anchorIndex = anchorCandidates.length ? pick(anchorCandidates) : [...distanceFromLanding.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const ar = regionRect(anchorIndex);
  const anchor = { x: ar.x + REGION_W / 2 + (random() - 0.5) * 260, y: ar.y + REGION_H / 2 + (random() - 0.5) * 260 };

  const hazards: WorldHazard[] = [];
  const chests: GeneratedWorld['chests'] = hasYard ? YARD_CHESTS.map(c => ({ ...c, position: { ...c.position } })) : [];
  const pads: BoostPad[] = hasYard ? YARD_PADS.map(p => ({ ...p, position: { ...p.position } })) : [];
  const lamps: { x: number; y: number; color: string }[] = [];
  const props: WorldProp[] = [];
  const reserved: KeepCircle[] = [{ x: landing.x, y: landing.y, r: hasYard ? 200 : 430 }, { x: anchor.x, y: anchor.y, r: 380 }];
  const vaultCount = 6 + (modifier === 'bloodMoon' ? 2 : 0);
  const vaultRegions = new Set<number>();
  const vaultEligible = regions.map((_, i) => i).filter(i => i !== landingIndex);
  // Own RNG stream so modifiers that add vaults never reshuffle the rest of the world.
  const vaultRandom = rng(seed * 104729 + 3);
  while (vaultRegions.size < vaultCount) vaultRegions.add(vaultEligible[Math.floor(vaultRandom() * vaultEligible.length)]);

  const corridorFree = (p: Vector2D, rad: number) => !corridors.some(c => circleRectOverlap(c, p.x, p.y, rad));
  const freeSpot = (rect: Rect, rad: number, extraWalls: WorldWall[]): Vector2D | null => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const p = { x: rect.x + 140 + random() * (rect.width - 280), y: rect.y + 140 + random() * (rect.height - 280) };
      // Dense biomes: after many misses, allow spots on the corridor edge (never in the doorway itself).
      if (attempt < 120 ? !corridorFree(p, rad + 60) : doorways.some(d => circleRectOverlap(d, p.x, p.y, rad + 120))) continue;
      if (reserved.some(k => Math.hypot(p.x - k.x, p.y - k.y) < k.r + rad)) continue;
      if (extraWalls.some(w => wallBlocks(w, p, rad + 40))) continue;
      if (walls.some(w => wallBlocks(w, p, rad + 30))) continue;
      return p;
    }
    return null;
  };

  // ---- Secret rooms: sealed pockets with one cracked (destructible) wall ----
  // Carved first so dense biome obstacles route around them instead of crowding them out.
  const secretWalls: string[] = [];
  const secretRegions = regions.map((_, i) => i).filter(i => i !== landingIndex && i !== anchorIndex);
  const secretCount = Math.min(secretRegions.length, 1 + (random() < 0.5 ? 1 : 0));
  for (let s = 0; s < secretCount; s++) {
    const ri = pick(secretRegions);
    const rect = regionRect(ri);
    for (let attempt = 0; attempt < 60; attempt++) {
      const cx = rect.x + 480 + random() * (rect.width - 960), cy = rect.y + 460 + random() * (rect.height - 920);
      const outer: Rect = { x: cx - 236, y: cy - 206, width: 472, height: 412 };
      if (!corridorFree({ x: cx, y: cy }, 320)) continue;
      if (reserved.some(k => circleRectOverlap(outer, k.x, k.y, k.r))) continue;
      if (walls.some(w => w.shape === 'circle' ? circleRectOverlap(outer, w.x + w.width / 2, w.y + w.height / 2, w.width / 2 + 30) : rectsOverlap({ x: w.x - 30, y: w.y - 30, width: w.width + 60, height: w.height + 60 }, outer))) continue;
      if (hazards.some(h => circleRectOverlap(outer, h.x, h.y, h.radius))) continue;
      const T = 56, W = 472, H = 412;
      const parts: [string, number, number, number, number][] = [
        ['top', outer.x, outer.y, W, T],
        ['bottom', outer.x, outer.y + H - T, W, T],
        ['left', outer.x, outer.y, T, H],
        ['right', outer.x + W - T, outer.y, T, H],
      ];
      const crackedSide = pick([0, 1, 2, 3]);
      parts.forEach(([side, x, y, w, h], pi) => {
        const wall: WorldWall = { id: `secret-${s}-${side}`, x, y, width: w, height: h };
        if (pi === crackedSide) { wall.cracked = true; wall.hp = 12; secretWalls.push(wall.id); }
        walls.push(wall);
      });
      if (random() < 0.5) chests.push({ id: `secret-${s}-vault`, kind: 'large', position: { x: cx, y: cy }, secret: true });
      else {
        chests.push({ id: `secret-${s}-a`, kind: 'small', position: { x: cx - 90, y: cy }, secret: true });
        chests.push({ id: `secret-${s}-b`, kind: 'small', position: { x: cx + 90, y: cy }, secret: true });
      }
      reserved.push({ x: cx, y: cy, r: 320 });
      break;
    }
  }

  for (let i = 0; i < regions.length; i++) {
    if (hasYard && i === YARD_INDEX) continue;
    const region = regions[i], rect = regionRect(i), biome = BIOMES[region.biome];
    const local: WorldWall[] = [];
    // Footprint-vs-footprint test: obstacles may pack tightly as long as a walkable gap remains.
    const tryAdd = (w: WorldWall, gap = 110) => {
      if (w.x < rect.x + 60 || w.y < rect.y + 60 || w.x + w.width > rect.x + rect.width - 60 || w.y + w.height > rect.y + rect.height - 60) return false;
      if (!footprintClear(w, corridors, 20, [])) return false;
      if (reserved.some(k => footprintHitsCircle(w, k.x, k.y, k.r))) return false;
      if (!footprintClear(w, [], gap, [...walls, ...local])) return false;
      local.push(w); return true;
    };
    // Uniform position inside the region keeping `margin` px from every edge for an obstacle of `size`.
    const rx = (margin: number, size = 0) => rect.x + margin + random() * (rect.width - margin * 2 - size);
    const ry = (margin: number, size = 0) => rect.y + margin + random() * (rect.height - margin * 2 - size);
    // A clump is a tight group of circles that may touch each other but keeps a walkable gap from everything else.
    const tryClump = (cx: number, cy: number, count: number, spread: number, rMin: number, rMax: number, prefix: string, gap = 110) => {
      const clump: WorldWall[] = [];
      for (let k = 0; k < count; k++) {
        const r = rMin + random() * (rMax - rMin);
        const w: WorldWall = { id: `${prefix}-${i}-${n++}`, x: cx + (random() - 0.5) * spread - r, y: cy + (random() - 0.5) * spread - r, width: r * 2, height: r * 2, shape: 'circle' };
        if (w.x < rect.x + 60 || w.y < rect.y + 60 || w.x + w.width > rect.x + rect.width - 60 || w.y + w.height > rect.y + rect.height - 60) continue;
        if (!footprintClear(w, corridors, 20, []) || reserved.some(k2 => footprintHitsCircle(w, k2.x, k2.y, k2.r))) continue;
        if (!footprintClear(w, [], gap, [...walls, ...local])) continue;
        clump.push(w);
      }
      local.push(...clump);
      return clump.length;
    };
    let n = 0;
    if (region.biome === 'frost') {
      // Dense parallel server-rack rows with cross-aisles every ~800px.
      const aisleXs = [0, 1, 2, 3].map(k => rect.x + 480 + k * 800 + (random() - 0.5) * 160);
      for (let row = 0; row < 8; row++) {
        const y = rect.y + 240 + row * 252 + (random() - 0.5) * 60;
        for (let x = rect.x + 140; x < rect.x + rect.width - 560; x += 560 + random() * 160) {
          const w = 380 + random() * 120;
          const cx = x + w / 2;
          if (aisleXs.some(ax => Math.abs(cx - ax) < 200)) continue;
          if (!tryAdd({ id: `frost-${i}-${n++}`, x, y, width: w, height: 52 }, 100)) tryAdd({ id: `frost-${i}-${n++}`, x: x + w * 0.25, y, width: w * 0.5, height: 52 }, 100);
        }
      }
      for (let k = 0; k < 10; k++) { const h = 240 + random() * 260; tryAdd({ id: `frost-v-${i}-${n++}`, x: rx(160, 52), y: ry(160, h), width: 52, height: h }, 100); }
      for (let k = 0; k < 10; k++) tryAdd({ id: `coolant-${i}-${n++}`, x: rx(160, 110), y: ry(160, 110), width: 110, height: 110 }, 110);
    } else if (region.biome === 'foundry') {
      for (let k = 0; k < 18; k++) { const r = 60 + random() * 60; tryAdd({ id: `crucible-${i}-${n++}`, x: rx(160, r * 2), y: ry(160, r * 2), width: r * 2, height: r * 2, shape: 'circle' }); }
      for (let k = 0; k < 18; k++) { const w = 220 + random() * 260; tryAdd({ id: `girder-${i}-${n++}`, x: rx(160, w), y: ry(160, 64), width: w, height: 64 }); }
      for (let k = 0; k < 10; k++) { const h = 220 + random() * 260; tryAdd({ id: `girder-v-${i}-${n++}`, x: rx(160, 64), y: ry(160, h), width: 64, height: h }); }
    } else if (region.biome === 'bloom') {
      // Overgrown hedge clumps with the odd lone giant bulb.
      for (let c = 0; c < 34; c++) tryClump(rx(260), ry(260), 4 + Math.floor(random() * 4), 300, 34, 70, 'bloom');
      for (let k = 0; k < 10; k++) { const r = 80 + random() * 40; tryAdd({ id: `bulb-${i}-${n++}`, x: rx(200, r * 2), y: ry(200, r * 2), width: r * 2, height: r * 2, shape: 'circle' }, 120); }
    } else if (region.biome === 'marsh') {
      for (let k = 0; k < 44; k++) {
        if (random() < 0.5) { const r = 40 + random() * 64; tryAdd({ id: `rock-${i}-${n++}`, x: rx(160, r * 2), y: ry(160, r * 2), width: r * 2, height: r * 2, shape: 'circle' }); }
        else { const w = 120 + random() * 220, h = 70 + random() * 70; tryAdd({ id: `wreck-${i}-${n++}`, x: rx(160, w), y: ry(160, h), width: w, height: h }); }
      }
    } else if (region.biome === 'void') {
      // Floating shard archipelagos with wider lanes between them (warp pools need room too).
      for (let c = 0; c < 22; c++) tryClump(rx(260), ry(260), 2 + Math.floor(random() * 4), 360, 28, 60, 'shard', 130);
      for (let k = 0; k < 8; k++) { const w = 60 + random() * 40, h = 180 + random() * 160; tryAdd({ id: `monolith-${i}-${n++}`, x: rx(200, w), y: ry(200, h), width: w, height: h }, 130); }
    } else if (region.biome === 'arcade') {
      // Tight building grid: ~700px pitch, 400-480px blocks -> 220-300px streets.
      for (let gx = 0; gx < 4; gx++) for (let gy = 0; gy < 3; gy++) {
        if (random() < 0.12) continue;
        const w = 400 + random() * 80, h = 400 + random() * 80;
        const x = rect.x + 220 + gx * 700 + (random() - 0.5) * 80, y = rect.y + 260 + gy * 700 + (random() - 0.5) * 80;
        if (tryAdd({ id: `building-${i}-${gx}-${gy}`, x, y, width: w, height: h }, 100)) continue;
        // Blocked by a doorway lane or landmark: fall back to smaller kiosks on the same lot.
        for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) tryAdd({ id: `kiosk-${i}-${gx}-${gy}-${qx}${qy}`, x: x + qx * (w / 2 + 30), y: y + qy * (h / 2 + 30), width: w / 2 - 30, height: h / 2 - 30 }, 100);
      }
    }
    walls.push(...local);

    // Hazards: circles that avoid corridors, reserved points and walls.
    if (biome.hazard) {
      const count = biome.hazard === 'warp' ? 5 : 6;
      for (let k = 0; k < count; k++) {
        const radius = biome.hazard === 'warp' ? 150 + random() * 90 : 110 + random() * 80;
        for (let attempt = 0; attempt < 50; attempt++) {
          const p = { x: rect.x + 200 + random() * (rect.width - 400), y: rect.y + 200 + random() * (rect.height - 400) };
          if (!corridorFree(p, radius + 80)) continue;
          if (reserved.some(k2 => Math.hypot(p.x - k2.x, p.y - k2.y) < k2.r + radius)) continue;
          if (walls.some(w => wallBlocks(w, p, radius + 24))) continue;
          if (hazards.some(h => Math.hypot(p.x - h.x, p.y - h.y) < h.radius + radius + 60)) continue;
          hazards.push({ id: `${biome.hazard}-${i}-${k}`, kind: biome.hazard, x: p.x, y: p.y, radius });
          break;
        }
      }
    }

    // Chests: 3 small + 1 shrine (+ optional legendary vault).
    const kinds: ('small' | 'large' | 'shrine')[] = ['small', 'small', 'small', 'shrine'];
    if (vaultRegions.has(i)) kinds.push('large');
    for (const [index, kind] of kinds.entries()) {
      const p = freeSpot(rect, 40, []);
      if (p) { chests.push({ id: `${kind}-${region.id}-${index}`, kind, position: p }); reserved.push({ x: p.x, y: p.y, r: 150 }); }
    }
    // Boost pads aimed along a corridor toward a doorway.
    const regionDoors = doorways.filter(d => circleRectOverlap(rect, d.x + d.width / 2, d.y + d.height / 2, 500));
    for (let k = 0; k < 1 + Math.floor(random() * 2) && k < regionDoors.length; k++) {
      const door = regionDoors[k];
      const dc = { x: door.x + door.width / 2, y: door.y + door.height / 2 };
      const inward = { x: Math.max(rect.x + 200, Math.min(rect.x + rect.width - 200, dc.x + Math.sign(rect.x + rect.width / 2 - dc.x) * 330)), y: Math.max(rect.y + 200, Math.min(rect.y + rect.height - 200, dc.y + Math.sign(rect.y + rect.height / 2 - dc.y) * 330)) };
      const p = walls.some(w => wallBlocks(w, inward, 50)) ? freeSpot(rect, 40, []) : inward;
      if (p) pads.push({ id: `pad-${region.id}-${k}`, position: p, angle: Math.atan2(dc.y - p.y, dc.x - p.x) });
    }
    // Pixel lamps sprinkled on free floor.
    for (let k = 0; k < 7; k++) {
      const p = freeSpot(rect, 24, []);
      if (p) lamps.push({ x: p.x, y: p.y, color: random() < 0.7 ? '#fbbf24' : region.neon });
    }
    // Dense non-colliding decor so every camera position shows the biome.
    const kinds2 = BIOME_PROPS[region.biome as Exclude<BiomeId, 'yard'>];
    for (let k = 0; k < 170; k++) {
      const p = { x: rect.x + 90 + random() * (rect.width - 180), y: rect.y + 90 + random() * (rect.height - 180) };
      // Decor never collides, so it may line corridors; only the doorway mouth stays clean.
      if (doorways.some(d => circleRectOverlap(d, p.x, p.y, 90))) continue;
      if (reserved.some(k2 => Math.hypot(p.x - k2.x, p.y - k2.y) < k2.r + 30)) continue;
      if (walls.some(w => wallBlocks(w, p, 10))) continue;
      props.push({ id: `prop-${region.id}-${k}`, x: p.x, y: p.y, kind: kinds2[Math.floor(random() * kinds2.length)] });
    }
  }

  // Yard lamps + props.
  if (hasYard) {
    for (let k = 0; k < 6; k++) {
      const p = { x: 200 + random() * 2800, y: YARD_OY + 150 + random() * 1700 };
      if (!walls.some(w => wallBlocks(w, p, 40))) lamps.push({ x: p.x, y: p.y, color: '#fbbf24' });
    }
  }

  // ---- Clearings: landing pad + anchor field must be free of obstacles/hazards ----
  const clearAt = (p: Vector2D, r: number) => {
    for (let i = walls.length - 1; i >= 0; i--) if (walls[i].id.startsWith('border-') || walls[i].id.startsWith('secret-') ? false : wallBlocks(walls[i], p, r)) walls.splice(i, 1);
    for (let i = hazards.length - 1; i >= 0; i--) if (Math.hypot(hazards[i].x - p.x, hazards[i].y - p.y) < r + hazards[i].radius) hazards.splice(i, 1);
  };
  if (!hasYard) clearAt(landing, 400);
  clearAt(anchor, 330);
  clearAt({ x: anchor.x + 180, y: anchor.y - 150 }, 60);

  // ---- Flood fill from the landing; relocate unreachable pickups ----
  const cell = 50, cols = Math.ceil(WORLD_W / cell), rows = Math.ceil(WORLD_H / cell);
  // Walls are final from here on; bucket them so the flood fill stays fast with dense biomes.
  const BUCKET = 400, bucketCols = Math.ceil(WORLD_W / BUCKET);
  const buckets = new Map<number, WorldWall[]>();
  for (const w of walls) {
    for (let bx = Math.floor((w.x - 100) / BUCKET); bx <= Math.floor((w.x + w.width + 100) / BUCKET); bx++) {
      for (let by = Math.floor((w.y - 100) / BUCKET); by <= Math.floor((w.y + w.height + 100) / BUCKET); by++) {
        const key = by * bucketCols + bx;
        const list = buckets.get(key);
        if (list) list.push(w); else buckets.set(key, [w]);
      }
    }
  }
  const walkable = (p: Vector2D, r: number) => p.x >= r && p.y >= r && p.x <= WORLD_W - r && p.y <= WORLD_H - r
    && !(buckets.get(Math.floor(p.y / BUCKET) * bucketCols + Math.floor(p.x / BUCKET)) || []).some(w => wallBlocks(w, p, r));
  const reachable = new Uint8Array(cols * rows);
  const start = Math.floor(landing.y / cell) * cols + Math.floor(landing.x / cell);
  const bfs = [start]; reachable[start] = 1;
  for (let head = 0; head < bfs.length; head++) {
    const cur = bfs[head];
    for (const next of [cur - cols, cur + cols, ...(cur % cols ? [cur - 1] : []), ...(cur % cols < cols - 1 ? [cur + 1] : [])]) {
      if (next < 0 || next >= reachable.length || reachable[next]) continue;
      const p = { x: (next % cols + 0.5) * cell, y: (Math.floor(next / cols) + 0.5) * cell };
      if (walkable(p, 22)) { reachable[next] = 1; bfs.push(next); }
    }
  }
  const isReachable = (p: Vector2D) => !!reachable[Math.floor(p.y / cell) * cols + Math.floor(p.x / cell)];
  const hazardFree = (p: Vector2D, rad: number) => !hazards.some(h => Math.hypot(h.x - p.x, h.y - p.y) < h.radius + rad);
  const relocate = (p: Vector2D, rad: number) => {
    if (isReachable(p) && walkable(p, rad) && hazardFree(p, rad)) return p;
    for (let ring = 1; ring < 80; ring++) {
      for (let a = 0; a < 16; a++) {
        const cand = { x: p.x + Math.cos(a / 16 * Math.PI * 2) * ring * cell, y: p.y + Math.sin(a / 16 * Math.PI * 2) * ring * cell };
        const ci = Math.floor(cand.y / cell) * cols + Math.floor(cand.x / cell);
        if (ci >= 0 && ci < reachable.length && reachable[ci] && walkable(cand, rad) && hazardFree(cand, rad)) return cand;
      }
    }
    return p;
  };
  for (const chest of chests) if (!chest.secret) chest.position = relocate(chest.position, 30);
  for (const pad of pads) pad.position = relocate(pad.position, 30);
  const relocatedAnchor = relocate(anchor, 60);
  anchor.x = relocatedAnchor.x; anchor.y = relocatedAnchor.y;
  clearAt(anchor, 330);
  clearAt({ x: anchor.x + 180, y: anchor.y - 150 }, 60);

  // ---- Landing-pad pedestals for treasure/blackMarket modifiers ----
  const landingPedestals: LandingPedestalSpec[] = [];
  if (!hasYard && modifier === 'treasure') {
    // Two flank the pad's upper corners and one sits below, leaving the RIFT LANDING label clear.
    for (const a of [-Math.PI * 5 / 6, -Math.PI / 6, Math.PI / 2]) landingPedestals.push({ kind: 'treasure', offset: { x: Math.cos(a) * 170, y: Math.sin(a) * 170 } });
  }
  if (!hasYard && modifier === 'blackMarket') {
    // Shops on the four corners, heal pedestal centred below; nothing overlaps the pad label.
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) landingPedestals.push({ kind: 'shop', offset: { x: sx * 180, y: sy * 110 - 10 } });
    landingPedestals.push({ kind: 'heal', offset: { x: 0, y: 220 } });
  }

  regions[landingIndex].discovered = true;

  return {
    walls, hazards, chests, pads, regions, anchor, doorways, lamps, props,
    spawn: landing, landing: hasYard ? null : landing,
    landingPedestals,
    cache: hasYard ? { x: 500 + (seed % 2) * 400, y: 350 + YARD_OY } : null,
    elite: hasYard ? { x: 1840, y: 850 + YARD_OY } : null,
    hasYard, secretWalls,
  };
}
