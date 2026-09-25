import type { ExplorationState, WorldProp, WorldWall } from '@shared/exploration';
import { BIOMES, LANDMARKS, regionAt } from './explorationWorld';
import { rng, REGION_H, REGION_W, YARD_INDEX } from './worldGen';

export const CHUNK = 1024;

// Glowing conduits drawn into the yard floor (world coords); the renderer animates pulses along them.
export const CONDUITS: { points: number[]; color: string }[] = [
  { points: [300, 3600, 550, 3900, 550, 4180, 1500, 4180, 1850, 3980, 2450, 3980, 2670, 3990], color: '#22d3ee' },
  { points: [400, 3600, 120, 3600, 120, 2690, 1340, 2690, 1340, 2950, 1800, 3350, 2450, 3350], color: '#e879f9' },
  { points: [2450, 3350, 2660, 3170, 3100, 3170, 3100, 4500, 2300, 4500], color: '#f43f5e' },
  { points: [1260, 3880, 1260, 3500, 1850, 3500, 1850, 3900], color: '#f59e0b' },
];

const WALL_ACCENTS: Record<string, string> = {
  'north-rack': '#22d3ee', 'pocket-west': '#e879f9', 'pocket-south': '#e879f9', 'pocket-tail': '#e879f9',
  'west-machine': '#a3e635', 'central-bank': '#f59e0b', 'court-cover': '#f59e0b', 'east-bank': '#f43f5e',
  'south-bank': '#a3e635', 'signal-cover': '#f43f5e',
};

const px = (v: number) => Math.round(v / 4) * 4; // quantise to the 4px pixel grid

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function polyline(ctx: CanvasRenderingContext2D, points: number[]) {
  ctx.beginPath(); ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
}

function hexAlpha(hex: string, alpha: number) {
  return hex + Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
}

// ---- Per-biome pixel-brick wall painters ----
interface WallPalette { base: string; mortar: string; light: string; accent: string; windows?: string }
const WALL_PAINTERS: Record<string, WallPalette> = {
  frost: { base: '#8fb8d8', mortar: '#3d6a94', light: '#dceefc', accent: '#7dd3fc' },
  foundry: { base: '#2b2226', mortar: '#0f0a0b', light: '#4a3a3c', accent: '#fb923c' },
  bloom: { base: '#1d4210', mortar: '#0c2306', light: '#3f7a1f', accent: '#a3e635' },
  marsh: { base: '#155048', mortar: '#072723', light: '#2a7a6e', accent: '#2dd4bf' },
  void: { base: '#33165e', mortar: '#150831', light: '#5b2ea6', accent: '#c084fc' },
  arcade: { base: '#3d1040', mortar: '#180722', light: '#6d2072', accent: '#f472b6', windows: '#f9a8d4' },
  border: { base: '#1b2436', mortar: '#0a0f1c', light: '#2e3d5c', accent: '#38bdf8' },
  secret: { base: '#241a2e', mortar: '#0d0714', light: '#43304f', accent: '#facc15' },
};

function pixelBricks(ctx: CanvasRenderingContext2D, wall: WorldWall, palette: WallPalette, random: () => number) {
  const { x, y, width: w, height: h } = wall;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(px(x + 8), px(y + 12), px(w), px(h));
  ctx.fillStyle = palette.base; ctx.fillRect(px(x), px(y), px(w), px(h));
  ctx.fillStyle = palette.light; ctx.fillRect(px(x), px(y), px(w), 8);
  ctx.fillStyle = palette.mortar;
  for (let by = y + 20; by < y + h - 8; by += 24) ctx.fillRect(px(x), px(by), px(w), 4);
  for (let by = y; by < y + h; by += 24) {
    const off = (Math.floor(by / 24) % 2) * 20;
    for (let bx = x + off + 36; bx < x + w - 8; bx += 40) ctx.fillRect(px(bx), px(by), 4, 24);
  }
  if (palette.windows) {
    for (let wy = y + 20; wy < y + h - 24; wy += 40) for (let wx = x + 16; wx < x + w - 24; wx += 36) {
      ctx.fillStyle = random() < 0.55 ? palette.windows : palette.mortar;
      ctx.fillRect(px(wx), px(wy), 12, 16);
    }
  } else {
    for (let i = 0; i < Math.floor((w + h) / 90); i++) {
      const lit = random();
      ctx.fillStyle = lit > 0.7 ? palette.accent : lit > 0.4 ? palette.light : palette.mortar;
      ctx.fillRect(px(x + 12 + random() * (w - 28)), px(y + 12 + random() * (h - 28)), 8, 8);
    }
  }
  ctx.fillStyle = palette.accent; ctx.fillRect(px(x + 4), px(y + h - 8), px(w - 8), 4);
  ctx.strokeStyle = palette.mortar; ctx.lineWidth = 4; ctx.strokeRect(px(x) + 2, px(y) + 2, px(w) - 4, px(h) - 4);
}

