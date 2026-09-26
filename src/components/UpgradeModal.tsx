import React, { useEffect, useState, useRef, useCallback } from "react";
import { useGameStore } from "@/hooks/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { useGamepad } from "@/hooks/useGamepad";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { AudioManager } from "@/lib/audio/AudioManager";
import { rarityFx } from "./upgrade-modal/rarityFx";
import {
  UpgradeParticles,
  type UpgradeParticlesHandle,
} from "./upgrade-modal/UpgradeParticles";
import { UpgradeCard, type CardPhase } from "./upgrade-modal/UpgradeCard";

interface UpgradeModalProps {
  onSelectUpgrade: (upgradeId: string) => void;
}

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function UpgradeModal({ onSelectUpgrade }: UpgradeModalProps) {
  const { isUpgradeModalOpen, upgradeOptions } = useGameStore(
    useShallow((state) => ({
      isUpgradeModalOpen: state.isUpgradeModalOpen,
      upgradeOptions: state.upgradeOptions,
    })),
  );
  const gameState = useGameStore((state) => state.gameState);
  const localPlayerId = useGameStore((state) => state.localPlayerId);

  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isGamepadActive, setIsGamepadActive] = useState(false);
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<string | null>(
    null,
  );
  const [phases, setPhases] = useState<CardPhase[]>([]);
  const [flash, setFlash] = useState<{ color: string; key: number } | null>(
    null,
  );
  const [glitchFx, setGlitchFx] = useState<{
    color: string;
    accent: string;
    key: number;
  } | null>(null);
  const shakeControls = useAnimationControls();
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const revealTimersRef = useRef<NodeJS.Timeout[]>([]);
  const particlesRef = useRef<UpgradeParticlesHandle>(null);
  const cardElsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const phasesRef = useRef<CardPhase[]>([]);
  const flashKeyRef = useRef(0);

  const promptType = gameState?.upgradePromptType ?? "levelUp";
  const localPlayer =
    gameState?.players.find((player) => player.id === localPlayerId) ?? null;
  const playerCoins = Math.floor(localPlayer?.coins || 0);
  const isShopPrompt =
    promptType === "shop" ||
    upgradeOptions.some((option) => option.source === "shop");

  const topFx = upgradeOptions.reduce(
    (best, option) => {
      const fx = rarityFx(option.rarity);
      return fx.tier > best.tier ? fx : best;
    },
    rarityFx("common"),
  );

  const { getGamepadInput } = useGamepad();
  const lastGamepadInput = useRef<{
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    confirm: boolean;
  }>({
    left: false,
    right: false,
    up: false,
    down: false,
    confirm: false,
  });

  const cardCenter = useCallback((index: number) => {
    const el = cardElsRef.current[index];
    if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  const fireFlash = useCallback((color: string) => {
    flashKeyRef.current += 1;
    setFlash({ color, key: flashKeyRef.current });
  }, []);

  const fireGlitch = useCallback((color: string, accent: string) => {
    flashKeyRef.current += 1;
    setGlitchFx({ color, accent, key: flashKeyRef.current });
  }, []);

  const shake = useCallback(
    (amp: number, duration = 0.32) => {
      if (REDUCED_MOTION || amp <= 0) return;
      shakeControls.start({
        x: [0, -amp, amp * 0.9, -amp * 0.6, amp * 0.4, 0],
        y: [0, 2, -2, 1, 0],
        transition: { duration, ease: "easeInOut" },
      });
    },
    [shakeControls],
  );

  const revealCard = useCallback(
    (index: number) => {
      const option = upgradeOptions[index];
      if (!option) return;
      const fx = rarityFx(option.rarity);
      setPhases((prev) => {
        if (prev[index] === 2) return prev;
        const next = [...prev];
        next[index] = 2;
        phasesRef.current = next;
        return next;
      });
      const { x, y } = cardCenter(index);
      particlesRef.current?.burst(x, y, {
        color: fx.color,
        accent: fx.accent,
        count: 30 + fx.tier * 90,
        speed: 260 + fx.tier * 90,
        kind: "square",
      });
      if (fx.tier >= 1) {
        particlesRef.current?.burst(x, y, {
          color: fx.color,
          count: 1,
          speed: 870,
          kind: "ring",
        });
      }
      if (fx.tier >= 3) {
        particlesRef.current?.burst(x, y, {
          color: fx.accent,
          count: 1,
          speed: 590,
          kind: "ring",
        });
        fireFlash(fx.color);
        fireGlitch(fx.color, fx.accent);
        shake(4, 0.25);
      }
      AudioManager.getInstance().playUpgradeReveal(fx.tier);
    },
    [upgradeOptions, cardCenter, fireFlash, fireGlitch, shake],
  );

  const skipReveal = useCallback(() => {
    revealTimersRef.current.forEach(clearTimeout);
    revealTimersRef.current = [];
    upgradeOptions.forEach((option, index) => {
      if (phasesRef.current[index] !== 2) {
        revealCard(index);
      }
    });
  }, [upgradeOptions, revealCard]);

  // Reset state when modal opens + schedule the deal/reveal timeline
  useEffect(() => {
    if (isUpgradeModalOpen && upgradeOptions.length > 0) {
      setIsAnimatingIn(false);
      setHoveredIndex(null);
      setIsSelecting(false);
      setSelectedUpgradeId(null);
      setIsGamepadActive(false);
      const initial = upgradeOptions.map(() => 0 as CardPhase);
      setPhases(initial);
      phasesRef.current = initial;

      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
        selectionTimeoutRef.current = null;
      }
      revealTimersRef.current.forEach(clearTimeout);
      revealTimersRef.current = [];

      upgradeOptions.forEach((option, index) => {
        const fx = rarityFx(option.rarity);
        const flipAt = 350 + index * 220 + (fx.tier >= 2 ? 250 : 0);
        if (fx.tier >= 2) {
          revealTimersRef.current.push(
            setTimeout(() => {
              setPhases((prev) => {
                const next = [...prev];
                if (next[index] === 0) next[index] = 1;
                phasesRef.current = next;
                return next;
              });
            }, flipAt - 250),
          );
        }
        revealTimersRef.current.push(
          setTimeout(() => revealCard(index), flipAt),
        );
      });

      requestAnimationFrame(() => {
        setIsAnimatingIn(true);
      });
    }
  }, [isUpgradeModalOpen, upgradeOptions, revealCard]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
      revealTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // Ambient embers tinted by the highest rarity on offer
  useEffect(() => {
    if (isUpgradeModalOpen) {
      particlesRef.current?.setAmbient(topFx.color, topFx.tier);
    }
  }, [isUpgradeModalOpen, topFx]);

  // Per-card edge emitters (updated on hover/phase change + slow interval)
  useEffect(() => {
    if (!isUpgradeModalOpen) return;
    const push = () => {
      const list = upgradeOptions
        .map((option, index) => {
          const el = cardElsRef.current[index];
          if (!el || phasesRef.current[index] !== 2) return null;
          const fx = rarityFx(option.rarity);
          return {
            rect: el.getBoundingClientRect(),
            color: fx.color,
            accent: fx.accent,
            tier: fx.tier,
            intensity: hoveredIndex === index ? 2.5 : 1,
          };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);
      particlesRef.current?.setEmitters(list);
    };
    push();
    const interval = setInterval(push, 200);
    return () => clearInterval(interval);
  }, [isUpgradeModalOpen, upgradeOptions, hoveredIndex, phases]);

  const allRevealed =
    phases.length > 0 && phases.every((phase) => phase === 2);

  const handleSelect = useCallback(
    (upgradeId: string) => {
      if (isSelecting || !allRevealed) return;

      setSelectedUpgradeId(upgradeId);
      setIsSelecting(true);

      const index = upgradeOptions.findIndex((o) => o.id === upgradeId);
      const option = upgradeOptions[index];
      const fx = rarityFx(option?.rarity);
      const { x, y } = cardCenter(index);
      particlesRef.current?.burst(x, y, {
        color: fx.color,
        accent: fx.accent,
        count: 90 + fx.tier * 180,
        speed: 320 + fx.tier * 110,
        kind: "square",
      });
      particlesRef.current?.burst(x, y, {
        color: fx.color,
        count: 16,
        speed: 200,
        kind: "emoji",
        text: option?.emoji || "🎁",
      });
      if (fx.tier >= 1) {
        particlesRef.current?.burst(x, y, {
          color: fx.accent,
          accent: fx.color,
          count: 40 + fx.tier * 20,
          speed: 240,
          kind: "confetti",
        });
      }
      const rings = 2 + Math.min(1, fx.tier);
      for (let i = 0; i < rings; i++) {
        setTimeout(() => {
          particlesRef.current?.burst(x, y, {
            color: i % 2 ? fx.accent : fx.color,
            count: 1,
            speed: 730 - i * 170,
            kind: "ring",
          });
        }, i * 90);
      }
      fireFlash(fx.color);
      shake(4 + fx.tier * 4);
      AudioManager.getInstance().playUpgradeSelect(fx.tier);

      // Longer delay so lock-in effects are visible and satisfying
      selectionTimeoutRef.current = setTimeout(() => {
        onSelectUpgrade(upgradeId);
      }, 650);
    },
    [isSelecting, allRevealed, upgradeOptions, cardCenter, fireFlash, shake, onSelectUpgrade],
  );

  // Gamepad polling for menu navigation
  useEffect(() => {
    if (!isUpgradeModalOpen) return;

    const pollInterval = setInterval(() => {
      const input = getGamepadInput();
      if (!input) return;
      setIsGamepadActive(true);

      // Handle navigation
      const current = hoveredIndex ?? 0;
      if (
        (input.left && !lastGamepadInput.current.left) ||
        (input.up && !lastGamepadInput.current.up)
      ) {
        setHoveredIndex(Math.max(0, current - 1));
      }
      if (
        (input.right && !lastGamepadInput.current.right) ||
        (input.down && !lastGamepadInput.current.down)
      ) {
        setHoveredIndex(Math.min(upgradeOptions.length - 1, current + 1));
      }

      // Handle Selection / skip reveal
      if (input.blink && !lastGamepadInput.current.confirm) {
        if (!allRevealed) {
          skipReveal();
        } else {
          const option = upgradeOptions[hoveredIndex ?? 0];
          const canAfford =
            !isShopPrompt || option?.isSkipOption || (option?.cost || 0) <= playerCoins;
          if (option && canAfford) {
            handleSelect(option.id);
          }
        }
      }

      lastGamepadInput.current = {
        left: !!input.left,
        right: !!input.right,
        up: !!input.up,
        down: !!input.down,
        confirm: !!input.blink,
      };
    }, 100);

    const handleMouseMove = () => {
      if (isGamepadActive) {
        setIsGamepadActive(false);
        setHoveredIndex(null);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [
    getGamepadInput,
    isUpgradeModalOpen,
    hoveredIndex,
    upgradeOptions,
    handleSelect,
    isGamepadActive,
    isShopPrompt,
    playerCoins,
    allRevealed,
    skipReveal,
  ]);

  if (!isUpgradeModalOpen || upgradeOptions.length === 0) {
    return null;
  }

  const isSelectionFxActive = isSelecting && selectedUpgradeId !== null;
  const fanCenter = (upgradeOptions.length - 1) / 2;
  const title = isShopPrompt ? "SHOP ROUND" : "LEVEL UP!";

  return (
    <motion.div
      className="fixed inset-0 bg-black/85 flex flex-col items-center justify-center z-50 overflow-hidden"
      animate={shakeControls}
      onClick={() => {
        if (!allRevealed) skipReveal();
      }}
    >
      {/* Radial glow behind the cards in the top rarity colour */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 52%, ${topFx.color}30 0%, transparent 55%)`,
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Rotating light rays for high-rarity line-ups */}
      {topFx.tier >= 2 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center mix-blend-screen">
          <motion.div
            className="h-[130vmin] w-[130vmin] rounded-full opacity-[0.12]"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, ${topFx.color} 12deg, transparent 26deg, transparent 90deg, ${topFx.accent} 104deg, transparent 118deg, transparent 200deg, ${topFx.color} 214deg, transparent 228deg, transparent 300deg, ${topFx.accent} 314deg, transparent 330deg)`,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}
      {/* Scanlines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          background:
            "repeating-linear-gradient(0deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 3px)",
        }}
      />
      {/* Full-screen rarity flash */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.key}
            className="pointer-events-none absolute inset-0 mix-blend-screen"
            style={{ backgroundColor: flash.color }}
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
      {/* Glitch slices on tier-3 reveal */}
      {glitchFx && (
        <div key={glitchFx.key} className="pointer-events-none absolute inset-0 mix-blend-screen">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute left-0 h-[5px] w-full"
              style={{
                top: `${18 + i * 17 + (glitchFx.key % 7)}%`,
                backgroundColor: i % 2 ? glitchFx.accent : glitchFx.color,
              }}
              initial={{ opacity: 0.8, x: i % 2 ? 70 : -70 }}
              animate={{ opacity: 0, x: i % 2 ? -30 : 30 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            />
          ))}
        </div>
      )}

      <UpgradeParticles ref={particlesRef} />

      <AnimatePresence>
        {isSelectionFxActive && (
          <>
            <motion.div
              className="absolute inset-0 pointer-events-none mix-blend-screen"
              style={{
                background:
                  "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.95) 0%, rgba(0,0,0,0) 55%)",
              }}
              initial={{ opacity: 0.85, scale: 0.85 }}
              animate={{ opacity: 0, scale: 1.45 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-0 pointer-events-none mix-blend-screen"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,0,110,0.35), transparent 45%, rgba(0,255,255,0.35))",
              }}
              initial={{ opacity: 0.7, x: -20 }}
              animate={{ opacity: 0, x: 20 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Title */}
      <div className="relative z-10 mb-8 text-center">
        <motion.h2
          className="font-press-start text-4xl md:text-5xl text-neon-yellow text-center"
          animate={{
            textShadow: [
              "2px 0 0 rgba(255,0,60,0.7), -2px 0 0 rgba(0,255,255,0.7), 0 0 16px #FFFF00, 0 0 30px #FFFF00",
              "2px 0 0 rgba(255,0,60,0.7), -2px 0 0 rgba(0,255,255,0.7), 0 0 32px #FFFF00, 0 0 70px #FFFF00",
              "4px 1px 0 rgba(255,0,60,0.9), -4px -1px 0 rgba(0,255,255,0.9), 0 0 20px #FFFF00",
              "2px 0 0 rgba(255,0,60,0.7), -2px 0 0 rgba(0,255,255,0.7), 0 0 16px #FFFF00, 0 0 30px #FFFF00",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, times: [0, 0.45, 0.5, 0.56] }}
        >
          {title.split("").map((char, i) => (
            <motion.span
              key={`${title}-${i}`}
              className="inline-block"
              initial={{ opacity: 0, y: -26, scale: 0.4 }}
              animate={
                isAnimatingIn
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: -26, scale: 0.4 }
              }
              transition={{
                delay: 0.08 + i * 0.05,
                type: "spring",
                stiffness: 320,
                damping: 14,
              }}
            >
              {char === " " ? " " : char}
            </motion.span>
          ))}
        </motion.h2>
        <p className="mt-3 font-sans text-base text-slate-200">
          {isShopPrompt
            ? `Spend coins on one upgrade or leave. Coins: ${playerCoins}`
            : "XP bar filled. Choose your next upgrade."}
        </p>
        {!isShopPrompt && localPlayer && (
          <div className="mt-2 inline-block rounded-md border border-yellow-300/40 bg-yellow-400/10 px-2.5 py-1 font-press-start text-[10px] text-yellow-300">
            LV {localPlayer.level}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="relative z-10 flex flex-col gap-6 px-4 md:flex-row">
        {upgradeOptions.map((option, index) => {
          const isLockedIn = selectedUpgradeId === option.id;
          return (
            <UpgradeCard
              key={`${option.id}-${index}`}
              option={option}
              index={index}
              phase={phases[index] ?? 0}
              isAnimatingIn={isAnimatingIn}
              isHovered={hoveredIndex === index}
              isDimmed={isSelecting && !isLockedIn}
              isLockedIn={isLockedIn}
              isSelecting={isSelecting}
              isOtherCardFocused={hoveredIndex !== null && hoveredIndex !== index}
              isShopPrompt={isShopPrompt}
              playerCoins={playerCoins}
              fanOffset={(index - fanCenter) * 42}
              fanRotate={(index - fanCenter) * -5}
              onSelect={() => handleSelect(option.id)}
              onHover={(i) => {
                setIsGamepadActive(false);
                setHoveredIndex(i);
              }}
              cardRef={(el) => {
                cardElsRef.current[index] = el;
              }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
