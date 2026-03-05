import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Gamepad2, LockKeyhole } from "lucide-react";
import { getAllCharacters } from "@shared/characterConfig";
import type { CharacterStats, CharacterType } from "@shared/types";
import { Button } from "./ui/button";
import {
  checkUnlocks,
  getUnlockProgress,
  isCharacterUnlocked,
} from "@/lib/progressionStorage";
import { UnlockTooltip } from "./UnlockTooltip";
import { useGamepad } from "@/hooks/useGamepad";
import { SPRITE_MAP } from "@/lib/spriteMap";

interface CharacterSelectProps {
  onSelect: (characterType: CharacterType) => void;
  onCancel: () => void;
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
  const spriteConfig = (
    SPRITE_MAP.characters as Record<
      string,
      {
        frames?: number;
        animationSpeed?: number;
        framePath?: string;
        url?: string;
      } | undefined
    >
  )[character.type];

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
    <div className="flex h-28 w-28 items-center justify-center text-6xl md:h-32 md:w-32">
      {character.emoji}
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
  onFocus,
  onLaunch,
  onMouseMove,
  onMouseLeave,
}: {
  character: CharacterStats;
  offset: number;
  isSelected: boolean;
  isLocked: boolean;
  onFocus: () => void;
  onLaunch: () => void;
  onMouseMove: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave: () => void;
}) {
  const visibility = Math.abs(offset);
  const isVisible = visibility <= 2;
  const unlockProgress = isLocked ? getUnlockProgress(character.type) : null;

  return (
    <div
      className="absolute left-1/2 top-0 h-[500px] w-[250px] -translate-x-1/2 sm:w-[280px] md:h-[540px] md:w-[290px]"
      style={{
        zIndex: isSelected ? 40 : 20 - visibility,
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      <motion.button
        type="button"
        initial={false}
        animate={{
          x: offset * 270,
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
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className={`relative flex h-full w-full flex-col overflow-hidden rounded-[24px] border-[3px] px-5 py-4 text-left transition-colors duration-200 ${
          isSelected
            ? "border-neon-yellow bg-[rgba(14,16,12,0.94)] text-neon-yellow shadow-[0_0_0_1px_rgba(255,255,0,0.18),0_0_48px_rgba(255,255,0,0.16)]"
            : "border-neon-pink bg-[rgba(10,8,18,0.9)] text-white shadow-[0_0_30px_rgba(255,0,255,0.1)]"
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

          <div className="relative mt-2 flex h-36 items-center justify-center rounded-[20px] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_58%)] md:h-40">
            <motion.div
              animate={isSelected ? { y: [0, -7, 0], scale: [1, 1.03, 1] } : { y: 0, scale: 0.94 }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <CharacterPortrait character={character} animated={isSelected} />
            </motion.div>
          </div>

          <div className="mt-4 text-center">
            <h3 className="font-press-start text-[16px] leading-7 text-inherit sm:text-[18px]">
              {character.name}
            </h3>
            <p className="mt-3 min-h-[54px] font-vt323 text-[20px] leading-5 text-neon-cyan">
              {character.description}
            </p>
          </div>

          <div className="mt-4 space-y-2.5">
            {STAT_SPECS.map((stat) => {
              const value = stat.value(character);
              const width = Math.min(100, (value / stat.max) * 100);

              return (
                <div key={stat.label} className="space-y-1">
                  <div className="flex items-center justify-between font-vt323 text-base uppercase tracking-[0.16em] text-white/85 md:text-lg">
                    <span>{stat.label}</span>
                    <span className="text-neon-pink">{stat.format(value)}</span>
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

          <div className="mt-3 rounded-[16px] border border-white/8 bg-black/25 p-3 font-vt323 text-[13px] leading-4 text-white/75 md:text-sm">
            <div className="text-emerald-300">
              <span className="mr-2 font-bold">PRO:</span>
              {character.pro}
            </div>
            <div className="mt-2 text-rose-300">
              <span className="mr-2 font-bold">CON:</span>
              {character.con}
            </div>
          </div>

          {isLocked && unlockProgress && character.unlockCriteria && (
            <div className="mt-3 rounded-[16px] border border-neon-yellow/25 bg-neon-yellow/8 p-3">
              <div className="flex items-center justify-between font-vt323 text-xs uppercase tracking-[0.28em] text-neon-yellow">
                <span>Unlock</span>
                <span>
                  {Math.min(unlockProgress.current, unlockProgress.required)}/
                  {unlockProgress.required}
                </span>
              </div>
              <p className="mt-2 font-vt323 text-base leading-4 text-white/80 md:text-lg md:leading-5">
                {character.unlockCriteria.description}
              </p>
            </div>
          )}
        </div>

        {isLocked && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
            <div className="rounded-full border border-white/15 bg-black/65 px-4 py-3 text-center">
              <LockKeyhole className="mx-auto h-7 w-7 text-white/80" />
              <div className="mt-2 font-vt323 text-base uppercase tracking-[0.32em] text-white/70">
                Locked
              </div>
            </div>
          </div>
        )}
      </motion.button>
    </div>
  );
}

export function CharacterSelect({ onSelect, onCancel }: CharacterSelectProps) {
  const characters = ALL_CHARACTERS;
  const { getGamepadInput } = useGamepad();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    current: number;
    required: number;
    description: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    current: 0,
    required: 0,
    description: "",
  });
  const [isGamepadFocused, setIsGamepadFocused] = useState(false);

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
      isCharacterUnlocked(character.type),
    );
    if (firstUnlockedIndex >= 0) {
      setCurrentIndex(firstUnlockedIndex);
    }
  }, [characters]);

  const activeCharacter = characters[currentIndex] ?? characters[0];
  const activeUnlocked = isCharacterUnlocked(activeCharacter.type);

  const handleMove = (direction: -1 | 1) => {
    setCurrentIndex((previousIndex) => {
      const nextIndex =
        (previousIndex + direction + characters.length) % characters.length;
      return nextIndex;
    });
    setTooltipState((previous) => ({ ...previous, visible: false }));
  };

  const handleConfirm = () => {
    if (activeUnlocked) {
      onSelect(activeCharacter.type);
    }
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

  const handleLockedTooltip = (
    event: React.MouseEvent<HTMLButtonElement>,
    character: CharacterStats,
  ) => {
    const progress = getUnlockProgress(character.type);
    if (!progress || !character.unlockCriteria) {
      setTooltipState((previous) => ({ ...previous, visible: false }));
      return;
    }

    setTooltipState({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      current: progress.current,
      required: progress.required,
      description: character.unlockCriteria.description,
    });
  };

  return (
    <>
      <UnlockTooltip {...tooltipState} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(0,255,255,0.08),transparent_24%),radial-gradient(circle_at_bottom,rgba(255,0,255,0.08),transparent_18%),rgba(0,0,0,0.96)] px-4 py-4 md:px-8 md:py-6"
      >
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.08)_1px,transparent_1px)] [background-size:80px_80px]" />

        <div className="relative mx-auto flex min-h-full w-full max-w-[1280px] flex-col justify-center">
          <div className="mb-6 text-center md:mb-8">
            <motion.h2
              initial={{ y: -18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-press-start text-3xl text-transparent bg-gradient-to-b from-neon-cyan to-sky-500 bg-clip-text md:text-5xl"
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
          </div>

          <div className="rounded-[28px] border border-white/8 bg-[rgba(5,8,18,0.82)] px-3 py-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm md:px-6 md:py-6">
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-center font-vt323 text-lg text-white/70 md:mb-6">
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

            <div className="relative h-[520px] overflow-hidden md:h-[560px]">
              <AnimatePresence initial={false}>
                {characters.map((character, index) => {
                  const offset = getCarouselOffset(index, currentIndex, characters.length);
                  const isLocked =
                    character.locked && !isCharacterUnlocked(character.type);

                  return (
                    <CharacterCard
                      key={character.type}
                      character={character}
                      offset={offset}
                      isSelected={offset === 0}
                      isLocked={isLocked}
                      onFocus={() => {
                        setCurrentIndex(index);
                        setTooltipState((previous) => ({ ...previous, visible: false }));
                      }}
                      onLaunch={() => onSelect(character.type)}
                      onMouseMove={(event) => {
                        if (isLocked) {
                          handleLockedTooltip(event, character);
                          return;
                        }
                        setTooltipState((previous) => ({ ...previous, visible: false }));
                      }}
                      onMouseLeave={() =>
                        setTooltipState((previous) => ({ ...previous, visible: false }))
                      }
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
                const isLocked = !isCharacterUnlocked(character.type);

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

            <div className="mx-auto mt-5 max-w-3xl rounded-[18px] border border-white/10 bg-black/25 px-4 py-3 text-center">
              <div className="font-vt323 text-xs uppercase tracking-[0.34em] text-white/45">
                Highlighted Operator
              </div>
              <div className="mt-2 font-press-start text-[13px] leading-6 text-white md:text-[15px]">
                {activeCharacter.name}
                <span className="mx-2 text-neon-cyan/60">|</span>
                {activeCharacter.abilityName}
              </div>
              <div className="mt-2 grid gap-2 font-vt323 text-[15px] leading-4 md:grid-cols-2 md:text-base">
                <div className="rounded-[12px] border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-emerald-300">
                  PRO: {activeCharacter.pro}
                </div>
                <div className="rounded-[12px] border border-rose-500/15 bg-rose-500/5 px-3 py-2 text-rose-300">
                  CON: {activeCharacter.con}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                onClick={onCancel}
                className="h-14 min-w-[150px] rounded-[14px] border-2 border-neon-pink bg-transparent px-8 font-press-start text-base text-neon-pink transition-all duration-200 hover:bg-neon-pink hover:text-black hover:shadow-[0_0_24px_rgba(255,0,255,0.25)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!activeUnlocked}
                className={`h-14 min-w-[210px] rounded-[14px] border-2 px-8 font-press-start text-base transition-all duration-200 ${
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
