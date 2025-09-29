import React from 'react';
import type { CollectedUpgrade, UpgradeRarity } from '@shared/types';

interface CollectedUpgradesPanelProps {
  upgrades: CollectedUpgrade[];
}

const RARITY_COLORS: Record<UpgradeRarity, string> = {
  common: 'text-white border-white',
  uncommon: 'text-green-400 border-green-400',
  legendary: 'text-red-400 border-red-400',
  boss: 'text-yellow-400 border-yellow-400',
  lunar: 'text-blue-400 border-blue-400',
  void: 'text-purple-400 border-purple-400',
};

export default function CollectedUpgradesPanel({ upgrades }: CollectedUpgradesPanelProps) {
  if (upgrades.length === 0) return null;

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 w-64 max-h-[70vh] overflow-y-auto bg-black/90 border-2 border-neon-yellow p-2 backdrop-blur-sm z-30 transition-transform duration-300 hover:translate-x-0 -translate-x-[calc(100%-2rem)] group">
      {/* Hover Tab */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-8 h-16 bg-neon-yellow/20 border-2 border-l-0 border-neon-yellow flex items-center justify-center group-hover:bg-neon-yellow/40 transition-colors">
        <span className="font-press-start text-[8px] text-neon-yellow -rotate-90">ITEMS</span>
      </div>
      <h2 className="font-press-start text-[10px] text-neon-yellow mb-2 text-center border-b border-neon-yellow pb-2">
        COLLECTED
      </h2>
      <div className="space-y-1">
        {upgrades.map((upgrade, idx) => (
          <div
            key={`${upgrade.type}-${idx}`}
            className={`flex items-center gap-2 p-1 border ${RARITY_COLORS[upgrade.rarity]} bg-black/50 transition-all duration-200 hover:scale-105`}
          >
            <span className="text-xl">{upgrade.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-press-start text-[8px] ${RARITY_COLORS[upgrade.rarity].split(' ')[0]} truncate`}>
                {upgrade.title}
              </p>
              {upgrade.count > 1 && (
                <p className="font-vt323 text-xs text-gray-400">x{upgrade.count}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
