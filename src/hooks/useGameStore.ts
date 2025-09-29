import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { GameState, UpgradeOption } from '@shared/types';
import { deepEqual } from '@/lib/utils';

type GameStore = {
  gameState: GameState | null;
  localPlayerId: string | null;
  isUpgradeModalOpen: boolean;
  upgradeOptions: UpgradeOption[];
  setGameState: (newState: GameState) => void;
  setLocalPlayerId: (playerId: string) => void;
  resetGameState: () => void;
  openUpgradeModal: (options: UpgradeOption[]) => void;
  closeUpgradeModal: () => void;
};

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    gameState: null,
    localPlayerId: null,
    isUpgradeModalOpen: false,
    upgradeOptions: [],
    setGameState: (newState) => {
      if (!deepEqual(get().gameState, newState)) {
        set((state) => {
          state.gameState = newState;
        });
      }
    },
    setLocalPlayerId: (playerId) => {
      set((state) => {
        state.localPlayerId = playerId;
      });
    },
    resetGameState: () => {
      set((state) => {
        state.gameState = null;
        state.localPlayerId = null;
        state.isUpgradeModalOpen = false;
        state.upgradeOptions = [];
      });
    },
    openUpgradeModal: (options) => {
      set((state) => {
        state.isUpgradeModalOpen = true;
        state.upgradeOptions = options;
      });
    },
    closeUpgradeModal: () => {
      set((state) => {
        state.isUpgradeModalOpen = false;
        state.upgradeOptions = [];
      });
    },
  }))
);