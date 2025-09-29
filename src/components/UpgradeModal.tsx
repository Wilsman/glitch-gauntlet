import React from 'react';
import { useGameStore } from '@/hooks/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { Button } from './ui/button';
import type { UpgradeOption, UpgradeRarity } from '@shared/types';

const RARITY_STYLES: Record<UpgradeRarity, { border: string; text: string; glow: string; bg: string }> = {
  common: { border: 'border-white', text: 'text-white', glow: 'shadow-white', bg: 'hover:bg-white/10' },
  uncommon: { border: 'border-green-400', text: 'text-green-400', glow: 'shadow-green-400', bg: 'hover:bg-green-400/10' },
  legendary: { border: 'border-red-400', text: 'text-red-400', glow: 'shadow-red-400', bg: 'hover:bg-red-400/10' },
  boss: { border: 'border-yellow-400', text: 'text-yellow-400', glow: 'shadow-yellow-400', bg: 'hover:bg-yellow-400/10' },
  lunar: { border: 'border-blue-400', text: 'text-blue-400', glow: 'shadow-blue-400', bg: 'hover:bg-blue-400/10' },
  void: { border: 'border-purple-400', text: 'text-purple-400', glow: 'shadow-purple-400', bg: 'hover:bg-purple-400/10' },
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
  if (!isUpgradeModalOpen) return null;
  const handleSelect = (option: UpgradeOption) => {
    onSelectUpgrade(option.id);
  };
  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-50">
      <h2 className="font-press-start text-5xl text-neon-yellow mb-12" style={{ textShadow: '0 0 10px #FFFF00' }}>
        LEVEL UP!
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {upgradeOptions.map((option) => {
          const styles = RARITY_STYLES[option.rarity || 'common'];
          const emoji = option.emoji || '🎁';
          return (
            <div
              key={option.id}
              className={`w-72 h-80 border-2 ${styles.border} p-6 flex flex-col justify-between bg-black/50 ${styles.bg} ${styles.glow} transition-all cursor-pointer`}
              onClick={() => handleSelect(option)}
              style={{ boxShadow: `0 0 20px ${styles.border.replace('border-', '')}` }}
            >
              <div className="text-center">
                <div className="text-5xl mb-2">{emoji}</div>
                <p className={`font-press-start text-[8px] ${styles.text} mb-2 uppercase`}>{option.rarity || 'common'}</p>
                <h3 className={`font-press-start text-lg ${styles.text} mb-4`}>{option.title}</h3>
                <p className="font-vt323 text-lg text-white/80">{option.description}</p>
              </div>
              <Button
                variant="outline"
                className={`w-full font-press-start text-lg bg-transparent border-2 ${styles.border} ${styles.text} h-12 hover:bg-${styles.border.replace('border-', '')}/20 hover:text-black`}
              >
                SELECT
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}