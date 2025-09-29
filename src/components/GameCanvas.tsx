import React from 'react';
import { Stage, Layer, Rect, Circle, Text, Ring } from 'react-konva';
import { useGameStore } from '@/hooks/useGameStore';
import { useShallow } from 'zustand/react/shallow';
const ARENA_WIDTH = 1600;
const ARENA_HEIGHT = 900;
const HIT_FLASH_DURATION = 100; // ms
const CRIT_FLASH_DURATION = 160; // ms
const HEAL_FLASH_DURATION = 180; // ms
const REVIVE_DURATION = 3000;
const DAMAGE_NUMBER_DURATION = 800; // ms
const selectGameState = (state) => ({
  gameState: state.gameState,
  localPlayerId: state.localPlayerId,
});
export default function GameCanvas() {
  const { gameState, localPlayerId } = useGameStore(useShallow(selectGameState));
  const { players = [], enemies = [], projectiles = [], xpOrbs = [], gameId = '', teleporter = null, explosions = [] } = gameState || {};
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
          const isHealed = player.lastHealedTimestamp && (now - player.lastHealedTimestamp < HEAL_FLASH_DURATION);
          const isBerserker = player.health < player.maxHealth * 0.3;
          const hasShield = player.shield && player.shield > 0;
          
          return (
            <React.Fragment key={player.id}>
              {/* Pickup radius (local player only) */}
              {player.id === localPlayerId && player.status === 'alive' && (
                <Circle
                  x={player.position.x}
                  y={player.position.y}
                  radius={player.pickupRadius || 30}
                  fillEnabled={false}
                  stroke="#a855f7"
                  opacity={0.2}
                  dash={[6, 6]}
                />
              )}
              {/* Shield ring */}
              {hasShield && player.status === 'alive' && (
                <Circle
                  x={player.position.x}
                  y={player.position.y}
                  radius={18}
                  fillEnabled={false}
                  stroke="#00CCFF"
                  strokeWidth={2}
                  opacity={0.7}
                />
              )}
              {/* Berserker glow */}
              {isBerserker && player.status === 'alive' && (
                <Circle
                  x={player.position.x}
                  y={player.position.y}
                  radius={20}
                  fillEnabled={false}
                  stroke="#FF0000"
                  strokeWidth={2}
                  opacity={0.6 + Math.sin(now / 100) * 0.3}
                />
              )}
              <Circle
                x={player.position.x}
                y={player.position.y}
                radius={15}
                fill={isHit ? '#FFFFFF' : player.color}
                stroke={player.id === localPlayerId && player.status === 'alive' ? '#FFFFFF' : player.color}
                strokeWidth={player.id === localPlayerId && player.status === 'alive' ? 3 : 2}
                shadowColor={isBerserker ? '#FF0000' : player.color}
                shadowBlur={isBerserker ? 30 : 20}
                opacity={player.status === 'dead' ? 0.3 : 1}
              />
              {/* Heal flash */}
              {isHealed && player.status === 'alive' && (
                <Ring
                  x={player.position.x}
                  y={player.position.y}
                  innerRadius={18}
                  outerRadius={22}
                  fill="#00FF00"
                  opacity={0.5}
                />
              )}
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
          const isCrit = enemy.lastCritTimestamp && (now - enemy.lastCritTimestamp < CRIT_FLASH_DURATION);
          
          // Check for status effects
          const isBurning = enemy.statusEffects?.some(e => e.type === 'burning');
          const isPoisoned = enemy.statusEffects?.some(e => e.type === 'poisoned');
          const isSlowed = enemy.statusEffects?.some(e => e.type === 'slowed');
          
          let fill = '#FFFF00'; // default yellow
          let shadow = '#FFFF00';
          
          if (isCrit) {
            fill = '#FF5A5A';
            shadow = '#FF5A5A';
          } else if (isHit) {
            fill = '#FFFFFF';
          } else if (isBurning) {
            fill = '#FF6600'; // orange/red for fire
            shadow = '#FF6600';
          } else if (isPoisoned) {
            fill = '#00FF00'; // green for poison
            shadow = '#00FF00';
          } else if (isSlowed) {
            fill = '#00CCFF'; // cyan/blue for ice
            shadow = '#00CCFF';
          }
          
          return (
            <React.Fragment key={enemy.id}>
              <Rect x={enemy.position.x - 10} y={enemy.position.y - 10} width={20} height={20} fill={fill} shadowColor={shadow} shadowBlur={18} />
              {/* Damage Numbers */}
              {enemy.damageNumbers?.map((dmg) => {
                const age = now - dmg.timestamp;
                if (age > DAMAGE_NUMBER_DURATION) return null;
                const progress = age / DAMAGE_NUMBER_DURATION;
                const yOffset = -20 - (progress * 30);
                const opacity = 1 - progress;
                const fontSize = dmg.isCrit ? 18 : 14;
                const color = dmg.isCrit ? '#FF3333' : '#FFFFFF';
                return (
                  <Text
                    key={dmg.id}
                    text={dmg.damage.toString()}
                    x={dmg.position.x}
                    y={dmg.position.y + yOffset}
                    fontSize={fontSize}
                    fontFamily='"Press Start 2P"'
                    fontStyle={dmg.isCrit ? 'bold' : 'normal'}
                    fill={color}
                    opacity={opacity}
                    shadowColor={color}
                    shadowBlur={dmg.isCrit ? 8 : 4}
                    offsetX={fontSize * 2}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
        {/* Render Projectiles */}
        {projectiles.map((p) => {
          if (p.kind === 'bananarang') {
            const color = p.isCrit ? '#FFD166' : '#FFF176';
            return (
              <Ring
                key={p.id}
                x={p.position.x}
                y={p.position.y}
                innerRadius={p.isCrit ? 6 : 5}
                outerRadius={p.isCrit ? 10 : 9}
                fill={color}
                opacity={0.9}
                shadowColor={color}
                shadowBlur={14}
                rotation={((Date.now() / 10) % 360)}
              />
            );
          }
          return (
            <Circle
              key={p.id}
              x={p.position.x}
              y={p.position.y}
              radius={p.isCrit ? 5 : 4}
              fill={p.isCrit ? '#FF3B3B' : '#FFFFFF'}
              shadowColor={p.isCrit ? '#FF3B3B' : '#FFFFFF'}
              shadowBlur={12}
            />
          );
        })}
        {/* Render Explosions */}
        {explosions.map((explosion) => {
          const age = now - explosion.timestamp;
          const maxDuration = 500; // ms
          if (age > maxDuration) return null;
          const progress = age / maxDuration;
          const currentRadius = explosion.radius * (0.3 + progress * 0.7);
          const opacity = 1 - progress;
          return (
            <Circle
              key={explosion.id}
              x={explosion.position.x}
              y={explosion.position.y}
              radius={currentRadius}
              fill="#FF6600"
              opacity={opacity * 0.6}
              shadowColor="#FF6600"
              shadowBlur={30}
            />
          );
        })}
        {/* Game ID Text */}
        <Text text={`Game Code: ${gameId}`} x={20} y={ARENA_HEIGHT - 30} fontFamily='"Press Start 2P"' fontSize={14} fill="#FF00FF" />
      </Layer>
    </Stage>
  );
}
