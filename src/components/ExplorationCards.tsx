import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import type { ExplorationState, InteractCard, ItemFeedEntry } from '@shared/exploration';
import { VIEW_WIDTH } from '@/lib/explorationWorld';
import { BIG_MS, REVEAL_MS } from '@/lib/lootReveal';
import { rarityFx } from './upgrade-modal/rarityFx';
import './pixelCards.css';

// Pixel-art cards: stepped CSS keyframes (pixelCards.css) for the DOM card, and a low-res canvas
// scaled with image-rendering: pixelated for burst FX, so every effect lands on whole pixels and
// soft light is Bayer dither rather than alpha.
const LEAVE_MS = 280;

const vars = (c: string, a: string) => ({ '--c': c, '--a': a }) as CSSProperties;

// Projects a world point to viewport pixels using the Konva canvas' on-screen box.
function worldToScreen(world: ExplorationState, x: number, y: number) {
  const canvas = document.querySelector('.konvajs-content');
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const scale = rect.width / VIEW_WIDTH;
  return { x: rect.left + (x - world.camera.x) * scale, y: rect.top + (y - world.camera.y) * scale };
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="px-frame px-notch">
    <div className="px-frame-color px-notch"><div className="px-frame-inner px-notch">{children}</div></div>
  </div>;
}

function Stars({ count, seed }: { count: number; seed: number }) {
  const stars = useMemo(() => Array.from({ length: count }, (_, i) => {
    const r = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const f = r - Math.floor(r), g = r * 7 - Math.floor(r * 7);
    return { left: `${Math.round(f * 22) * 4}%`, top: `${Math.round(g * 22) * 4}%`, plus: i % 4 === 0, delay: `${(i * 230) % 1600}ms` };
  }), [count, seed]);
  return <>{stars.map((s, i) => <i key={i} className={`px-star ${s.plus ? 'plus' : ''}`} style={{ left: s.left, top: s.top, animationDelay: s.delay }} />)}</>;
}

// ---- Hover card: anchored above whatever the player is standing on ----
export function InteractHoverCard({ world, hidden }: { world: ExplorationState; hidden?: boolean }) {
  const card = hidden ? null : world.interact;
  const at = card ? worldToScreen(world, card.anchor.x, card.anchor.y - card.lift) : null;
  if (!card || !at) return null;
  const left = Math.min(window.innerWidth - 170, Math.max(170, at.x));
  const top = Math.max(270, at.y);
  return <div className="fixed z-40 pointer-events-none" style={{ left, top, transform: 'translate(-50%, -100%)' }} data-testid="interact-card">
    <div key={card.id} className="px-pop"><HoverCardBody card={card} /></div>
  </div>;
}

function HoverCardBody({ card }: { card: InteractCard }) {
  const accent = card.rarity ? rarityFx(card.rarity).accent : '#f8fafc';
  return <div className="px-card w-[300px]" style={vars(card.color, accent)}>
    <Frame>
      <div className="p-3 pb-2.5">
        <div className="flex gap-3">
          <div className="px-window flex h-16 w-16 shrink-0 items-center justify-center">
            <Stars count={5} seed={card.id.length + card.title.length} />
            <span className="px-emoji text-[32px] leading-none">{card.emoji}</span>
            <i className="px-shine" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <span className="px-chip truncate text-[7px] leading-none tracking-wider">{card.tag}</span>
              {card.cost != null && <span className={`px-cost shrink-0 text-[12px] leading-none ${card.ready ? '' : 'broke'}`}>${card.cost}</span>}
            </div>
            <div className="mt-2.5 text-[11px] leading-[15px]" style={{ color: card.color, textShadow: '2px 2px 0 #020617' }}>{card.title}</div>
          </div>
        </div>
        <div className="px-body mt-2.5">{card.body}</div>
        {(card.pros || card.cons) && <div className="px-body mt-1 text-[18px]">
          {card.pros && <div className="px-pro">+ {card.pros}</div>}
          {card.cons && <div className="px-con">- {card.cons}</div>}
        </div>}
        <div className="px-rule mt-2.5" />
        <div className="mt-2.5 flex items-center gap-2.5">
          <span className={`px-key text-[9px] leading-none ${card.ready ? '' : 'off'}`}>E</span>
          <span className="text-[10px] leading-none" style={{ color: card.ready ? '#f8fafc' : '#64748b' }}>{card.action}</span>
          {card.note && <span className={`ml-auto truncate text-[7px] leading-none ${card.ready ? 'text-amber-200' : 'text-rose-300'}`}>{card.note}</span>}
        </div>
      </div>
    </Frame>
    {/* Stepped pointer down to the object */}
    <div className="absolute left-1/2 top-full -translate-x-1/2">
      <div className="mx-auto h-1 w-5" style={{ background: card.color }} />
      <div className="mx-auto h-1 w-3" style={{ background: card.color }} />
      <div className="mx-auto h-1 w-1" style={{ background: card.color }} />
    </div>
  </div>;
}

