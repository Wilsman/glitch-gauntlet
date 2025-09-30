import { useState, useEffect } from 'react';

interface UnlockTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  current: number;
  required: number;
  description: string;
}

export function UnlockTooltip({ visible, x, y, current, required, description }: UnlockTooltipProps) {
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    setPosition({ x, y });
  }, [x, y]);

  if (!visible) return null;

  const progress = Math.min(current, required);
  const percentage = (progress / required) * 100;

  return (
    <div
      className="fixed pointer-events-none z-[9999] transition-opacity duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="bg-black border-2 border-neon-yellow p-4 rounded-lg shadow-lg max-w-xs">
        {/* Lock Icon */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🔒</span>
          <span className="font-press-start text-sm text-neon-yellow">LOCKED</span>
        </div>

        {/* Description */}
        <p className="font-vt323 text-base text-white mb-3">
          {description}
        </p>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between font-vt323 text-sm">
            <span className="text-neon-cyan">Progress:</span>
            <span className="text-neon-pink">{progress}/{required}</span>
          </div>
          <div className="w-full h-3 bg-gray-800 border border-neon-cyan rounded">
            <div
              className="h-full bg-gradient-to-r from-neon-cyan to-neon-yellow rounded transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
