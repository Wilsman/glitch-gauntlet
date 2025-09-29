import { useEffect, useRef } from 'react';
import { useGameStore } from './useGameStore';
import { useHotkeys } from 'react-hotkeys-hook';
import type { ApiResponse, GameState, InputState } from '@shared/types';

const LOOP_INTERVAL = 50; // ms, 20 updates per second

const createNeutralInput = (): InputState => ({ up: false, down: false, left: false, right: false });

export function useGameLoop(gameId?: string, isPaused: boolean = false) {
  const setGameState = useGameStore((state) => state.setGameState);
  const localPlayerId = useGameStore((state) => state.localPlayerId);
  const inputRef = useRef<InputState>(createNeutralInput());

  // Keyboard input handling
  useHotkeys('w,arrowup', () => (inputRef.current.up = true), { keydown: true, enabled: !isPaused });
  useHotkeys('w,arrowup', () => (inputRef.current.up = false), { keyup: true, enabled: !isPaused });
  useHotkeys('s,arrowdown', () => (inputRef.current.down = true), { keydown: true, enabled: !isPaused });
  useHotkeys('s,arrowdown', () => (inputRef.current.down = false), { keyup: true, enabled: !isPaused });
  useHotkeys('a,arrowleft', () => (inputRef.current.left = true), { keydown: true, enabled: !isPaused });
  useHotkeys('a,arrowleft', () => (inputRef.current.left = false), { keyup: true, enabled: !isPaused });
  useHotkeys('d,arrowright', () => (inputRef.current.right = true), { keydown: true, enabled: !isPaused });
  useHotkeys('d,arrowright', () => (inputRef.current.right = false), { keyup: true, enabled: !isPaused });

  useEffect(() => {
    if (isPaused) {
      inputRef.current = createNeutralInput();
    }
  }, [isPaused]);

  useEffect(() => {
    if (!gameId || !localPlayerId || !isPaused) return;

    const syncNeutralInput = async () => {
      try {
        const response = await fetch(`/api/game/${gameId}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: localPlayerId,
            input: createNeutralInput(),
          }),
        });

        if (!response.ok) return;
        const result = (await response.json()) as ApiResponse<GameState>;
        if (result.success && result.data) {
          setGameState(result.data);
        }
      } catch (error) {
        console.error('Error syncing paused state:', error);
      }
    };

    void syncNeutralInput();
  }, [gameId, localPlayerId, isPaused, setGameState]);

  useEffect(() => {
    if (!gameId || !localPlayerId) return;

    let isCancelled = false;

    const tick = async () => {
      try {
        const response = await fetch(`/api/game/${gameId}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: localPlayerId,
            input: isPaused ? createNeutralInput() : inputRef.current,
          }),
        });

        if (!response.ok) {
          console.error('Failed to update game state');
          return;
        }

        const result = (await response.json()) as ApiResponse<GameState>;
        if (!isCancelled && result.success && result.data) {
          setGameState(result.data);
        }
      } catch (error) {
        console.error('Error in game loop:', error);
      }
    };

    const gameLoop = setInterval(tick, LOOP_INTERVAL);
    void tick();

    return () => {
      isCancelled = true;
      clearInterval(gameLoop);
    };
  }, [gameId, localPlayerId, setGameState, isPaused]);
}