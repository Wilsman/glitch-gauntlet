import React from 'react';
import { Stage, Layer, Rect, Circle, Text, Ring } from 'react-konva';
import { useGameStore } from '@/hooks/useGameStore';
import { useShallow } from 'zustand/react/shallow';
const ARENA_WIDTH = 1280;
const ARENA_HEIGHT = 720;
const HIT_FLASH_DURATION = 100; // ms
const REVIVE_DURATION = 3000;
const selectGameState = (state) => ({
  gameState: state.gameState,
  localPlayerId: state.localPlayerId,
});
export default function GameCanvas() {
  const { gameState, localPlayerId } = useGameStore(useShallow(selectGameState));
  const { players = [], enemies = [], projectiles = [], xpOrbs = [], gameId = '', teleporter = null } = gameState || {};
  const now = Date.now();
  return (
    <Stage width={ARENA_WIDTH} height={ARENA_HEIGHT} className="bg-gray-900 border-4 border-neon-pink shadow-glow-pink">
      <Layer>
        {/* Background Grid */}
        {[...Array(Math.floor(ARENA_WIDTH / 40))].map((_, i) => (
          <Rect key={`v-${i}`} x={i * 40} y={0} width={1} height={ARENA_HEIGHT} fill="#FF00FF" opacity={0.2} />
        ))}
        {[...Array(Math.floor(ARENA_HEIGHT / 40))].map((_, i) => (
          <Rect key={`h-${i}`} x={0} y={i * 40} width={ARENA_WIDTH} height={1} fill="#FF00FF" opacity={0.2} />
        ))}
        {/* Teleporter */}
        {teleporter && (
          <Circle
            x={teleporter.position.x}
            y={teleporter.position.y}
            radius={teleporter.radius}
            fillRadialGradientStartPoint={{ x: 0, y: 0 }}
            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndRadius={teleporter.radius}
            fillRadialGradientColorStops={[0, '#00FFFF', 0.8, '#00FFFF55', 1, '#00FFFF00']}
            shadowColor="#00FFFF"
            shadowBlur={30}
          />
        )}
        {/* Render XP Orbs */}
        {xpOrbs.map((orb) => (
          <Circle key={orb.id} x={orb.position.x} y={orb.position.y} radius={5} fill="#a855f7" shadowColor="#a855f7" shadowBlur={10} />
        ))}
        {/* Render Players */}
        {players.map((player) => {
          const isHit = player.lastHitTimestamp && (now - player.lastHitTimestamp < HIT_FLASH_DURATION);
          return (
            <React.Fragment key={player.id}>
              <Circle
                x={player.position.x}
                y={player.position.y}
                radius={15}
                fill={isHit ? '#FFFFFF' : player.color}
                stroke={player.id === localPlayerId && player.status === 'alive' ? '#FFFFFF' : player.color}
                strokeWidth={player.id === localPlayerId && player.status === 'alive' ? 3 : 2}
                shadowColor={player.color}
                shadowBlur={20}
                opacity={player.status === 'dead' ? 0.3 : 1}
              />
              {player.status === 'dead' && player.reviveProgress > 0 && (
                <Ring
                  x={player.position.x}
                  y={player.position.y}
                  innerRadius={25}
                  outerRadius={30}
                  fill="#00FF00"
                  angle={(player.reviveProgress / REVIVE_DURATION) * 360}
                  rotation={-90}
                />
              )}
            </React.Fragment>
          );
        })}
        {/* Render Enemies */}
        {enemies.map((enemy) => {
          const isHit = enemy.lastHitTimestamp && (now - enemy.lastHitTimestamp < HIT_FLASH_DURATION);
          return (
            <Rect key={enemy.id} x={enemy.position.x - 10} y={enemy.position.y - 10} width={20} height={20} fill={isHit ? '#FFFFFF' : '#FFFF00'} shadowColor="#FFFF00" shadowBlur={15} />
          );
        })}
        {/* Render Projectiles */}
        {projectiles.map((p) => (
          <Circle key={p.id} x={p.position.x} y={p.position.y} radius={4} fill="#FFFFFF" shadowColor="#FFFFFF" shadowBlur={10} />
        ))}
        {/* Game ID Text */}
        <Text text={`Game Code: ${gameId}`} x={20} y={ARENA_HEIGHT - 30} fontFamily='"Press Start 2P"' fontSize={14} fill="#FF00FF" />
      </Layer>
    </Stage>
  );
}