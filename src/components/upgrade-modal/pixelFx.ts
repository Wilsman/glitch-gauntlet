// Low-res pixel FX for the level-up modal. Two canvases share one simulation: `back` (stars, dithered
// vignette, charge halos, light rays, shockwave rings) sits behind the cards and `front` (sparks, shattered
// tiles, confetti, lightning, suck-in pixels, motes) sits in front. Both are drawn at 1/SCALE of the
// screen and scaled up with image-rendering: pixelated, so every draw lands on a whole pixel, soft light is
// ordered (Bayer) dither rather than alpha, and nothing is rotated or blurred.

export const SCALE = 4;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
export const bay = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];
// Rarity hint ladder while a card charges: silver -> teal -> violet -> gold.
export const TIER_HINT = ['#c4ccd9', '#47d6c1', '#b86bff', '#ffcf4a'];
export const INK = '#07060f';

export function u32(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0;
}
export function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f))).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
}
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export interface Rect { x: number; y: number; w: number; h: number }
interface Spark { x: number; y: number; px: number; py: number; vx: number; vy: number; age: number; life: number; c: string; trail: string; big: boolean }
interface Tile { img: CanvasImageSource; sx: number; sy: number; sw: number; sh: number; x: number; y: number; w: number; h: number; vx: number; vy: number; age: number; life: number }
interface Confetti { x: number; y: number; vx: number; vy: number; ph: number; age: number; life: number; c: string; land: boolean }
interface Suck { x: number; y: number; px: number; py: number; v: number; tx: number; ty: number; c: string; done: boolean }
interface Bolt { pts: [number, number][]; c: string; age: number; life: number }
interface Ring { x: number; y: number; r: number; v: number; w: number; c: number; age: number; life: number }
interface Mote { x: number; y: number; vy: number; age: number; life: number; c: string }
export interface Halo { rect: Rect; color: string; strength: number }
export interface Rays { x: number; y: number; color: string; strength: number; tier: number }

export class PixelFx {
  W = 0; H = 0;
  trauma = 0;
  reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  halos: Halo[] = [];
  rays: Rays[] = [];
  warp = 0;
  private back?: CanvasRenderingContext2D;
  private front?: CanvasRenderingContext2D;
  private img?: ImageData;
  private px?: Uint32Array;
  private vignette?: Uint32Array;
  private stars: { a: number; r: number; z: number; tw: number }[] = [];
  private sparks: Spark[] = []; private tiles: Tile[] = []; private confetti: Confetti[] = []; private sucks: Suck[] = [];
  private bolts: Bolt[] = []; private rings: Ring[] = []; private motes: Mote[] = [];
  private t = 0;

  attach(back: HTMLCanvasElement, front: HTMLCanvasElement) {
    this.back = back.getContext('2d')!;
    this.front = front.getContext('2d')!;
    this.resize(back, front);
  }

