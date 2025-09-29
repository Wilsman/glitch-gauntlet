import React from 'react';
import { useGameStore } from '@/hooks/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { Button } from './ui/button';
import type { UpgradeOption } from '@shared/types';
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
        {upgradeOptions.map((option) => (
          <div
            key={option.id}
            className="w-72 h-80 border-2 border-neon-cyan p-6 flex flex-col justify-between bg-black/50 hover:bg-neon-cyan/10 hover:shadow-glow-cyan transition-all cursor-pointer"
            onClick={() => handleSelect(option)}
          >
            <div className="text-center">
              <h3 className="font-press-start text-2xl text-neon-cyan mb-4">{option.title}</h3>
              <p className="font-vt323 text-xl text-white/80">{option.description}</p>
            </div>
            <Button
              variant="outline"
              className="w-full font-press-start text-lg bg-transparent border-2 border-neon-cyan text-neon-cyan h-12 hover:bg-neon-cyan hover:text-black"
            >
              SELECT
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}