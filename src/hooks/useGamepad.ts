import { useRef, useEffect, useCallback } from 'react';
import type { InputState } from '@shared/types';

export function useGamepad() {
    const gamepadRef = useRef<number | null>(null);

    useEffect(() => {
        // Check for already connected gamepads on mount
        const initialGamepads = navigator.getGamepads();
        for (let i = 0; i < initialGamepads.length; i++) {
            const gp = initialGamepads[i];
            if (gp) {
                console.log('Gamepad found on mount:', gp.id, 'at index', i);
                gamepadRef.current = i;
                break;
            }
        }

        const handleConnected = (e: GamepadEvent) => {
            console.log('Gamepad connected event:', e.gamepad.id, 'at index', e.gamepad.index);
            if (gamepadRef.current === null) {
                gamepadRef.current = e.gamepad.index;
            }
        };

        const handleDisconnected = (e: GamepadEvent) => {
            console.log('Gamepad disconnected event:', e.gamepad.id, 'at index', e.gamepad.index);
            if (gamepadRef.current === e.gamepad.index) {
                gamepadRef.current = null;
                // Try to find another connected gamepad
                const gamepads = navigator.getGamepads();
                for (let i = 0; i < gamepads.length; i++) {
                    if (gamepads[i] && i !== e.gamepad.index) {
                        gamepadRef.current = i;
                        break;
                    }
                }
            }
        };

        window.addEventListener('gamepadconnected', handleConnected);
        window.addEventListener('gamepaddisconnected', handleDisconnected);

        return () => {
            window.removeEventListener('gamepadconnected', handleConnected);
            window.removeEventListener('gamepaddisconnected', handleDisconnected);
        };
    }, []);

    const getGamepadInput = useCallback((): Partial<InputState> | null => {
        const gamepads = navigator.getGamepads();

        // If we don't have a tracked index or the tracked index is now null, try to find any gamepad
        if (gamepadRef.current === null || !gamepads[gamepadRef.current]) {
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i]) {
                    gamepadRef.current = i;
                    break;
                }
            }
        }

        if (gamepadRef.current === null) return null;
        const gp = gamepads[gamepadRef.current];
        if (!gp) return null;

        // Movement axes (Left Stick)
        // Axes mapping can vary, but 0, 1 is standard for Left Stick X, Y
        const analogX = gp.axes[0] ?? 0;
        const analogY = gp.axes[1] ?? 0;

        // Threshold for digital movement (Deadzone)
        const DEADZONE = 0.2;
        const THRESHOLD = 0.5;

        // Buttons (standard mapping)
        const buttons = gp.buttons;
        const blink = buttons[0]?.pressed || buttons[4]?.pressed; // A or L1
        const ability = buttons[2]?.pressed || buttons[5]?.pressed; // X or R1
        const shake = buttons[1]?.pressed || buttons[3]?.pressed; // B or Y (mash to break free)

        // Robust number check
        const cleanX = typeof analogX === 'number' ? analogX : 0;
        const cleanY = typeof analogY === 'number' ? analogY : 0;

        return {
            up: cleanY < -THRESHOLD || buttons[12]?.pressed,
            down: cleanY > THRESHOLD || buttons[13]?.pressed,
            left: cleanX < -THRESHOLD || buttons[14]?.pressed,
            right: cleanX > THRESHOLD || buttons[15]?.pressed,
            analogX: Math.abs(cleanX) > DEADZONE ? cleanX : 0,
            analogY: Math.abs(cleanY) > DEADZONE ? cleanY : 0,
            blink,
            ability,
            shake
        };
    }, []);

    return { getGamepadInput };
}
