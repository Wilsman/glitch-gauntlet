import type { GameState, Player } from '@shared/types';
import { activeWalls, CHARGE_MS, COMBO_WINDOW_MS, DIFFICULTY_TIERS, VIEW_HEIGHT, VIEW_WIDTH, difficultyTier, distance } from '@/lib/explorationWorld';

const RARITY_COLORS: Record<string, string> = { common: '#e2e8f0', uncommon: '#4ade80', legendary: '#f87171', boss: '#facc15', lunar: '#60a5fa', void: '#c084fc' };
const CHEST_COLORS = { small: '#22d3ee', large: '#facc15', shrine: '#f472b6' };

export default function ExplorationHUD({ gameState, player }: { gameState: GameState; player: Player }) {
  const world = gameState.exploration;
  if (!world) return null;
  const active = world.phase === 'anchorActive';
  const ready = world.phase === 'exitReady';
  const objective = ready ? 'Return to the route map' : active ? 'Stabilise the Anchor' : world.anchor.discovered ? 'Activate the Glitch Anchor' : 'Find the Glitch Anchor';
  const seconds = Math.floor(world.elapsedMs / 1000);
  const tier = difficultyTier(world.elapsedMs);
  const dx = world.anchor.position.x - player.position.x, dy = world.anchor.position.y - player.position.y;
  const angle = Math.atan2(dy, dx);
  const hint = world.anchor.discovered || world.elapsedMs >= 90000 || (world.elapsedMs > 12000 && world.elapsedMs % 22000 < 2500);
  const anchorOnScreen = world.anchor.position.x > world.camera.x && world.anchor.position.x < world.camera.x + VIEW_WIDTH && world.anchor.position.y > world.camera.y && world.anchor.position.y < world.camera.y + VIEW_HEIGHT;
  const combo = world.combo;
  const milestoneT = 1 - combo.milestoneMs / 2000;
  const visited = new Set(world.visited);
  const seen = (p: { x: number; y: number }) => visited.has(Math.floor(p.y / 100) * 32 + Math.floor(p.x / 100));
  const guardianHp = gameState.boss ? Math.max(0, gameState.boss.health / gameState.boss.maxHealth) : 0;
  return <div className="font-sans">
    <div className="fixed left-1/2 top-3 z-30 w-[min(430px,44vw)] -translate-x-1/2 pointer-events-none" data-testid="exploration-objective">
      <div className="relative overflow-hidden rounded-xl border border-cyan-300/40 bg-slate-950/85 px-4 py-2.5 text-slate-100 shadow-[0_0_30px_rgba(34,211,238,0.18)] backdrop-blur">
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan-300 via-fuchsia-400 to-rose-400" />
        <div className="flex items-center justify-between font-press-start text-[8px] uppercase tracking-widest text-cyan-300/80"><span>Objective</span><span style={{ color: tier.color }}>{tier.label}</span></div>
        <div className="mt-1.5 text-[15px] font-bold tracking-wide">{objective}</div>
        {active && <div className="mt-2 space-y-1.5">
          <Bar label={`CHARGE ${Math.floor(world.anchor.chargeMs / CHARGE_MS * 100)}%`} value={world.anchor.chargeMs / CHARGE_MS} color="#6ee7b7" />
          <Bar label={world.anchor.guardianDefeated ? 'GUARDIAN DELETED' : `GUARDIAN ${Math.ceil(gameState.boss?.health || 0)} HP`} value={guardianHp} color="#f43f5e" />
          <div className={`text-xs font-semibold ${world.anchor.occupied ? 'text-emerald-200' : 'animate-pulse text-rose-300'}`}>{world.anchor.occupied ? 'Charging · keep moving inside the field' : 'Charge paused · return to the field'}</div>
        </div>}
        {hint && !active && !ready && <div className="mt-1.5 flex items-center gap-2 text-xs text-cyan-200"><span className="inline-block" style={{ transform: `rotate(${angle}rad)` }}>➜</span>{world.anchor.discovered ? `Anchor · ${Math.round(distance(player.position, world.anchor.position))}m` : 'Signal detected in this direction'}</div>}
      </div>
    </div>

    <div className="fixed right-4 top-14 z-30 w-[250px] pointer-events-none" data-testid="exploration-difficulty">
      <div className="rounded-xl border border-white/15 bg-slate-950/85 p-3 shadow-[0_0_24px_rgba(0,0,0,0.6)] backdrop-blur">
        <div className="flex items-center justify-between font-press-start text-[7px] tracking-widest text-slate-400"><span>BROKEN CIRCUIT YARD</span><span>STAGE 1</span></div>
        <div className="mt-2 flex items-end justify-between">
          <div className="font-press-start text-[26px] leading-none text-white [text-shadow:0_0_14px_rgba(255,255,255,0.35)]">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</div>
          <div className="text-right font-press-start text-[8px] text-slate-400">KILLS<div className="mt-1 text-[12px] text-white">{world.kills}</div></div>
        </div>
        <div className="mt-3 flex h-3 gap-[2px] overflow-hidden rounded-sm">
          {DIFFICULTY_TIERS.map((t, i) => <div key={t.label} className="relative flex-1 bg-slate-800" style={{ backgroundColor: i < tier.index ? t.color : undefined, opacity: i < tier.index ? 0.55 : 1 }}>
            {i === tier.index && <div className="absolute inset-y-0 left-0" style={{ width: `${tier.progress * 100}%`, backgroundColor: t.color, boxShadow: `0 0 10px ${t.color}` }} />}
          </div>)}
        </div>
        <div className="mt-2 font-press-start text-[11px] tracking-wider" style={{ color: tier.color, textShadow: `0 0 12px ${tier.color}` }}>{tier.label}</div>
      </div>
    </div>

    <div className="fixed right-4 top-[212px] z-20 w-[250px] rounded-xl border border-cyan-400/25 bg-slate-950/85 p-2 pointer-events-none backdrop-blur" aria-label="Explored yard map">
      <svg viewBox="0 0 3200 2000" className="w-full rounded-md" role="img" aria-label="Visited terrain and discovered landmarks">
        <rect width="3200" height="2000" fill="#050912" />
        {world.visited.map(id => <rect key={id} x={id % 32 * 100} y={Math.floor(id / 32) * 100} width="100" height="100" fill="#0f2a3a" />)}
        {activeWalls(world).filter(w => seen(w)).map(w => <rect key={w.id} x={w.x} y={w.y} width={w.width} height={w.height} fill="#5eead4" opacity="0.55" />)}
        {world.chests.filter(c => seen(c.position)).map(c => <rect key={c.id} x={c.position.x - 45} y={c.position.y - 45} width="90" height="90" fill={c.opened ? '#334155' : CHEST_COLORS[c.kind]} transform={c.kind === 'shrine' ? `rotate(45 ${c.position.x} ${c.position.y})` : undefined} />)}
        {world.cache.discovered && !world.cache.claimed && <rect x={world.cache.position.x - 40} y={world.cache.position.y - 40} width="80" height="80" fill="#5eead4" />}
        {world.elite.discovered && !world.elite.defeated && <circle cx={world.elite.position.x} cy={world.elite.position.y} r="60" fill="#f59e0b" />}
        {world.anchor.discovered && <circle cx={world.anchor.position.x} cy={world.anchor.position.y} r="90" fill="none" stroke="#67e8f9" strokeWidth="30" />}
        <rect x={world.camera.x} y={world.camera.y} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="14" />
        <circle cx={player.position.x} cy={player.position.y} r="55" fill="white" stroke="#22d3ee" strokeWidth="20" />
      </svg>
      <div className="mt-1 flex justify-between font-press-start text-[7px] tracking-wider text-slate-500"><span>DISCOVERED TERRAIN</span><span>{world.chests.filter(c => c.opened).length}/{world.chests.length} LOOTED</span></div>
    </div>

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

    {world.anchor.discovered && !anchorOnScreen && !ready && <div className="fixed left-1/2 top-1/2 z-20 pointer-events-none" style={{ transform: `translate(-50%,-50%) translate(${Math.cos(angle) * Math.min(window.innerWidth, window.innerHeight) * 0.4}px, ${Math.sin(angle) * Math.min(window.innerWidth, window.innerHeight) * 0.4}px)` }}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-cyan-300 bg-slate-950/80 text-cyan-200 shadow-[0_0_16px_#22d3ee]"><span style={{ transform: `rotate(${angle}rad)` }}>➜</span></div>
    </div>}

    <div className="fixed bottom-24 left-1/2 z-30 flex w-[min(440px,60vw)] -translate-x-1/2 flex-col gap-2 pointer-events-none" data-testid="exploration-item-feed">
      {world.itemFeed.map(item => {
        const color = RARITY_COLORS[item.rarity] || '#fff';
        const enter = Math.min(1, (4500 - item.ms) / 180);
        return <div key={item.id} className="flex items-center gap-3 overflow-hidden rounded-lg border bg-slate-950/90 px-3 py-2 shadow-lg" style={{ borderColor: color, boxShadow: `0 0 18px ${color}55`, opacity: item.ms < 600 ? item.ms / 600 : 1, transform: `translateY(${(1 - enter) * 20}px)` }}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-2xl" style={{ backgroundColor: `${color}22`, border: `1px solid ${color}` }}>{item.emoji}</div>
          <div className="min-w-0">
            <div className="font-press-start text-[9px] leading-relaxed" style={{ color }}>{item.title}</div>
            <div className="truncate text-xs text-slate-300">{item.description}</div>
          </div>
        </div>;
      })}
    </div>

    <div className="fixed bottom-7 left-1/2 z-30 flex max-w-[60vw] -translate-x-1/2 flex-col items-center gap-2 pointer-events-none text-center">
      {world.noticeMs > 0 && <div className="rounded-lg border border-cyan-300/40 bg-slate-950/90 px-4 py-2 text-sm font-semibold text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.25)]">{world.notice}</div>}
      {world.prompt && <div className="rounded-lg border border-yellow-300/60 bg-slate-950/95 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_18px_rgba(250,204,21,0.25)]"><kbd className="mr-2 rounded border border-yellow-300/70 bg-yellow-300/10 px-1.5 font-press-start text-[9px] text-yellow-200">E / RT</kbd>{world.prompt}</div>}
      <div className="flex items-center gap-3 rounded-lg border border-slate-500/40 bg-slate-950/90 px-4 py-2 text-xs text-slate-200">
        {player.characterType === 'dash-dynamo' ? <>
          <span className="font-press-start text-[8px] text-cyan-300">MOMENTUM</span>
          <div className="flex gap-[3px]">{Array.from({ length: 10 }, (_, i) => <div key={i} className="h-3 w-2.5 -skew-x-12" style={{ backgroundColor: i < Math.round(world.momentum * 10) ? (i > 6 ? '#f0abfc' : '#22d3ee') : '#1e293b', boxShadow: i < Math.round(world.momentum * 10) ? '0 0 6px #22d3ee' : undefined }} />)}</div>
          <span>{world.slideCooldownMs > 0 ? `Slide ${(world.slideCooldownMs / 1000).toFixed(1)}s` : 'Shift / A: slide'} · Q / X: Overdrive</span>
        </> : <span>{world.established ? 'Established · nearby turrets fire 30% faster' : 'Hold still to establish'} · Q / X: deploy turrets</span>}
      </div>
    </div>
  </div>;
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return <div>
    <div className="font-press-start text-[8px] tracking-wider" style={{ color }}>{label}</div>
    <div className="mt-1 h-2 overflow-hidden rounded-sm bg-slate-800"><div className="h-full" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }} /></div>
  </div>;
}
