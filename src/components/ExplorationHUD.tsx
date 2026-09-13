import type { GameState, Player } from '@shared/types';
import { activeWalls, CHARGE_MS, distance } from '@/lib/explorationWorld';

export default function ExplorationHUD({ gameState, player }: { gameState: GameState; player: Player }) {
  const world = gameState.exploration;
  if (!world) return null;
  const active = world.phase === 'anchorActive';
  const ready = world.phase === 'exitReady';
  const objective = ready ? 'Return to the route map' : active ? 'Stabilise the Anchor' : world.anchor.discovered ? 'Activate the Glitch Anchor' : 'Find the Glitch Anchor';
  const seconds = Math.floor(world.elapsedMs / 1000);
  const angle = Math.atan2(world.anchor.position.y - player.position.y, world.anchor.position.x - player.position.x) * 180 / Math.PI;
  const hint = world.anchor.discovered || world.elapsedMs >= 90000 || (world.elapsedMs > 12000 && world.elapsedMs % 22000 < 2500);
  return <>
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 w-[min(390px,42vw)] rounded-xl border border-slate-500/50 bg-slate-950/90 px-4 py-3 text-slate-100 pointer-events-none font-sans" data-testid="exploration-objective">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-cyan-200/70"><span>Broken Circuit Yard</span><span>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span></div>
      <div className="mt-1 text-base font-semibold">{objective}</div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-300"><span>Pressure</span><span>{world.pressure.toFixed(2)}×</span></div>
      <div className="mt-1 h-1 rounded bg-slate-700"><div className="h-full rounded bg-amber-300/80" style={{ width: `${20 + (world.pressure - 1) / 0.75 * 80}%` }} /></div>
      {active && <div className="mt-3 text-xs">
        <div className="flex justify-between"><span>Charge {Math.floor(world.anchor.chargeMs / CHARGE_MS * 100)}%</span><span>{world.anchor.guardianDefeated ? 'Guardian defeated' : `Guardian ${Math.max(0, Math.ceil(gameState.boss?.health || 0))} HP`}</span></div>
        <div className="mt-1 h-1.5 rounded bg-slate-700"><div className="h-full rounded bg-emerald-300" style={{ width: `${world.anchor.chargeMs / CHARGE_MS * 100}%` }} /></div>
        <div className="mt-2 text-cyan-100/80">{world.anchor.occupied ? 'Charging · keep moving inside the field' : 'Charge paused · return to the field'}</div>
      </div>}
      {hint && !active && !ready && <div className="mt-2 flex items-center gap-2 text-xs text-cyan-200"><span style={{ transform: `rotate(${angle}deg)` }}>➜</span>{world.anchor.discovered ? `Anchor · ${Math.round(distance(player.position, world.anchor.position))} units` : 'Signal detected in this direction'}</div>}
    </div>
    <div className="fixed right-4 top-32 z-20 w-[192px] rounded-lg border border-slate-500/40 bg-slate-950/90 p-2 pointer-events-none" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }} aria-label="Explored yard map">
      <svg viewBox="0 0 3200 2000" className="w-full" role="img" aria-label="Visited terrain and discovered landmarks">
        <rect width="3200" height="2000" fill="#0b131d" />
        {world.visited.map(id => <rect key={id} x={id % 32 * 100} y={Math.floor(id / 32) * 100} width="100" height="100" fill="#294351" />)}
        {activeWalls(world).filter(w => world.visited.includes(Math.floor(w.y / 100) * 32 + Math.floor(w.x / 100))).map(w => <rect key={w.id} x={w.x} y={w.y} width={w.width} height={w.height} fill="#7b8e97" />)}
        {world.cache.discovered && !world.cache.claimed && <rect x={world.cache.position.x - 40} y={world.cache.position.y - 40} width="80" height="80" fill="#88ddd0" />}
        {world.elite.discovered && !world.elite.defeated && <circle cx={world.elite.position.x} cy={world.elite.position.y} r="55" fill="#f0b277" />}
        {world.anchor.discovered && <circle cx={world.anchor.position.x} cy={world.anchor.position.y} r="70" fill="#8aeeee" />}
        <circle cx={player.position.x} cy={player.position.y} r="50" fill="white" stroke="#112a35" strokeWidth="15" />
      </svg>
      <div className="mt-1 text-[10px] tracking-wider text-slate-400">DISCOVERED TERRAIN</div>
    </div>
    <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-30 flex max-w-[60vw] flex-col items-center gap-2 pointer-events-none text-center font-sans">
      {world.noticeMs > 0 && <div className="rounded-lg border border-cyan-300/30 bg-slate-950/90 px-4 py-2 text-sm text-cyan-100">{world.notice}</div>}
      {world.prompt && <div className="rounded-lg border border-cyan-300/50 bg-slate-950/95 px-4 py-2 text-sm text-white"><kbd className="mr-2 rounded border border-slate-500 px-1.5">E / RT</kbd>{world.prompt}</div>}
      <div className="rounded-lg border border-slate-500/40 bg-slate-950/90 px-4 py-2 text-xs text-slate-200">
        {player.characterType === 'dash-dynamo' ? `Momentum ${Math.round(world.momentum * 100)}% · ${world.slideCooldownMs > 0 ? `Slide ${(world.slideCooldownMs / 1000).toFixed(1)}s` : 'Shift / A: slide'} · Q / X: Overdrive` : `${world.established ? 'Established · nearby turrets fire 30% faster' : 'Hold still to establish'} · Q / X: deploy turrets`}
      </div>
    </div>
  </>;
}
