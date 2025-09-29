import { useEffect, useRef } from 'react';
import { useGameStore } from './useGameStore';
import { useHotkeys } from 'react-hotkeys-hook';
import type { ApiResponse, GameState, InputState } from '@shared/types';
const LOOP_INTERVAL = 50; // ms, 20 updates per second
export function useGameLoop(gameId?: string, isPaused: boolean = false) {
  const { setGameState, localPlayerId } = useGameStore();
  const inputRef = useRef<InputState>({ up: false, down: false, left: false, right: false });
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
    if (!gameId || !localPlayerId || isPaused) return;
    const gameLoop = setInterval(async () => {
      try {
        const response = await fetch(`/api/game/${gameId}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: localPlayerId,
            input: inputRef.current,
          }),
        });
        if (!response.ok) {
          console.error('Failed to update game state');
          return;
        }
        const result = (await response.json()) as ApiResponse<GameState>;
        if (result.success && result.data) {
          setGameState(result.data);
        }
      } catch (error) {
        console.error('Error in game loop:', error);
      }
    }, LOOP_INTERVAL);
    return () => clearInterval(gameLoop);
  }, [gameId, localPlayerId, setGameState, isPaused]);
}