  resize(back: HTMLCanvasElement, front: HTMLCanvasElement) {
    this.W = Math.ceil(window.innerWidth / SCALE); this.H = Math.ceil(window.innerHeight / SCALE);
    for (const c of [back, front]) {
      c.width = this.W; c.height = this.H;
      c.style.width = `${this.W * SCALE}px`; c.style.height = `${this.H * SCALE}px`;
    }
    this.back!.imageSmoothingEnabled = false; this.front!.imageSmoothingEnabled = false;
    this.img = this.back!.createImageData(this.W, this.H);
    this.px = new Uint32Array(this.img.data.buffer);
    // Static dithered vignette + deep-night base, copied into the back buffer every frame.
    this.vignette = new Uint32Array(this.W * this.H);
    const base = u32('#0d0b1e'), k = u32(INK), navy = u32('#1a1640');
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const vx = (x - this.W / 2) / (this.W / 2), vy = (y - this.H / 2) / (this.H / 2);
      const d = Math.sqrt(vx * vx * 0.8 + vy * vy * 0.9), b = bay(x, y);
      this.vignette[y * this.W + x] = (d - 0.55) * 1.6 > b ? k : (0.55 - d) * 0.5 > b + 0.25 ? navy : base;
    }
    const n = Math.round(Math.max(60, Math.min(260, this.W * this.H / 300)));
    this.stars = Array.from({ length: n }, () => ({ a: rnd(0, Math.PI * 2), r: rnd(4, Math.hypot(this.W, this.H) * 0.6), z: rnd(0.3, 1), tw: rnd(0, 6) }));
  }

  // Screen-space DOMRect -> logical pixel rect.
  toLogical(r: DOMRect): Rect { return { x: Math.round(r.left / SCALE), y: Math.round(r.top / SCALE), w: Math.round(r.width / SCALE), h: Math.round(r.height / SCALE) }; }
  private q(n: number) { return Math.round(n * (this.reduce ? 0.35 : 1)); }

  sparksAt(x: number, y: number, n: number, colors: string[], speed = 120, life = 1) {
    for (let i = 0; i < this.q(n); i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(speed * 0.35, speed);
      this.sparks.push({ x, y, px: x, py: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, age: 0, life: life * rnd(0.5, 1.2), c: Math.random() < 0.3 ? '#ffffff' : colors[i % colors.length], trail: colors[0], big: Math.random() < 0.25 });
    }
  }
  ring(x: number, y: number, color: string, speed = 200, width = 2, delay = 0) { this.rings.push({ x, y, r: 6, v: speed, w: width, c: u32(color), age: -delay, life: 0.8 }); }
  confettiAt(x: number, y: number, n: number, colors: string[]) {
    for (let i = 0; i < this.q(n); i++) {
      const a = -Math.PI / 2 + rnd(-1.3, 1.3), s = rnd(50, 170);
      this.confetti.push({ x: x + rnd(-8, 8), y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, ph: rnd(0, 6), age: 0, life: rnd(2.2, 3.6), c: colors[i % colors.length], land: false });
    }
  }
  suck(rect: Rect, color: string) {
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2, a = rnd(0, Math.PI * 2), d = rnd(rect.w * 0.9, rect.w * 1.8);
    this.sucks.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, px: 0, py: 0, v: rnd(20, 50), tx: cx, ty: cy, c: Math.random() < 0.35 ? '#ffffff' : color, done: false });
  }
  mote(rect: Rect, color: string) {
    const side = Math.random() < 0.5 ? -1 : 1;
    this.motes.push({ x: rect.x + rect.w / 2 + side * rnd(rect.w * 0.2, rect.w * 0.6), y: rect.y + rnd(0, rect.h), vy: -rnd(6, 16), age: 0, life: rnd(0.8, 1.6), c: Math.random() < 0.5 ? '#ffffff' : color });
  }
  // Midpoint-displaced lightning bolt off a card edge.
  bolt(rect: Rect, color: string) {
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2, a = Math.random() * Math.PI * 2;
    const sx = cx + Math.cos(a) * rect.w * 0.5, sy = cy + Math.sin(a) * rect.h * 0.5, len = rnd(12, 34), b = a + rnd(-0.5, 0.5);
    let pts: [number, number][] = [[sx, sy], [sx + Math.cos(b) * len, sy + Math.sin(b) * len]], disp = len * 0.45;
    for (let k = 0; k < 4; k++) {
      const next: [number, number][] = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, off = (Math.random() - 0.5) * disp;
        next.push([(ax + bx) / 2 - dy / L * off, (ay + by) / 2 + dx / L * off], pts[i + 1]);
      }
      pts = next; disp *= 0.55;
    }
    this.bolts.push({ pts: pts.map(([x, y]) => [Math.round(x), Math.round(y)]), c: color, age: 0, life: rnd(0.06, 0.14) });
  }
  // Break a card back into TxT (logical source) tiles that fly out and bounce; `power` (0..1) scales
  // how far and how long the debris flies so low-rarity breaks stay local to the card.
  shatter(img: HTMLCanvasElement, rect: Rect, T = 8, power = 1) {
    const sxScale = rect.w / img.width, syScale = rect.h / img.height;
    for (let ty = 0; ty < img.height; ty += T) for (let tx = 0; tx < img.width; tx += T) {
      const sw = Math.min(T, img.width - tx), sh = Math.min(T, img.height - ty);
      const cx = tx + T / 2 - img.width / 2, cy = ty + T / 2 - img.height / 2, a = Math.atan2(cy, cx) + rnd(-0.4, 0.4), s = rnd(60, 170) * (0.35 + 0.65 * power);
      this.tiles.push({ img, sx: tx, sy: ty, sw, sh, x: rect.x + tx * sxScale, y: rect.y + ty * syScale, w: Math.max(1, Math.round(sw * sxScale)), h: Math.max(1, Math.round(sh * syScale)), vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60 * power, age: 0, life: rnd(0.8, 1.5) * (0.4 + 0.6 * power) });
    }
  }
  shake(amount: number) { if (!this.reduce) this.trauma = Math.min(1, this.trauma + amount); }
  shakeOffset() {
    const tr = this.trauma * this.trauma * 10;
    return { x: Math.round((Math.sin(this.t * 37) * 0.6 + Math.sin(this.t * 61) * 0.4) * tr), y: Math.round((Math.sin(this.t * 43 + 1) * 0.6 + Math.sin(this.t * 71) * 0.4) * tr) };
  }

  step(dt: number) {
    this.t += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const floor = this.H - 6, dr = (f: number) => Math.exp(-f * dt);
    for (const p of this.sparks) { p.age += dt; p.px = p.x; p.py = p.y; p.vx *= dr(2.2); p.vy = p.vy * dr(2.2) + 200 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > floor && p.vy > 0) { p.y = floor; p.vy *= -0.45; p.vx *= 0.7; } }
    for (const p of this.tiles) { p.age += dt; p.vx *= dr(0.8); p.vy += 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y + p.h > floor && p.vy > 0) { p.y = floor - p.h; p.vy *= -0.35; p.vx *= 0.6; } }
    for (const p of this.confetti) { p.age += dt; if (p.land) continue; p.vx = p.vx * dr(3) + Math.sin(p.ph) * 20 * dt; p.vy = p.vy * dr(3) + 110 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.ph += dt * 10; if (p.y >= floor) { p.y = floor; p.land = true; p.life = p.age + rnd(0.8, 2); } }
    for (const p of this.sucks) { const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy) || 1; p.px = p.x; p.py = p.y; p.v += 400 * dt; const m = Math.min(d, p.v * dt); p.x += dx / d * m; p.y += dy / d * m; if (d < 4) p.done = true; }
    for (const p of this.motes) { p.age += dt; p.y += p.vy * dt; }
    for (const b of this.bolts) b.age += dt;
    for (const r of this.rings) { r.age += dt; if (r.age > 0) { r.r += r.v * dt; r.v *= dr(2.6); } }
    const maxR = Math.hypot(this.W, this.H) * 0.6;
    for (const s of this.stars) { s.r += (2 + this.warp * s.r * 0.35) * s.z * dt; s.tw += dt * 3; if (s.r > maxR) { s.r = rnd(3, 12); s.a = rnd(0, Math.PI * 2); } }
    this.sparks = this.sparks.filter(p => p.age < p.life); this.tiles = this.tiles.filter(p => p.age < p.life);
    this.confetti = this.confetti.filter(p => p.age < p.life); this.sucks = this.sucks.filter(p => !p.done);
    this.motes = this.motes.filter(p => p.age < p.life); this.bolts = this.bolts.filter(p => p.age < p.life); this.rings = this.rings.filter(r => r.age < r.life);
  }

  private line(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (let n = 0; n < 300; n++) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }

  render() {
    const g = this.back, f = this.front, px = this.px, W = this.W, H = this.H;
    if (!g || !f || !px || !this.img || !this.vignette) return;
    // ---- back layer (one ImageData pass) ----
    px.set(this.vignette);
    const warpKey = u32(this.halos.reduce((best, h) => h.strength > best.strength ? h : best, { color: '#a9a3c9', strength: 0 } as Halo).color);
    const cx0 = W / 2, cy0 = H / 2, starCol = [u32('#f4efe0'), u32('#a9a3c9'), u32('#6a6394')];
    for (const s of this.stars) {
      const len = Math.min(12, Math.round(this.warp * s.r * 0.05 * s.z));
      const col = this.warp > 1.2 ? warpKey : Math.sin(s.tw) > 0.6 ? starCol[0] : s.z > 0.7 ? starCol[1] : starCol[2];
      for (let k = 0; k <= Math.max(0, len); k++) {
        const x = Math.round(cx0 + Math.cos(s.a) * (s.r - k)), y = Math.round(cy0 + Math.sin(s.a) * (s.r - k));
        if (x >= 0 && y >= 0 && x < W && y < H) px[y * W + x] = col;
      }
    }
    // Rotating dithered rays behind revealed cards; strength and spoke count escalate with tier.
    for (const r of this.rays) {
      if (r.strength < 0.02) continue;
      const light = u32(r.color), dark = u32(shade(r.color, 0.5)), spokes = 8 + r.tier * 2, sector = Math.PI * 2 / spokes, width = 0.16 + r.tier * 0.02;
      const R = 70 + r.tier * 18, spin = this.t * (0.25 + r.tier * 0.12);
      for (let y = Math.max(0, Math.floor(r.y - R)); y < Math.min(H, r.y + R); y++) for (let x = Math.max(0, Math.floor(r.x - R)); x < Math.min(W, r.x + R); x++) {
        const dx = x - r.x, dy = y - r.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > R) continue;
        const a = ((Math.atan2(dy, dx) + spin) % sector + sector) % sector;
        if (a > sector * width) continue;
        const iv = r.strength * (1 - d / R) * 1.2, b = bay(x, y);
        if (iv > b) px[y * W + x] = iv > b + 0.45 ? light : dark;
      }
    }
    // Charge halos: a dithered glow that tightens around the card as it charges.
    for (const h of this.halos) {
      if (h.strength < 0.02) continue;
      const light = u32(h.color), dark = u32(shade(h.color, 0.45)), reach = 6 + 18 * h.strength, { x: rx, y: ry, w: rw, h: rh } = h.rect;
      for (let y = Math.max(0, Math.floor(ry - reach)); y < Math.min(H, ry + rh + reach); y++) for (let x = Math.max(0, Math.floor(rx - reach)); x < Math.min(W, rx + rw + reach); x++) {
        const dx = Math.max(rx - x, 0, x - (rx + rw)), dy = Math.max(ry - y, 0, y - (ry + rh)), d = Math.sqrt(dx * dx + dy * dy);
        if (d <= 0 || d > reach) continue;
        const iv = h.strength * h.strength * 1.3 * (1 - d / reach), b = bay(x, y);
        if (iv > b) px[y * W + x] = iv > b + 0.4 ? light : dark;
      }
    }
    for (const r of this.rings) {
      if (r.age <= 0) continue;
      const w = Math.max(1, Math.round(r.w * (1 - r.age / r.life)));
      const steps = Math.ceil(r.r * 7);
      for (let i = 0; i < steps; i++) {
        const a = i / steps * Math.PI * 2;
        for (let k = 0; k < w; k++) {
          const x = Math.round(r.x + Math.cos(a) * (r.r + k)), y = Math.round(r.y + Math.sin(a) * (r.r + k));
          if (x >= 0 && y >= 0 && x < W && y < H) px[y * W + x] = r.c;
        }
      }
    }
    g.putImageData(this.img, 0, 0);
    // ---- front layer ----
    f.clearRect(0, 0, W, H);
    for (const p of this.sucks) { f.fillStyle = p.c; this.line(f, p.px || p.x, p.py || p.y, p.x, p.y); }
    for (const p of this.tiles) { const t = p.age / p.life; if (t > 0.65 && Math.floor(p.age * 30) & 1) continue; f.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, Math.round(p.x), Math.round(p.y), p.w, p.h); }
    for (const b of this.bolts) {
      if (Math.random() < 0.25) continue;
      f.fillStyle = b.c;
      for (let i = 0; i < b.pts.length - 1; i++) { const [x0, y0] = b.pts[i], [x1, y1] = b.pts[i + 1]; this.line(f, x0 + 1, y0, x1 + 1, y1); this.line(f, x0, y0 + 1, x1, y1 + 1); }
      f.fillStyle = '#ffffff';
      for (let i = 0; i < b.pts.length - 1; i++) { const [x0, y0] = b.pts[i], [x1, y1] = b.pts[i + 1]; this.line(f, x0, y0, x1, y1); }
    }
    for (const p of this.sparks) {
      const t = p.age / p.life, s = p.big && t < 0.5 ? 2 : 1;
      f.fillStyle = t > 0.6 && Math.floor(p.age * 24) & 1 ? p.trail : p.c;
      f.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      if (t < 0.4) { f.fillStyle = shade(p.trail, 0.6); f.fillRect(Math.round(p.px), Math.round(p.py), 1, 1); }
    }
    for (const p of this.confetti) {
      const t = p.age / p.life;
      if (t > 0.8 && Math.floor(p.age * 20) & 1) continue;
      const hor = p.land || Math.sin(p.ph) > 0;
      f.fillStyle = p.c; f.fillRect(Math.round(p.x), Math.round(p.y) - (hor ? 0 : 1), hor ? 2 : 1, hor ? 1 : 2);
    }
    for (const p of this.motes) {
      const t = p.age / p.life, x = Math.round(p.x), y = Math.round(p.y);
      f.fillStyle = '#ffffff'; f.fillRect(x, y, 1, 1);
      if (t > 0.3 && t < 0.7) { f.fillStyle = p.c; f.fillRect(x - 1, y, 1, 1); f.fillRect(x + 1, y, 1, 1); f.fillRect(x, y - 1, 1, 1); f.fillRect(x, y + 1, 1, 1); }
    }
  }
}
