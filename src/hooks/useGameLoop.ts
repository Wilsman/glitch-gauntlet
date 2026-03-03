import { useEffect, useRef } from 'react';
import { useGameStore } from './useGameStore';
import { useHotkeys } from 'react-hotkeys-hook';
import type { ApiResponse, GameState, InputState } from '@shared/types';
import { useGamepad } from './useGamepad';

const LOOP_INTERVAL = 33; // ms, ~30 updates per second for better responsiveness

const createNeutralInput = (): InputState => ({ up: false, down: false, left: false, right: false });
export function useGameLoop(gameId?: string, isPaused: boolean = false) {
  const setGameState = useGameStore((state) => state.setGameState);
  const localPlayerId = useGameStore((state) => state.localPlayerId);
  const inputRef = useRef<InputState>(createNeutralInput());
  const { getGamepadInput } = useGamepad();

  // Keyboard input handling with preventDefault for instant response
  useHotkeys('w,arrowup', (e) => { e?.preventDefault(); inputRef.current.up = true; }, { keydown: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('w,arrowup', (e) => { e?.preventDefault(); inputRef.current.up = false; }, { keyup: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('s,arrowdown', (e) => { e?.preventDefault(); inputRef.current.down = true; }, { keydown: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('s,arrowdown', (e) => { e?.preventDefault(); inputRef.current.down = false; }, { keyup: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('a,arrowleft', (e) => { e?.preventDefault(); inputRef.current.left = true; }, { keydown: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('a,arrowleft', (e) => { e?.preventDefault(); inputRef.current.left = false; }, { keyup: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('d,arrowright', (e) => { e?.preventDefault(); inputRef.current.right = true; }, { keydown: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('d,arrowright', (e) => { e?.preventDefault(); inputRef.current.right = false; }, { keyup: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('space', (e) => { e?.preventDefault(); inputRef.current.shake = true; }, { keydown: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('space', (e) => { e?.preventDefault(); inputRef.current.shake = false; }, { keyup: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('e', (e) => { e?.preventDefault(); inputRef.current.interact = true; }, { keydown: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('e', (e) => { e?.preventDefault(); inputRef.current.interact = false; }, { keyup: true, enabled: !isPaused, preventDefault: true });

  // Character abilities
  useHotkeys('shift', (e) => { e?.preventDefault(); inputRef.current.blink = true; }, { keydown: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('shift', (e) => { e?.preventDefault(); inputRef.current.blink = false; }, { keyup: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('q', (e) => { e?.preventDefault(); inputRef.current.ability = true; }, { keydown: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('q', (e) => { e?.preventDefault(); inputRef.current.ability = false; }, { keyup: true, enabled: !isPaused, preventDefault: true });

  useEffect(() => {
    if (isPaused) {
      inputRef.current = createNeutralInput();
    }
  }, [isPaused]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && !isPaused) {
        inputRef.current.shake = true;
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        inputRef.current.shake = false;
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
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
      const gamepadInput = getGamepadInput();
      let activeInput = { ...inputRef.current };

      if (gamepadInput && !isPaused) {
        activeInput = {
          up: activeInput.up || !!gamepadInput.up,
          down: activeInput.down || !!gamepadInput.down,
          left: activeInput.left || !!gamepadInput.left,
          right: activeInput.right || !!gamepadInput.right,
          analogX: gamepadInput.analogX,
          analogY: gamepadInput.analogY,
          interact: activeInput.interact || !!gamepadInput.blink || !!gamepadInput.ability,
          blink: activeInput.blink || !!gamepadInput.blink,
          ability: activeInput.ability || !!gamepadInput.ability,
          shake: activeInput.shake || !!gamepadInput.shake,
        };
      }

      try {
        const response = await fetch(`/api/game/${gameId}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: localPlayerId,
            input: isPaused ? createNeutralInput() : activeInput,
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
  }, [gameId, localPlayerId, setGameState, isPaused, getGamepadInput]);
}
