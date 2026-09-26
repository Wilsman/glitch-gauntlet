import { useEffect, useRef, useState } from 'react';
import type { GameState, Player } from '@shared/types';
import type { ExplorationState } from '@shared/exploration';
import { activeWalls, CHARGE_MS, COMBO_WINDOW_MS, DIFFICULTY_TIERS, VIEW_HEIGHT, VIEW_WIDTH, difficultyTier, distance, regionIndexAt } from '@/lib/explorationWorld';
import { CAVE_PORTAL, STAGE_MODIFIERS } from '@/lib/stageModifiers';
import { InteractHoverCard, LootReveals } from './ExplorationCards';
import { isRevealing } from '@/lib/lootReveal';

const CHEST_COLORS = { small: '#22d3ee', large: '#facc15', shrine: '#f472b6' };
const HAZARD_COLORS: Record<string, string> = { ice: '#7dd3fc', lava: '#fb923c', sludge: '#2dd4bf', warp: '#c084fc' };

const hexAlpha = (hex: string, alpha: number) => hex + Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');

// Shared renderer for the corner minimap and the full-screen map overlay.
function drawWorldMap(ctx: CanvasRenderingContext2D, world: ExplorationState, player: Player, w: number, h: number, labels: boolean, now = performance.now()) {
  const scale = Math.min(w / world.width, h / world.height);
  const ox = (w - world.width * scale) / 2, oy = (h - world.height * scale) / 2;
  const X = (v: number) => ox + v * scale, Y = (v: number) => oy + v * scale;
  ctx.fillStyle = '#050912'; ctx.fillRect(0, 0, w, h);
  const cols = Math.ceil(world.width / 100), rows = Math.ceil(world.height / 100);
  const visited = new Set(world.visited);
  const seen = (x: number, y: number) => visited.has(Math.floor(y / 100) * cols + Math.floor(x / 100));
  // Discovered regions tint in their biome colour; outlines glow.
  for (const region of world.biomes) {
    if (region.discovered) {
      ctx.fillStyle = hexAlpha(region.neon, 0.09);
      ctx.fillRect(X(region.x), Y(region.y), region.width * scale, region.height * scale);
    }
    ctx.strokeStyle = region.discovered ? hexAlpha(region.neon, 0.55) : 'rgba(100,116,139,0.25)';
    ctx.lineWidth = labels ? 2 : 1;
    ctx.strokeRect(X(region.x), Y(region.y), region.width * scale, region.height * scale);
  }
  for (const id of visited) {
    const cx = (id % cols) * 100 + 50, cy = Math.floor(id / cols) * 100 + 50;
    const region = world.biomes[regionIndexAt({ x: cx, y: cy })];
    ctx.fillStyle = region ? hexAlpha(region.neon, 0.16) : 'rgba(15,42,58,0.8)';
    ctx.fillRect(X(cx - 50), Y(cy - 50), 100 * scale, 100 * scale);
  }
  for (const hazard of world.hazards) {
    if (!seen(hazard.x, hazard.y)) continue;
    ctx.fillStyle = hexAlpha(HAZARD_COLORS[hazard.kind] || '#fff', 0.25);
    ctx.beginPath(); ctx.arc(X(hazard.x), Y(hazard.y), hazard.radius * scale, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(94,234,212,0.6)';
  for (const wall of activeWalls(world)) {
    const cx = wall.x + wall.width / 2, cy = wall.y + wall.height / 2;
    if (!seen(cx, cy) && !seen(wall.x, wall.y) && !seen(wall.x + wall.width, wall.y + wall.height)) continue;
    if (wall.shape === 'circle') { ctx.beginPath(); ctx.arc(X(cx), Y(cy), wall.width / 2 * scale, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(X(wall.x), Y(wall.y), wall.width * scale, wall.height * scale);
  }
  // Doorways show as bright gaps in region borders.
  ctx.fillStyle = '#facc15';
  for (const door of world.doorways) {
    const cx = door.x + door.width / 2, cy = door.y + door.height / 2;
    if (!seen(cx, cy) && !seen(door.x, door.y)) continue;
    ctx.fillRect(X(cx) - Math.max(2, door.width * scale / 2), Y(cy) - Math.max(2, door.height * scale / 2), Math.max(4, door.width * scale), Math.max(4, door.height * scale));
  }
  for (const chest of world.chests) {
    if (!seen(chest.position.x, chest.position.y)) continue;
    const s = (chest.kind === 'large' ? 110 : 80) * scale;
    ctx.fillStyle = chest.opened ? '#334155' : CHEST_COLORS[chest.kind];
    if (chest.kind === 'shrine') {
      ctx.save(); ctx.translate(X(chest.position.x), Y(chest.position.y)); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
    } else ctx.fillRect(X(chest.position.x) - s / 2, Y(chest.position.y) - s / 2, s, s);
  }
  for (const pad of world.pads) {
    if (!seen(pad.position.x, pad.position.y)) continue;
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath(); ctx.arc(X(pad.position.x), Y(pad.position.y), Math.max(2, 60 * scale), 0, Math.PI * 2); ctx.fill();
  }
  if (world.hasYard && world.cache.discovered && !world.cache.claimed) { ctx.fillStyle = '#5eead4'; ctx.fillRect(X(world.cache.position.x) - 40 * scale, Y(world.cache.position.y) - 40 * scale, 80 * scale, 80 * scale); }
  if (world.hasYard && world.elite.discovered && !world.elite.defeated) { ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(X(world.elite.position.x), Y(world.elite.position.y), 60 * scale, 0, Math.PI * 2); ctx.fill(); }
  for (const portal of world.portals) {
    ctx.fillStyle = portal.modifier ? STAGE_MODIFIERS[portal.modifier].color : CAVE_PORTAL.color;
    ctx.beginPath(); ctx.arc(X(portal.position.x), Y(portal.position.y), Math.max(3, 70 * scale), 0, Math.PI * 2); ctx.fill();
  }
  if (world.anchor.discovered) {
    const ax = X(world.anchor.position.x), ay = Y(world.anchor.position.y);
    ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = Math.max(2, 26 * scale);
    ctx.beginPath(); ctx.arc(ax, ay, 90 * scale, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#67e8f9'; ctx.beginPath(); ctx.arc(ax, ay, Math.max(3, 40 * scale), 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(X(world.camera.x), Y(world.camera.y), VIEW_WIDTH * scale, VIEW_HEIGHT * scale);
  // Player marker with a pulse ring.
  const px = X(player.position.x), py = Y(player.position.y);
  const pulse = (now % 1400) / 1400;
  ctx.strokeStyle = `rgba(34,211,238,${0.7 * (1 - pulse)})`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(px, py, Math.max(4, 60 * scale) + pulse * 14, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = Math.max(2, 18 * scale);
  ctx.beginPath(); ctx.arc(px, py, Math.max(4, 70 * scale), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (labels) {
    // Region names sit on backed tags along each region's top edge, clear of the markers in the middle.
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const region of world.biomes) {
      const name = region.discovered ? region.name : '???';
      const maxW = region.width * scale - 20;
      let size = region.discovered ? 11 : 10;
      ctx.font = `${size}px "Press Start 2P", monospace`;
      while (size > 6 && ctx.measureText(name).width > maxW - 16) { size -= 1; ctx.font = `${size}px "Press Start 2P", monospace`; }
      const tw = ctx.measureText(name).width + 16, th = size + 10;
      const tx = X(region.x + region.width / 2) - tw / 2, ty = Y(region.y) + 8;
      ctx.fillStyle = 'rgba(5,9,18,0.88)'; ctx.fillRect(tx, ty, tw, th);
      ctx.strokeStyle = region.discovered ? hexAlpha(region.neon, 0.7) : 'rgba(100,116,139,0.35)'; ctx.lineWidth = 1;
      ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, th - 1);
      ctx.fillStyle = region.discovered ? region.neon : 'rgba(100,116,139,0.7)';
      ctx.fillText(name, tx + tw / 2, ty + th / 2 + 1);
    }
    if (world.anchor.discovered) {
      const label = `ANCHOR ${Math.round(distance(player.position, world.anchor.position))}m`;
      ctx.font = '10px "Press Start 2P", monospace';
      const tw = ctx.measureText(label).width + 12, th = 18;
      const ax = X(world.anchor.position.x), ay = Y(world.anchor.position.y) + Math.max(10, 110 * scale);
      const tx = Math.min(w - tw - 4, Math.max(4, ax - tw / 2)), ty = Math.min(h - th - 4, ay);
      ctx.fillStyle = 'rgba(5,9,18,0.9)'; ctx.fillRect(tx, ty, tw, th);
      ctx.strokeStyle = 'rgba(103,232,249,0.7)'; ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, th - 1);
      ctx.fillStyle = '#a5f3fc'; ctx.fillText(label, tx + tw / 2, ty + th / 2 + 1);
    }
  }
}

function WorldMapCanvas({ world, player, width, labels }: { world: ExplorationState; player: Player; width: number; labels: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const lastDraw = useRef(0);
  const height = Math.round(width * world.height / world.width);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const draw = () => {
      lastDraw.current = performance.now();
      const ctx = ref.current?.getContext('2d');
      if (ctx) drawWorldMap(ctx, world, player, width, height, labels);
    };
    const wait = 100 - (performance.now() - lastDraw.current); // redraw at most ~10x/s
    if (wait <= 0) draw(); else timer = setTimeout(draw, wait);
    return () => { if (timer) clearTimeout(timer); };
  });
  return <canvas ref={ref} width={width} height={height} className="w-full rounded-md" role="img" aria-label="Visited terrain and discovered landmarks" />;
}

const PHASE_OBJECTIVES: Record<string, string> = {
  pedestals: 'Claim a boss relic',
  results: 'Stage clear',
  portals: 'Enter the rift',
};

const RANK_COLORS: Record<string, string> = { S: '#facc15', A: '#4ade80', B: '#22d3ee', C: '#a78bfa', D: '#94a3b8' };

export default function ExplorationHUD({ gameState, player }: { gameState: GameState; player: Player }) {
  const world = gameState.exploration;
  const [mapOpen, setMapOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM' && !(e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))) setMapOpen(v => !v);
    };
    window.addEventListener('keydown', onKey);
    // Gamepad Back/View (button 8) toggles the same overlay.
    let backHeld = false;
    const poll = setInterval(() => {
      const pad = navigator.getGamepads?.().find(Boolean);
      const pressed = !!pad?.buttons[8]?.pressed;
      if (pressed && !backHeld) setMapOpen(v => !v);
      backHeld = pressed;
    }, 120);
    return () => { window.removeEventListener('keydown', onKey); clearInterval(poll); };
  }, []);
  if (!world) return null;
  const active = world.phase === 'anchorActive';
  const pastAnchor = world.phase === 'pedestals' || world.phase === 'results' || world.phase === 'portals';
  const currentRegion = world.biomes.find(r => r.id === world.currentRegionId);
  const modifier = world.modifier ? STAGE_MODIFIERS[world.modifier] : null;
  const objective = world.interlude ? 'Shop, then jump into a rift' : PHASE_OBJECTIVES[world.phase] || (active ? 'Stabilise the Anchor' : world.anchor.discovered ? 'Activate the Glitch Anchor' : 'Find the Glitch Anchor');
  const seconds = Math.floor(world.elapsedMs / 1000);
  const tier = difficultyTier(world.elapsedMs);
  const dx = world.anchor.position.x - player.position.x, dy = world.anchor.position.y - player.position.y;
  const angle = Math.atan2(dy, dx);
  const hint = world.anchor.discovered || world.elapsedMs >= 60000 || (world.elapsedMs > 12000 && world.elapsedMs % 22000 < 2500);
  const anchorOnScreen = world.anchor.position.x > world.camera.x && world.anchor.position.x < world.camera.x + VIEW_WIDTH && world.anchor.position.y > world.camera.y && world.anchor.position.y < world.camera.y + VIEW_HEIGHT;
  const combo = world.combo;
  const milestoneT = 1 - combo.milestoneMs / 2000;
  const banner = world.biomeBanner;
  const bannerT = banner ? 1 - banner.ms / 2500 : 1;
  const stageBanner = world.stageBanner;
  const stageBannerT = stageBanner ? 1 - stageBanner.ms / 2200 : 1;
  const results = world.results;
  const resultsT = results ? Math.min(1, (4200 - results.ms) / 260) : 0;
  const guardianHp = gameState.boss ? Math.max(0, gameState.boss.health / gameState.boss.maxHealth) : 0;
  return <div className="font-sans">
    <div className="fixed right-4 top-14 z-30 flex w-[232px] flex-col gap-2 pointer-events-none">
      <div className="rounded-md border border-white/10 bg-slate-950/85 px-2.5 py-2" data-testid="exploration-difficulty">
        <div className="flex items-center justify-between font-press-start text-[7px] tracking-widest text-slate-400 uppercase"><span>{currentRegion?.name || 'UNKNOWN SECTOR'}</span><span>STAGE {world.stage}</span></div>
        {modifier && <div className="mt-1.5 rounded-sm border px-1.5 py-1 font-press-start text-[7px] tracking-widest" style={{ borderColor: `${modifier.color}66`, color: modifier.color, backgroundColor: `${modifier.color}14` }} data-testid="exploration-modifier">{modifier.name}</div>}
        <div className="mt-1.5 flex items-end justify-between">
          <div className="font-press-start text-[20px] leading-none text-white">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</div>
          <div className="font-press-start text-[8px] text-slate-400">KILLS <span className="text-[11px] text-white">{world.kills}</span></div>
        </div>
        <div className="mt-2 flex h-1.5 gap-[2px] overflow-hidden rounded-sm">
          {DIFFICULTY_TIERS.map((t, i) => <div key={t.label} className="relative flex-1 bg-slate-800" style={{ backgroundColor: i < tier.index ? t.color : undefined, opacity: i < tier.index ? 0.55 : 1 }}>
            {i === tier.index && <div className="absolute inset-y-0 left-0" style={{ width: `${tier.progress * 100}%`, backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}` }} />}
          </div>)}
        </div>
        <div className="mt-1.5 font-press-start text-[9px] tracking-wider" style={{ color: tier.color }}>{tier.label}</div>
        <div className="mt-2 border-t border-white/10 pt-2" data-testid="exploration-objective">
          <div className="font-press-start text-[7px] uppercase tracking-widest text-slate-400">Objective</div>
          <div className="mt-1 text-[13px] font-semibold text-slate-100">{objective}</div>
          {active && <div className="mt-2 space-y-1.5">
            <Bar label={`CHARGE ${Math.floor(world.anchor.chargeMs / CHARGE_MS * 100)}%`} value={world.anchor.chargeMs / CHARGE_MS} color="#6ee7b7" />
            <Bar label={world.anchor.guardianDefeated ? 'GUARDIAN DELETED' : `GUARDIAN ${Math.ceil(gameState.boss?.health || 0)} HP`} value={guardianHp} color="#f43f5e" />
            <div className={`text-xs font-semibold ${world.anchor.occupied ? 'text-emerald-200' : 'animate-pulse text-rose-300'}`}>{world.anchor.occupied ? 'Charging · keep moving inside the field' : 'Charge paused · return to the field'}</div>
          </div>}
          {hint && !active && !pastAnchor && <div className="mt-1.5 flex items-center gap-2 text-xs text-cyan-200"><span className="inline-block" style={{ transform: `rotate(${angle}rad)` }}>➜</span>{world.anchor.discovered ? `Anchor · ${Math.round(distance(player.position, world.anchor.position))}m` : 'Signal detected in this direction'}</div>}
        </div>
      </div>

      <div className="rounded-md border border-white/10 bg-slate-950/85 p-2" data-testid="exploration-minimap">
        <WorldMapCanvas world={world} player={player} width={216} labels={false} />
        <div className="mt-1 flex justify-between font-press-start text-[7px] tracking-wider text-slate-500"><span>M · MAP</span><span>{world.chests.filter(c => c.opened).length}/{world.chests.length} LOOTED</span></div>
      </div>
    </div>

    {mapOpen && <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 pointer-events-none" data-testid="exploration-fullmap">
      <div className="w-[min(1100px,92vw)] rounded-2xl border border-cyan-300/40 bg-slate-950/95 p-4 shadow-[0_0_60px_rgba(34,211,238,0.2)]">
        <WorldMapCanvas world={world} player={player} width={1060} labels={true} />
        <div className="mt-3 flex flex-wrap items-center gap-4 font-press-start text-[8px] tracking-wider text-slate-400">
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-cyan-300" />CHEST</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rotate-45 bg-pink-400" />SHRINE</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-400" />VAULT</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" />DOOR</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full border-2 border-cyan-200" />ANCHOR</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-white" />YOU</span>
          <span className="ml-auto text-slate-500">M / VIEW · CLOSE</span>
        </div>
      </div>
    </div>}

    {banner && <div className="fixed left-1/2 top-[38%] z-40 -translate-x-1/2 pointer-events-none text-center" style={{ transform: `translateX(-50%) scale(${bannerT < 0.08 ? 0.4 + bannerT / 0.08 * 0.6 : 1})`, opacity: bannerT > 0.8 ? (1 - bannerT) / 0.2 : 1 }} data-testid="exploration-biome-banner">
      <div className="font-press-start text-[12px] tracking-[0.4em] text-slate-300">ENTERING //</div>
      <div className="mt-2 whitespace-nowrap font-press-start text-[30px]" style={{ color: banner.neon, textShadow: `2px 2px 0 #020617, 0 0 22px ${hexAlpha(banner.neon, 0.55)}` }}>{banner.name}</div>
      {banner.sub && <div className="mt-2 font-press-start text-[11px] text-yellow-200" style={{ textShadow: '2px 2px 0 #020617' }}>{banner.sub}</div>}
    </div>}

    {stageBanner && <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none" data-testid="exploration-stage-banner" style={{ opacity: stageBannerT > 0.85 ? (1 - stageBannerT) / 0.15 : Math.min(1, stageBannerT / 0.12) }}>
      <div className="text-center">
        <div className="font-press-start text-[12px] tracking-[0.5em] text-slate-400">RIFT JUMP COMPLETE</div>
        <div className="mt-3 whitespace-nowrap font-press-start text-[34px] text-white" style={{ textShadow: `3px 3px 0 #020617, 0 0 40px ${stageBanner.neon}` }}>{stageBanner.title}</div>
        {modifier && <div className="mx-auto mt-3 inline-block rounded-sm border px-3 py-1.5 font-press-start text-[11px] tracking-widest" style={{ borderColor: modifier.color, color: modifier.color, backgroundColor: `${modifier.color}18` }}>{modifier.name}</div>}
      </div>
    </div>}

    {results && <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none bg-slate-950/40" data-testid="exploration-results">
      <div className="w-[340px] rounded-lg border-2 bg-[#0a0f1e]/95 p-4 text-center shadow-2xl" style={{ borderColor: RANK_COLORS[results.rank], transform: `scale(${0.6 + resultsT * 0.4})` }}>
        <div className="font-press-start text-[10px] tracking-[0.4em] text-slate-400">STAGE {world.stage} CLEAR</div>
        <div className="mt-2 font-press-start text-[64px] leading-none" style={{ color: RANK_COLORS[results.rank], textShadow: `4px 4px 0 #020617, 0 0 40px ${RANK_COLORS[results.rank]}`, transform: `scale(${resultsT < 0.4 ? 1.8 - resultsT : 1}) rotate(-6deg)` }}>{results.rank}</div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-left font-vt323 text-[15px] text-slate-300">
          <span>Time</span><span className="text-right text-white">{Math.floor(results.seconds / 60)}:{String(results.seconds % 60).padStart(2, '0')}</span>
          <span>Kills</span><span className="text-right text-white">{results.kills}</span>
          <span>Best combo</span><span className="text-right text-white">x{results.bestCombo}</span>
          <span>Items</span><span className="text-right text-white">{results.items}</span>
          <span>Damage taken</span><span className="text-right text-white">{results.damageTaken}</span>
        </div>
        <div className="mt-3 border-t border-white/10 pt-2 font-press-start text-[11px] text-yellow-300">RANK BONUS · +${results.bonus}</div>
      </div>
    </div>}

    {combo.count >= 3 && <div className="fixed left-6 top-[46%] z-30 pointer-events-none -rotate-3" data-testid="exploration-combo">
      <div className="font-press-start text-[10px] tracking-widest text-fuchsia-300 [text-shadow:0_0_10px_#e879f9]">COMBO</div>
      <div className="font-press-start leading-none text-white [text-shadow:3px_3px_0_#e879f9,-2px_-2px_0_#22d3ee]" style={{ fontSize: `${Math.min(56, 26 + combo.count * 0.3)}px` }}>x{combo.count}</div>
      <div className="mt-2 h-1.5 w-40 overflow-hidden rounded bg-slate-800"><div className="h-full bg-gradient-to-r from-fuchsia-400 to-cyan-300" style={{ width: `${combo.timerMs / COMBO_WINDOW_MS * 100}%` }} /></div>
      <div className="mt-1 font-press-start text-[8px] text-cyan-200">+{Math.round(Math.min(1, combo.count / 50) * 100)}% XP</div>
    </div>}

    {combo.milestoneMs > 0 && <div className="fixed left-1/2 top-[24%] z-40 -translate-x-1/2 pointer-events-none text-center" style={{ transform: `translateX(-50%) scale(${milestoneT < 0.1 ? 2.2 - milestoneT * 12 : 1})`, opacity: milestoneT > 0.75 ? (1 - milestoneT) / 0.25 : 1 }}>
      <div className="whitespace-nowrap font-press-start text-[34px] text-yellow-300 [text-shadow:4px_4px_0_#be185d,0_0_30px_#facc15]">{combo.milestone}</div>
      <div className="mt-2 font-press-start text-[11px] text-white">{combo.count} KILL CHAIN</div>
    </div>}

    {world.anchor.discovered && !anchorOnScreen && !pastAnchor && <div className="fixed left-1/2 top-1/2 z-20 pointer-events-none" style={{ transform: `translate(-50%,-50%) translate(${Math.cos(angle) * Math.min(window.innerWidth, window.innerHeight) * 0.4}px, ${Math.sin(angle) * Math.min(window.innerWidth, window.innerHeight) * 0.4}px)` }}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-cyan-300 bg-slate-950/80 text-cyan-200 shadow-[0_0_16px_#22d3ee]"><span style={{ transform: `rotate(${angle}rad)` }}>➜</span></div>
    </div>}

    <LootReveals feed={world.itemFeed} />
    <InteractHoverCard world={world} hidden={isRevealing(world.itemFeed)} />

    <div className="fixed bottom-7 left-1/2 z-30 flex max-w-[60vw] -translate-x-1/2 flex-col items-center gap-2 pointer-events-none text-center">
      {world.noticeMs > 0 && <div className="rounded-md border border-cyan-300/40 bg-slate-950/85 px-4 py-2 text-sm font-semibold text-cyan-100">{world.notice}</div>}
      {world.prompt && !world.interact && <div className="rounded-md border border-yellow-300/60 bg-slate-950/85 px-4 py-2 text-sm font-semibold text-white">{!/^walk /i.test(world.prompt) && <kbd className="mr-2 rounded border border-yellow-300/70 bg-yellow-300/10 px-1.5 font-press-start text-[9px] text-yellow-200">E / RT</kbd>}{world.prompt}</div>}
    </div>
  </div>;
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return <div>
    <div className="font-press-start text-[8px] tracking-wider" style={{ color }}>{label}</div>
    <div className="mt-1 h-2 overflow-hidden rounded-sm bg-slate-800"><div className="h-full" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }} /></div>
  </div>;
}