// ---- Pixel burst FX: dithered rays + rings, square sparks, confetti; escalates with rarity tier ----
const FX_W = 180, FX_H = 150, FX_SCALE = 4;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const u32 = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0;
};
const darken = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * f).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
};

function PixelBurst({ color, accent, tier, fail }: { color: string; accent: string; tier: number; fail: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const image = ctx.createImageData(FX_W, FX_H), px = new Uint32Array(image.data.buffer);
    const C = { l: u32(color), d: u32(darken(color, 0.55)), a: u32(accent), w: u32('#ffffff') };
    const cx = FX_W / 2, cy = FX_H / 2 + 6;
    const count = Math.round((fail ? 14 : 28 + tier * 22) * (reduce ? 0.4 : 1));
    const sparks = Array.from({ length: count }, () => {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * (60 + tier * 30);
      return { x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 25, life: 0.6 + Math.random() * 0.7, big: Math.random() < 0.25, k: Math.random() < 0.3 ? C.w : Math.random() < 0.5 ? C.a : C.l };
    });
    const confetti = tier >= 2 && !fail ? Array.from({ length: tier === 3 ? 60 : 30 }, (_, i) => ({ x: cx + (Math.random() - 0.5) * 20, y: cy, vx: (Math.random() - 0.5) * 140, vy: -60 - Math.random() * 90, ph: Math.random() * 6, k: [C.l, C.a, C.w][i % 3] })) : [];
    const rings = fail ? [] : [0, 0.08, 0.18, 0.3].slice(0, 1 + Math.min(3, tier)).map((delay, i) => ({ delay, k: i === 1 ? C.w : i % 2 ? C.a : C.l }));
    const start = performance.now();
    let last = start, frame = 0;
    const draw = (now: number) => {
      const t = (now - start) / 1000, dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      px.fill(0);
      const rays = fail || tier === 0 ? 0 : Math.min(1, t * 4) * (0.35 + tier * 0.18) * (t > 1.8 ? Math.max(0, 1 - (t - 1.8) * 2) : 1);
      const spin = t * (0.3 + tier * 0.15), sector = (Math.PI * 2) / 12;
      for (let y = 0; y < FX_H; y++) for (let x = 0; x < FX_W; x++) {
        const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy), b = BAYER[(y & 3) * 4 + (x & 3)];
        let col = 0;
        if (rays > 0.01) {
          const a = ((Math.atan2(dy, dx) + spin) % sector + sector) % sector;
          if (a < 0.2) { const iv = rays * (1 - d / 95); if (iv > b) col = iv > b + 0.4 ? C.l : C.d; }
        }
        for (const ring of rings) {
          const rt = t - ring.delay;
          if (rt <= 0 || rt > 0.8) continue;
          const r = 8 + (1 - Math.pow(1 - rt / 0.8, 2)) * (70 + tier * 10), w = Math.max(1, Math.round(3 * (1 - rt / 0.8)));
          if (Math.abs(d - r) < w) { col = ring.k; break; }
        }
        if (col) px[y * FX_W + x] = col;
      }
      for (const p of sparks) {
        if (t > p.life) continue;
        p.vx *= Math.exp(-2.2 * dt); p.vy = p.vy * Math.exp(-2.2 * dt) + 140 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (t / p.life > 0.6 && Math.floor(t * 24) & 1) continue;
        const s = p.big && t < p.life / 2 ? 2 : 1, x0 = Math.round(p.x), y0 = Math.round(p.y);
        for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) if (x0 + xx >= 0 && x0 + xx < FX_W && y0 + yy >= 0 && y0 + yy < FX_H) px[(y0 + yy) * FX_W + x0 + xx] = p.k;
      }
      for (const p of confetti) {
        p.vx *= Math.exp(-2.5 * dt); p.vy = p.vy * Math.exp(-2.5 * dt) + 90 * dt; p.x += (p.vx + Math.sin(p.ph) * 12) * dt; p.y += p.vy * dt; p.ph += dt * 10;
        const x0 = Math.round(p.x), y0 = Math.round(p.y), hor = Math.sin(p.ph) > 0;
        if (x0 < 0 || x0 >= FX_W - 2 || y0 < 1 || y0 >= FX_H) continue;
        px[y0 * FX_W + x0] = p.k; px[(hor ? y0 : y0 - 1) * FX_W + (hor ? x0 + 1 : x0)] = p.k;
      }
      ctx.putImageData(image, 0, 0);
      if (t < 2.4) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [color, accent, tier, fail]);
  return <canvas ref={ref} width={FX_W} height={FX_H} className="absolute left-1/2 top-1/2 -z-10" aria-hidden
    style={{ width: FX_W * FX_SCALE, height: FX_H * FX_SCALE, marginLeft: -FX_W * FX_SCALE / 2, marginTop: -FX_H * FX_SCALE / 2, imageRendering: 'pixelated' }} />;
}

