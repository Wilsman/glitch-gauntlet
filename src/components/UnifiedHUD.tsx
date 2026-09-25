import React, { useEffect, useState } from "react";
import type { CollectedUpgrade, GameState, Pet, Player } from "@shared/types";
import ExplorationHUD from "./ExplorationHUD";
import { AbilityDock } from "./AbilityDock";
import { Coins } from "lucide-react";
import { getCharacter } from "@shared/characterConfig";
import { SPRITE_MAP } from "@/lib/spriteMap";

interface UnifiedHUDProps {
  gameState: GameState;
  localPlayer: Player;
  localPlayerPet?: Pet | null;
}

function formatUpgradeType(type: string): string {
  return type
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const PANEL =
  "rounded-md border border-white/10 bg-slate-950/70 backdrop-blur-sm";
const LABEL =
  "font-press-start text-[7px] tracking-widest text-slate-400 uppercase";

export default function UnifiedHUD({
  gameState,
  localPlayer,
  localPlayerPet = null,
}: UnifiedHUDProps) {
  const [avatarFrame, setAvatarFrame] = useState(0);
  const {
    wave,
    mapDepth = 0,
    runMap = null,
    currentEncounterType = null,
    encounterWave = 0,
    encounterWavesTotal = 0,
    encounterPhase = null,
    encounterEnemiesRemaining = 0,
    encounterEnemiesTotal = 0,
    encounterIntermissionMs = 0,
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
    : spriteConfig && "url" in spriteConfig && typeof spriteConfig.url === "string" ? spriteConfig.url : undefined;

  const xpPercentage = Math.max(
    0,
    Math.min(100, (localPlayer.xp / localPlayer.xpToNextLevel) * 100)
  );
  const healthPercentage = (localPlayer.health / localPlayer.maxHealth) * 100;
  const hasShield = !!localPlayer.maxShield && localPlayer.maxShield > 0;
  const shieldPercentage = hasShield
    ? Math.max(0, Math.min(100, ((localPlayer.shield || 0) / (localPlayer.maxShield || 1)) * 100))
    : 0;

  const isDead = localPlayer.status === "dead";
  const totalMapDepth = runMap?.nodes.reduce((max, node) => Math.max(max, node.depth), 10) || 10;
  const statusText = gameState.exploration ? "EXPLORE THE YARD" : status === "mapSelection"
    ? "CHOOSE PATH"
    : isShopRound
      ? "SHOP ROUND"
      : status === "bossFight"
        ? "BOSS FIGHT"
        : isHellhoundRound
          ? "HELLHOUND NODE"
          : currentEncounterType === "combat"
            ? "CLEAR THE PACKS"
            : "SURVIVE";
  const showCombatProgress =
    currentEncounterType === "combat" && status === "playing" && !isHellhoundRound && !gameState.exploration;
  const combatProgressPercentage =
    encounterEnemiesTotal > 0
      ? Math.min(
          100,
          ((encounterEnemiesTotal - encounterEnemiesRemaining) / encounterEnemiesTotal) * 100,
        )
      : 0;
  const intermissionSeconds = Math.max(0, Math.ceil((encounterIntermissionMs || 0) / 1000));
  const combatPackLabel =
    showCombatProgress && encounterWavesTotal > 0
      ? `PACK ${Math.max(1, encounterWave)}/${encounterWavesTotal}`
      : "SELECT A REACHABLE NODE";
  const petDps = localPlayerPet
    ? (localPlayerPet.damage / Math.max(0.001, localPlayerPet.attackSpeed / 1000)).toFixed(1)
    : null;

  const collectedUpgrades = (localPlayer.collectedUpgrades || []) as CollectedUpgrade[];
  const totalUpgradePicks = collectedUpgrades.reduce((sum, upgrade) => sum + upgrade.count, 0);
  const sortedUpgrades = [...collectedUpgrades]
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
  const tileUpgrades = sortedUpgrades.slice(0, 10);
  const extraUpgradeCount = Math.max(0, sortedUpgrades.length - tileUpgrades.length);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 p-4">
      <ExplorationHUD gameState={gameState} player={localPlayer} />

      {/* Top-left: coins + items strip */}
      <div className="group absolute left-4 top-4 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <div className={`${PANEL} flex h-7 items-center gap-1.5 px-2.5`}>
            <Coins className="h-3.5 w-3.5 text-yellow-300" />
            <span className="font-press-start text-[9px] text-yellow-200">
              {Math.floor(localPlayer.coins || 0)}
            </span>
          </div>
          {tileUpgrades.map((upgrade) => (
            <div
              key={`${upgrade.type}-${upgrade.title}`}
              className={`${PANEL} relative flex h-7 w-7 items-center justify-center text-sm leading-none`}
              title={upgrade.title || formatUpgradeType(upgrade.type)}
            >
              {upgrade.emoji}
              {upgrade.count > 1 && (
                <span className="absolute -bottom-0.5 -right-0.5 rounded-sm bg-slate-950/90 px-0.5 font-press-start text-[6px] text-yellow-200">
                  x{upgrade.count}
                </span>
              )}
            </div>
          ))}
          {extraUpgradeCount > 0 && (
            <div className={`${PANEL} flex h-7 w-7 items-center justify-center font-press-start text-[7px] text-slate-300`}>
              +{extraUpgradeCount}
            </div>
          )}
        </div>
        {collectedUpgrades.length > 0 && (
          <div className={`${PANEL} mt-1.5 hidden max-h-72 w-56 overflow-y-auto px-2.5 py-2 group-hover:block`}>
            <div className={LABEL}>
              {totalUpgradePicks} picks · {collectedUpgrades.length} unique
            </div>
            <div className="mt-1.5 space-y-1">
              {sortedUpgrades.map((upgrade) => (
                <div
                  key={`${upgrade.type}-${upgrade.title}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-xs text-slate-200">
                    <span className="mr-1">{upgrade.emoji}</span>
                    {upgrade.title || formatUpgradeType(upgrade.type)}
                  </span>
                  <span className="shrink-0 font-press-start text-[7px] text-yellow-200">
                    x{upgrade.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom-left: vitals */}
      <div className={`absolute bottom-4 left-4 w-[min(300px,calc(100vw-2rem))] ${PANEL} px-2.5 py-2`}>
        <div className="flex items-center gap-2">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-sm border border-white/10 bg-black/60">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={character.name}
                className="h-full w-full object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg">
                {character.emoji}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className={`truncate font-press-start text-[9px] ${isDead ? "text-slate-500" : "text-white"}`}>
                {localPlayer.name || "PLAYER_LOCAL"}
              </span>
              <span className="shrink-0 rounded-sm border border-yellow-300/30 bg-yellow-400/10 px-1 py-0.5 font-press-start text-[7px] text-yellow-300">
                LV {localPlayer.level}
              </span>
            </div>
            <div className={`mt-0.5 truncate ${LABEL}`}>{character.name}</div>
          </div>
        </div>

        {hasShield && (
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <span className={LABEL}>Shield</span>
              <span className="font-press-start text-[7px] text-cyan-200">
                {Math.ceil(localPlayer.shield || 0)} / {localPlayer.maxShield}
              </span>
            </div>
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-sm bg-white/10">
              <div
                className="h-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${shieldPercentage}%`, boxShadow: "0 0 8px #22d3ee" }}
              />
            </div>
          </div>
        )}

        <div className="mt-2">
          <div
            className={`relative h-3.5 overflow-hidden rounded-sm bg-white/10 ${
              healthPercentage < 30 ? "animate-pulse" : ""
            }`}
          >
            <div
              className="h-full bg-red-500 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, healthPercentage))}%`, boxShadow: "0 0 8px #ef4444" }}
            />
            <div className="absolute inset-0 flex items-center justify-center font-press-start text-[8px] text-white [text-shadow:1px_1px_0_rgba(0,0,0,0.9)]">
              {Math.ceil(localPlayer.health)} / {localPlayer.maxHealth}
            </div>
          </div>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between">
            <span className={LABEL}>XP</span>
            <span className="font-press-start text-[7px] text-white">
              {Math.floor(localPlayer.xp)} / {localPlayer.xpToNextLevel}
            </span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-sm bg-white/10">
            <div
              className="h-full bg-violet-500 transition-all duration-300"
              style={{ width: `${xpPercentage}%`, boxShadow: "0 0 8px #8b5cf6" }}
            />
          </div>
        </div>

        {localPlayerPet && (
          <div className="mt-2 border-t border-white/10 pt-1.5">
            <div className="flex items-center justify-between">
              <span className={`${LABEL} flex items-center gap-1`}>
                <span className="text-xs leading-none">{localPlayerPet.emoji}</span>
                PET LV {localPlayerPet.level}
              </span>
              <span className="font-press-start text-[7px] text-pink-300">
                DPS {petDps}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-sm bg-white/10">
              <div
                className="h-full bg-pink-400 transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, (localPlayerPet.health / Math.max(1, localPlayerPet.maxHealth)) * 100))}%`,
                  boxShadow: "0 0 8px #f472b6",
                }}
              />
            </div>
            <div className="mt-0.5 font-press-start text-[7px] text-slate-500">
              HP {Math.round(localPlayerPet.health)}/{localPlayerPet.maxHealth} · DMG {localPlayerPet.damage}
            </div>
          </div>
        )}
      </div>

      {/* Bottom-right: ability dock */}
      <div className="absolute bottom-4 right-4">
        <AbilityDock player={localPlayer} exploration={gameState.exploration} />
      </div>

      {/* Top-center: node / threat / status (arena mode only) */}
      {!gameState.exploration && (
        <div className="absolute left-1/2 top-4 w-[min(480px,calc(100vw-2rem))] -translate-x-1/2">
          <div className={`${PANEL} px-2.5 py-2`}>
            <div className="flex items-center justify-between gap-3 font-press-start text-[8px]">
              <span className="text-slate-400">
                NODE <span className="text-yellow-300">{mapDepth}</span>
                <span className="text-slate-500">/{totalMapDepth}</span>
              </span>
              <span
                className={`${
                  status === "mapSelection"
                    ? "text-cyan-200"
                    : currentEncounterType === "hellhound"
                      ? "text-red-300"
                      : currentEncounterType === "shop"
                        ? "text-yellow-300"
                        : currentEncounterType === "boss"
                          ? "text-fuchsia-300"
                          : "text-green-400"
                }`}
              >
                {statusText}
              </span>
              <span className="text-slate-400">
                THREAT <span className="text-pink-400">{Math.max(0, wave)}</span>
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-400">
                {showCombatProgress
                  ? combatPackLabel
                  : currentEncounterType
                    ? `NEXT TYPE: ${currentEncounterType.toUpperCase()}`
                    : "SELECT A REACHABLE NODE"}
              </span>
              <span
                className={`font-press-start text-[8px] ${
                  isShopRound
                    ? "text-yellow-300"
                    : isHellhoundRound
                      ? "text-red-300"
                      : showCombatProgress
                        ? encounterPhase === "intermission"
                          ? "text-cyan-300"
                          : encounterEnemiesRemaining > 0
                            ? "text-white"
                            : "text-green-300"
                        : "text-slate-400"
                }`}
              >
                {isHellhoundRound ? (
                  <>{hellhoundsKilled || 0}/{totalHellhoundsInRound || 0} HELLHOUNDS</>
                ) : showCombatProgress ? (
                  encounterPhase === "intermission" ? (
                    <>NEXT PACK IN {intermissionSeconds}s</>
                  ) : (
                    <>{encounterEnemiesRemaining} HOSTILES</>
                  )
                ) : status === "mapSelection" ? (
                  <>ROUTE PLANNING</>
                ) : status === "bossFight" ? (
                  <>FINAL PUSH</>
                ) : (
                  <>SAFE ROOM</>
                )}
              </span>
            </div>
            {showCombatProgress && (
              <div className="mt-1.5 h-1 overflow-hidden rounded-sm bg-white/10">
                <div
                  className="h-full bg-cyan-400 transition-all duration-1000 ease-linear"
                  style={{ width: `${combatProgressPercentage}%`, boxShadow: "0 0 8px #22d3ee" }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
