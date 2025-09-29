import { useEffect, useRef } from 'react';
import { AudioManager } from '@/lib/audio/AudioManager';
import { useGameStore } from './useGameStore';
import { useSyncAudioSettings } from './useSyncAudioSettings';
import type { GameStatus, PlayerStatus } from '@shared/types';

/**
 * Hooks Tone.js driven game audio into the current game state.
 */
export function useGameAudio() {
  const gameState = useGameStore((state) => state.gameState);
  const localPlayerId = useGameStore((state) => state.localPlayerId);

  useSyncAudioSettings();

  const previousProjectiles = useRef<Set<string>>(new Set());
  const previousPlayerStatuses = useRef<Map<string, PlayerStatus>>(new Map());
  const previousGameStatus = useRef<GameStatus | null>(null);

  useEffect(() => {
    const audio = AudioManager.getInstance();
    void audio.resume();
    audio.playGameMusic();
    return () => {
      audio.stopGameMusic();
    };
  }, []);

  useEffect(() => {
    if (!gameState) {
      previousProjectiles.current.clear();
      previousPlayerStatuses.current.clear();
      previousGameStatus.current = null;
      return;
    }

    const audio = AudioManager.getInstance();

    const currentProjectiles = new Set<string>();
    for (const projectile of gameState.projectiles) {
      currentProjectiles.add(projectile.id);
      const isNew = !previousProjectiles.current.has(projectile.id);
      if (isNew && (!localPlayerId || projectile.ownerId === localPlayerId)) {
        audio.playShoot();
      }
    }
    previousProjectiles.current = currentProjectiles;

    for (const player of gameState.players) {
      const prevStatus = previousPlayerStatuses.current.get(player.id) ?? player.status;
      if (prevStatus === 'alive' && player.status === 'dead') {
        audio.playPlayerDeath();
      }
      previousPlayerStatuses.current.set(player.id, player.status);
    }

    const prevStatus = previousGameStatus.current;
    if (prevStatus && prevStatus !== gameState.status) {
      if (gameState.status === 'gameOver') {
        audio.playGameOver();
      }
      if (gameState.status === 'won') {
        audio.playVictory();
      }
    }
    previousGameStatus.current = gameState.status;
  }, [gameState, localPlayerId]);
}
