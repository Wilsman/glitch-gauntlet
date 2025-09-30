import { getLastRunStats } from '@/lib/progressionStorage';
import { getCharacter } from '@shared/characterConfig';
import type { LastRunStats } from '@shared/types';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function LastRunStatsCard() {
  const lastRun = getLastRunStats();

  if (!lastRun) {
    return (
      <div className="bg-black border-2 border-neon-cyan p-6 rounded-lg shadow-glow-cyan">
        <h2 className="font-press-start text-lg text-neon-yellow mb-4">
          LAST RUN
        </h2>
        <p className="font-vt323 text-xl text-neon-cyan/50 text-center py-8">
          No runs yet!
          <br />
          Play a game to see your stats here.
        </p>
      </div>
    );
  }

  const character = getCharacter(lastRun.characterType);

  return (
    <div className="bg-black border-2 border-neon-cyan p-6 rounded-lg shadow-glow-cyan">
      <h2 className="font-press-start text-lg text-neon-yellow mb-4">
        LAST RUN
      </h2>
      
      <div className="space-y-4">
        {/* Character */}
        <div className="flex items-center gap-3 pb-3 border-b border-neon-cyan/30">
          <span className="text-5xl">{character.emoji}</span>
          <div>
            <p className="font-press-start text-sm text-neon-pink">
              {character.name}
            </p>
            <p className="font-vt323 text-base text-neon-cyan/70">
              {character.weaponType}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="space-y-2 font-vt323 text-xl">
          <div className="flex justify-between">
            <span className="text-neon-cyan">Wave:</span>
            <span className="text-white font-press-start text-lg">
              {lastRun.waveReached}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-neon-cyan">Kills:</span>
            <span className="text-white font-press-start text-lg">
              {lastRun.enemiesKilled}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-neon-cyan">Time:</span>
            <span className="text-white font-press-start text-lg">
              {formatTime(lastRun.survivalTimeMs)}
            </span>
          </div>
        </div>

        {/* Result Badge */}
        <div className="pt-3 border-t border-neon-cyan/30">
          {lastRun.isVictory ? (
            <div className="bg-neon-yellow/10 border-2 border-neon-yellow rounded px-4 py-2 text-center">
              <span className="font-press-start text-lg text-neon-yellow">
                🏆 VICTORY
              </span>
            </div>
          ) : (
            <div className="bg-red-500/10 border-2 border-red-500 rounded px-4 py-2 text-center">
              <span className="font-press-start text-lg text-red-500">
                💀 DEFEATED
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
