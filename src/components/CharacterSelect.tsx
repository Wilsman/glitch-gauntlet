import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Gamepad2, LockKeyhole } from "lucide-react";
import { getAllCharacters } from "@shared/characterConfig";
import type { CharacterStats, CharacterType, PetCoat } from "@shared/types";
import { Button } from "./ui/button";
import {
  checkUnlocks,
  getPetCoat,
  getUnlockProgress,
  isCharacterUnlocked,
  setPetCoat,
  type UnlockRouteProgress,
} from "@/lib/progressionStorage";
import { GAME_MODES } from "@/lib/gameModes";
import { DACHSHUND_COATS, PET_COATS } from "@/lib/pixelSprites";
import { useGamepad } from "@/hooks/useGamepad";
import { SPRITE_MAP, USE_LEGACY_CHARACTER_SPRITES } from "@/lib/spriteMap";
import { PixelCharacterPortrait, PixelPetPortrait } from "./PixelSprite";
import { toast } from "@/components/ui/sonner";

interface CharacterSelectProps {
  onSelect: (characterType: CharacterType) => void;
  onCancel: () => void;
  unlockAll?: boolean;
}

const ALL_CHARACTERS = getAllCharacters();

const STAT_SPECS = [
  {
    label: "Vitals",
    max: 160,
    color: "bg-gradient-to-r from-rose-500 to-orange-300",
    value: (character: CharacterStats) => character.baseHealth,
    format: (value: number) => `${value}`,
  },
  {
    label: "Power",
    max: 40,
    color: "bg-gradient-to-r from-yellow-300 to-lime-300",
    value: (character: CharacterStats) => character.baseDamage,
    format: (value: number) => `${value}`,
  },
  {
    label: "Agility",
    max: 6,
    color: "bg-gradient-to-r from-cyan-300 to-sky-400",
    value: (character: CharacterStats) => character.baseSpeed,
    format: (value: number) => `${value.toFixed(1)}`,
  },
  {
    label: "Cadence",
    max: 4,
    color: "bg-gradient-to-r from-violet-400 to-fuchsia-400",
    value: (character: CharacterStats) => 1000 / character.baseAttackSpeed,
    format: (value: number) => `${value.toFixed(1)}/s`,
  },
];

function CharacterPortrait({
  character,
  animated = false,
}: {
  character: CharacterStats;
  animated?: boolean;
}) {
  const [frame, setFrame] = useState(0);
  const spriteConfig = USE_LEGACY_CHARACTER_SPRITES ? (
    SPRITE_MAP.legacyCharacters as Record<
      string,
      {
        frames?: number;
        animationSpeed?: number;
        framePath?: string;
        url?: string;
      } | undefined
    >
  )[character.type] : undefined;

  useEffect(() => {
    if (!animated || !spriteConfig?.frames) {
      setFrame(0);
      return;
    }

    const interval = window.setInterval(() => {
      setFrame((previousFrame) => (previousFrame + 1) % spriteConfig.frames!);
    }, spriteConfig.animationSpeed || 100);

    return () => window.clearInterval(interval);
  }, [animated, spriteConfig]);

  const spriteUrl = spriteConfig?.framePath
    ? spriteConfig.framePath.replace("{i}", frame.toString())
    : spriteConfig?.url;

  if (spriteUrl) {
    return (
      <img
        src={spriteUrl}
        alt={character.name}
        className="h-28 w-28 object-contain pixelated drop-shadow-[0_0_24px_rgba(255,255,255,0.2)] md:h-32 md:w-32"
      />
    );
  }

  return (
    <PixelCharacterPortrait
      type={character.type}
      animated={animated}
      className="h-28 w-28 drop-shadow-[0_0_18px_rgba(255,255,255,0.18)] md:h-32 md:w-32"
    />
  );
}

