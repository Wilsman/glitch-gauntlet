import { useRef, type MouseEvent } from "react";
import { motion } from "framer-motion";
import type { UpgradeOption } from "@shared/types";
import { rarityFx } from "./rarityFx";

export type CardPhase = 0 | 1 | 2; // 0 = face-down, 1 = anticipating, 2 = revealed

interface UpgradeCardProps {
  option: UpgradeOption;
  index: number;
  phase: CardPhase;
  isAnimatingIn: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  isLockedIn: boolean;
  isSelecting: boolean;
  isOtherCardFocused: boolean;
  isShopPrompt: boolean;
  playerCoins: number;
  fanOffset: number;
  fanRotate: number;
  onSelect: () => void;
  onHover: (index: number | null) => void;
  cardRef: (el: HTMLButtonElement | null) => void;
}

const RIVET = "absolute h-1.5 w-1.5";
const FLIP_MS = 480;
const FLIP_HALF = FLIP_MS / 2;

export function UpgradeCard({
  option,
  index,
  phase,
  isAnimatingIn,
  isHovered,
  isDimmed,
  isLockedIn,
  isSelecting,
  isOtherCardFocused,
  isShopPrompt,
  playerCoins,
  fanOffset,
  fanRotate,
  onSelect,
  onHover,
  cardRef,
}: UpgradeCardProps) {
  const fx = rarityFx(option.rarity);
  const tiltRef = useRef<HTMLDivElement>(null);
  const revealed = phase === 2;
  const anticipating = phase === 1;
  const isSkipOption = !!option.isSkipOption;
  const cost = option.cost || 0;
  const isUnaffordable = isShopPrompt && !isSkipOption && cost > playerCoins;
  const isIdleFloating = !isHovered && !isSelecting;

  const handleTilt = (e: MouseEvent<HTMLButtonElement>) => {
    const el = tiltRef.current;
    if (!el || !revealed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateX(${(-py * 10).toFixed(2)}deg) rotateY(${(px * 10).toFixed(2)}deg)`;
  };
  const resetTilt = () => {
    if (tiltRef.current) tiltRef.current.style.transform = "rotateX(0deg) rotateY(0deg)";
  };

  return (
    <motion.div
      className="relative"
      style={{ transformPerspective: "1200px" }}
      initial={{ opacity: 0, y: 65, scale: 0.82, rotateX: 16 }}
      animate={{
        opacity: isAnimatingIn ? (isDimmed ? 0 : 1) : 0,
        y: isAnimatingIn ? (isDimmed ? 90 : 0) : 65,
        scale: isLockedIn ? 1.05 : 1,
        x: isHovered || !isOtherCardFocused ? fanOffset : fanOffset * 0.9,
        rotateZ: isDimmed
          ? fanRotate * 2.4
          : isHovered
            ? fanRotate * 0.45
            : isOtherCardFocused
              ? fanRotate * 1.15
              : fanRotate,
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
      {/* Light pillar behind the card on reveal (tier >= 2) */}
      {revealed && fx.tier >= 2 && (
        <motion.div
          className="pointer-events-none absolute -inset-x-4 -top-24 bottom-0 z-0"
          style={{
            background: `linear-gradient(to top, ${fx.color}66 0%, ${fx.accent}33 55%, transparent 100%)`,
          }}
          initial={{ opacity: 0.85, scaleY: 0.2 }}
          animate={{ opacity: 0, scaleY: 1.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      )}

      {/* Rarity stamp slam (tier >= 2) */}
      {revealed && fx.tier >= 2 && !isLockedIn && (
        <motion.div
          className="pointer-events-none absolute -top-12 left-1/2 z-50 whitespace-nowrap font-press-start text-3xl"
          style={{
            color: fx.color,
            textShadow: `2px 0 0 rgba(255,0,60,0.8), -2px 0 0 rgba(0,255,255,0.8), 3px 3px 0 #020617, 0 0 22px ${fx.color}`,
          }}
          initial={{ x: "-50%", scale: 3, rotate: -14, opacity: 0 }}
          animate={{ x: "-50%", scale: 1, rotate: -6, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.4, times: [0, 0.12, 0.75, 1], ease: "easeOut" }}
        >
          {fx.label}!
        </motion.div>
      )}
      {isLockedIn && (
        <motion.div
          className="pointer-events-none absolute -top-12 left-1/2 z-50 whitespace-nowrap font-press-start text-3xl"
          style={{
            color: "#ffffff",
            textShadow: `2px 0 0 rgba(255,0,60,0.8), -2px 0 0 rgba(0,255,255,0.8), 3px 3px 0 #020617, 0 0 22px ${fx.color}`,
          }}
          initial={{ x: "-50%", scale: 3, rotate: 10, opacity: 0 }}
          animate={{ x: "-50%", scale: 1, rotate: -4, opacity: 1 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 12 }}
        >
          LOCKED IN!
        </motion.div>
      )}

      <motion.button
        ref={cardRef}
        data-testid={`upgrade-card-${index}`}
        onClick={() => {
          if (revealed && !isUnaffordable) onSelect();
        }}
        onMouseMove={handleTilt}
        onMouseEnter={() => onHover(index)}
        onMouseLeave={() => {
          resetTilt();
          onHover(null);
        }}
        disabled={isSelecting || isUnaffordable}
        className="group relative h-96 w-72 cursor-pointer rounded-lg disabled:cursor-not-allowed md:h-[27rem] md:w-[19rem]"
        animate={
          isLockedIn
            ? { y: -30, scale: 1.16, rotateZ: [0, -1.5, 1, 0] }
            : isHovered
              ? { y: -30, scale: 1.1, rotateZ: 0 }
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
                  scale: { type: "spring", stiffness: 300, damping: 13 },
                }
              : { duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }
        }
        style={{
          // No filter on affordable cards: a CSS filter on an element that animates every frame forces it
          // to be re-rasterised each frame.
          filter: isUnaffordable ? "grayscale(0.5) saturate(0.6)" : undefined,
          opacity: isUnaffordable ? 0.55 : 1,
          zIndex: isLockedIn ? 40 : isHovered ? 30 : isOtherCardFocused ? 5 : 10,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          ref={tiltRef}
          className="h-full w-full"
          style={{ transformStyle: "preserve-3d", transition: "transform 150ms ease-out" }}
        >
          <div
            className="relative h-full w-full"
            style={{
              transformStyle: "preserve-3d",
              transition: `transform ${FLIP_MS}ms cubic-bezier(0.2, 0.7, 0.3, 1.2)`,
              transform: revealed ? "rotateY(0deg)" : "rotateY(180deg)",
            }}
          >
            {/* ===== Card face ===== */}
            <div
              className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-lg border-2 bg-[#050914] p-5"
              style={{
                backfaceVisibility: "hidden",
                visibility: revealed ? "visible" : "hidden",
                transition: `visibility 0s linear ${FLIP_HALF}ms`,
                borderColor: fx.color,
                boxShadow: isLockedIn
                  ? `0 0 45px ${fx.color}, 0 0 140px ${fx.color}40, inset 0 0 0 1px ${fx.accent}55`
                  : isHovered
                    ? `0 0 40px ${fx.color}, 0 0 90px ${fx.color}25, inset 0 0 0 1px ${fx.accent}55`
                    : `0 0 15px ${fx.color}40, inset 0 0 0 1px ${fx.accent}40`,
              }}
            >
              {/* opaque rarity wash under everything */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 50% 20%, ${fx.color}26 0%, transparent 60%)`,
                }}
              />
              {/* corner rivets */}
              <i className={`${RIVET} left-1 top-1`} style={{ backgroundColor: fx.accent }} />
              <i className={`${RIVET} right-1 top-1`} style={{ backgroundColor: fx.accent }} />
              <i className={`${RIVET} bottom-1 left-1`} style={{ backgroundColor: fx.accent }} />
              <i className={`${RIVET} bottom-1 right-1`} style={{ backgroundColor: fx.accent }} />

              {/* shimmer sweep (tier >= 2) — under the text plate */}
              {fx.tier >= 2 && (
                <div
                  className="pointer-events-none absolute inset-0 z-0 opacity-20 transition-opacity group-hover:opacity-40"
                  style={{
                    backgroundImage: `linear-gradient(135deg, transparent 40%, ${fx.color} 50%, transparent 60%)`,
                    backgroundSize: "300% 300%",
                    animation: "shimmer 3s infinite linear",
                  }}
                />
              )}
              {/* rainbow foil (tier 3) — under the text plate */}
              {fx.tier >= 3 && (
                <motion.div
                  className="pointer-events-none absolute inset-0 z-0 mix-blend-overlay"
                  style={{
                    backgroundImage:
                      "linear-gradient(115deg, #f87171, #facc15, #4ade80, #22d3ee, #c084fc, #f87171)",
                    backgroundSize: "400% 400%",
                    opacity: 0.22,
                  }}
                  animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                />
              )}

              <div className="z-10 flex flex-1 flex-col items-center justify-start text-center">
                {isShopPrompt && (
                  <div
                    className="mb-2 rounded border bg-black/70 px-3 py-1 font-press-start text-[10px]"
                    style={{
                      borderColor: isUnaffordable ? "#ef4444" : "#facc15",
                      color: isUnaffordable ? "#fca5a5" : "#fde047",
                    }}
                  >
                    {isSkipOption ? "NO COST" : `${cost} COINS`}
                  </div>
                )}

                {/* Art window */}
                <div
                  className="relative mb-3 flex h-36 w-full items-center justify-center overflow-hidden rounded-md border"
                  style={{
                    borderColor: `${fx.color}66`,
                    background: `radial-gradient(circle at 50% 60%, ${fx.color}38 0%, #020617 78%)`,
                  }}
                >
                  {fx.tier >= 2 && (
                    <motion.div
                      className="pointer-events-none absolute -inset-16"
                      style={{
                        background: `conic-gradient(from 0deg, transparent 0deg, ${fx.color}55 20deg, transparent 40deg, transparent 120deg, ${fx.accent}44 150deg, transparent 180deg, transparent 300deg, ${fx.color}55 330deg, transparent 360deg)`,
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  <motion.div
                    className="text-7xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    animate={fx.tier >= 2 ? { y: [0, -5, 0] } : {}}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {option.emoji || "🎁"}
                  </motion.div>
                </div>

                {/* Text plate */}
                <div className="relative z-20 w-full rounded-md bg-black/70 px-3 py-2">
                  <div className="mb-2 flex items-center justify-center gap-1.5">
                    <p
                      className="font-press-start text-[10px] uppercase tracking-[0.2em]"
                      style={{ color: fx.color, textShadow: `0 0 8px ${fx.color}` }}
                    >
                      {fx.label}
                    </p>
                    <span className="flex gap-0.5">
                      {Array.from({ length: fx.tier + 1 }, (_, i) => (
                        <i
                          key={i}
                          className="inline-block h-1.5 w-1.5"
                          style={{ backgroundColor: fx.color, boxShadow: `0 0 4px ${fx.color}` }}
                        />
                      ))}
                    </span>
                  </div>
                  <h3
                    className="mb-2 font-press-start text-base leading-tight md:text-lg"
                    style={{ color: fx.color, textShadow: "2px 2px 0 #020617" }}
                  >
                    {option.title}
                  </h3>
                  <p className="font-sans text-sm leading-relaxed text-slate-100">
                    {option.description}
                  </p>
                  {isUnaffordable && (
                    <p className="mt-2 font-vt323 text-xl text-red-300">
                      Not enough coins
                    </p>
                  )}
                </div>
              </div>

              <div className="z-10 mt-3">
                <div
                  className="w-full rounded border-2 px-4 py-3 text-center font-press-start text-sm transition-all"
                  style={{
                    borderColor: fx.color,
                    color: fx.color,
                    backgroundColor: isLockedIn
                      ? `${fx.color}45`
                      : isHovered
                        ? `${fx.color}30`
                        : "transparent",
                    boxShadow: isLockedIn
                      ? `0 0 25px ${fx.color}, inset 0 0 12px #ffffff88`
                      : isHovered
                        ? `0 0 15px ${fx.color}`
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
            </div>

            {/* ===== Card back ===== */}
            <motion.div
              data-testid={`upgrade-card-back-${index}`}
              className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg border-2 bg-[#050914]"
              style={{
                backfaceVisibility: "hidden",
                visibility: revealed ? "hidden" : "visible",
                transition: `visibility 0s linear ${FLIP_HALF}ms`,
                borderColor: `${fx.color}88`,
                boxShadow: anticipating
                  ? `0 0 34px ${fx.color}, inset 0 0 26px ${fx.color}66`
                  : `inset 0 0 ${10 + fx.tier * 14}px ${fx.color}${anticipating ? "66" : "33"}`,
              }}
              animate={anticipating ? { x: [0, -4, 4, -3, 3, 0] } : { x: 0 }}
              transition={
                anticipating
                  ? { duration: 0.12, repeat: Infinity }
                  : { duration: 0.1 }
              }
            >
              <div
                className="absolute inset-2 rounded-sm border border-cyan-200/25"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, rgba(34,211,238,0.07) 25%, transparent 25%, transparent 75%, rgba(34,211,238,0.07) 75%), linear-gradient(45deg, rgba(34,211,238,0.07) 25%, transparent 25%, transparent 75%, rgba(34,211,238,0.07) 75%)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 8px 8px",
                }}
              />
              {/* rotating dashed pixel frame */}
              <motion.div
                className="absolute h-28 w-28 rounded-sm border-2 border-dashed"
                style={{ borderColor: `${fx.accent}66` }}
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              />
              <span
                className="relative font-press-start text-7xl"
                style={{
                  color: anticipating || fx.tier >= 2 ? fx.color : "#22d3ee",
                  textShadow: anticipating
                    ? `0 0 24px ${fx.color}`
                    : `0 0 ${10 + fx.tier * 6}px ${fx.tier >= 2 ? fx.color : "rgba(34,211,238,0.7)"}`,
                }}
              >
                ?
              </span>
            </motion.div>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}
