import { bay } from './pixelFx';

// Hand-drawn 56x80 pixel card back, repainted each frame while a card charges.
export const BACK_W = 56;
export const BACK_H = 80;

const P = { k: '#07060f', navy: '#1a1640', indigo: '#2b2461', mid: '#3d3a8c', lav: '#6a6394', cream: '#f4efe0', gold: '#ffcf4a', goldD: '#e0781f', goldL: '#fff3b0', white: '#ffffff' };
const QMARK = ['##.', '..#', '.#.', '...', '.#.'];

export interface CrackTier { paths: [number, number][][]; shown: boolean; prog: number }

function mulberry(a: number) {
  return () => { a |= 0; a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// Four tiers of branching pixel cracks radiating from the centre; one tier opens per charge threshold.
export function genCracks(seed: number): CrackTier[] {
  const rng = mulberry(seed), tiers: [number, number][][][] = [[], [], [], []];
  const walk = (x: number, y: number, a: number, len: number, tier: number, depth: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < len; i++) {
      a += (rng() - 0.5) * 0.7; x += Math.cos(a); y += Math.sin(a);
      const px = Math.round(x), py = Math.round(y);
      if (px < 2 || py < 2 || px > BACK_W - 3 || py > BACK_H - 3) break;
      pts.push([px, py]);
      if (depth < 2 && rng() < 0.05) walk(x, y, a + (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 0.6), Math.floor(len * 0.4), Math.min(3, tier + 1), depth + 1);
    }
    tiers[tier].push(pts);
  };
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + rng() * 0.4; walk(28 + Math.cos(a) * 3, 40 + Math.sin(a) * 3, a, 18 + Math.floor(rng() * 22), i % 4, 0); }
  return tiers.map(paths => ({ paths, shown: false, prog: 0 }));
}

let baseCache: ImageData | null = null;
function base(g: CanvasRenderingContext2D) {
  if (baseCache) return baseCache;
  const f = (c: string, x: number, y: number, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  g.clearRect(0, 0, BACK_W, BACK_H);
  f(P.navy, 1, 1, BACK_W - 2, BACK_H - 2);
  for (let y = 2; y < BACK_H - 2; y++) for (let x = 2; x < BACK_W - 2; x++) if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) f(P.indigo, x, y);
  f(P.k, 1, 0, BACK_W - 2); f(P.k, 1, BACK_H - 1, BACK_W - 2); f(P.k, 0, 1, 1, BACK_H - 2); f(P.k, BACK_W - 1, 1, 1, BACK_H - 2);
  f(P.cream, 2, 1, BACK_W - 4); f(P.cream, 2, BACK_H - 2, BACK_W - 4); f(P.cream, 1, 2, 1, BACK_H - 4); f(P.cream, BACK_W - 2, 2, 1, BACK_H - 4);
  f(P.gold, 4, 4, BACK_W - 8); f(P.gold, 4, BACK_H - 5, BACK_W - 8); f(P.gold, 4, 4, 1, BACK_H - 8); f(P.gold, BACK_W - 5, 4, 1, BACK_H - 8);
  f(P.goldD, 5, BACK_H - 6, BACK_W - 10); f(P.goldD, BACK_W - 6, 5, 1, BACK_H - 10);
  for (const [a, b] of [[6, 6], [BACK_W - 8, 6], [6, BACK_H - 8], [BACK_W - 8, BACK_H - 8]]) { f(P.goldL, a, b, 2, 2); f(P.goldD, a + 1, b + 1); }
  const cx = 28, cy = 40, R = 15;
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const d = Math.abs(x) + Math.abs(y);
    if (d <= R) f(d >= R - 1 ? P.gold : d === R - 2 ? P.k : P.mid, cx + x, cy + y);
    if (d <= R - 3 && bay(x + 40, y + 40) < (1 - d / (R - 3)) * 0.7) f(P.lav, cx + x, cy + y);
  }
  QMARK.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch === '#') { f(P.k, cx - 5 + rx * 4 + 1, cy - 9 + ry * 4 + 1, 4, 4); } }));
  QMARK.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch === '#') { f(P.gold, cx - 5 + rx * 4, cy - 9 + ry * 4, 4, 4); f(P.goldL, cx - 5 + rx * 4, cy - 9 + ry * 4, 4, 1); } }));
  baseCache = g.getImageData(0, 0, BACK_W, BACK_H);
  return baseCache;
}

// charge 0..1 heats the diamond with the hint colour; cracks glow in it with white cores.
export function drawBack(g: CanvasRenderingContext2D, t: number, charge: number, hint: string, cracks: CrackTier[]) {
  g.putImageData(base(g), 0, 0);
  // Diagonal shine band sweeping across the back.
  const band = ((t * 40) % 160) - 40;
  g.fillStyle = 'rgba(255,255,255,0.28)';
  for (let y = 2; y < BACK_H - 2; y++) { const bx = Math.round(band - y * 0.6); if (bx > 1 && bx < BACK_W - 4) g.fillRect(bx, y, 3, 1); }
  if (charge > 0.02) {
    g.fillStyle = hint;
    const cx = 28, cy = 40, R = 12;
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      const d = Math.abs(x) + Math.abs(y);
      if (d <= R && bay(x + 40, y + 40) < charge * charge * (1 - d / (R + 4)) * 1.4) g.fillRect(cx + x, cy + y, 1, 1);
    }
    // Pulsing 1px outline in the hint colour.
    if (Math.floor(t * (6 + charge * 16)) % 2 === 0) { g.fillRect(1, 0, BACK_W - 2, 1); g.fillRect(1, BACK_H - 1, BACK_W - 2, 1); g.fillRect(0, 1, 1, BACK_H - 2); g.fillRect(BACK_W - 1, 1, 1, BACK_H - 2); }
  }
  const all: [number, number][] = [];
  for (const tier of cracks) if (tier.shown) for (const p of tier.paths) { const n = Math.floor(p.length * Math.min(1, tier.prog)); for (let i = 0; i < n; i++) all.push(p[i]); }
  g.fillStyle = hint;
  for (const [x, y] of all) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
  g.fillStyle = P.white;
  for (const [x, y] of all) g.fillRect(x, y, 1, 1);
}
