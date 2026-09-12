import { getLastRunStats } from '@/lib/progressionStorage';
import { getCharacter } from '@shared/characterConfig';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
}

export function LastRunStatsCard() {
  const lastRun = getLastRunStats();
  if (!lastRun) return null;
  const character = getCharacter(lastRun.characterType);
  return (
    <section className="rounded-xl border border-white/10 bg-[#090b16]/90 p-4 font-sans">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Last run</h2>
        <span className={`text-xs ${lastRun.isVictory ? 'text-yellow-200' : 'text-red-300'}`}>
          {lastRun.isVictory ? 'Victory' : 'Defeated'}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-100">
        <span aria-hidden="true" className="text-xl">{character.emoji}</span>
        {character.name}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-4 border-t border-white/10 pt-3">
        {[['Wave', lastRun.waveReached], ['Kills', lastRun.enemiesKilled], ['Time', formatTime(lastRun.survivalTimeMs)]].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
