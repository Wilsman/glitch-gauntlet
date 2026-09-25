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

  const isExploration = !!engine?.getGameState().exploration;

  // Keyboard input handling
  useHotkeys('w,arrowup', (e) => { e?.preventDefault(); inputRef.current.up = true; }, { keydown: true, enabled: !isPaused && !isExploration, preventDefault: true });
  useHotkeys('w,arrowup', (e) => { e?.preventDefault(); inputRef.current.up = false; }, { keyup: true, enabled: !isPaused && !isExploration, preventDefault: true });
  useHotkeys('s,arrowdown', (e) => { e?.preventDefault(); inputRef.current.down = true; }, { keydown: true, enabled: !isPaused && !isExploration, preventDefault: true });
  useHotkeys('s,arrowdown', (e) => { e?.preventDefault(); inputRef.current.down = false; }, { keyup: true, enabled: !isPaused && !isExploration, preventDefault: true });
  useHotkeys('a,arrowleft', (e) => { e?.preventDefault(); inputRef.current.left = true; }, { keydown: true, enabled: !isPaused && !isExploration, preventDefault: true });
  useHotkeys('a,arrowleft', (e) => { e?.preventDefault(); inputRef.current.left = false; }, { keyup: true, enabled: !isPaused && !isExploration, preventDefault: true });
  useHotkeys('d,arrowright', (e) => { e?.preventDefault(); inputRef.current.right = true; }, { keydown: true, enabled: !isPaused && !isExploration, preventDefault: true });
  useHotkeys('d,arrowright', (e) => { e?.preventDefault(); inputRef.current.right = false; }, { keyup: true, enabled: !isPaused && !isExploration, preventDefault: true });
  useHotkeys('space', (e) => { e?.preventDefault(); inputRef.current.shake = true; }, { keydown: true, enabled: !isPaused && !isExploration, preventDefault: true });
  useHotkeys('space', (e) => { e?.preventDefault(); inputRef.current.shake = false; }, { keyup: true, enabled: !isPaused && !isExploration, preventDefault: true });
  useHotkeys('e', (e) => { e?.preventDefault(); inputRef.current.interact = true; }, { keydown: true, enabled: !isPaused && !isExploration, preventDefault: true });
  useHotkeys('e', (e) => { e?.preventDefault(); inputRef.current.interact = false; }, { keyup: true, enabled: !isPaused && !isExploration, preventDefault: true });

  // Character abilities
  useHotkeys('shift', (e) => {
    e?.preventDefault();
    if (engine && !lastSnapshotRef.current?.isShopRound) engine.useBlink();
  }, { enabled: !isPaused && !isExploration, preventDefault: true });

  useHotkeys('q', (e) => {
    e?.preventDefault();
    if (engine && !lastSnapshotRef.current?.isShopRound) engine.useAbility();
  }, { enabled: !isPaused && !isExploration, preventDefault: true });

  useEffect(() => {
    if (!isExploration) return;
    const keys: Record<string, 'up' | 'down' | 'left' | 'right' | 'interact' | 'shake'> = {
      KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyE: 'interact', Space: 'shake',
    };
    const held = new Set<string>();
    const handle = (event: KeyboardEvent) => {
      if (isPaused || (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))) return;
      const down = event.type === 'keydown';
      if (keys[event.code]) {
        event.preventDefault();
        if (down) held.add(event.code); else held.delete(event.code);
        const action = keys[event.code];
        inputRef.current[action] = [...held].some(code => keys[code] === action);
      }
      if (down && !event.repeat && (event.code === 'ShiftLeft' || event.code === 'ShiftRight')) { event.preventDefault(); engine?.useBlink(); }
      if (down && !event.repeat && event.code === 'KeyQ') { event.preventDefault(); engine?.useAbility(); }
    };
    const clear = () => { held.clear(); inputRef.current = createNeutralInput(); };
    window.addEventListener('keydown', handle); window.addEventListener('keyup', handle);
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
    return () => { clear(); window.removeEventListener('keydown', handle); window.removeEventListener('keyup', handle); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); };
  }, [engine, isPaused, isExploration]);

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

    const feedInput = () => {
      const gamepadInput = getGamepadInput();
      let activeInput = { ...inputRef.current };

      if (gamepadInput && !isPaused) {
        const isShopRound = !!lastSnapshotRef.current?.isShopRound;
        // Merge gamepad input with keyboard
        activeInput = {
          up: activeInput.up || !!gamepadInput.up,
          down: activeInput.down || !!gamepadInput.down,
          left: activeInput.left || !!gamepadInput.left,
          right: activeInput.right || !!gamepadInput.right,
          analogX: gamepadInput.analogX,
          analogY: gamepadInput.analogY,
          shake: activeInput.shake || !!gamepadInput.shake,
          interact: activeInput.interact || (lastSnapshotRef.current?.exploration ? !!gamepadInput.interact : !!gamepadInput.blink || !!gamepadInput.ability),
        };

        // Handle one-shot triggers
        if (!isShopRound && gamepadInput.blink && !lastGamepadButtons.current.blink) {
          engine.useBlink();
        }
        if (!isShopRound && gamepadInput.ability && !lastGamepadButtons.current.ability) {
          engine.useAbility();
        }
        lastGamepadButtons.current = {
          blink: !!gamepadInput.blink,
          ability: !!gamepadInput.ability,
        };
      }

      engine.updateInput(isPaused ? createNeutralInput() : activeInput);
    };
    const publish = () => {
      const snapshot = engine.getGameState();
      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setGameState(snapshot, true);
      }
    };

    // The open map steps once per display frame: feed input right before the step and publish right after it,
    // so every rendered frame shows a fresh simulation state.
    if (engine.isFrameSynced()) {
      engine.setFrameHooks({ before: feedInput, after: publish });
      return () => {
        engine.setFrameHooks({});
        lastSnapshotRef.current = null;
      };
    }

    const updateLoop = setInterval(() => {
      feedInput();
      publish();
    }, 33); // ~30 FPS

    return () => {
      clearInterval(updateLoop);
      lastSnapshotRef.current = null;
    };
  }, [engine, setGameState, isPaused, getGamepadInput]);
}
