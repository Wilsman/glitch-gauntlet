import { useEffect, useRef } from 'react';
import { useGameStore } from './useGameStore';
import { useHotkeys } from 'react-hotkeys-hook';
import type { InputState } from '@shared/types';
import { LocalGameEngine } from '@/lib/LocalGameEngine';

const createNeutralInput = (): InputState => ({ up: false, down: false, left: false, right: false });

export function useLocalGameLoop(engine: LocalGameEngine | null, isPaused: boolean = false) {
  const setGameState = useGameStore((state) => state.setGameState);
  const inputRef = useRef<InputState>(createNeutralInput());

  // Keyboard input handling
  useHotkeys('w,arrowup', (e) => { e?.preventDefault(); inputRef.current.up = true; }, { keydown: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('w,arrowup', (e) => { e?.preventDefault(); inputRef.current.up = false; }, { keyup: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('s,arrowdown', (e) => { e?.preventDefault(); inputRef.current.down = true; }, { keydown: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('s,arrowdown', (e) => { e?.preventDefault(); inputRef.current.down = false; }, { keyup: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('a,arrowleft', (e) => { e?.preventDefault(); inputRef.current.left = true; }, { keydown: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('a,arrowleft', (e) => { e?.preventDefault(); inputRef.current.left = false; }, { keyup: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('d,arrowright', (e) => { e?.preventDefault(); inputRef.current.right = true; }, { keydown: true, enabled: !isPaused, preventDefault: true });
  useHotkeys('d,arrowright', (e) => { e?.preventDefault(); inputRef.current.right = false; }, { keyup: true, enabled: !isPaused, preventDefault: true });

  useEffect(() => {
    if (isPaused) {
      inputRef.current = createNeutralInput();
    }
  }, [isPaused]);

  useEffect(() => {
    if (!engine) return;

    const updateLoop = setInterval(() => {
      engine.updateInput(isPaused ? createNeutralInput() : inputRef.current);
      setGameState(engine.getGameState());
    }, 33); // ~30 FPS

    return () => {
      clearInterval(updateLoop);
    };
  }, [engine, setGameState, isPaused]);
}