// ---- Loot reveal: big pixel card that drops into the compact feed ----
const REVEAL_THEME = {
  fail: { color: '#94a3b8', accent: '#e2e8f0', label: 'NOTHING', tier: 0 },
  heal: { color: '#4ade80', accent: '#dcfce7', label: 'HEALED', tier: 1 },
};

export function LootReveals({ feed }: { feed: ItemFeedEntry[] }) {
  const big = feed.filter(e => REVEAL_MS - e.ms < BIG_MS).slice(0, 2);
  const small = feed.filter(e => REVEAL_MS - e.ms >= BIG_MS);
  return <>
    <div className="fixed left-1/2 top-[12%] z-40 flex -translate-x-1/2 gap-10 pointer-events-none" data-testid="loot-reveal">
      {big.map((entry, i) => <RevealCard key={entry.id} entry={entry} index={i} leaving={REVEAL_MS - entry.ms > BIG_MS - LEAVE_MS} />)}
    </div>
    <div className="fixed bottom-24 left-1/2 z-30 flex w-[min(420px,60vw)] -translate-x-1/2 flex-col gap-3 pointer-events-none" data-testid="exploration-item-feed">
      {small.map(entry => {
        const theme = entry.kind === 'fail' || entry.kind === 'heal' ? REVEAL_THEME[entry.kind] : rarityFx(entry.rarity);
        return <div key={entry.id} className="px-card px-slide" style={{ ...vars(theme.color, theme.accent), opacity: entry.ms < 600 ? Math.ceil(entry.ms / 150) / 4 : 1 }}>
          <Frame>
            <div className="flex items-center gap-3 px-2 py-1.5">
              <div className="px-window flex h-10 w-10 shrink-0 items-center justify-center"><span className="text-[22px] leading-none">{entry.emoji}</span></div>
              <div className="min-w-0">
                <div className="text-[9px] leading-[13px]" style={{ color: theme.color, textShadow: '2px 2px 0 #020617' }}>{entry.title}</div>
                <div className="px-body truncate text-[17px]">{entry.description}</div>
              </div>
            </div>
          </Frame>
        </div>;
      })}
    </div>
  </>;
}

function RevealCard({ entry, index, leaving }: { entry: ItemFeedEntry; index: number; leaving: boolean }) {
  const fx = rarityFx(entry.rarity);
  const special = entry.kind === 'fail' || entry.kind === 'heal' ? REVEAL_THEME[entry.kind] : null;
  const color = special?.color || fx.color;
  const accent = special?.accent || fx.accent;
  const label = special?.label || fx.label;
  const tier = special ? special.tier : fx.tier;
  const fail = entry.kind === 'fail';
  return <div className={leaving ? 'px-leave' : ''}>
    <div className={`px-card px-reveal ${fail ? 'fail' : ''} w-[312px]`} style={{ ...vars(color, accent), animationDelay: `${index * 120}ms` }}>
      <PixelBurst color={color} accent={accent} tier={tier} fail={fail} />
      {/* Chunky banded rarity header; letters drop in one by one */}
      <div className="relative mb-4 flex items-end justify-center">
        <div className="px-banded text-center text-[30px] leading-none tracking-[2px]">
          {label.split('').map((ch, i) => <span key={i} style={{ '--i': i } as CSSProperties}>{ch === ' ' ? ' ' : ch}</span>)}
        </div>
      </div>
      <div className="relative">
        {!fail && <span className="px-tag px-stamp absolute -right-4 -top-5 z-10 text-[11px] leading-none" style={{ animationDelay: `${420 + label.length * 45}ms, 0ms` }}>{entry.kind === 'heal' ? '+2' : 'NEW!'}</span>}
        <Frame>
          <div className="p-3">
            <div className="px-window flex h-36 items-center justify-center">
              <Stars count={12} seed={entry.id} />
              <span className="px-emoji text-[64px] leading-none">{entry.emoji}</span>
              <i className="px-shine" />
            </div>
            <div className="px-plate mt-3 text-center text-[11px] leading-[15px]">{entry.title}</div>
            <div className="px-body mt-2.5 text-center">{entry.description}</div>
            <div className="px-rule mt-2.5" />
            <div className="mt-2.5 flex items-center justify-center gap-1.5">
              {Array.from({ length: tier + 1 }, (_, i) => <i key={i} className="px-gem" style={{ animationDelay: `${600 + i * 110}ms` }} />)}
            </div>
            <div className="mt-2 text-center text-[7px] leading-none tracking-[3px]" style={{ color: accent }}>{entry.source || 'ITEM GET'}</div>
          </div>
        </Frame>
      </div>
    </div>
  </div>;
}
