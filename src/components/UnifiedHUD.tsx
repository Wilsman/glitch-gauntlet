import React from "react";
import type { GameState, Player } from "@shared/types";
import { Star, Skull, Shield, Zap, Target } from "lucide-react";

interface UnifiedHUDProps {
  gameState: GameState;
  localPlayer: Player;
}

const WAVE_DURATION = 20000; // 20 seconds (sync with engine)

export default function UnifiedHUD({
  gameState,
  localPlayer,
}: UnifiedHUDProps) {
  const {
    wave,
    waveTimer,
    isHellhoundRound,
    hellhoundsKilled,
    totalHellhoundsInRound,
    status,
  } = gameState;

  const xpPercentage = (localPlayer.xp / localPlayer.xpToNextLevel) * 100;
  const healthPercentage = (localPlayer.health / localPlayer.maxHealth) * 100;
  const shieldPercentage = localPlayer.maxShield
    ? ((localPlayer.shield || 0) / localPlayer.maxShield) * 100
    : 0;

  const isDead = localPlayer.status === "dead";
  const remainingTime = Math.max(
    0,
    Math.ceil((WAVE_DURATION - (waveTimer || 0)) / 1000)
  );
  const timerPercentage = Math.min(
    100,
    ((waveTimer || 0) / WAVE_DURATION) * 100
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex flex-col justify-between p-4 font-press-start">
      {/* Top Header - Wave Info */}
      <div className="w-full flex flex-col items-center">
        <div className="relative w-full max-w-2xl px-8 py-2 bg-black/60 backdrop-blur-md border-b-2 border-x-2 border-neon-cyan/50 rounded-b-2xl shadow-[0_4px_20px_rgba(0,255,255,0.2)]">
          <div className="flex justify-between items-center mb-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-neon-cyan/80">WAVE</span>
              <span className="text-2xl text-neon-yellow drop-shadow-[0_0_8px_rgba(255,255,0,0.8)]">
                {wave}
              </span>
            </div>

            <div className="flex flex-col items-center">
              {isHellhoundRound ? (
                <div className="animate-pulse">
                  <span className="text-sm text-red-500">
                    🐺 HELLHOUND ROUND 🐺
                  </span>
                  <div className="text-[10px] text-white mt-1">
                    {hellhoundsKilled} / {totalHellhoundsInRound} KILLED
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-xl text-white font-vt323 tracking-widest">
                    {remainingTime}s
                  </span>
                  <div className="w-64 h-2 bg-gray-800 rounded-full mt-1 overflow-hidden border border-white/20">
                    <div
                      className="h-full bg-neon-cyan shadow-[0_0_10px_#00FFFF] transition-all duration-1000 ease-linear"
                      style={{ width: `${100 - timerPercentage}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-neon-cyan/80">STATUS</span>
              <span
                className={`text-sm ${
                  status === "bossFight"
                    ? "text-red-500 animate-pulse"
                    : "text-green-400"
                }`}
              >
                {status === "bossFight" ? "BOSS INCOMING!" : "SURVIVE"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom HUD - Player Info */}
      <div className="w-full flex justify-center">
        <div className="relative w-full max-w-3xl p-4 bg-black/80 backdrop-blur-xl border-2 border-neon-cyan/50 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,255,255,0.15)] overflow-hidden">
          {/* Decorative scanline-like effect */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-50" />

          <div className="flex flex-col gap-4">
            {/* Top row: Name, Level, and Core Stats */}
            <div className="flex justify-between items-end px-2">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-neon-cyan mb-1">
                    UNIT IDENTIFIER
                  </span>
                  <span
                    className={`text-lg ${
                      isDead ? "text-gray-500" : "text-white"
                    }`}
                  >
                    {localPlayer.name || "PLAYER_LOCAL"}{" "}
                    <span className="text-neon-cyan/60 hidden md:inline">
                      [VX-9]
                    </span>
                  </span>
                </div>
                <div className="h-10 w-[2px] bg-neon-cyan/20" />
                <div className="flex items-center gap-2 px-3 py-1 bg-neon-yellow/10 border border-neon-yellow/30 rounded-lg">
                  <Star className="w-4 h-4 text-neon-yellow fill-neon-yellow" />
                  <span className="text-lg text-neon-yellow">
                    LVL {localPlayer.level}
                  </span>
                </div>
              </div>

              <div className="flex gap-6 text-[10px]">
                <div className="flex flex-col items-center">
                  <Zap className="w-4 h-4 text-neon-pink mb-1" />
                  <span className="text-neon-pink/70">SPEED</span>
                  <span className="text-white">
                    {localPlayer.speed.toFixed(1)}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <Target className="w-4 h-4 text-neon-yellow mb-1" />
                  <span className="text-neon-yellow/70">ATK_SPD</span>
                  <span className="text-white">
                    {(1000 / localPlayer.attackSpeed).toFixed(1)}/s
                  </span>
                </div>
              </div>
            </div>

            {/* Middle row: Large Resource Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Health Group */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-2">
                    <Skull
                      className={`w-3 h-3 ${
                        isDead ? "text-gray-500" : "text-red-500"
                      }`}
                    />
                    <span className="text-[10px] text-red-400">
                      VITALS_STATUS
                    </span>
                  </div>
                  <span className="text-xs text-white">
                    {Math.ceil(localPlayer.health)}{" "}
                    <span className="text-gray-500">
                      / {localPlayer.maxHealth}
                    </span>
                  </span>
                </div>
                <div className="relative h-6 bg-red-950/40 border-2 border-red-500/50 rounded-sm overflow-hidden group">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300 relative"
                    style={{ width: `${healthPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[pulse_2s_infinite]" />
                  </div>
                  {/* Shield Overlay */}
                  {localPlayer.maxShield && localPlayer.maxShield > 0 && (
                    <div
                      className="absolute top-0 right-0 h-1 bg-neon-cyan shadow-[0_0_5px_#00FFFF] transition-all duration-300"
                      style={{ width: `${shieldPercentage}%` }}
                    />
                  )}
                </div>
              </div>

              {/* XP Group */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-purple-500" />
                    <span className="text-[10px] text-purple-400">XP</span>
                  </div>
                  <span className="text-xs text-white">
                    {localPlayer.xp}{" "}
                    <span className="text-gray-500">
                      / {localPlayer.xpToNextLevel}
                    </span>
                  </span>
                </div>
                <div className="h-4 bg-purple-950/40 border-2 border-purple-500/50 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-500"
                    style={{ width: `${xpPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Ability indicators or other sub-info could go here */}
          </div>
        </div>
      </div>
    </div>
  );
}
