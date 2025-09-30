import React, { useState, useEffect, useMemo, memo } from 'react';
import { Stage, Layer, Rect, Circle, Text, Ring, Line } from 'react-konva';
import { useGameStore } from '@/hooks/useGameStore';
import { useShallow } from 'zustand/react/shallow';

// Fixed server-side arena dimensions
const SERVER_ARENA_WIDTH = 1280;
const SERVER_ARENA_HEIGHT = 720;

// Memoized background grid for performance
const BackgroundGrid = memo(() => (
  <>
    {[...Array(Math.floor(SERVER_ARENA_WIDTH / 40))].map((_, i) => (
      <Rect key={`v-${i}`} x={i * 40} y={0} width={1} height={SERVER_ARENA_HEIGHT} fill="#FF00FF" opacity={0.2} />
    ))}
    {[...Array(Math.floor(SERVER_ARENA_HEIGHT / 40))].map((_, i) => (
      <Rect key={`h-${i}`} x={0} y={i * 40} width={SERVER_ARENA_WIDTH} height={1} fill="#FF00FF" opacity={0.2} />
    ))}
  </>
));

// Calculate responsive display size while maintaining aspect ratio
function getDisplaySize() {
  const width = window.innerWidth;
  const height = window.innerHeight - 120; // Reserve space for player cards at bottom
  
  // Maintain same aspect ratio as server arena
  const aspectRatio = SERVER_ARENA_WIDTH / SERVER_ARENA_HEIGHT;
  let displayWidth = width * 0.95; // 95% of window width
  let displayHeight = displayWidth / aspectRatio;
  
  // If height is too tall, constrain by height instead
  if (displayHeight > height) {
    displayHeight = height;
    displayWidth = displayHeight * aspectRatio;
  }
  
  return { 
    width: Math.floor(displayWidth), 
    height: Math.floor(displayHeight),
    scaleX: displayWidth / SERVER_ARENA_WIDTH,
    scaleY: displayHeight / SERVER_ARENA_HEIGHT
  };
}
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
  const { players = [], enemies = [], projectiles = [], xpOrbs = [], gameId = '', teleporter = null, explosions = [], chainLightning = [], pets = [] } = gameState || {};
  const now = Date.now();
  
  const [displaySize, setDisplaySize] = useState(getDisplaySize());
  
  useEffect(() => {
    const handleResize = () => setDisplaySize(getDisplaySize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const scale = displaySize.scaleX; // Use same scale for both X and Y to maintain aspect ratio
  
  // Guard: Don't render Stage until we have valid game state
  if (!gameState) {
    return (
      <div 
        className="bg-gray-900 border-4 border-neon-pink shadow-glow-pink flex items-center justify-center"
        style={{ width: displaySize.width, height: displaySize.height }}
      >
        <p className="text-neon-pink font-pixel">Loading game...</p>
      </div>
    );
  }
  
  return (
    <Stage 
      width={displaySize.width} 
      height={displaySize.height} 
      scaleX={scale}
      scaleY={scale}
      className="bg-gray-900 border-4 border-neon-pink shadow-glow-pink"
      listening={false}
    >
      <Layer>
        {/* Background Grid */}
        <BackgroundGrid />
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
        {/* Render Pets */}
        {pets.map((pet) => {
          const isHit = pet.lastHitTimestamp && (now - pet.lastHitTimestamp < HIT_FLASH_DURATION);
          return (
            <React.Fragment key={pet.id}>
              {/* Pet body */}
              <Circle
                x={pet.position.x}
                y={pet.position.y}
                radius={12}
                fill={isHit ? '#FFFFFF' : '#FFB6C1'}
                stroke="#FF69B4"
                strokeWidth={2}
                shadowColor="#FF69B4"
                shadowBlur={15}
              />
              {/* Pet emoji */}
              <Text
                text={pet.emoji}
                x={pet.position.x}
                y={pet.position.y}
                fontSize={16}
                offsetX={8}
                offsetY={8}
              />
              {/* Health bar */}
              <Rect
                x={pet.position.x - 15}
                y={pet.position.y - 20}
                width={30}
                height={3}
                fill="#333333"
              />
              <Rect
                x={pet.position.x - 15}
                y={pet.position.y - 20}
                width={30 * (pet.health / pet.maxHealth)}
                height={3}
                fill="#FF69B4"
              />
            </React.Fragment>
          );
        })}
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
          
          // Enemy type specific colors and sizes
          let fill = '#FFFF00'; // default yellow for grunt
          let shadow = '#FFFF00';
          let size = 20;
          
          if (enemy.type === 'slugger') {
            fill = '#FF8800'; // orange for slugger
            shadow = '#FF8800';
            size = 24; // slightly larger
          }
          
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
              <Rect x={enemy.position.x - size/2} y={enemy.position.y - size/2} width={size} height={size} fill={fill} shadowColor={shadow} shadowBlur={18} />
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
          const owner = players.find(pl => pl.id === p.ownerId);
          const isEnemyProjectile = enemies.some(e => e.id === p.ownerId);
          const hasHoming = owner?.homingStrength && owner.homingStrength > 0;
          const hasRicochet = owner?.ricochetCount && owner.ricochetCount > 0;
          
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
          
          // Enemy projectiles have distinct appearance
          if (isEnemyProjectile) {
            return (
              <Circle
                key={p.id}
                x={p.position.x}
                y={p.position.y}
                radius={5}
                fill="#FF0000"
                shadowColor="#FF0000"
                shadowBlur={10}
              />
            );
          }
          
          // Enhanced bullet visuals for upgrades
          let bulletColor = p.isCrit ? '#FF3B3B' : '#FFFFFF';
          let bulletRadius = p.isCrit ? 5 : 4;
          let bulletGlow = 12;
          
          if (hasRicochet) {
            bulletColor = '#FF00FF'; // Magenta for ricochet
            bulletGlow = 16;
          } else if (hasHoming) {
            bulletColor = '#00FFFF'; // Cyan for homing
            bulletGlow = 14;
          }
          
          return (
            <Circle
              key={p.id}
              x={p.position.x}
              y={p.position.y}
              radius={bulletRadius}
              fill={bulletColor}
              shadowColor={bulletColor}
              shadowBlur={bulletGlow}
            />
          );
        })}
        {/* Render Chain Lightning */}
        {chainLightning.map((chain) => {
          const age = now - chain.timestamp;
          const maxDuration = 200; // ms
          if (age > maxDuration) return null;
          const progress = age / maxDuration;
          const opacity = 1 - progress;
          
          // Create jagged lightning effect with multiple segments
          const segments = 5;
          const points: number[] = [];
          const dx = chain.to.x - chain.from.x;
          const dy = chain.to.y - chain.from.y;
          
          points.push(chain.from.x, chain.from.y);
          
          for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const baseX = chain.from.x + dx * t;
            const baseY = chain.from.y + dy * t;
            // Add random offset perpendicular to the line
            const perpX = -dy;
            const perpY = dx;
            const length = Math.hypot(perpX, perpY) || 1;
            const offset = (Math.random() - 0.5) * 20;
            points.push(
              baseX + (perpX / length) * offset,
              baseY + (perpY / length) * offset
            );
          }
          
          points.push(chain.to.x, chain.to.y);
          
          return (
            <React.Fragment key={chain.id}>
              {/* Outer glow */}
              <Line
                points={points}
                stroke="#FFFF00"
                strokeWidth={4}
                opacity={opacity * 0.3}
                shadowColor="#FFFF00"
                shadowBlur={20}
                lineCap="round"
                lineJoin="round"
              />
              {/* Inner bolt */}
              <Line
                points={points}
                stroke="#FFFFFF"
                strokeWidth={2}
                opacity={opacity * 0.8}
                shadowColor="#FFFF00"
                shadowBlur={10}
                lineCap="round"
                lineJoin="round"
              />
            </React.Fragment>
          );
        })}
        {/* Render Explosions */}
        {explosions.map((explosion) => {
          const age = now - explosion.timestamp;
          const maxDuration = 500; // ms
          if (age > maxDuration) return null;
          const progress = age / maxDuration;
          const currentRadius = Math.max(0, explosion.radius * (0.3 + progress * 0.7));
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
        <Text text={`Game Code: ${gameId}`} x={20} y={SERVER_ARENA_HEIGHT - 30} fontFamily='"Press Start 2P"' fontSize={14} fill="#FF00FF" />
      </Layer>
    </Stage>
  );
}

