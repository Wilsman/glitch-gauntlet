import React, { useEffect, useState } from "react";
import type { CollectedUpgrade, GameState, Pet, Player } from "@shared/types";
import { Coins, Heart, Shield, Sparkles, Star } from "lucide-react";
import { getCharacter } from "@shared/characterConfig";
import { SPRITE_MAP } from "@/lib/spriteMap";

interface UnifiedHUDProps {
  gameState: GameState;
  localPlayer: Player;
  localPlayerPet?: Pet | null;
}

const WAVE_DURATION = 20000; // 20 seconds (sync with engine)
const HEALTH_SLOTS = 5;
const SHIELD_SLOTS = 3;

function createSegmentFills(current: number, max: number, slots: number): number[] {
  const normalizedMax = Math.max(1, max);
  const totalFilled = Math.max(0, Math.min(slots, (current / normalizedMax) * slots));
  return Array.from({ length: slots }, (_, index) =>
    Math.max(0, Math.min(1, totalFilled - index))
  );
}

function formatUpgradeType(type: string): string {
  return type
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function UnifiedHUD({
  gameState,
  localPlayer,
  localPlayerPet = null,
}: UnifiedHUDProps) {
  const [avatarFrame, setAvatarFrame] = useState(0);
  const {
    wave,
    waveTimer,
    isHellhoundRound,
    hellhoundsKilled,
    totalHellhoundsInRound,
    status,
    isShopRound = false,
  } = gameState;

  const characterType = localPlayer.characterType || "spray-n-pray";
  const character = getCharacter(characterType);
  const spriteConfig = SPRITE_MAP.characters[characterType as keyof typeof SPRITE_MAP.characters];

  useEffect(() => {
    if (!spriteConfig?.frames || spriteConfig.frames <= 1) return;
    const interval = setInterval(() => {
      setAvatarFrame((prev) => (prev + 1) % spriteConfig.frames!);
    }, spriteConfig.animationSpeed || 110);
    return () => clearInterval(interval);
  }, [spriteConfig]);

  const avatarSrc = spriteConfig?.framePath
    ? spriteConfig.framePath.replace("{i}", avatarFrame.toString())
    : spriteConfig?.url;

  const xpPercentage = Math.max(
    0,
    Math.min(100, (localPlayer.xp / localPlayer.xpToNextLevel) * 100)
  );
  const xpToNextUpgrade = Math.max(0, Math.ceil(localPlayer.xpToNextLevel - localPlayer.xp));
  const healthPercentage = (localPlayer.health / localPlayer.maxHealth) * 100;
  const hasShield = !!localPlayer.maxShield && localPlayer.maxShield > 0;
  const healthSlots = createSegmentFills(localPlayer.health, localPlayer.maxHealth, HEALTH_SLOTS);
  const shieldSlots = hasShield
    ? createSegmentFills(localPlayer.shield || 0, localPlayer.maxShield || 1, SHIELD_SLOTS)
    : [];

  const isDead = localPlayer.status === "dead";
  const remainingTime = Math.max(0, Math.ceil((WAVE_DURATION - (waveTimer || 0)) / 1000));
  const timerPercentage = Math.min(100, ((waveTimer || 0) / WAVE_DURATION) * 100);
  const statusText = isShopRound
    ? "SHOP ROUND"
    : status === "bossFight"
      ? "BOSS FIGHT"
      : "SURVIVE";
  const petDps = localPlayerPet
    ? (localPlayerPet.damage / Math.max(0.001, localPlayerPet.attackSpeed / 1000)).toFixed(1)
    : null;

  const collectedUpgrades = (localPlayer.collectedUpgrades || []) as CollectedUpgrade[];
  const totalUpgradePicks = collectedUpgrades.reduce((sum, upgrade) => sum + upgrade.count, 0);
  const topUpgrades = [...collectedUpgrades]
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, 8);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 p-4 font-press-start">
      <div className="absolute left-3 top-3 w-[min(420px,calc(100vw-1.5rem))]">
        <div className="rounded-2xl border border-neon-cyan/55 bg-black/78 p-3.5 backdrop-blur-md shadow-[0_0_30px_rgba(0,255,255,0.22)]">
          <div className="flex items-center gap-3.5">
            <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-neon-cyan/50 bg-black/70">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={character.name}
                  className="h-full w-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl">
                  {character.emoji}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className={`truncate pt-0.5 text-[13px] ${isDead ? "text-gray-400" : "text-white"}`}>
                  {localPlayer.name || "PLAYER_LOCAL"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-neon-yellow/35 bg-neon-yellow/15 px-2 py-1 text-[10px] text-neon-yellow">
                  <Star className="h-3 w-3 fill-neon-yellow text-neon-yellow" />
                  LVL {localPlayer.level}
                </span>
              </div>
              <div className="mt-1.5 text-[10px]">
                <span className="truncate text-neon-cyan/80">{character.name}</span>
              </div>
              <div className="mt-2.5 inline-flex items-center gap-1 rounded-md border border-yellow-300/35 bg-yellow-500/10 px-2.5 py-1.5 text-[11px] text-yellow-200">
                <Coins className="h-3.5 w-3.5 text-yellow-300" />
                {Math.floor(localPlayer.coins || 0)}
              </div>
            </div>
          </div>

          <div className="mt-3.5 space-y-2">
            <div className="rounded-lg border border-red-500/45 bg-red-950/25 px-2.5 py-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-red-300">HEALTH</span>
                <span className="text-white">
                  {Math.ceil(localPlayer.health)} / {localPlayer.maxHealth}
                </span>
              </div>
              <div className={`mt-1.5 flex items-center gap-1.5 ${healthPercentage < 30 ? "animate-pulse" : ""}`}>
                {healthSlots.map((fill, index) => (
                  <div key={`health-${index}`} className="relative h-5 w-5">
                    <Heart className="h-5 w-5 fill-red-950 text-red-950" />
                    <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                      <Heart className="h-5 w-5 fill-red-500 text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {hasShield && (
              <div className="rounded-lg border border-cyan-400/45 bg-cyan-950/30 px-2.5 py-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-cyan-200">SHIELD</span>
                  <span className="text-cyan-100">
                    {Math.ceil(localPlayer.shield || 0)} / {localPlayer.maxShield}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {shieldSlots.map((fill, index) => (
                    <div key={`shield-${index}`} className="relative h-5 w-5">
                      <Shield className="h-5 w-5 fill-cyan-950 text-cyan-900" />
                      <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                        <Shield className="h-5 w-5 fill-cyan-400 text-cyan-300 drop-shadow-[0_0_6px_rgba(103,232,249,0.9)]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-purple-400/45 bg-purple-950/30 px-2.5 py-2">
              <div className="mb-1 flex items-center justify-between text-[10px]">
                <span className="inline-flex items-center gap-1 text-purple-200">
                  <Sparkles className="h-3 w-3 text-purple-300" />
                  XP
                </span>
                <span className="text-white">
                  {Math.floor(localPlayer.xp)} / {localPlayer.xpToNextLevel}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full border border-purple-500/40 bg-purple-950/70">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-300"
                  style={{ width: `${xpPercentage}%` }}
                />
              </div>
              <div className="mt-1 text-[9px] text-purple-200/90">
                NEXT UPGRADE IN {xpToNextUpgrade} XP
              </div>
            </div>
          </div>
        </div>

        {localPlayerPet && (
          <div className="-mt-px rounded-b-xl border border-t-0 border-neon-cyan/45 bg-black/72 px-3 py-2.5 shadow-[0_0_20px_rgba(0,255,255,0.14)]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] text-pink-300">
                <span className="text-sm leading-none">{localPlayerPet.emoji}</span>
                PET
              </span>
              <span className="text-[10px] text-pink-200">LVL {localPlayerPet.level}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full border border-pink-400/40 bg-pink-950/50">
              <div
                className="h-full bg-gradient-to-r from-pink-600 to-pink-400 transition-all duration-300"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, (localPlayerPet.health / Math.max(1, localPlayerPet.maxHealth)) * 100)
                  )}%`,
                }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[9px] text-pink-100/95">
              <span>HP {Math.round(localPlayerPet.health)}/{localPlayerPet.maxHealth}</span>
              <span>DPS {petDps}</span>
              <span>DMG {localPlayerPet.damage}</span>
            </div>
          </div>
        )}

        <div className="group pointer-events-auto -mt-px">
          <div className="rounded-b-xl border border-t-0 border-neon-cyan/45 bg-black/74 px-3 py-2 shadow-[0_0_20px_rgba(0,255,255,0.12)] transition-colors group-hover:border-neon-cyan/65">
            <div className="flex items-center justify-between text-[10px] text-neon-cyan">
              <span>ITEMS</span>
              <span className="text-neon-yellow">{totalUpgradePicks} PICKS</span>
            </div>
            <div className="mt-0.5 text-[8px] text-neon-cyan/70">
              {collectedUpgrades.length} UNIQUE · HOVER TO EXPAND
            </div>
          </div>
          <div className="max-h-0 overflow-hidden rounded-b-xl border border-t-0 border-neon-cyan/45 bg-black/76 px-3 transition-all duration-300 ease-out group-hover:max-h-72">
            <div className="space-y-1 py-2.5">
              {topUpgrades.length === 0 ? (
                <div className="text-[9px] text-gray-400">No upgrades collected yet.</div>
              ) : (
                topUpgrades.map((upgrade) => (
                  <div
                    key={`${upgrade.type}-${upgrade.title}`}
                    className="flex items-center justify-between rounded-md border border-neon-cyan/20 bg-black/40 px-2 py-1.5"
                  >
                    <span className="truncate text-[9px] text-gray-100">
                      <span className="mr-1">{upgrade.emoji}</span>
                      {upgrade.title || formatUpgradeType(upgrade.type)}
                    </span>
                    <span className="ml-2 shrink-0 text-[9px] text-neon-yellow">x{upgrade.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-1/2 top-4 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2">
        <div className="rounded-xl border border-neon-cyan/45 bg-black/65 px-4 py-2 backdrop-blur-md shadow-[0_0_18px_rgba(0,255,255,0.15)]">
          <div className="flex items-center justify-between gap-3 text-[10px]">
            <span className="text-neon-cyan/90">
              WAVE <span className="text-neon-yellow">{wave}</span>
            </span>
            <span
              className={`${
                isShopRound
                  ? "text-yellow-300"
                  : status === "bossFight"
                    ? "text-red-400"
                    : "text-green-400"
              }`}
            >
              {statusText}
            </span>
            {isHellhoundRound ? (
              <span className="text-red-300">
                {hellhoundsKilled || 0}/{totalHellhoundsInRound || 0} HELLHOUNDS
              </span>
            ) : (
              <span className="text-white">{remainingTime}s</span>
            )}
          </div>
          {!isHellhoundRound && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full border border-white/10 bg-black/40">
              <div
                className="h-full bg-neon-cyan transition-all duration-1000 ease-linear"
                style={{ width: `${100 - timerPercentage}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