function UnlockRouteList({ routes, large = false }: { routes: UnlockRouteProgress[]; large?: boolean }) {
  return (
    <div className={`w-full ${large ? "space-y-2.5" : "space-y-2"}`}>
      {routes.map(({ route, current, done }, index) => {
        const accent = route.mode === "any" ? "#e2e8f0" : GAME_MODES[route.mode].accent;
        return (
          <div key={route.stat}>
            {index > 0 && (
              <div className="mb-1.5 text-center font-vt323 text-xs uppercase tracking-[0.3em] text-white/35">or</div>
            )}
            <div className={`flex items-center gap-2 text-left font-sans ${large ? "text-sm" : "text-xs"}`}>
              <span
                className="shrink-0 rounded border px-1.5 py-px font-vt323 text-xs uppercase tracking-[0.18em]"
                style={{ color: accent, borderColor: `${accent}66` }}
              >
                {route.mode === "any" ? "Any" : GAME_MODES[route.mode].short}
              </span>
              <span className="min-w-0 flex-1 leading-4 text-slate-200">{route.description}</span>
              <span className={`shrink-0 tabular-nums ${done ? "text-emerald-300" : "text-slate-400"}`}>
                {current}/{route.required}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-900/80">
              <div
                className="h-full rounded-full"
                style={{ width: `${(current / route.required) * 100}%`, background: accent }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getCarouselOffset(index: number, currentIndex: number, total: number) {
  let offset = index - currentIndex;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return offset;
}

function CharacterCard({
  character,
  offset,
  isSelected,
  isLocked,
  unlockRoutes,
  isDenied,
  onFocus,
  onLaunch,
}: {
  character: CharacterStats;
  offset: number;
  isSelected: boolean;
  isLocked: boolean;
  unlockRoutes: UnlockRouteProgress[];
  isDenied?: boolean;
  onFocus: () => void;
  onLaunch: () => void;
}) {
  const visibility = Math.abs(offset);
  const isVisible = visibility <= 2;


  return (
    <div
      className="absolute left-1/2 top-0 h-[480px] w-[250px] -translate-x-1/2 sm:w-[280px] md:h-[480px] md:w-[290px]"
      style={{
        zIndex: isSelected ? 40 : 20 - visibility,
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      <motion.button
        type="button"
        initial={false}
        animate={{
          x: isDenied
            ? [offset * 270, offset * 270 - 12, offset * 270 + 12, offset * 270 - 6, offset * 270]
            : offset * 270,
          scale: isSelected ? 1 : visibility === 1 ? 0.86 : 0.72,
          opacity: isVisible ? (isSelected ? 1 : visibility === 1 ? 0.78 : 0.16) : 0,
          rotateY: isSelected ? 0 : offset > 0 ? -17 : 17,
          y: isSelected ? 0 : visibility === 1 ? 18 : 36,
        }}
        transition={{ type: "spring", stiffness: 220, damping: 28 }}
        onClick={onFocus}
        onDoubleClick={() => {
          if (!isLocked) {
            onLaunch();
          }
        }}
        className={`relative flex h-full w-full flex-col overflow-hidden rounded-[24px] border-[3px] px-5 py-4 text-left transition-colors duration-200 ${
          isDenied
            ? "border-red-500 bg-[rgba(20,6,8,0.94)] text-red-300 shadow-[0_0_0_1px_rgba(255,0,0,0.3),0_0_48px_rgba(255,0,0,0.3)]"
            : isSelected
              ? "border-neon-yellow bg-[rgba(14,16,12,0.94)] text-neon-yellow shadow-[0_0_0_1px_rgba(255,255,0,0.18),0_0_48px_rgba(255,255,0,0.16)]"
              : "border-white/20 bg-[rgba(10,8,18,0.9)] text-white"
        }`}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_22%,transparent_76%,rgba(255,255,255,0.03))]" />
        <div
          className={`pointer-events-none absolute inset-0 ${
            isSelected
              ? "bg-[radial-gradient(circle_at_top,rgba(255,255,0,0.16),transparent_42%)]"
              : "bg-[radial-gradient(circle_at_top,rgba(0,255,255,0.08),transparent_42%)]"
          }`}
        />

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="font-vt323 text-xs uppercase tracking-[0.32em] text-white/75">
              {isLocked ? "Locked" : "Operator"}
            </div>
            <AnimatePresence>
              {isSelected && !isLocked && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  className="rounded-full bg-neon-yellow px-3 py-1 font-vt323 text-sm uppercase tracking-[0.24em] text-black"
                >
                  Selected
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={`relative mt-2 flex shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_58%)] ${isLocked ? "h-20" : "h-24 md:h-28"}`}>
            <motion.div
              animate={isSelected && !isLocked ? { y: [0, -7, 0], scale: [1, 1.03, 1] } : { y: 0, scale: 0.94 }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className={isLocked ? "opacity-40 brightness-50 grayscale" : undefined}
            >
              <CharacterPortrait character={character} animated={isSelected && !isLocked} />
            </motion.div>
            {isLocked && (
              <LockKeyhole className="absolute h-9 w-9 text-white/85 drop-shadow-[0_0_10px_rgba(0,0,0,0.9)]" />
            )}
          </div>

          <div className="mt-4 text-center">
            <h3 className="font-press-start text-[16px] leading-7 text-inherit sm:text-[18px]">
              {character.name}
            </h3>
            {isLocked ? (
              <div className="mt-3 min-h-[54px]">
                <UnlockRouteList routes={unlockRoutes} />
              </div>
            ) : (
              <p className="mt-3 min-h-[54px] font-sans text-sm leading-5 text-slate-200">
                {character.description}
              </p>
            )}
          </div>

          <div className={isLocked ? "mt-3 space-y-1.5" : "mt-4 space-y-2.5"}>
            {STAT_SPECS.map((stat) => {
              const value = stat.value(character);
              const width = Math.min(100, (value / stat.max) * 100);

              return (
                <div key={stat.label} className="space-y-1">
                  <div className="flex items-center justify-between font-sans text-xs font-medium text-slate-200">
                    <span>{stat.label}</span>
                    <span className="tabular-nums text-white">{stat.format(value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-slate-900/80">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                      className={`h-full ${stat.color}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </motion.button>
    </div>
  );
}

export function CharacterSelect({ onSelect, onCancel, unlockAll = false }: CharacterSelectProps) {
  const characters = ALL_CHARACTERS;
  const isUnlocked = (type: CharacterType) => unlockAll || isCharacterUnlocked(type);
  const { getGamepadInput } = useGamepad();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGamepadFocused, setIsGamepadFocused] = useState(false);
  const [deniedType, setDeniedType] = useState<CharacterType | null>(null);
  const [petCoat, setPetCoatState] = useState<PetCoat>(getPetCoat);
  const deniedTimeoutRef = useRef<number | null>(null);

  const lastGamepadInput = useRef<{
    left: boolean;
    right: boolean;
    confirm: boolean;
    cancel: boolean;
  }>({
    left: false,
    right: false,
    confirm: false,
    cancel: false,
  });

  useEffect(() => {
    checkUnlocks();
    const firstUnlockedIndex = characters.findIndex((character) =>
      unlockAll || isCharacterUnlocked(character.type),
    );
    if (firstUnlockedIndex >= 0) {
      setCurrentIndex(firstUnlockedIndex);
    }
  }, [characters, unlockAll]);

  const activeCharacter = characters[currentIndex] ?? characters[0];
  const activeUnlocked = isUnlocked(activeCharacter.type);
  const activeUnlockRoutes = !activeUnlocked ? getUnlockProgress(activeCharacter.type) : [];

  const handleMove = (direction: -1 | 1) => {
    setCurrentIndex((previousIndex) => {
      const nextIndex =
        (previousIndex + direction + characters.length) % characters.length;
      return nextIndex;
    });
  };

  const handleConfirm = () => {
    if (activeUnlocked) {
      onSelect(activeCharacter.type);
      return;
    }
    // Denied feedback: shake the card and explain the unlock requirement
    setDeniedType(activeCharacter.type);
    toast.warning("OPERATOR LOCKED", {
      description:
        activeUnlockRoutes
          .map(({ route }) => `${route.mode === "any" ? "" : `${GAME_MODES[route.mode].short}: `}${route.description}`)
          .join(" — or — ") || "Complete the unlock challenge first.",
    });
    if (deniedTimeoutRef.current) window.clearTimeout(deniedTimeoutRef.current);
    deniedTimeoutRef.current = window.setTimeout(() => setDeniedType(null), 450);
  };

  useEffect(() => {
    const pollInterval = window.setInterval(() => {
      const input = getGamepadInput();
      if (!input) {
        return;
      }

      setIsGamepadFocused(true);

      if (input.left && !lastGamepadInput.current.left) {
        handleMove(-1);
      }
      if (input.right && !lastGamepadInput.current.right) {
        handleMove(1);
      }
      if (input.blink && !lastGamepadInput.current.confirm) {
        handleConfirm();
      }

      const gamepad = navigator.getGamepads()[0];
      const isCancelPressed = !!gamepad?.buttons[1]?.pressed;
      if (isCancelPressed && !lastGamepadInput.current.cancel) {
        onCancel();
      }

      lastGamepadInput.current = {
        left: !!input.left,
        right: !!input.right,
        confirm: !!input.blink,
        cancel: isCancelPressed,
      };
    }, 100);

    const handleMouseMove = () => setIsGamepadFocused(false);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.clearInterval(pollInterval);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [activeCharacter.type, activeUnlocked, getGamepadInput, onCancel]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        handleMove(-1);
        return;
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        handleMove(1);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCharacter.type, activeUnlocked, onCancel]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(0,255,255,0.08),transparent_24%),radial-gradient(circle_at_bottom,rgba(255,0,255,0.08),transparent_18%),rgba(0,0,0,0.96)] px-4 py-4 md:px-8 md:py-4"
      >
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.08)_1px,transparent_1px)] [background-size:80px_80px]" />

        <div className="relative mx-auto flex min-h-full w-full max-w-[1280px] flex-col justify-center">
          <div className="mb-4 text-center">
            <motion.h2
              initial={{ y: -18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-press-start text-2xl text-transparent bg-gradient-to-b from-neon-cyan to-sky-500 bg-clip-text md:text-4xl"
              style={{ filter: "drop-shadow(0 0 12px rgba(0,255,255,0.45))" }}
            >
              SELECT CHARACTER
            </motion.h2>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2 }}
              className="mx-auto mt-4 h-px w-40 bg-gradient-to-r from-transparent via-neon-cyan to-transparent md:w-64"
            />
            {unlockAll && (
              <p className="mt-3 font-vt323 text-sm uppercase tracking-[0.3em] text-neon-pink">
                Beta playtest — all operators unlocked
              </p>
            )}
          </div>

          <div className="rounded-[28px] border border-white/8 bg-[rgba(5,8,18,0.82)] px-3 py-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm md:px-6 md:py-6">
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-center font-sans text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                Click or tap a card to focus
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                Enter deploys highlighted operator
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Gamepad2 className="h-4 w-4 text-neon-pink" />
                D-pad browse, A deploy, B back
              </span>
            </div>

            <div className="relative h-[500px] overflow-hidden">
              <AnimatePresence initial={false}>
                {characters.map((character, index) => {
                  const offset = getCarouselOffset(index, currentIndex, characters.length);
                  const isLocked =
                    !!character.locked && !isUnlocked(character.type);

                  return (
                    <CharacterCard
                      key={character.type}
                      character={character}
                      offset={offset}
                      isSelected={offset === 0}
                      isLocked={isLocked}
                      unlockRoutes={isLocked ? getUnlockProgress(character.type) : []}
                      isDenied={deniedType === character.type}
                      onFocus={() => setCurrentIndex(index)}
                      onLaunch={() => onSelect(character.type)}
                    />
                  );
                })}
              </AnimatePresence>

              <button
                type="button"
                onClick={() => handleMove(-1)}
                className="absolute left-0 top-1/2 z-50 -translate-y-1/2 rounded-full border border-neon-cyan/45 bg-black/70 p-3 text-neon-cyan transition-all duration-200 hover:border-neon-cyan hover:bg-neon-cyan hover:text-black md:left-2"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => handleMove(1)}
                className="absolute right-0 top-1/2 z-50 -translate-y-1/2 rounded-full border border-neon-cyan/45 bg-black/70 p-3 text-neon-cyan transition-all duration-200 hover:border-neon-cyan hover:bg-neon-cyan hover:text-black md:right-2"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-5 flex justify-center gap-2.5">
              {characters.map((character, index) => {
                const isLocked = !isUnlocked(character.type);

                return (
                  <button
                    key={character.type}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? "w-12 bg-neon-cyan shadow-[0_0_12px_rgba(0,255,255,0.5)]"
                        : isLocked
                          ? "w-3 bg-white/20"
                          : "w-3 bg-white/35 hover:bg-white/55"
                    }`}
                  />
                );
              })}
            </div>

            <div className="mx-auto mt-3 max-w-3xl rounded-[18px] border border-white/10 bg-black/25 px-4 py-3 text-center">
              <div className="font-press-start text-xs leading-5 text-white">
                {activeCharacter.name}
                <span className="mx-2 text-neon-cyan/60">|</span>
                {activeCharacter.abilityName}
              </div>
              {activeUnlockRoutes.length > 0 ? (
                <div className="mx-auto mt-3 max-w-md">
                  <div className="mb-2 font-vt323 text-sm uppercase tracking-[0.3em] text-yellow-100/80">
                    {activeUnlockRoutes.length > 1 ? "Unlock in either mode" : "Unlock"}
                  </div>
                  <UnlockRouteList routes={activeUnlockRoutes} large />
                </div>
              ) : (
              <div className="mt-2 grid gap-2 font-sans text-sm leading-5 md:grid-cols-2">
                <div className="rounded-[12px] border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-emerald-300">
                  PRO: {activeCharacter.pro}
                </div>
                <div className="rounded-[12px] border border-rose-500/15 bg-rose-500/5 px-3 py-2 text-rose-300">
                  CON: {activeCharacter.con}
                </div>
              </div>
              )}
              {activeUnlocked && activeCharacter.startsWithPet && (
                <div className="mt-3 flex flex-col items-center gap-3 rounded-[12px] border border-amber-400/15 bg-amber-400/5 px-3 py-2 sm:flex-row sm:justify-center">
                  <div className="flex items-center gap-2">
                    <PixelPetPortrait coat={petCoat} className="h-20 w-20 rounded-lg bg-white/10" />
                    <div className="text-left">
                      <div className="font-vt323 text-xs uppercase tracking-[0.28em] text-amber-200/70">Pup coat</div>
                      <div className="font-sans text-sm text-amber-100">{DACHSHUND_COATS[petCoat].label}</div>
                    </div>
                  </div>
                  <div role="radiogroup" aria-label="Pup coat colour" className="flex flex-wrap justify-center gap-2">
                    {PET_COATS.map((coat) => (
                      <button
                        key={coat}
                        type="button"
                        role="radio"
                        aria-checked={coat === petCoat}
                        aria-label={DACHSHUND_COATS[coat].label}
                        title={DACHSHUND_COATS[coat].label}
                        onClick={() => {
                          setPetCoatState(coat);
                          setPetCoat(coat);
                        }}
                        className={`h-8 w-8 rounded-full border-2 transition-all duration-150 ${
                          coat === petCoat
                            ? "scale-110 border-neon-yellow shadow-[0_0_12px_rgba(255,255,0,0.4)]"
                            : "border-white/25 hover:border-white/60"
                        }`}
                        style={{
                          background:
                            coat === "dapple"
                              ? `radial-gradient(circle at 30% 35%, ${DACHSHUND_COATS.dapple.palette.d} 0 22%, transparent 24%), radial-gradient(circle at 68% 62%, ${DACHSHUND_COATS.dapple.palette.d} 0 18%, transparent 20%), ${DACHSHUND_COATS.dapple.palette.B}`
                              : coat.endsWith("-tan")
                                ? `linear-gradient(135deg, ${DACHSHUND_COATS[coat].palette.B} 55%, ${DACHSHUND_COATS[coat].palette.t} 55%)`
                                : DACHSHUND_COATS[coat].swatch,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                onClick={onCancel}
                className="h-12 min-w-[150px] rounded-[14px] border-2 border-neon-pink bg-transparent px-6 font-press-start text-sm text-neon-pink transition-all duration-200 hover:bg-neon-pink hover:text-black hover:shadow-[0_0_24px_rgba(255,0,255,0.25)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!activeUnlocked}
                className={`h-12 min-w-[210px] rounded-[14px] border-2 px-8 font-press-start text-base transition-all duration-200 ${
                  activeUnlocked
                    ? isGamepadFocused
                      ? "border-neon-yellow bg-neon-yellow text-black shadow-[0_0_24px_rgba(255,255,0,0.35)]"
                      : "border-neon-yellow bg-transparent text-neon-yellow hover:bg-neon-yellow hover:text-black hover:shadow-[0_0_24px_rgba(255,255,0,0.25)]"
                    : "border-white/10 bg-white/5 text-white/30"
                }`}
              >
                Start Game
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
