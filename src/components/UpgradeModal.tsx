import React, { useEffect, useState, useRef, useCallback } from "react";
import { useGameStore } from "@/hooks/useGameStore";
import { useShallow } from "zustand/react/shallow";
import type { UpgradeOption, UpgradeRarity } from "@shared/types";

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
    }))
  );

  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isUpgradeModalOpen && upgradeOptions.length > 0) {
      setIsAnimatingIn(false);
      setHoveredIndex(null);
      setIsSelecting(false);

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

      setIsSelecting(true);

      // Brief delay for visual feedback
      selectionTimeoutRef.current = setTimeout(() => {
        onSelectUpgrade(upgradeId);
      }, 300);
    },
    [isSelecting, onSelectUpgrade]
  );

  if (!isUpgradeModalOpen || upgradeOptions.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      {/* Title */}
      <div
        className="mb-8"
        style={{
          opacity: isAnimatingIn ? 1 : 0,
          transform: isAnimatingIn ? "translateY(0)" : "translateY(-20px)",
          transitionProperty: "opacity, transform",
          transitionDuration: "0.5s",
          transitionTimingFunction: "ease-out",
        }}
      >
        <h2
          className="font-press-start text-4xl md:text-5xl text-neon-yellow text-center"
          style={{
            textShadow: "0 0 20px #FFFF00, 0 0 40px #FFFF00",
          }}
        >
          LEVEL UP!
        </h2>
      </div>

      {/* Cards */}
      <div className="flex flex-col md:flex-row gap-6 px-4">
        {upgradeOptions.map((option, index) => {
          const styles = RARITY_STYLES[option.rarity || "common"];
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={`${option.id}-${index}`}
              className="relative"
              style={{
                opacity: isAnimatingIn ? 1 : 0,
                transform: isAnimatingIn
                  ? "translateY(0) scale(1)"
                  : "translateY(40px) scale(0.8)",
                transitionProperty: "opacity, transform",
                transitionDuration: "0.6s",
                transitionDelay: `${index * 0.1}s`,
                transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              <button
                onClick={() => handleSelect(option.id)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                disabled={isSelecting}
                className="w-72 h-96 p-6 flex flex-col justify-between bg-black/80 border-2 rounded-lg cursor-pointer disabled:cursor-not-allowed group overflow-hidden relative"
                style={{
                  borderColor: styles.borderColor,
                  boxShadow: isHovered
                    ? `0 0 30px ${styles.glowColor}, 0 0 60px ${styles.glowColor}20`
                    : `0 0 15px ${styles.glowColor}40`,
                  transform: isHovered
                    ? "translateY(-12px) scale(1.05)"
                    : `translateY(${
                        Math.sin(Date.now() / 1000 + index) * 5
                      }px)`, // Subtle float
                  transitionProperty: "transform, box-shadow",
                  transitionDuration: "0.3s",
                  transitionTimingFunction: "ease-out",
                }}
              >
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
                </div>

                {/* Select Button */}
                <div className="mt-4 z-10">
                  <div
                    className="w-full py-3 px-4 font-press-start text-sm text-center border-2 rounded transition-all"
                    style={{
                      borderColor: styles.borderColor,
                      color: styles.textColor,
                      backgroundColor: isHovered
                        ? `${styles.glowColor}30`
                        : "transparent",
                      boxShadow: isHovered
                        ? `0 0 15px ${styles.glowColor}`
                        : "none",
                    }}
                  >
                    SELECT
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
