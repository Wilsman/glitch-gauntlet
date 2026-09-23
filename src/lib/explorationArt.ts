import type { ExplorationState } from '@shared/exploration';
import { LANDMARKS } from './explorationWorld';

// Glowing conduits drawn into the floor; the renderer animates pulses along the same polylines.
export const CONDUITS: { points: number[]; color: string }[] = [
  { points: [300, 1000, 550, 1300, 550, 1580, 1500, 1580, 1850, 1380, 2450, 1380, 2670, 1390], color: '#22d3ee' },
  { points: [400, 1000, 120, 1000, 120, 90, 1340, 90, 1340, 350, 1800, 750, 2450, 750], color: '#e879f9' },
  { points: [2450, 750, 2660, 570, 3100, 570, 3100, 1900, 2300, 1900], color: '#f43f5e' },
  { points: [1260, 1280, 1260, 900, 1850, 900, 1850, 1300], color: '#f59e0b' },
];

export const WALL_ACCENTS: Record<string, string> = {
  'north-rack': '#22d3ee', 'pocket-west': '#e879f9', 'pocket-south': '#e879f9', 'pocket-tail': '#e879f9',
  'west-machine': '#a3e635', 'central-bank': '#f59e0b', 'court-cover': '#f59e0b', 'east-bank': '#f43f5e',
  'south-bank': '#a3e635', 'signal-cover': '#f43f5e',
};

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

// Bakes every static layer of the yard (floor, zones, conduits, walls, props) once so the per-frame Konva tree stays small.
export function bakeExplorationArt(world: ExplorationState): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = world.width; canvas.height = world.height;
  const ctx = canvas.getContext('2d')!;
  const random = rng(1337);

  const base = ctx.createRadialGradient(world.width / 2, world.height / 2, 200, world.width / 2, world.height / 2, world.width * 0.7);
  base.addColorStop(0, '#0b1222'); base.addColorStop(1, '#04060c');
  ctx.fillStyle = base; ctx.fillRect(0, 0, world.width, world.height);

  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(${120 + random() * 100},${160 + random() * 80},255,${0.03 + random() * 0.07})`;
    const s = random() < 0.9 ? 2 : 4;
    ctx.fillRect(Math.floor(random() * world.width / 2) * 2, Math.floor(random() * world.height / 2) * 2, s, s);
  }
  ctx.lineWidth = 1;
  for (let x = 0; x <= world.width; x += 50) { ctx.strokeStyle = x % 200 === 0 ? 'rgba(56,189,248,0.07)' : 'rgba(56,189,248,0.03)'; ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, world.height); ctx.stroke(); }
  for (let y = 0; y <= world.height; y += 50) { ctx.strokeStyle = y % 200 === 0 ? 'rgba(56,189,248,0.07)' : 'rgba(56,189,248,0.03)'; ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(world.width, y + 0.5); ctx.stroke(); }

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
    ctx.shadowColor = area.neon; ctx.shadowBlur = 28; ctx.strokeStyle = hexAlpha(area.neon, 0.85); ctx.lineWidth = 3;
    roundRect(ctx, area.x, area.y, area.width, area.height, 28); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    roundRect(ctx, area.x + 6, area.y + 6, area.width - 12, area.height - 12, 22); ctx.stroke();
    ctx.shadowColor = area.neon; ctx.shadowBlur = 14; ctx.strokeStyle = area.neon; ctx.lineWidth = 6; ctx.lineCap = 'square';
    const b = 34;
    for (const [cx, cy, dx, dy] of [[area.x, area.y, 1, 1], [area.x + area.width, area.y, -1, 1], [area.x, area.y + area.height, 1, -1], [area.x + area.width, area.y + area.height, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(cx + dx * 4, cy + dy * (b + 4)); ctx.lineTo(cx + dx * 4, cy + dy * 4); ctx.lineTo(cx + dx * (b + 4), cy + dy * 4); ctx.stroke();
    }
    ctx.font = '22px "Press Start 2P", monospace'; ctx.textBaseline = 'top';
    ctx.shadowBlur = 22; ctx.fillStyle = area.neon; ctx.fillText(area.name, area.x + 32, area.y + 30);
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(area.name, area.x + 32, area.y + 30);
    ctx.font = '10px "Press Start 2P", monospace'; ctx.fillStyle = hexAlpha(area.neon, 0.6);
    ctx.fillText(`SECTOR 0${LANDMARKS.indexOf(area) + 1} // ${area.neon.toUpperCase()}`, area.x + 34, area.y + 62);
    ctx.restore();
  }

  for (const conduit of CONDUITS) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    polyline(ctx, conduit.points); ctx.strokeStyle = 'rgba(2,6,14,0.9)'; ctx.lineWidth = 16; ctx.stroke();
    polyline(ctx, conduit.points); ctx.shadowColor = conduit.color; ctx.shadowBlur = 18; ctx.strokeStyle = hexAlpha(conduit.color, 0.45); ctx.lineWidth = 6; ctx.stroke();
    polyline(ctx, conduit.points); ctx.shadowBlur = 0; ctx.strokeStyle = hexAlpha(conduit.color, 0.9); ctx.lineWidth = 1.5; ctx.stroke();
    for (let i = 0; i < conduit.points.length; i += 2) {
      ctx.beginPath(); ctx.arc(conduit.points[i], conduit.points[i + 1], 9, 0, Math.PI * 2); ctx.fillStyle = '#050a14'; ctx.fill();
      ctx.shadowColor = conduit.color; ctx.shadowBlur = 14; ctx.strokeStyle = conduit.color; ctx.lineWidth = 3; ctx.stroke(); ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  for (let i = 0; i < 70; i++) {
    const x = 60 + random() * (world.width - 120), y = 60 + random() * (world.height - 120);
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

  for (const wall of world.walls) {
    if (wall.id === 'gate') continue;
    const accent = WALL_ACCENTS[wall.id] || '#5eead4';
    const { x, y, width: w, height: h } = wall;
    const face = Math.min(22, h * 0.3);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 26; ctx.shadowOffsetX = 10; ctx.shadowOffsetY = 18;
    ctx.fillStyle = '#060a12'; roundRect(ctx, x, y, w, h, 6); ctx.fill();
    ctx.restore();
    const front = ctx.createLinearGradient(0, y + h - face, 0, y + h);
    front.addColorStop(0, '#0e1726'); front.addColorStop(1, '#070b14');
    ctx.fillStyle = front; ctx.fillRect(x, y + h - face, w, face);
    for (let vx = x + 10; vx < x + w - 10; vx += 14) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(vx, y + h - face + 5, 6, face - 10); }
    ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 12; ctx.fillStyle = hexAlpha(accent, 0.9); ctx.fillRect(x + 6, y + h - 4, w - 12, 2); ctx.restore();
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
    ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 16; ctx.strokeStyle = hexAlpha(accent, 0.8); ctx.lineWidth = 2;
    roundRect(ctx, x + 1, y + 1, w - 2, h - face - 2, 6); ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(203,213,225,0.35)';
    for (const [rx, ry] of [[x + 8, y + 8], [x + w - 12, y + 8], [x + 8, y + h - face - 12], [x + w - 12, y + h - face - 12]]) ctx.fillRect(rx, ry, 4, 4);
  }

  ctx.save(); ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 30; ctx.strokeStyle = 'rgba(34,211,238,0.6)'; ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, world.width - 6, world.height - 6); ctx.restore();
  return canvas;
}
