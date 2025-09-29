import React from 'react';
import type { Player } from '@shared/types';
import { Star, Skull } from 'lucide-react';
interface PlayerHUDProps {
  player: Player;
  isLocalPlayer: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}
const positionClasses = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
};
export default function PlayerHUD({ player, isLocalPlayer, position }: PlayerHUDProps) {
  const xpPercentage = (player.xp / player.xpToNextLevel) * 100;
  const isDead = player.status === 'dead';
  return (
    <div
      className={`absolute ${positionClasses[position]} w-64 p-2 border-2 bg-black/50 backdrop-blur-sm transition-all duration-300 ${
        isDead ? 'border-gray-600 opacity-60' : isLocalPlayer ? 'border-neon-cyan' : 'border-neon-pink'
      }`}
      style={{
        boxShadow: isDead ? 'none' : isLocalPlayer ? '0 0 10px #00FFFF' : '0 0 10px #FF00FF',
      }}
    >
      <div className="flex items-center justify-between font-press-start text-sm">
        <span className={isDead ? 'text-gray-400' : isLocalPlayer ? 'text-neon-cyan' : 'text-neon-pink'}>
          P{player.id.substring(0, 2).toUpperCase()} {isLocalPlayer && '(YOU)'}
        </span>
        {isDead ? (
          <div className="flex items-center gap-1 text-red-500">
            <Skull className="w-4 h-4" />
            <span>DOWN</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-neon-yellow">
            <Star className="w-4 h-4" fill="#FFFF00" />
            <span>LVL {player.level}</span>
          </div>
        )}
      </div>
      {/* Health Bar */}
      <div className="w-full h-4 bg-red-900/50 border border-red-500 my-2">
        <div
          className="h-full bg-red-500 transition-all duration-300"
          style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
        />
      </div>
      {/* XP Bar */}
      <div className="w-full h-2 bg-purple-900/50 border border-purple-500">
        <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${xpPercentage}%` }} />
      </div>
    </div>
  );
}