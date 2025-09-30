import { useEffect, useState } from 'react';
import type { CharacterType } from '@shared/types';
import { getCharacter } from '@shared/characterConfig';

interface UnlockNotificationProps {
  characterType: CharacterType | null;
  onClose: () => void;
}

export function UnlockNotification({ characterType, onClose }: UnlockNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (characterType) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300); // Wait for fade out
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [characterType, onClose]);

  if (!characterType) return null;

  const character = getCharacter(characterType);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/80 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }}
    >
      <div
        className={`relative transform transition-all duration-500 ${
          visible ? 'scale-100 rotate-0' : 'scale-50 rotate-12'
        }`}
      >
        {/* Celebration Border */}
        <div className="absolute -inset-4 bg-gradient-to-r from-neon-yellow via-neon-pink to-neon-cyan rounded-lg opacity-75 blur-xl animate-pulse" />
        
        {/* Main Card */}
        <div className="relative bg-black border-4 border-neon-yellow rounded-lg p-8 shadow-glow-yellow">
          {/* Title */}
          <div className="text-center mb-6">
            <h2
              className="font-press-start text-3xl text-neon-yellow mb-2"
              style={{ textShadow: '0 0 20px #FFFF00' }}
            >
              CHARACTER UNLOCKED!
            </h2>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🎉</span>
              <span className="text-2xl">✨</span>
              <span className="text-2xl">🎊</span>
            </div>
          </div>

          {/* Character Info */}
          <div className="text-center space-y-4">
            {/* Emoji */}
            <div className="text-8xl animate-bounce">
              {character.emoji}
            </div>

            {/* Name */}
            <h3 className="font-press-start text-2xl text-neon-cyan">
              {character.name}
            </h3>

            {/* Description */}
            <p className="font-vt323 text-lg text-white max-w-md">
              {character.description}
            </p>

            {/* Special Feature */}
            {character.startsWithPet && (
              <div className="bg-neon-pink/10 border-2 border-neon-pink rounded p-3">
                <p className="font-press-start text-sm text-neon-pink">
                  ⭐ STARTS WITH PET COMPANION ⭐
                </p>
              </div>
            )}
          </div>

          {/* Click to Continue */}
          <p className="text-center font-vt323 text-sm text-gray-400 mt-6 animate-pulse">
            Click anywhere to continue
          </p>
        </div>
      </div>
    </div>
  );
}
