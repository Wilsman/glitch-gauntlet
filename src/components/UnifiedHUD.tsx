import React, { useState } from "react";
import type { GameState, Player } from "@shared/types";
import { Star, Skull, Shield, Zap, Target, Sparkles } from "lucide-react";
import { getCharacter } from "@shared/characterConfig";

interface UnifiedHUDProps {
  gameState: GameState;
  localPlayer: Player;
}

const WAVE_DURATION = 20000; // 20 seconds (sync with engine)

export default function UnifiedHUD({
  gameState,
  localPlayer,
}: UnifiedHUDProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const {
    wave,
    waveTimer,
    isHellhoundRound,
    hellhoundsKilled,
    totalHellhoundsInRound,
    status,
  } = gameState;

  const character = getCharacter(localPlayer.characterType || "spray-n-pray");
  const abilityCooldown = localPlayer.abilityCooldown || 0;
  const isAbilityReady = abilityCooldown <= 0;
  const cooldownPercentage = Math.max(
    0,
    Math.min(100, (abilityCooldown / character.baseAbilityCooldown) * 100)
  );

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

      <div className="w-full flex justify-center">
        <div className="relative w-full max-w-4xl p-4 bg-black/80 backdrop-blur-xl border-2 border-neon-cyan/50 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,255,255,0.15)]">
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
                      [{localPlayer.characterType?.toUpperCase()}]
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

            {/* Middle row: Large Resource Bars and Ultimate */}
            <div className="flex flex-col md:flex-row gap-6 items-center">
              {/* Health Group */}
              <div className="flex-1 w-full flex flex-col gap-1">
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
                <div
                  className={`flex flex-col gap-1 ${
                    healthPercentage < 30 ? "animate-bounce" : ""
                  }`}
                  style={{
                    animation:
                      healthPercentage < 30 ? "jiggle 0.1s infinite" : "none",
                  }}
                >
                  <div className="relative h-6 bg-red-950/40 border-2 border-red-500/50 rounded-sm overflow-hidden group">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300 relative"
                      style={{ width: `${healthPercentage}%` }}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[pulse_2s_infinite]" />
                    </div>
                  </div>
                  {/* Shield Bar - Independent and visible */}
                  {localPlayer.maxShield && localPlayer.maxShield > 0 && (
                    <div className="relative h-2 bg-cyan-950/40 border border-neon-cyan/50 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-neon-cyan shadow-[0_0_10px_#00FFFF] transition-all duration-300"
                        style={{ width: `${shieldPercentage}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Ultimate Indicator */}
              <div className="flex-shrink-0 relative">
                <div
                  key={isAbilityReady ? "ready" : "not-ready"}
                  className={`
                    w-16 h-16 rounded-xl border-2 flex items-center justify-center cursor-help pointer-events-auto
                    transition-all duration-300 relative group
                    ${
                      isAbilityReady
                        ? "border-neon-cyan bg-neon-cyan/20 shadow-glow-cyan animate-ready"
                        : "border-gray-700 bg-black/40 grayscale"
                    }
                  `}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  {/* Icon */}
                  <div className="flex flex-col items-center">
                    <Sparkles
                      className={`w-6 h-6 ${
                        isAbilityReady ? "text-neon-cyan" : "text-gray-500"
                      }`}
                    />
                    <span
                      className={`text-[8px] mt-1 ${
                        isAbilityReady ? "text-white" : "text-gray-600"
                      }`}
                    >
                      ULT
                    </span>
                  </div>

                  {/* Cooldown Overlay */}
                  {!isAbilityReady && (
                    <div className="absolute inset-0 bg-black/60 rounded-lg overflow-hidden flex items-end">
                      <div
                        className="w-full bg-neon-cyan/40 transition-all duration-500"
                        style={{ height: `${100 - cooldownPercentage}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-white font-press-start">
                          {Math.ceil(abilityCooldown / 1000)}s
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tooltip */}
                  {showTooltip && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2">
                      <div className="bg-black/95 border-2 border-neon-cyan p-4 rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.3)] backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse" />
                          <span className="text-[10px] text-neon-cyan uppercase tracking-tighter">
                            ULTIMATE ABILITY [SPACE]
                          </span>
                        </div>
                        <h4 className="text-sm text-neon-yellow mb-1 uppercase">
                          {character.abilityName}
                        </h4>
                        <p className="font-vt323 text-base text-gray-300 leading-tight">
                          {character.abilityDescription}
                        </p>
                        <div className="mt-3 pt-2 border-t border-white/10 flex justify-between items-center text-[8px]">
                          <span className="text-gray-500 uppercase">
                            COOLDOWN
                          </span>
                          <span className="text-neon-pink">
                            {(character.baseAbilityCooldown / 1000).toFixed(0)}{" "}
                            SECONDS
                          </span>
                        </div>
                      </div>
                      {/* Tooltip Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px] border-8 border-transparent border-t-neon-cyan" />
                    </div>
                  )}
                </div>
              </div>

              {/* XP Group */}
              <div className="flex-1 w-full flex flex-col gap-1">
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
                <div className="h-6 bg-purple-950/40 border-2 border-purple-500/50 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-500"
                    style={{ width: `${xpPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
