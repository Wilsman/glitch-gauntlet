import { useEffect, useRef } from 'react';
import { AudioManager } from '@/lib/audio/AudioManager';
import { useGameStore } from './useGameStore';
import { useSyncAudioSettings } from './useSyncAudioSettings';
import { useAudioSettings } from './useAudioSettings';
import type { GameStatus, PlayerStatus } from '@shared/types';

/**
 * Hooks Tone.js driven game audio into the current game state.
 */
export function useGameAudio() {
  const gameState = useGameStore((state) => state.gameState);
  const localPlayerId = useGameStore((state) => state.localPlayerId);
  const enabledGameTracks = useAudioSettings((state) => state.enabledGameTracks);

  useSyncAudioSettings();

  const previousProjectiles = useRef<Set<string>>(new Set());
  const previousXpOrbs = useRef<Set<string>>(new Set());
  const previousPlayerStatuses = useRef<Map<string, PlayerStatus>>(new Map());
  const previousGameStatus = useRef<GameStatus | null>(null);

  useEffect(() => {
    const audio = AudioManager.getInstance();
    let cancelled = false;
    (async () => {
      await audio.resume();
      if (!cancelled) {
        audio.playGameMusic(enabledGameTracks);
      }
    })();
    return () => {
      cancelled = true;
      audio.stopGameMusic();
      audio.stopPreviewTrack();
    };
  }, [enabledGameTracks]);

  useEffect(() => {
    if (!gameState) {
      previousProjectiles.current.clear();
      previousXpOrbs.current.clear();
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

    const currentXpOrbs = new Set<string>();
    for (const orb of gameState.xpOrbs) {
      currentXpOrbs.add(orb.id);
    }
    // Compare sets to see which orb ids are gone
    for (const orbId of previousXpOrbs.current) {
      if (!currentXpOrbs.has(orbId)) {
        // Orb was collected (or removed for some reason)
        audio.playPickup();
      }
    }
    previousXpOrbs.current = currentXpOrbs;

    for (const player of gameState.players) {
      const prevStatus =
        previousPlayerStatuses.current.get(player.id) ?? player.status;
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
