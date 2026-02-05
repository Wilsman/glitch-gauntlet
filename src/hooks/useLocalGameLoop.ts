import { useEffect, useRef } from 'react';
import { useGameStore } from './useGameStore';
import { useHotkeys } from 'react-hotkeys-hook';
import type { InputState } from '@shared/types';
import { LocalGameEngine } from '@/lib/LocalGameEngine';
import { useGamepad } from './useGamepad';

const createNeutralInput = (): InputState => ({ up: false, down: false, left: false, right: false });

export function useLocalGameLoop(engine: LocalGameEngine | null, isPaused: boolean = false) {
  const setGameState = useGameStore((state) => state.setGameState);
  const inputRef = useRef<InputState>(createNeutralInput());
  const lastGamepadButtons = useRef<{ blink: boolean; ability: boolean }>({ blink: false, ability: false });
  const lastSnapshotRef = useRef<ReturnType<LocalGameEngine['getGameState']> | null>(null);
  const { getGamepadInput } = useGamepad();

  // Keyboard input handling
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

  // Character abilities
  useHotkeys('shift', (e) => {
    e?.preventDefault();
    if (engine) engine.useBlink();
  }, { enabled: !isPaused, preventDefault: true });

  useHotkeys('q', (e) => {
    e?.preventDefault();
    if (engine) engine.useAbility();
  }, { enabled: !isPaused, preventDefault: true });

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
    if (!engine) return;

    const updateLoop = setInterval(() => {
      const gamepadInput = getGamepadInput();
      let activeInput = { ...inputRef.current };

      if (gamepadInput && !isPaused) {
        // Merge gamepad input with keyboard
        activeInput = {
          up: activeInput.up || !!gamepadInput.up,
          down: activeInput.down || !!gamepadInput.down,
          left: activeInput.left || !!gamepadInput.left,
          right: activeInput.right || !!gamepadInput.right,
          analogX: gamepadInput.analogX,
          analogY: gamepadInput.analogY,
          shake: activeInput.shake || !!gamepadInput.shake,
        };

        // Handle one-shot triggers
        if (gamepadInput.blink && !lastGamepadButtons.current.blink) {
          engine.useBlink();
        }
        if (gamepadInput.ability && !lastGamepadButtons.current.ability) {
          engine.useAbility();
        }
        lastGamepadButtons.current = {
          blink: !!gamepadInput.blink,
          ability: !!gamepadInput.ability,
        };
      }

      engine.updateInput(isPaused ? createNeutralInput() : activeInput);
      const snapshot = engine.getGameState();
      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setGameState(snapshot, true);
      }
    }, 33); // ~30 FPS

    return () => {
      clearInterval(updateLoop);
      lastSnapshotRef.current = null;
    };
  }, [engine, setGameState, isPaused, getGamepadInput]);
}
