import { useState, useRef, useEffect } from "react";
import { getAllCharacters } from "@shared/characterConfig";
import type { CharacterType } from "@shared/types";
import { Button } from "./ui/button";
import {
  isCharacterUnlocked,
  getUnlockProgress,
  checkUnlocks,
} from "@/lib/progressionStorage";
import { UnlockTooltip } from "./UnlockTooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

interface CharacterSelectProps {
  onSelect: (characterType: CharacterType) => void;
  onCancel: () => void;
}

function CharacterCard({
  char,
  isSelected,
  onSelect,
  isLocked,
  onMouseMove,
  onMouseLeave,
}: {
  char: any;
  isSelected: boolean;
  onSelect: () => void;
  isLocked: boolean;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 5000, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 5000, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
    onMouseMove(e);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    onMouseLeave();
  };

  return (
    <motion.div
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: isLocked ? 1 : 1.05 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => !isLocked && onSelect()}
      className={`
        relative p-6 rounded-xl border-4 transition-all duration-300 flex-shrink-0 w-[300px]
        ${
          isLocked
            ? "border-gray-800 bg-black/40 opacity-60 cursor-not-allowed grayscale"
            : isSelected
            ? "border-neon-yellow bg-neon-yellow/10 shadow-[0_0_30px_rgba(255,255,0,0.3)] cursor-pointer"
            : "border-neon-pink bg-black/60 hover:border-neon-cyan hover:shadow-[0_0_30px_rgba(0,255,255,0.2)] cursor-pointer"
        }
      `}
    >
      <div style={{ transform: "translateZ(50px)" }} className="relative">
        {/* Emoji / Avatar */}
        <motion.div
          animate={
            isSelected ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
          className="text-7xl mb-6 text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
        >
          {char.emoji}
        </motion.div>

        {/* Name */}
        <h3 className="font-press-start text-xl text-neon-yellow mb-3 text-center tracking-tighter">
          {char.name}
        </h3>

        {/* Description */}
        <p className="font-vt323 text-lg text-neon-cyan mb-6 text-center leading-tight h-12 flex items-center justify-center">
          {char.description}
        </p>

        {/* Stats */}
        <div className="space-y-4 mb-8 font-vt323 text-lg">
          {[
            {
              label: "VITALS",
              value: char.baseHealth,
              max: 200,
              color: "bg-red-500",
              glow: "shadow-[0_0_10px_#EF4444]",
            },
            {
              label: "POWER",
              value: char.baseDamage,
              max: 50,
              color: "bg-neon-yellow",
              glow: "shadow-[0_0_10px_#FFFF00]",
            },
            {
              label: "AGILITY",
              value: char.baseSpeed,
              max: 6,
              color: "bg-neon-cyan",
              glow: "shadow-[0_0_10px_#00FFFF]",
            },
            {
              label: "CADENCE",
              value: (1000 / char.baseAttackSpeed).toFixed(1),
              max: 8,
              color: "bg-purple-500",
              glow: "shadow-[0_0_10px_#A855F7]",
            },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-white px-1">
                <span className="opacity-80">{stat.label}</span>
                <span className="text-neon-pink font-bold">
                  {stat.value}
                  {stat.label === "CADENCE" ? "/s" : ""}
                </span>
              </div>
              <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-white/10 p-[1px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(Number(stat.value) / stat.max) * 100}%`,
                  }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${stat.color} ${stat.glow}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Pro/Con */}
        <div className="space-y-2 font-vt323 text-sm bg-black/40 p-3 rounded-lg border border-white/5">
          <div className="text-green-400 flex gap-2">
            <span className="font-bold shrink-0">PRO:</span>
            <span className="leading-tight">{char.pro}</span>
          </div>
          <div className="text-red-400 flex gap-2">
            <span className="font-bold shrink-0">CON:</span>
            <span className="leading-tight">{char.con}</span>
          </div>
        </div>

        {/* Selected Indicator */}
        <AnimatePresence>
          {isSelected && !isLocked && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-10 -right-4 bg-neon-yellow text-black font-press-start text-[10px] px-3 py-1.5 rounded shadow-glow-yellow rotate-12"
            >
              SELECTED
            </motion.div>
          )}
        </AnimatePresence>

        {/* Locked Indicator */}
        {isLocked && (
          <div className="absolute inset-0 -m-6 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-xl">
            <div className="text-center">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-5xl mb-3"
              >
                🔒
              </motion.div>
              <div className="font-press-start text-xs text-gray-400 tracking-widest">
                LOCKED
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function CharacterSelect({ onSelect, onCancel }: CharacterSelectProps) {
  const characters = getAllCharacters();
  const [selected, setSelected] = useState<CharacterType | null>(null);
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

  // Check for unlocks when component mounts
  useEffect(() => {
    checkUnlocks();
  }, []);

  const handleConfirm = () => {
    if (selected && isCharacterUnlocked(selected)) {
      onSelect(selected);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(characters.length - 1, prev + 1));
  };

  const handleMouseMove = (
    e: React.MouseEvent,
    char: (typeof characters)[0]
  ) => {
    const unlocked = isCharacterUnlocked(char.type);
    const isLocked = char.locked && !unlocked;

    if (isLocked) {
      const progress = getUnlockProgress(char.type);
      if (progress && char.unlockCriteria) {
        setTooltipState({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          current: progress.current,
          required: progress.required,
          description: char.unlockCriteria.description,
        });
      }
    }
  };

  const handleMouseLeave = () => {
    setTooltipState((prev) => ({ ...prev, visible: false }));
  };

  return (
    <>
      <UnlockTooltip {...tooltipState} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(20,20,30,0.95)_0%,_rgba(0,0,0,1)_100%)] p-4 perspective-1000"
      >
        <div className="relative w-full max-w-7xl">
          {/* Header Section */}
          <div className="text-center mb-12">
            <motion.h2
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-press-start text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-b from-neon-cyan to-blue-500 mb-4"
              style={{ filter: "drop-shadow(0 0 10px rgba(0,255,255,0.5))" }}
            >
              SELECT CHARACTER
            </motion.h2>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3 }}
              className="h-1 w-64 bg-gradient-to-r from-transparent via-neon-cyan to-transparent mx-auto"
            />
          </div>

          {/* Carousel Section */}
          <div className="relative mb-12 group">
            {/* Nav Buttons */}
            <AnimatePresence>
              {currentIndex > 0 && (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={handlePrevious}
                  className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 p-4 bg-black/80 border-2 border-neon-cyan rounded-full text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all duration-300 shadow-glow-cyan"
                >
                  <ChevronLeft className="w-8 h-8" />
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {currentIndex < characters.length - 1 && (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={handleNext}
                  className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 p-4 bg-black/80 border-2 border-neon-cyan rounded-full text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all duration-300 shadow-glow-cyan"
                >
                  <ChevronRight className="w-8 h-8" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Carousel Viewport */}
            <div className="overflow-hidden px-4 md:px-12 py-8">
              <motion.div
                className="flex gap-8"
                animate={{
                  x: `calc(${-currentIndex * 332}px)`, // 300px width + 32px gap
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {characters.map((char) => (
                  <CharacterCard
                    key={char.type}
                    char={char}
                    isSelected={selected === char.type}
                    onSelect={() => {
                      setSelected(char.type);
                      // Center the selected character
                      const index = characters.findIndex(
                        (c) => c.type === char.type
                      );
                      setCurrentIndex(index);
                    }}
                    isLocked={char.locked && !isCharacterUnlocked(char.type)}
                    onMouseMove={(e) => handleMouseMove(e, char)}
                    onMouseLeave={handleMouseLeave}
                  />
                ))}
              </motion.div>
            </div>

            {/* Indicators */}
            <div className="flex justify-center gap-3 mt-8">
              {characters.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    index === currentIndex
                      ? "bg-neon-cyan w-12 shadow-[0_0_10px_#00FFFF]"
                      : "bg-gray-700 w-3 hover:bg-gray-500"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-6"
          >
            <Button
              onClick={onCancel}
              className="font-press-start text-lg bg-transparent border-2 border-neon-pink text-neon-pink px-10 py-7 hover:bg-neon-pink hover:text-black hover:shadow-glow-pink transition-all duration-300 transform hover:-translate-y-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selected}
              className={`
                font-press-start text-lg bg-transparent border-2 px-10 py-7 transition-all duration-300 transform
                ${
                  selected
                    ? "border-neon-yellow text-neon-yellow hover:bg-neon-yellow hover:text-black hover:shadow-glow-yellow hover:-translate-y-1"
                    : "border-gray-700 text-gray-700 opacity-50 cursor-not-allowed"
                }
              `}
            >
              Start Game
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}