// Secret-room walls look like ordinary dark masonry with faint pixel cracks.
function crackedWall(ctx: CanvasRenderingContext2D, wall: WorldWall, random: () => number) {
  pixelBricks(ctx, wall, WALL_PAINTERS.secret, random);
  const { x, y, width: w, height: h } = wall;
  ctx.strokeStyle = 'rgba(250,204,21,0.4)'; ctx.lineWidth = 3;
  const cracks = 3 + Math.floor(random() * 3);
  for (let i = 0; i < cracks; i++) {
    let cx = px(x + 10 + random() * (w - 20)), cy = px(y + 8 + random() * (h - 16));
    ctx.beginPath(); ctx.moveTo(cx, cy);
    for (let s = 0; s < 4; s++) { cx += (random() - 0.5) * 48; cy += random() * 22; ctx.lineTo(px(cx), px(cy)); }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(253,224,71,0.85)';
  for (let i = 0; i < 3; i++) ctx.fillRect(px(x + 12 + random() * (w - 24)), px(y + 8 + random() * (h - 16)), 4, 4);
}

function pixelBlob(ctx: CanvasRenderingContext2D, wall: WorldWall, palette: WallPalette, random: () => number) {
  const cx = wall.x + wall.width / 2, cy = wall.y + wall.height / 2, r = wall.width / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.arc(px(cx + 8), px(cy + 12), r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = palette.base;
  ctx.beginPath(); ctx.arc(px(cx), px(cy), r, 0, Math.PI * 2); ctx.fill();
  // Pixel-stepped rim and facet speckles keep the circles inside the pixel-art look.
  ctx.fillStyle = palette.light;
  ctx.beginPath(); ctx.arc(px(cx), px(cy), r * 0.72, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = palette.base;
  ctx.beginPath(); ctx.arc(px(cx), px(cy), r * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = palette.mortar; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(px(cx), px(cy), r - 2, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const a = random() * Math.PI * 2, d = random() * r * 0.7;
    ctx.fillStyle = random() < 0.5 ? palette.accent : palette.light;
    ctx.fillRect(px(cx + Math.cos(a) * d), px(cy + Math.sin(a) * d), 8, 8);
  }
}

function yardWall(ctx: CanvasRenderingContext2D, wall: WorldWall, random: () => number) {
  const accent = WALL_ACCENTS[wall.id] || '#5eead4';
  const { x, y, width: w, height: h } = wall;
  const face = Math.min(22, h * 0.3);
  ctx.fillStyle = '#060a12'; roundRect(ctx, x, y, w, h, 6); ctx.fill();
  const front = ctx.createLinearGradient(0, y + h - face, 0, y + h);
  front.addColorStop(0, '#0e1726'); front.addColorStop(1, '#070b14');
  ctx.fillStyle = front; ctx.fillRect(x, y + h - face, w, face);
  for (let vx = x + 10; vx < x + w - 10; vx += 14) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(vx, y + h - face + 5, 6, face - 10); }
  ctx.fillStyle = hexAlpha(accent, 0.9); ctx.fillRect(x + 6, y + h - 4, w - 12, 2);
  const top = ctx.createLinearGradient(x, y, x, y + h - face);
  top.addColorStop(0, '#24344d'); top.addColorStop(1, '#141f31');
  ctx.fillStyle = top; roundRect(ctx, x, y, w, h - face, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
  for (let sx = x + 60; sx < x + w - 20; sx += 60) { ctx.beginPath(); ctx.moveTo(sx, y + 4); ctx.lineTo(sx, y + h - face - 4); ctx.stroke(); }
  for (let sy = y + 60; sy < y + h - face - 20; sy += 60) { ctx.beginPath(); ctx.moveTo(x + 4, sy); ctx.lineTo(x + w - 4, sy); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x + 4, y + 3, w - 8, 3);
  if (w > 150 || h > 250) {
    const horizontal = w >= h;
    for (let i = 0; i < (horizontal ? Math.floor((w - 40) / 26) : Math.floor((h - face - 40) / 26)); i++) {
      for (let j = 0; j < 3; j++) {
        const lx = horizontal ? x + 26 + i * 26 : x + w / 2 - 20 + j * 20;
        const ly = horizontal ? y + (h - face) / 2 - 16 + j * 16 : y + 26 + i * 26;
        const on = random();
        ctx.fillStyle = on > 0.8 ? '#f43f5e' : on > 0.45 ? accent : 'rgba(148,163,184,0.25)';
        ctx.fillRect(lx, ly, 8, 4);
      }
    }
  }
  ctx.strokeStyle = hexAlpha(accent, 0.8); ctx.lineWidth = 2;
  roundRect(ctx, x + 1, y + 1, w - 2, h - face - 2, 6); ctx.stroke();
  ctx.fillStyle = 'rgba(203,213,225,0.35)';
  for (const [rx, ry] of [[x + 8, y + 8], [x + w - 12, y + 8], [x + 8, y + h - face - 12], [x + w - 12, y + h - face - 12]]) ctx.fillRect(rx, ry, 4, 4);
}

function drawYardFloorAndProps(ctx: CanvasRenderingContext2D, world: ExplorationState, random: () => number) {
  // Landmarks, conduits and scattered props live only inside the authored yard.
  for (const area of LANDMARKS) {
    const gradient = ctx.createLinearGradient(area.x, area.y, area.x + area.width, area.y + area.height);
    gradient.addColorStop(0, hexAlpha(area.neon, 0.07)); gradient.addColorStop(0.5, 'rgba(8,12,24,0.85)'); gradient.addColorStop(1, hexAlpha(area.neon, 0.06));
    roundRect(ctx, area.x, area.y, area.width, area.height, 28);
    ctx.fillStyle = '#0a101d'; ctx.fill();
    ctx.fillStyle = gradient; ctx.fill();
    ctx.save(); roundRect(ctx, area.x, area.y, area.width, area.height, 28); ctx.clip();
    for (let tx = area.x + 6; tx < area.x + area.width; tx += 40) {
      for (let ty = area.y + 6; ty < area.y + area.height; ty += 40) {
        const lit = random();
        ctx.fillStyle = hexAlpha(area.neon, lit > 0.97 ? 0.22 : lit > 0.85 ? 0.08 : 0.035);
        ctx.fillRect(tx, ty, 34, 34);
      }
    }
    for (let i = 0; i < 5; i++) {
      const gx = area.x + 60 + random() * (area.width - 120), gy = area.y + 70 + random() * (area.height - 120), gr = 30 + random() * 50;
      const goo = ctx.createRadialGradient(gx, gy, 2, gx, gy, gr);
      goo.addColorStop(0, hexAlpha(area.neon, 0.16)); goo.addColorStop(1, hexAlpha(area.neon, 0));
      ctx.fillStyle = goo; ctx.beginPath(); ctx.ellipse(gx, gy, gr * 1.4, gr, random() * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(250,204,21,0.5)'; ctx.lineWidth = 10;
    for (let s = area.x - area.height; s < area.x + area.width; s += 28) { ctx.beginPath(); ctx.moveTo(s, area.y + area.height); ctx.lineTo(s + 14, area.y + area.height - 14); ctx.stroke(); }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = hexAlpha(area.neon, 0.85); ctx.lineWidth = 3;
    roundRect(ctx, area.x, area.y, area.width, area.height, 28); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    roundRect(ctx, area.x + 6, area.y + 6, area.width - 12, area.height - 12, 22); ctx.stroke();
    ctx.strokeStyle = area.neon; ctx.lineWidth = 6; ctx.lineCap = 'square';
    const b = 34;
    for (const [cx, cy, dx, dy] of [[area.x, area.y, 1, 1], [area.x + area.width, area.y, -1, 1], [area.x, area.y + area.height, 1, -1], [area.x + area.width, area.y + area.height, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(cx + dx * 4, cy + dy * (b + 4)); ctx.lineTo(cx + dx * 4, cy + dy * 4); ctx.lineTo(cx + dx * (b + 4), cy + dy * 4); ctx.stroke();
    }
    ctx.font = '22px "Press Start 2P", monospace'; ctx.textBaseline = 'top';
    ctx.fillStyle = area.neon; ctx.fillText(area.name, area.x + 32, area.y + 30);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(area.name, area.x + 32, area.y + 30);
    ctx.font = '10px "Press Start 2P", monospace'; ctx.fillStyle = hexAlpha(area.neon, 0.6);
    ctx.fillText(`SECTOR 0${LANDMARKS.indexOf(area) + 1} // ${area.neon.toUpperCase()}`, area.x + 34, area.y + 62);
    ctx.restore();
  }
  for (const conduit of CONDUITS) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    polyline(ctx, conduit.points); ctx.strokeStyle = 'rgba(2,6,14,0.9)'; ctx.lineWidth = 16; ctx.stroke();
    polyline(ctx, conduit.points); ctx.strokeStyle = hexAlpha(conduit.color, 0.45); ctx.lineWidth = 6; ctx.stroke();
    polyline(ctx, conduit.points); ctx.strokeStyle = hexAlpha(conduit.color, 0.9); ctx.lineWidth = 1.5; ctx.stroke();
    for (let i = 0; i < conduit.points.length; i += 2) {
      ctx.beginPath(); ctx.arc(conduit.points[i], conduit.points[i + 1], 9, 0, Math.PI * 2); ctx.fillStyle = '#050a14'; ctx.fill();
      ctx.strokeStyle = conduit.color; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
  }
  const yr = world.biomes[YARD_INDEX];
  if (!yr || yr.biome !== 'yard') return;
  for (let i = 0; i < 90; i++) {
    const x = yr.x + 60 + random() * (yr.width - 120), y = yr.y + 260 + random() * (yr.height - 520);
    const kind = random();
    ctx.save(); ctx.translate(x, y);
    if (kind < 0.35) {
      ctx.fillStyle = 'rgba(2,6,14,0.8)'; ctx.fillRect(-22, -14, 44, 28);
      ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(-22, -14, 44, 28);
      ctx.fillStyle = 'rgba(148,163,184,0.25)'; for (let s = -16; s < 18; s += 7) ctx.fillRect(s, -10, 3, 20);
    } else if (kind < 0.6) {
      ctx.rotate(random() * Math.PI);
      ctx.fillStyle = '#0d1522'; ctx.fillRect(-14, -14, 28, 28);
      ctx.fillStyle = '#16233a'; ctx.fillRect(-14, -14, 28, 8);
      ctx.strokeStyle = 'rgba(94,234,212,0.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(-14, -14, 28, 28);
    } else if (kind < 0.8) {
      ctx.strokeStyle = 'rgba(15,23,42,0.95)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-60, 0); ctx.bezierCurveTo(-20, 40 * (random() - 0.5), 20, 60 * (random() - 0.5), 60, 0); ctx.stroke();
      ctx.strokeStyle = random() < 0.5 ? 'rgba(244,63,94,0.5)' : 'rgba(34,211,238,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      for (let p = 0; p < 6; p++) {
        ctx.fillStyle = ['rgba(232,121,249,0.55)', 'rgba(34,211,238,0.55)', 'rgba(255,255,255,0.4)'][p % 3];
        ctx.fillRect(Math.floor((random() - 0.5) * 50 / 4) * 4, Math.floor((random() - 0.5) * 30 / 4) * 4, 4 + Math.floor(random() * 3) * 4, 4);
      }
    }
    ctx.restore();
  }
}

// ---- Per-biome floor patterns: bright enough that every camera shows texture ----
function drawFloorPattern(ctx: CanvasRenderingContext2D, biomeId: string, ix: number, iy: number, iw: number, ih: number, random: () => number) {
  if (biomeId === 'frost') {
    // Icy tiles with pale grout.
    ctx.strokeStyle = 'rgba(219,238,252,0.10)'; ctx.lineWidth = 2;
    for (let x = Math.ceil(ix / 64) * 64; x < ix + iw; x += 64) { ctx.beginPath(); ctx.moveTo(x, iy); ctx.lineTo(x, iy + ih); ctx.stroke(); }
    for (let y = Math.ceil(iy / 64) * 64; y < iy + ih; y += 64) { ctx.beginPath(); ctx.moveTo(ix, y); ctx.lineTo(ix + iw, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(224,242,254,0.05)';
    for (let x = Math.ceil(ix / 128) * 128; x < ix + iw; x += 128) for (let y = Math.ceil(iy / 128) * 128; y < iy + ih; y += 128) ctx.fillRect(x, y, 64, 64);
    for (let i = 0; i < Math.floor(iw * ih / 30000); i++) {
      const sx = px(ix + random() * iw), sy = px(iy + random() * ih);
      ctx.fillStyle = 'rgba(226,240,252,0.16)';
      ctx.fillRect(sx, sy, 28 + px(random() * 40), 8 + px(random() * 16));
    }
  } else if (biomeId === 'foundry') {
    // Iron plates with glowing seams and rivets.
    ctx.strokeStyle = 'rgba(8,5,4,0.7)'; ctx.lineWidth = 3;
    for (let x = Math.ceil(ix / 80) * 80; x < ix + iw; x += 80) { ctx.beginPath(); ctx.moveTo(x, iy); ctx.lineTo(x, iy + ih); ctx.stroke(); }
    for (let y = Math.ceil(iy / 80) * 80; y < iy + ih; y += 80) { ctx.beginPath(); ctx.moveTo(ix, y); ctx.lineTo(ix + iw, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(251,146,60,0.16)'; ctx.lineWidth = 1;
    for (let x = Math.ceil(ix / 80) * 80 + 40; x < ix + iw; x += 80) { ctx.beginPath(); ctx.moveTo(x, iy); ctx.lineTo(x, iy + ih); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for (let x = Math.ceil(ix / 80) * 80 + 8; x < ix + iw; x += 80) for (let y = Math.ceil(iy / 80) * 80 + 8; y < iy + ih; y += 80) ctx.fillRect(x, y, 4, 4);
    for (let i = 0; i < Math.floor(iw * ih / 60000); i++) {
      const ex = ix + random() * iw, ey = iy + random() * ih;
      ctx.strokeStyle = 'rgba(251,146,60,0.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + (random() - 0.5) * 60, ey + random() * 30); ctx.stroke();
    }
  } else if (biomeId === 'bloom') {
    // Mossy ground: dense dithered clusters + tiny glowing flowers.
    for (let i = 0; i < Math.floor(iw * ih / 4000); i++) {
      ctx.fillStyle = `rgba(74,124,30,${0.10 + random() * 0.16})`;
      ctx.fillRect(px(ix + random() * iw), px(iy + random() * ih), 8 + px(random() * 20), 8 + px(random() * 12));
    }
    for (let i = 0; i < Math.floor(iw * ih / 45000); i++) {
      const fx = px(ix + random() * iw), fy = px(iy + random() * ih);
      ctx.fillStyle = random() < 0.5 ? 'rgba(190,242,100,0.7)' : 'rgba(244,114,182,0.7)';
      ctx.fillRect(fx, fy, 4, 4); ctx.fillRect(fx - 4, fy + 4, 4, 4); ctx.fillRect(fx + 4, fy + 4, 4, 4);
    }
  } else if (biomeId === 'marsh') {
    // Murky pools and ripple arcs.
    for (let i = 0; i < Math.floor(iw * ih / 40000); i++) {
      const mx = ix + random() * iw, my = iy + random() * ih, mr = 30 + random() * 60;
      ctx.fillStyle = 'rgba(6,40,36,0.55)';
      ctx.beginPath(); ctx.ellipse(mx, my, mr * 1.5, mr, random() * Math.PI, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(45,212,191,0.18)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(mx, my, mr * 1.1, mr * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(94,234,212,0.10)'; ctx.lineWidth = 2;
    for (let i = 0; i < Math.floor(iw * ih / 55000); i++) {
      const rx = ix + random() * iw, ry = iy + random() * ih, rr = 16 + random() * 40;
      ctx.beginPath(); ctx.arc(rx, ry, rr, random() * Math.PI, Math.PI * 0.8); ctx.stroke();
    }
  } else if (biomeId === 'void') {
    // Starfield with faint distorted grid.
    for (let i = 0; i < Math.floor(iw * ih / 5500); i++) {
      const b = random();
      ctx.fillStyle = b > 0.9 ? 'rgba(216,180,254,0.8)' : `rgba(255,255,255,${0.15 + random() * 0.4})`;
      ctx.fillRect(px(ix + random() * iw), px(iy + random() * ih), b > 0.9 ? 4 : 2, b > 0.9 ? 4 : 2);
    }
    ctx.strokeStyle = 'rgba(192,132,252,0.07)'; ctx.lineWidth = 1;
    for (let x = Math.ceil(ix / 160) * 160; x < ix + iw; x += 160) { ctx.beginPath(); ctx.moveTo(x, iy); ctx.lineTo(x + Math.sin(x * 0.01) * 24, iy + ih); ctx.stroke(); }
    for (let i = 0; i < Math.floor(iw * ih / 90000); i++) {
      const rx = ix + random() * iw, ry = iy + random() * ih;
      ctx.strokeStyle = 'rgba(192,132,252,0.3)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + (random() - 0.5) * 90, ry + (random() - 0.5) * 40); ctx.stroke();
    }
  } else if (biomeId === 'arcade') {
    // Asphalt with neon lane reflections.
    ctx.strokeStyle = 'rgba(244,114,182,0.10)'; ctx.lineWidth = 2;
    for (let x = Math.ceil(ix / 128) * 128; x < ix + iw; x += 128) { ctx.beginPath(); ctx.moveTo(x, iy); ctx.lineTo(x, iy + ih); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(34,211,238,0.08)';
    for (let y = Math.ceil(iy / 128) * 128; y < iy + ih; y += 128) { ctx.beginPath(); ctx.moveTo(ix, y); ctx.lineTo(ix + iw, y); ctx.stroke(); }
    for (let i = 0; i < Math.floor(iw * ih / 70000); i++) {
      const gx = ix + random() * iw, gy = iy + random() * ih;
      const glow = ctx.createRadialGradient(gx, gy, 2, gx, gy, 60);
      glow.addColorStop(0, random() < 0.5 ? 'rgba(244,114,182,0.14)' : 'rgba(34,211,238,0.14)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(gx, gy, 60, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // Yard / default: subtle circuit grid.
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(56,189,248,0.05)';
    for (let x = Math.ceil(ix / 100) * 100; x < ix + iw; x += 100) { ctx.beginPath(); ctx.moveTo(x + 0.5, iy); ctx.lineTo(x + 0.5, iy + ih); ctx.stroke(); }
    for (let y = Math.ceil(iy / 100) * 100; y < iy + ih; y += 100) { ctx.beginPath(); ctx.moveTo(ix, y + 0.5); ctx.lineTo(ix + iw, y + 0.5); ctx.stroke(); }
  }
}

function drawFloor(ctx: CanvasRenderingContext2D, world: ExplorationState, chunk: { x: number; y: number; w: number; h: number }, random: () => number) {
  for (const region of world.biomes) {
    const ix = Math.max(chunk.x, region.x), iy = Math.max(chunk.y, region.y);
    const iw = Math.min(chunk.x + chunk.w, region.x + region.width) - ix, ih = Math.min(chunk.y + chunk.h, region.y + region.height) - iy;
    if (iw <= 0 || ih <= 0) continue;
    const biome = BIOMES[region.biome];
    const gradient = ctx.createLinearGradient(ix, iy, ix + iw, iy + ih);
    gradient.addColorStop(0, biome.floorA); gradient.addColorStop(1, biome.floorB);
    ctx.fillStyle = gradient; ctx.fillRect(ix, iy, iw, ih);
    drawFloorPattern(ctx, region.biome, ix, iy, iw, ih, random);
    // Dithered pixel speckles.
    const count = Math.floor(iw * ih / 6000);
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = hexAlpha(biome.speckle, 0.05 + random() * 0.12);
      const s = random() < 0.85 ? 4 : 8;
      ctx.fillRect(px(ix + random() * iw), px(iy + random() * ih), s, s);
    }
    if (region.biome === 'yard') drawYardFloorAndProps(ctx, world, random);
  }
}

// ---- Non-colliding decor props, baked per chunk ----
function drawProp(ctx: CanvasRenderingContext2D, prop: WorldProp, random: () => number) {
  const { x, y, kind } = prop;
  ctx.save(); ctx.translate(px(x), px(y));
  switch (kind) {
    case 'snowdrift':
      ctx.fillStyle = 'rgba(226,240,252,0.5)';
      for (let i = 0; i < 5; i++) ctx.fillRect(px((random() - 0.5) * 56), px((random() - 0.5) * 24), 16 + px(random() * 24), 8 + px(random() * 8));
      break;
    case 'icecrystal':
      for (let i = 0; i < 3; i++) {
        const bx = (i - 1) * 14, hgt = 18 + random() * 22;
        ctx.fillStyle = i === 1 ? 'rgba(186,230,253,0.9)' : 'rgba(125,211,252,0.7)';
        ctx.beginPath(); ctx.moveTo(bx - 6, 0); ctx.lineTo(bx, -hgt); ctx.lineTo(bx + 6, 0); ctx.closePath(); ctx.fill();
      }
      break;
    case 'cabletray':
      ctx.fillStyle = '#16233a'; ctx.fillRect(-50, -6, 100, 12);
      ctx.strokeStyle = 'rgba(125,211,252,0.4)'; ctx.lineWidth = 2;
      for (const oy of [-2, 2]) { ctx.beginPath(); ctx.moveTo(-48, oy); ctx.lineTo(48, oy); ctx.stroke(); }
      break;
    case 'frostcrate':
      ctx.fillStyle = '#1c3049'; ctx.fillRect(-18, -18, 36, 36);
      ctx.fillStyle = '#2c4a6e'; ctx.fillRect(-18, -18, 36, 10);
      ctx.strokeStyle = 'rgba(186,230,253,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(-18, -18, 36, 36);
      ctx.fillStyle = 'rgba(224,242,254,0.4)'; ctx.fillRect(-14, -22, 20, 4);
      break;
    case 'conveyor':
      ctx.fillStyle = '#1a1210'; ctx.fillRect(-70, -12, 140, 24);
      ctx.fillStyle = '#f59e0b';
      for (let i = -60; i < 60; i += 20) { ctx.beginPath(); ctx.moveTo(i, -8); ctx.lineTo(i + 8, 0); ctx.lineTo(i, 8); ctx.closePath(); ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1; }
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3; ctx.strokeRect(-70, -12, 140, 24);
      break;
    case 'pipe': {
      ctx.rotate(random() < 0.5 ? Math.PI / 2 : 0);
      ctx.fillStyle = '#3a2a24'; ctx.fillRect(-60, -8, 120, 16);
      ctx.fillStyle = '#5b423a'; ctx.fillRect(-60, -8, 120, 5);
      ctx.fillStyle = '#241a16'; ctx.fillRect(-14, -11, 8, 22); ctx.fillRect(20, -11, 8, 22);
      break;
    }
    case 'anvil':
      ctx.fillStyle = '#0f0a0b'; ctx.fillRect(-20, -10, 40, 12);
      ctx.fillStyle = '#3d3235'; ctx.fillRect(-24, -18, 48, 10);
      ctx.fillStyle = '#2b2226'; ctx.fillRect(-8, 2, 16, 12);
      break;
    case 'slag':
      ctx.fillStyle = '#241a16';
      for (let i = 0; i < 6; i++) ctx.fillRect(px((random() - 0.5) * 60), px((random() - 0.5) * 30), 12 + px(random() * 20), 10 + px(random() * 10));
      ctx.fillStyle = 'rgba(251,146,60,0.8)';
      for (let i = 0; i < 3; i++) ctx.fillRect(px((random() - 0.5) * 44), px((random() - 0.5) * 20), 6, 4);
      break;
    case 'embercrack':
      ctx.strokeStyle = 'rgba(251,146,60,0.75)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-34, 0);
      for (let i = 0; i < 4; i++) ctx.lineTo(-34 + i * 20 + random() * 8, (random() - 0.5) * 16);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(254,215,170,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      break;
    case 'mushroom': {
      const c = random() < 0.5 ? '#a3e635' : '#22d3ee';
      ctx.fillStyle = '#0c2306'; ctx.fillRect(-4, -6, 8, 14);
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(0, -8, 12 + random() * 6, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-4, -14, 4, 4); ctx.fillRect(4, -11, 4, 4);
      break;
    }
    case 'vine':
      ctx.strokeStyle = 'rgba(63,122,31,0.9)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-50, 0);
      ctx.bezierCurveTo(-20, 30 * (random() - 0.5), 20, 40 * (random() - 0.5), 50, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(163,230,53,0.5)'; ctx.lineWidth = 2; ctx.stroke();
      break;
    case 'flowerbed':
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = ['rgba(190,242,100,0.85)', 'rgba(244,114,182,0.85)', 'rgba(34,211,238,0.7)'][i % 3];
        ctx.fillRect(px((random() - 0.5) * 56), px((random() - 0.5) * 30), 6, 6);
      }
      break;
    case 'fern':
      ctx.strokeStyle = 'rgba(74,124,30,0.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.4;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * (18 + random() * 14), Math.sin(a) * (18 + random() * 14)); ctx.stroke();
      }
      break;
    case 'reeds':
      ctx.strokeStyle = 'rgba(45,212,191,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const rx = (i - 3) * 7;
        ctx.beginPath(); ctx.moveTo(rx, 0); ctx.quadraticCurveTo(rx + 4, -18 - random() * 14, rx + (random() - 0.5) * 10, -30 - random() * 14); ctx.stroke();
      }
      break;
    case 'lily':
      ctx.fillStyle = 'rgba(6,40,36,0.7)'; ctx.beginPath(); ctx.ellipse(0, 0, 40, 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(74,222,128,0.7)'; ctx.beginPath(); ctx.arc(0, 0, 14, 0.4, Math.PI * 2 - 0.4); ctx.fill();
      ctx.fillStyle = 'rgba(240,171,252,0.9)'; ctx.fillRect(-3, -3, 6, 6);
      break;
    case 'wrecksm':
      ctx.rotate((random() - 0.5) * 0.6);
      ctx.fillStyle = '#1c2b28'; ctx.fillRect(-30, -12, 60, 24);
      ctx.fillStyle = '#2a423d'; ctx.fillRect(-30, -12, 60, 8);
      ctx.fillStyle = 'rgba(45,212,191,0.4)'; ctx.fillRect(-22, -4, 12, 8); ctx.fillRect(6, -4, 14, 8);
      break;
    case 'puddle':
      ctx.fillStyle = 'rgba(13,80,72,0.5)'; ctx.beginPath(); ctx.ellipse(0, 0, 30 + random() * 30, 14 + random() * 12, random(), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(94,234,212,0.25)'; ctx.lineWidth = 2; ctx.stroke();
      break;
    case 'stardust':
      for (let i = 0; i < 8; i++) {
        const b = random();
        ctx.fillStyle = b > 0.8 ? 'rgba(216,180,254,0.9)' : `rgba(255,255,255,${0.3 + b * 0.5})`;
        ctx.fillRect(px((random() - 0.5) * 80), px((random() - 0.5) * 50), b > 0.8 ? 5 : 3, b > 0.8 ? 5 : 3);
      }
      break;
    case 'rift':
      ctx.strokeStyle = 'rgba(192,132,252,0.6)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-44, 0);
      for (let i = 0; i < 4; i++) ctx.lineTo(-44 + i * 26 + random() * 8, (random() - 0.5) * 26);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(233,213,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      break;
    case 'shardfrag':
      ctx.fillStyle = 'rgba(91,46,166,0.8)';
      ctx.beginPath(); ctx.moveTo(-8, 6); ctx.lineTo(0, -16 - random() * 10); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(216,180,254,0.9)'; ctx.fillRect(-2, -12, 4, 8);
      break;
    case 'lane':
      ctx.fillStyle = 'rgba(244,114,182,0.5)';
      for (let i = -3; i <= 3; i++) ctx.fillRect(i * 22 - 7, -3, 14, 6);
      break;
    case 'crosswalk':
      ctx.fillStyle = 'rgba(226,232,240,0.35)';
      for (let i = 0; i < 5; i++) ctx.fillRect(-40 + i * 18, -20, 10, 40);
      break;
    case 'sign': {
      const c = random() < 0.5 ? '#f472b6' : '#22d3ee';
      ctx.fillStyle = '#0c0714'; ctx.fillRect(-26, -34, 52, 22);
      ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.strokeRect(-26, -34, 52, 22);
      ctx.fillStyle = c; ctx.fillRect(-18, -27, 36 * (0.4 + random() * 0.5), 8);
      break;
    }
    case 'cabinet': {
      const c = random() < 0.5 ? '#f472b6' : '#a78bfa';
      ctx.fillStyle = '#150a20'; ctx.fillRect(-16, -34, 32, 52);
      ctx.fillStyle = c; ctx.fillRect(-16, -34, 32, 8);
      ctx.fillStyle = '#0ea5e9'; ctx.fillRect(-11, -20, 22, 14);
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.strokeRect(-16, -34, 32, 52);
      break;
    }
    case 'vending':
      ctx.fillStyle = '#1c1030'; ctx.fillRect(-16, -30, 32, 48);
      ctx.fillStyle = '#22d3ee'; ctx.fillRect(-11, -26, 22, 20);
      ctx.fillStyle = '#f472b6'; ctx.fillRect(-11, 0, 22, 8);
      ctx.strokeStyle = 'rgba(244,114,182,0.7)'; ctx.lineWidth = 2; ctx.strokeRect(-16, -30, 32, 48);
      break;
    case 'reflect': {
      const c = random() < 0.5 ? 'rgba(244,114,182,0.3)' : 'rgba(34,211,238,0.3)';
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, 34 + random() * 30, 10 + random() * 8, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function drawProps(ctx: CanvasRenderingContext2D, world: ExplorationState, chunk: { x: number; y: number; w: number; h: number }) {
  for (const prop of world.props) {
    if (prop.x < chunk.x - 100 || prop.x > chunk.x + chunk.w + 100 || prop.y < chunk.y - 100 || prop.y > chunk.y + chunk.h + 100) continue;
    const random = rng(world.seed * 31 + prop.x * 7 + prop.y * 13);
    drawProp(ctx, prop, random);
  }
}

// ---- Organic hazard pools: jittered pixel-edged blobs baked into the floor ----
const HAZARD_PAINTS: Record<string, { crust: string; mid: string; core: string; spark: string }> = {
  lava: { crust: '#1c0d05', mid: '#7c2d12', core: '#ea580c', spark: '#fbbf24' },
  ice: { crust: '#0c2f4d', mid: '#155e8a', core: '#38bdf8', spark: '#e0f2fe' },
  sludge: { crust: '#04251f', mid: '#0f5c50', core: '#14b8a6', spark: '#99f6e4' },
  warp: { crust: '#1e0b38', mid: '#4c1d95', core: '#7c3aed', spark: '#d8b4fe' },
};

function blobPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, random: () => number, scale = 1) {
  ctx.beginPath();
  const verts = 14;
  for (let i = 0; i <= verts; i++) {
    const a = (i % verts) / verts * Math.PI * 2;
    const rr = px(r * scale * (0.82 + random() * 0.3));
    const vx = px(x + Math.cos(a) * rr), vy = px(y + Math.sin(a) * rr * 0.9);
    if (i === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
  }
  ctx.closePath();
}

function drawHazardFloor(ctx: CanvasRenderingContext2D, world: ExplorationState, chunk: { x: number; y: number; w: number; h: number }) {
  for (const hazard of world.hazards) {
    if (hazard.x + hazard.radius < chunk.x || hazard.x - hazard.radius > chunk.x + chunk.w || hazard.y + hazard.radius < chunk.y || hazard.y - hazard.radius > chunk.y + chunk.h) continue;
    const paint = HAZARD_PAINTS[hazard.kind];
    const random = rng(world.seed * 17 + Math.floor(hazard.x) * 3 + Math.floor(hazard.y) * 5 + hazard.radius);
    blobPath(ctx, hazard.x, hazard.y, hazard.radius, rng(world.seed * 17 + hazard.x), 1.06);
    ctx.fillStyle = paint.crust; ctx.fill();
    blobPath(ctx, hazard.x, hazard.y, hazard.radius, rng(world.seed * 17 + hazard.y), 0.92);
    ctx.fillStyle = paint.mid; ctx.fill();
    blobPath(ctx, hazard.x, hazard.y, hazard.radius, rng(world.seed * 13 + hazard.x + hazard.y), 0.66);
    ctx.fillStyle = paint.core; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
    // Surface detail: molten flecks / cracks / bubbles / stream streaks.
    for (let i = 0; i < Math.floor(hazard.radius / 14); i++) {
      const a = random() * Math.PI * 2, d = random() * hazard.radius * 0.6;
      const fx = px(hazard.x + Math.cos(a) * d), fy = px(hazard.y + Math.sin(a) * d * 0.85);
      if (hazard.kind === 'ice') {
        ctx.strokeStyle = 'rgba(224,242,254,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + (random() - 0.5) * 60, fy + (random() - 0.5) * 40); ctx.stroke();
      } else if (hazard.kind === 'sludge') {
        ctx.fillStyle = random() < 0.5 ? 'rgba(153,246,228,0.5)' : 'rgba(4,37,31,0.8)';
        ctx.beginPath(); ctx.arc(fx, fy, 3 + random() * 8, 0, Math.PI * 2); ctx.fill();
      } else if (hazard.kind === 'warp') {
        ctx.strokeStyle = 'rgba(216,180,254,0.55)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(fx - 16, fy - 8); ctx.lineTo(fx + 10, fy); ctx.lineTo(fx - 16, fy + 8); ctx.stroke();
      } else {
        ctx.fillStyle = random() < 0.5 ? paint.spark : paint.crust;
        ctx.fillRect(fx, fy, 6 + px(random() * 14), 4 + px(random() * 8));
      }
    }
  }
}

function drawDoorways(ctx: CanvasRenderingContext2D, world: ExplorationState, chunk: { x: number; y: number; w: number; h: number }) {
  for (const door of world.doorways) {
    if (door.x > chunk.x + chunk.w || door.x + door.width < chunk.x || door.y > chunk.y + chunk.h || door.y + door.height < chunk.y) continue;
    ctx.fillStyle = 'rgba(8,14,24,0.9)'; ctx.fillRect(door.x, door.y, door.width, door.height);
    ctx.fillStyle = '#facc15';
    const horizontal = door.width > door.height;
    if (horizontal) { ctx.fillRect(door.x, door.y - 8, door.width, 8); ctx.fillRect(door.x, door.y + door.height, door.width, 8); }
    else { ctx.fillRect(door.x - 8, door.y, 8, door.height); ctx.fillRect(door.x + door.width, door.y, 8, door.height); }
  }
}

function drawLampBase(ctx: CanvasRenderingContext2D, lamp: { x: number; y: number; color: string }) {
  ctx.fillStyle = '#0a0f1a'; ctx.fillRect(px(lamp.x - 4), px(lamp.y - 16), 8, 24);
  ctx.fillStyle = '#1e293b'; ctx.fillRect(px(lamp.x - 8), px(lamp.y + 4), 16, 8);
  ctx.fillStyle = lamp.color; ctx.fillRect(px(lamp.x - 4), px(lamp.y - 24), 8, 8);
}

// The game state is deep-cloned per snapshot, so chunks are keyed by seed (worlds are deterministic per seed).
const chunkCache = new Map<string, HTMLCanvasElement>();
export function invalidateArt(world?: ExplorationState) {
  if (!world) { chunkCache.clear(); return; }
  for (const key of [...chunkCache.keys()]) if (key.startsWith(`${world.seed}|`)) chunkCache.delete(key);
}

function bakeChunk(world: ExplorationState, cx: number, cy: number) {
  const canvas = document.createElement('canvas');
  canvas.width = CHUNK; canvas.height = CHUNK;
  const ctx = canvas.getContext('2d')!;
  const ox = cx * CHUNK, oy = cy * CHUNK;
  ctx.translate(-ox, -oy);
  const chunk = { x: ox, y: oy, w: CHUNK, h: CHUNK };
  const random = rng(world.seed * 131 + cx * 97 + cy * 211 + 5);
  ctx.fillStyle = '#04060c'; ctx.fillRect(ox, oy, CHUNK, CHUNK);
  drawFloor(ctx, world, chunk, random);
  drawHazardFloor(ctx, world, chunk);
  drawProps(ctx, world, chunk);
  drawDoorways(ctx, world, chunk);
  for (const lamp of world.lamps) {
    if (lamp.x > chunk.x - 40 && lamp.x < chunk.x + chunk.w + 40 && lamp.y > chunk.y - 40 && lamp.y < chunk.y + chunk.h + 40) drawLampBase(ctx, lamp);
  }
  for (const wall of world.walls) {
    if (wall.id === 'gate') continue;
    if (wall.x > chunk.x + chunk.w + 40 || wall.x + wall.width < chunk.x - 40 || wall.y > chunk.y + chunk.h + 40 || wall.y + wall.height < chunk.y - 40) continue;
    if (wall.cracked) { crackedWall(ctx, wall, random); continue; }
    if (wall.id.startsWith('border-')) {
      pixelBricks(ctx, wall, WALL_PAINTERS.border, random);
      continue;
    }
    if (wall.id.startsWith('secret-')) { pixelBricks(ctx, wall, WALL_PAINTERS.secret, random); continue; }
    const region = regionAt(world, { x: wall.x + wall.width / 2, y: wall.y + wall.height / 2 });
    if (region?.biome === 'yard') { yardWall(ctx, wall, random); continue; }
    const palette = WALL_PAINTERS[region?.biome || 'yard'] || WALL_PAINTERS.arcade;
    if (wall.shape === 'circle') pixelBlob(ctx, wall, palette, random);
    else pixelBricks(ctx, wall, palette, random);
  }
  // Neon frame around the whole world edge.
  ctx.strokeStyle = 'rgba(34,211,238,0.6)'; ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, world.width - 6, world.height - 6);
  return canvas;
}

export function getChunk(world: ExplorationState, cx: number, cy: number): HTMLCanvasElement {
  const key = `${world.seed}|${cx}|${cy}`;
  const hit = chunkCache.get(key);
  if (hit) { chunkCache.delete(key); chunkCache.set(key, hit); return hit; }
  const canvas = bakeChunk(world, cx, cy);
  chunkCache.set(key, canvas);
  while (chunkCache.size > 40) chunkCache.delete(chunkCache.keys().next().value!);
  return canvas;
}

// Bakes the ring of chunks around the camera so crossing a border never hitches.
export function prebakeAround(world: ExplorationState, camera: { x: number; y: number }, viewW: number, viewH: number) {
  const c0x = Math.max(0, Math.floor(camera.x / CHUNK) - 1), c1x = Math.min(Math.ceil(world.width / CHUNK) - 1, Math.floor((camera.x + viewW) / CHUNK) + 1);
  const c0y = Math.max(0, Math.floor(camera.y / CHUNK) - 1), c1y = Math.min(Math.ceil(world.height / CHUNK) - 1, Math.floor((camera.y + viewH) / CHUNK) + 1);
  const pending: [number, number][] = [];
  for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) pending.push([cx, cy]);
  const step = () => {
    const next = pending.shift();
    if (!next) return;
    getChunk(world, next[0], next[1]);
    setTimeout(step, 0);
  };
  setTimeout(step, 0);
}
