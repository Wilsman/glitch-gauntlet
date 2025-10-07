import { useState, useRef, useEffect } from 'react';
import { getAllCharacters } from '@shared/characterConfig';
import type { CharacterType } from '@shared/types';
import { Button } from './ui/button';
import { isCharacterUnlocked, getUnlockProgress, checkUnlocks } from '@/lib/progressionStorage';
import { UnlockTooltip } from './UnlockTooltip';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CharacterSelectProps {
  onSelect: (characterType: CharacterType) => void;
  onCancel: () => void;
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
    description: '',
  });
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleMouseMove = (e: React.MouseEvent, char: typeof characters[0]) => {
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
      
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
        <div className="relative w-full max-w-6xl">
        {/* Title */}
        <h2 
          className="font-press-start text-3xl md:text-4xl text-neon-cyan text-center mb-8"
          style={{ textShadow: '0 0 10px #00FFFF, 0 0 20px #00FFFF' }}
        >
          SELECT CHARACTER
        </h2>

        {/* Carousel Container */}
        <div className="relative mb-8">
          {/* Navigation Arrows */}
          {currentIndex > 0 && (
            <button
              onClick={handlePrevious}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/80 border-2 border-neon-cyan rounded-full hover:bg-neon-cyan hover:text-black transition-all duration-300 shadow-glow-cyan"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {currentIndex < characters.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/80 border-2 border-neon-cyan rounded-full hover:bg-neon-cyan hover:text-black transition-all duration-300 shadow-glow-cyan"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Carousel Track */}
          <div className="overflow-visible px-12 py-4" ref={containerRef}>
            <div
              className="flex transition-transform duration-500 ease-out gap-6"
              style={{
                transform: `translateX(-${currentIndex * (100 / 3.5)}%)`,
              }}
            >
              {characters.map((char) => {
                const isSelected = selected === char.type;
                const unlocked = isCharacterUnlocked(char.type);
                const isLocked = char.locked && !unlocked;
                
                return (
                  <div
                    key={char.type}
                    onMouseMove={(e) => handleMouseMove(e, char)}
                    onMouseLeave={handleMouseLeave}
                    className={`
                      relative p-6 rounded-lg border-4 transition-all duration-300 flex-shrink-0 w-[calc(28.571%-1rem)]
                      ${isLocked 
                        ? 'border-gray-600 bg-black/30 opacity-60 cursor-not-allowed grayscale' 
                        : isSelected 
                          ? 'border-neon-yellow bg-neon-yellow/10 shadow-glow-yellow scale-105 cursor-pointer' 
                          : 'border-neon-pink bg-black/50 hover:border-neon-cyan hover:shadow-glow-cyan hover:scale-102 cursor-pointer'
                      }
                    `}
                    onClick={() => unlocked && setSelected(char.type)}
                  >
                {/* Emoji */}
                <div className="text-6xl mb-4 text-center">
                  {char.emoji}
                </div>

                {/* Name */}
                <h3 className="font-press-start text-xl text-neon-yellow mb-3 text-center">
                  {char.name}
                </h3>

                {/* Description */}
                <p className="font-vt323 text-sm text-neon-cyan mb-4 text-center leading-relaxed">
                  {char.description}
                </p>

                {/* Stats */}
                <div className="space-y-2 mb-4 font-vt323 text-sm">
                  <div className="flex justify-between text-white">
                    <span>HP:</span>
                    <span className="text-neon-pink">{char.baseHealth}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Damage:</span>
                    <span className="text-neon-pink">{char.baseDamage}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Fire Rate:</span>
                    <span className="text-neon-pink">{(1000 / char.baseAttackSpeed).toFixed(1)}/s</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Speed:</span>
                    <span className="text-neon-pink">{char.baseSpeed}</span>
                  </div>
                </div>

                {/* Pro/Con */}
                <div className="space-y-2 font-vt323 text-xs">
                  <div className="text-green-400">
                    <span className="font-bold">PRO:</span> {char.pro}
                  </div>
                  <div className="text-red-400">
                    <span className="font-bold">CON:</span> {char.con}
                  </div>
                </div>

                {/* Selected Indicator */}
                {isSelected && !isLocked && (
                  <div className="absolute -top-2 -right-2 bg-neon-yellow text-black font-press-start text-xs px-3 py-1 rounded">
                    SELECTED
                  </div>
                )}
                
                {/* Locked Indicator */}
                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🔒</div>
                      <div className="font-press-start text-xs text-gray-400">LOCKED</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
            </div>
          </div>

          {/* Carousel Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {characters.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-neon-cyan w-8'
                    : 'bg-gray-600 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={onCancel}
            className="font-press-start text-lg bg-transparent border-2 border-neon-pink text-neon-pink px-8 py-6 hover:bg-neon-pink hover:text-black hover:shadow-glow-pink transition-all duration-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            className="font-press-start text-lg bg-transparent border-2 border-neon-yellow text-neon-yellow px-8 py-6 hover:bg-neon-yellow hover:text-black hover:shadow-glow-yellow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm
          </Button>
        </div>
        </div>
      </div>
    </>
  );
}
