import React, { useEffect, useState, useRef, useCallback } from "react";
import { useGameStore } from "@/hooks/useGameStore";
import { useShallow } from "zustand/react/shallow";
import type { UpgradeOption, UpgradeRarity } from "@shared/types";
import { useGamepad } from "@/hooks/useGamepad";
import { AnimatePresence, motion } from "framer-motion";

const RARITY_STYLES: Record<
  UpgradeRarity,
  {
    borderColor: string;
    textColor: string;
    glowColor: string;
  }
> = {
  common: {
    borderColor: "#ffffff",
    textColor: "#ffffff",
    glowColor: "#ffffff",
  },
  uncommon: {
    borderColor: "#4ade80",
    textColor: "#4ade80",
    glowColor: "#4ade80",
  },
  legendary: {
    borderColor: "#f87171",
    textColor: "#f87171",
    glowColor: "#f87171",
  },
  boss: { borderColor: "#facc15", textColor: "#facc15", glowColor: "#facc15" },
  lunar: { borderColor: "#60a5fa", textColor: "#60a5fa", glowColor: "#60a5fa" },
  void: { borderColor: "#c084fc", textColor: "#c084fc", glowColor: "#c084fc" },
};

interface UpgradeModalProps {
  onSelectUpgrade: (upgradeId: string) => void;
}

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
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const promptType = gameState?.upgradePromptType ?? "levelUp";
  const localPlayer =
    gameState?.players.find((player) => player.id === localPlayerId) ?? null;
  const playerCoins = Math.floor(localPlayer?.coins || 0);
  const isShopPrompt =
    promptType === "shop" ||
    upgradeOptions.some((option) => option.source === "shop");

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

  // Reset state when modal opens
  useEffect(() => {
    if (isUpgradeModalOpen && upgradeOptions.length > 0) {
      setIsAnimatingIn(false);
      setHoveredIndex(null);
      setIsSelecting(false);
      setSelectedUpgradeId(null);
      setIsGamepadActive(false);

      // Clear any pending selection
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
        selectionTimeoutRef.current = null;
      }

      // Trigger entrance animation
      requestAnimationFrame(() => {
        setIsAnimatingIn(true);
      });
    }
  }, [isUpgradeModalOpen, upgradeOptions.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);

  const handleSelect = useCallback(
    (upgradeId: string) => {
      if (isSelecting) return;

      setSelectedUpgradeId(upgradeId);
      setIsSelecting(true);

      // Longer delay so lock-in effects are visible and satisfying
      selectionTimeoutRef.current = setTimeout(() => {
        onSelectUpgrade(upgradeId);
      }, 480);
    },
    [isSelecting, onSelectUpgrade],
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

      // Handle Selection
      if (input.blink && !lastGamepadInput.current.confirm) {
        const option = upgradeOptions[hoveredIndex ?? 0];
        const canAfford =
          !isShopPrompt || option?.isSkipOption || (option?.cost || 0) <= playerCoins;
        if (option && canAfford) {
          handleSelect(option.id);
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
  ]);

  if (!isUpgradeModalOpen || upgradeOptions.length === 0) {
    return null;
  }

  const isSelectionFxActive = isSelecting && selectedUpgradeId !== null;
  const fanCenter = (upgradeOptions.length - 1) / 2;

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50"
      animate={
        isSelectionFxActive
          ? {
              x: [0, -8, 7, -5, 3, 0],
              y: [0, 2, -2, 1, 0],
            }
          : { x: 0, y: 0 }
      }
      transition={{ duration: 0.32, ease: "easeInOut" }}
    >
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
      <motion.div
        className="mb-8 text-center"
        initial={{ opacity: 0, y: -26, scale: 0.9 }}
        animate={{ opacity: isAnimatingIn ? 1 : 0, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 180 }}
      >
        <motion.h2
          className="font-press-start text-4xl md:text-5xl text-neon-yellow text-center"
          animate={{
            textShadow: [
              "0 0 16px #FFFF00, 0 0 30px #FFFF00",
              "0 0 32px #FFFF00, 0 0 70px #FFFF00",
              "0 0 16px #FFFF00, 0 0 30px #FFFF00",
            ],
            scale: [1, 1.03, 1],
          }}
          transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 0.4 }}
        >
          {isShopPrompt ? "SHOP ROUND" : "LEVEL UP!"}
        </motion.h2>
        <p className="mt-3 font-vt323 text-xl text-white/85">
          {isShopPrompt
            ? `Spend coins on one upgrade or leave. Coins: ${playerCoins}`
            : "XP bar filled. Choose your next upgrade."}
        </p>
      </motion.div>

      {/* Cards */}
      <div className="flex flex-col md:flex-row gap-6 px-4">
        {upgradeOptions.map((option, index) => {
          const styles = RARITY_STYLES[option.rarity || "common"];
          const isHovered = hoveredIndex === index;
          const isLockedIn = selectedUpgradeId === option.id;
          const isDimmed = isSelecting && !isLockedIn;
          const isOtherCardFocused = hoveredIndex !== null && !isHovered;
          const isIdleFloating = !isHovered && !isSelecting;
          const isSkipOption = !!option.isSkipOption;
          const cost = option.cost || 0;
          const isUnaffordable = isShopPrompt && !isSkipOption && cost > playerCoins;
          const fanOffset = (index - fanCenter) * 42;
          const fanRotate = (index - fanCenter) * -5;

          return (
            <motion.div
              key={`${option.id}-${index}`}
              className="relative"
              style={{ transformPerspective: "1200px" }}
              initial={{ opacity: 0, y: 65, scale: 0.82, rotateX: 16 }}
              animate={{
                opacity: isAnimatingIn ? (isDimmed ? 0.45 : 1) : 0,
                y: isAnimatingIn ? 0 : 65,
                scale: isLockedIn ? 1.05 : 1,
                x: hoveredIndex === null ? fanOffset : isHovered ? fanOffset : fanOffset * 0.9,
                rotateZ: hoveredIndex === null ? fanRotate : isHovered ? fanRotate * 0.45 : fanRotate * 1.15,
                rotateX: 0,
              }}
              transition={{
                duration: 0.65,
                delay: index * 0.12,
                type: "spring",
                stiffness: 120,
                damping: 16,
              }}
            >
              <motion.button
                onClick={() => {
                  if (!isUnaffordable) {
                    handleSelect(option.id);
                  }
                }}
                onMouseEnter={() => {
                  setIsGamepadActive(false);
                  setHoveredIndex(index);
                }}
                onMouseLeave={() => setHoveredIndex(null)}
                disabled={isSelecting || isUnaffordable}
                className="w-72 h-96 p-6 flex flex-col justify-between bg-black/80 border-2 rounded-lg cursor-pointer disabled:cursor-not-allowed group overflow-hidden relative"
                animate={
                  isLockedIn
                    ? { y: -30, scale: 1.16, rotateZ: [0, -1.5, 1, 0] }
                    : isHovered
                      ? { y: -30, scale: 1.16, rotateZ: 0 }
                      : { y: [0, -6, 0, 4, 0], scale: isOtherCardFocused ? 0.94 : 1, rotateZ: 0 }
                }
                transition={
                  isLockedIn
                    ? {
                        y: { type: "spring", stiffness: 250, damping: 14 },
                        scale: { type: "spring", stiffness: 270, damping: 13 },
                        rotateZ: { duration: 0.35, ease: "easeOut" },
                      }
                    : isHovered
                      ? {
                          y: { type: "spring", stiffness: 280, damping: 14 },
                          scale: {
                            type: "spring",
                            stiffness: 300,
                            damping: 13,
                          },
                        }
                      : {
                          duration: 2.8,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: index * 0.2,
                        }
                }
                style={{
                  borderColor: styles.borderColor,
                  boxShadow: isLockedIn
                    ? `0 0 45px ${styles.glowColor}, 0 0 140px ${styles.glowColor}40`
                    : isHovered
                      ? `0 0 40px ${styles.glowColor}, 0 0 90px ${styles.glowColor}25`
                      : `0 0 15px ${styles.glowColor}40`,
                  filter: isUnaffordable
                    ? "grayscale(0.5) saturate(0.6)"
                    : isIdleFloating
                    ? "saturate(1.05)"
                    : "saturate(1.15)",
                  opacity: isUnaffordable ? 0.55 : 1,
                  zIndex: isLockedIn ? 40 : isHovered ? 30 : isOtherCardFocused ? 5 : 10,
                }}
              >
                <AnimatePresence>
                  {isLockedIn && (
                    <>
                      <motion.div
                        className="absolute inset-0 pointer-events-none rounded-lg border-2"
                        style={{ borderColor: styles.glowColor }}
                        initial={{ scale: 1, opacity: 0.9 }}
                        animate={{ scale: 1.24, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute -inset-6 pointer-events-none rounded-2xl"
                        style={{
                          background: `radial-gradient(circle, ${styles.glowColor}50 0%, transparent 65%)`,
                        }}
                        initial={{ opacity: 0.7, scale: 0.85 }}
                        animate={{ opacity: 0, scale: 1.3 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </>
                  )}
                </AnimatePresence>

                {/* Visual Shine Effect for Rare Upgrades */}
                {(option.rarity === "legendary" ||
                  option.rarity === "boss" ||
                  option.rarity === "lunar" ||
                  option.rarity === "void") && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity"
                    style={{
                      background: `linear-gradient(135deg, transparent 40%, ${styles.glowColor} 50%, transparent 60%)`,
                      backgroundSize: "300% 300%",
                      animation: "shimmer 3s infinite linear",
                    }}
                  />
                )}

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-start text-center z-10">
                  {isShopPrompt && (
                    <div
                      className="mb-3 rounded border px-3 py-1 font-press-start text-[10px]"
                      style={{
                        borderColor: isUnaffordable ? "#ef4444" : "#facc15",
                        color: isUnaffordable ? "#fca5a5" : "#fde047",
                      }}
                    >
                      {isSkipOption ? "NO COST" : `${cost} COINS`}
                    </div>
                  )}
                  {/* Emoji */}
                  <div className="text-6xl mb-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                    {option.emoji || "🎁"}
                  </div>

                  {/* Rarity */}
                  <p
                    className="font-press-start text-[10px] mb-3 uppercase tracking-[0.2em]"
                    style={{
                      color: styles.textColor,
                      textShadow: `0 0 8px ${styles.glowColor}`,
                    }}
                  >
                    {option.rarity || "common"}
                  </p>

                  {/* Title */}
                  <h3
                    className="font-press-start text-base md:text-lg mb-4 leading-tight"
                    style={{ color: styles.textColor }}
                  >
                    {option.title}
                  </h3>

                  {/* Description */}
                  <p className="font-vt323 text-lg text-white/90 leading-snug">
                    {option.description}
                  </p>
                  {isUnaffordable && (
                    <p className="mt-2 font-vt323 text-xl text-red-300">
                      Not enough coins
                    </p>
                  )}
                </div>

                {/* Select Button */}
                <div className="mt-4 z-10">
                  <div
                    className="w-full py-3 px-4 font-press-start text-sm text-center border-2 rounded transition-all"
                    style={{
                      borderColor: styles.borderColor,
                      color: styles.textColor,
                      backgroundColor: isLockedIn
                        ? `${styles.glowColor}45`
                        : isHovered
                        ? `${styles.glowColor}30`
                        : "transparent",
                      boxShadow: isLockedIn
                        ? `0 0 25px ${styles.glowColor}`
                        : isHovered
                          ? `0 0 15px ${styles.glowColor}`
                        : "none",
                    }}
                  >
                    {isLockedIn
                      ? "LOCKED IN!"
                      : isUnaffordable
                      ? "NEED MORE COINS"
                      : isSkipOption
                      ? "LEAVE SHOP"
                      : "SELECT"}
                  </div>
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
