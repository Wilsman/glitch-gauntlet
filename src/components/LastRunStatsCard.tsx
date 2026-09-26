import { getLastRunStats, getNearestUnlock } from '@/lib/progressionStorage';
import { getCharacter } from '@shared/characterConfig';
import { GAME_MODES } from '@/lib/gameModes';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
}

export function LastRunStatsCard() {
  const lastRun = getLastRunStats();
  if (!lastRun) return null;
  const character = getCharacter(lastRun.characterType);
  const mode = lastRun.gameMode ?? 'arena';
  const rift = mode === 'rift';
  // Closest unlock this mode can advance, so the next run has a goal.
  const nextUnlock = getNearestUnlock(mode);
  const stats: [string, string | number][] = rift
    ? [['Stages', lastRun.stagesCleared ?? 0], ['Kills', lastRun.enemiesKilled], ['Combo', `x${lastRun.bestCombo ?? 0}`]]
    : [['Wave', lastRun.waveReached], ['Kills', lastRun.enemiesKilled], ['Time', formatTime(lastRun.survivalTimeMs)]];
  return (
    <section className="rounded-xl border border-white/10 bg-[#090b16]/90 p-4 font-sans">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Last run · <span style={{ color: GAME_MODES[mode].accent }}>{GAME_MODES[mode].short}</span>
        </h2>
        <span className={`text-xs ${lastRun.isVictory ? 'text-yellow-200' : 'text-red-300'}`}>
          {rift ? `Stage ${lastRun.waveReached} · ${formatTime(lastRun.survivalTimeMs)}` : lastRun.isVictory ? 'Victory' : 'Defeated'}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-100">
        <span aria-hidden="true" className="text-xl">{character.emoji}</span>
        {character.name}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-4 border-t border-white/10 pt-3">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{value}</dd>
          </div>
        ))}
      </dl>
      {nextUnlock && (
        <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-slate-300">
          <span aria-hidden="true" className="text-base">🔒</span>
          <span className="min-w-0 flex-1">
            Next: <span className="font-medium text-slate-100">{nextUnlock.character.name}</span> · {nextUnlock.progress.route.description}
          </span>
          <span className="tabular-nums text-slate-400">
            {nextUnlock.progress.current}/{nextUnlock.progress.route.required}
          </span>
        </div>
      )}
    </section>
  );
}
