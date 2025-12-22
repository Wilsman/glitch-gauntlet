import React, { useState, useEffect, useMemo, memo } from "react";
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Text,
  Ring,
  Line,
  Group,
} from "react-konva";
import { useGameStore } from "@/hooks/useGameStore";
import { useShallow } from "zustand/react/shallow";
import type { Particle, Hazard } from "@shared/types";

// Fixed server-side arena dimensions
const SERVER_ARENA_WIDTH = 1280;
const SERVER_ARENA_HEIGHT = 720;

const RenderParticles = memo(({ particles }: { particles: Particle[] }) => {
  return (
    <>
      {particles.map((p) => (
        <Rect
          key={p.id}
          x={p.position.x}
          y={p.position.y}
          width={p.size}
          height={p.size}
          fill={p.color}
          opacity={p.life}
        />
      ))}
    </>
  );
});

const RenderHazards = memo(({ hazards }: { hazards: Hazard[] }) => {
  return (
    <>
      {hazards.map((h) => (
        <Group key={h.id} x={h.position.x} y={h.position.y}>
          {h.type === "spike-trap" ? (
            <>
              <Rect
                x={-20}
                y={-20}
                width={40}
                height={40}
                fill="#222222"
                stroke="#444444"
                strokeWidth={2}
                cornerRadius={2}
              />
              {h.isActive ? (
                <>
                  <Rect
                    x={-15}
                    y={-15}
                    width={30}
                    height={30}
                    fill="#FF0000"
                    opacity={0.3 + Math.sin(Date.now() / 100) * 0.2}
                  />
                  <Text
                    text="🔺"
                    x={-12}
                    y={-12}
                    fontSize={24}
                    shadowColor="#FF0000"
                    shadowBlur={10}
                  />
                </>
              ) : (
                <Text text="◾" x={-10} y={-10} fontSize={20} fill="#444" />
              )}
            </>
          ) : (
            <>
              <Rect
                x={-15}
                y={-15}
                width={30}
                height={30}
                fill={h.type === "explosive-barrel" ? "#CC4400" : "#00FFFF"}
                stroke="#FFFFFF"
                strokeWidth={2}
                cornerRadius={4}
                shadowBlur={h.type === "explosive-barrel" ? 10 : 5}
                shadowColor={
                  h.type === "explosive-barrel" ? "#FF0000" : "#00FFFF"
                }
              />
              <Text
                text={h.type === "explosive-barrel" ? "!!" : "❄️"}
                x={-10}
                y={-10}
                fontSize={14}
                fill="#FFFFFF"
                fontFamily='"Press Start 2P"'
              />
            </>
          )}
        </Group>
      ))}
    </>
  );
});

// Memoized background grid for performance
const BackgroundGrid = memo(() => (
  <>
    {[...Array(Math.floor(SERVER_ARENA_WIDTH / 40))].map((_, i) => (
      <Rect
        key={`v-${i}`}
        x={i * 40}
        y={0}
        width={1}
        height={SERVER_ARENA_HEIGHT}
        fill="#FF00FF"
        opacity={0.2}
      />
    ))}
    {[...Array(Math.floor(SERVER_ARENA_HEIGHT / 40))].map((_, i) => (
      <Rect
        key={`h-${i}`}
        x={0}
        y={i * 40}
        width={SERVER_ARENA_WIDTH}
        height={1}
        fill="#FF00FF"
        opacity={0.2}
      />
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
    scaleY: displayHeight / SERVER_ARENA_HEIGHT,
  };
}
const HIT_FLASH_DURATION = 100; // ms
const CRIT_FLASH_DURATION = 160; // ms
const HEAL_FLASH_DURATION = 180; // ms
const REVIVE_DURATION = 3000;
const EXTRACTION_DURATION = 5000;
const DAMAGE_NUMBER_DURATION = 800; // ms
const WAVE_DURATION = 20000; // 20 seconds per wave (must match LocalGameEngine)
const selectGameState = (state) => ({
  gameState: state.gameState,
  localPlayerId: state.localPlayerId,
});
export default function GameCanvas() {
  const { gameState, localPlayerId } = useGameStore(
    useShallow(selectGameState)
  );
  const {
    players = [],
    enemies = [],
    projectiles = [],
    xpOrbs = [],
    gameId = "",
    teleporter = null,
    explosions = [],
    chainLightning = [],
    pets = [],
    orbitalSkulls = [],
    fireTrails = [],
    turrets = [],
    clones = [],
    isHellhoundRound = false,
    hellhoundsKilled = 0,
    totalHellhoundsInRound = 0,
    waveTimer = 0,
    boss = null,
    shockwaveRings = [],
    bossProjectiles = [],
    status = "playing",
    particles = [],
    screenShake = null,
    hazards = [],
  } = gameState || {};
  const now = Date.now();

  const [displaySize, setDisplaySize] = useState(getDisplaySize());

  useEffect(() => {
    const handleResize = () => setDisplaySize(getDisplaySize());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scale = displaySize.scaleX; // Use same scale for both X and Y to maintain aspect ratio

  // Calculate screen shake offset
  const shakeOffset = useMemo(() => {
    if (!screenShake || !screenShake.startTime) return { x: 0, y: 0 };

    const elapsed = now - screenShake.startTime;
    if (elapsed >= screenShake.duration) return { x: 0, y: 0 };

    // Decrease intensity over time
    const remainingRatio = 1 - elapsed / screenShake.duration;
    const currentIntensity = screenShake.intensity * remainingRatio;

    return {
      x: (Math.random() - 0.5) * currentIntensity * 2,
      y: (Math.random() - 0.5) * currentIntensity * 2,
    };
  }, [screenShake, now]);

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
        {/* Hellhound Round Dim Overlay */}
        {isHellhoundRound && (
          <Rect
            x={0}
            y={0}
            width={SERVER_ARENA_WIDTH}
            height={SERVER_ARENA_HEIGHT}
            fill="#000000"
            opacity={0.4}
          />
        )}
        <Group x={shakeOffset.x} y={shakeOffset.y}>
          {/* Hazards */}
          <RenderHazards hazards={hazards} />
          {/* Particles */}
          <RenderParticles particles={particles} />
          {/* Teleporter */}
          {teleporter && (
            <>
              <Circle
                x={teleporter.position.x}
                y={teleporter.position.y}
                radius={teleporter.radius}
                fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndRadius={teleporter.radius}
                fillRadialGradientColorStops={[
                  0,
                  "#00FFFF",
                  0.8,
                  "#00FFFF55",
                  1,
                  "#00FFFF00",
                ]}
                shadowColor="#00FFFF"
                shadowBlur={30}
              />
              {/* Extraction countdown for players in teleporter */}
              {players
                .filter(
                  (p) =>
                    p.status === "alive" &&
                    p.extractionProgress &&
                    p.extractionProgress > 0
                )
                .map((player) => {
                  const progress =
                    (player.extractionProgress || 0) / EXTRACTION_DURATION;
                  const timeRemaining = Math.ceil(
                    (EXTRACTION_DURATION - (player.extractionProgress || 0)) /
                      1000
                  );
                  const pulseOpacity = 0.7 + Math.sin(now / 100) * 0.3;

                  return (
                    <React.Fragment key={`extraction-${player.id}`}>
                      {/* Progress ring */}
                      <Ring
                        x={player.position.x}
                        y={player.position.y}
                        innerRadius={20}
                        outerRadius={26}
                        fill="#00FFFF"
                        angle={progress * 360}
                        rotation={-90}
                        opacity={pulseOpacity}
                        shadowColor="#00FFFF"
                        shadowBlur={15}
                      />
                      {/* Countdown text */}
                      <Text
                        text={timeRemaining.toString()}
                        x={player.position.x}
                        y={player.position.y - 40}
                        fontSize={24}
                        fontFamily='"Press Start 2P"'
                        fill="#00FFFF"
                        fontStyle="bold"
                        offsetX={12}
                        shadowColor="#00FFFF"
                        shadowBlur={20}
                        opacity={pulseOpacity}
                      />
                      {/* "EXTRACTING" label */}
                      <Text
                        text="EXTRACTING"
                        x={player.position.x}
                        y={player.position.y - 60}
                        fontSize={10}
                        fontFamily='"Press Start 2P"'
                        fill="#FFFFFF"
                        offsetX={45}
                        opacity={0.9}
                      />
                    </React.Fragment>
                  );
                })}
            </>
          )}
          {/* Render XP Orbs */}
          {xpOrbs &&
            xpOrbs.length > 0 &&
            xpOrbs.map((orb) => {
              const isDoubled = orb.isDoubled;
              const pulseScale = isDoubled ? 1 + Math.sin(now / 100) * 0.2 : 1;
              const glowIntensity = isDoubled ? 20 : 10;

              return (
                <React.Fragment key={orb.id}>
                  {/* Extra glow for doubled orbs */}
                  {isDoubled && (
                    <Circle
                      x={orb.position.x}
                      y={orb.position.y}
                      radius={8 * pulseScale}
                      fill="#FFD700"
                      opacity={0.3}
                      shadowColor="#FFD700"
                      shadowBlur={15}
                    />
                  )}
                  <Circle
                    x={orb.position.x}
                    y={orb.position.y}
                    radius={5 * pulseScale}
                    fill={isDoubled ? "#FFD700" : "#a855f7"}
                    shadowColor={isDoubled ? "#FFD700" : "#a855f7"}
                    shadowBlur={glowIntensity}
                  />
                  {/* Lucky clover emoji for doubled orbs */}
                  {isDoubled && (
                    <Text
                      text="🍀"
                      x={orb.position.x}
                      y={orb.position.y - 12}
                      fontSize={10}
                      offsetX={5}
                      offsetY={5}
                      opacity={0.8}
                    />
                  )}
                </React.Fragment>
              );
            })}
          {/* Render Turrets */}
          {turrets &&
            turrets.length > 0 &&
            turrets.map((turret) => {
              const timeRemaining = Math.max(0, turret.expiresAt - now);
              const isExpiring = timeRemaining < 5000;
              const pulseOpacity = isExpiring
                ? 0.5 + Math.sin(now / 100) * 0.5
                : 1;

              return (
                <React.Fragment key={turret.id}>
                  {/* Turret range indicator */}
                  <Circle
                    x={turret.position.x}
                    y={turret.position.y}
                    radius={turret.range}
                    fillEnabled={false}
                    stroke="#FFA500"
                    opacity={0.15}
                    dash={[8, 8]}
                  />
                  {/* Turret body */}
                  <Circle
                    x={turret.position.x}
                    y={turret.position.y}
                    radius={15}
                    fill="#8B4513"
                    stroke="#FFA500"
                    strokeWidth={2}
                    shadowColor="#FFA500"
                    shadowBlur={15}
                    opacity={pulseOpacity}
                  />
                  {/* Turret emoji */}
                  <Text
                    text="🗼"
                    x={turret.position.x}
                    y={turret.position.y}
                    fontSize={20}
                    offsetX={10}
                    offsetY={10}
                    opacity={pulseOpacity}
                  />
                  {/* Health bar */}
                  <Rect
                    x={turret.position.x - 15}
                    y={turret.position.y - 25}
                    width={30}
                    height={4}
                    fill="#333333"
                  />
                  <Rect
                    x={turret.position.x - 15}
                    y={turret.position.y - 25}
                    width={30 * (turret.health / turret.maxHealth)}
                    height={4}
                    fill="#FFA500"
                  />
                  {/* Timer */}
                  {isExpiring && (
                    <Text
                      text={Math.ceil(timeRemaining / 1000).toString()}
                      x={turret.position.x}
                      y={turret.position.y + 20}
                      fontSize={10}
                      fontFamily='"Press Start 2P"'
                      fill="#FFA500"
                      offsetX={5}
                    />
                  )}
                </React.Fragment>
              );
            })}
          {/* Render Pets */}
          {pets &&
            pets.length > 0 &&
            pets.map((pet) => {
              const isHit =
                pet.lastHitTimestamp &&
                now - pet.lastHitTimestamp < HIT_FLASH_DURATION;
              return (
                <React.Fragment key={pet.id}>
                  {/* Pet body */}
                  <Circle
                    x={pet.position.x}
                    y={pet.position.y}
                    radius={12}
                    fill={isHit ? "#FFFFFF" : "#FFB6C1"}
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
          {/* Render Clones */}
          {clones &&
            clones.length > 0 &&
            clones.map((clone) => {
              const owner = players.find((p) => p.id === clone.ownerId);
              if (!owner) return null;

              // Character-specific emoji for clone
              const characterEmoji =
                owner.characterType === "spray-n-pray"
                  ? "🔫"
                  : owner.characterType === "boom-bringer"
                  ? "💣"
                  : owner.characterType === "glass-cannon-carl"
                  ? "🎯"
                  : owner.characterType === "pet-pal-percy"
                  ? "🐾"
                  : owner.characterType === "vampire-vex"
                  ? "🧛"
                  : owner.characterType === "turret-tina"
                  ? "🏗️"
                  : owner.characterType === "dash-dynamo"
                  ? "⚡"
                  : "🔫";

              return (
                <React.Fragment key={clone.id}>
                  {/* Clone ghostly aura */}
                  <Circle
                    x={clone.position.x}
                    y={clone.position.y}
                    radius={20}
                    fill="#9333EA"
                    opacity={clone.opacity * 0.2}
                    shadowColor="#9333EA"
                    shadowBlur={20}
                  />
                  {/* Clone body */}
                  <Circle
                    x={clone.position.x}
                    y={clone.position.y}
                    radius={15}
                    fill={owner.color || "#00FFFF"}
                    opacity={clone.opacity * 0.5}
                    stroke="#9333EA"
                    strokeWidth={2}
                    shadowColor="#9333EA"
                    shadowBlur={10}
                  />
                  {/* Clone emoji (semi-transparent) */}
                  <Text
                    text={characterEmoji}
                    x={clone.position.x}
                    y={clone.position.y}
                    fontSize={18}
                    offsetX={9}
                    offsetY={9}
                    opacity={clone.opacity * 0.7}
                  />
                  {/* Afterimage effect indicator */}
                  <Text
                    text="👯"
                    x={clone.position.x}
                    y={clone.position.y - 25}
                    fontSize={12}
                    offsetX={6}
                    offsetY={6}
                    opacity={clone.opacity * 0.8}
                  />
                </React.Fragment>
              );
            })}
          {/* Render Players */}
          {players &&
            players.length > 0 &&
            players.map((player) => {
              const isHit =
                player.lastHitTimestamp &&
                now - player.lastHitTimestamp < HIT_FLASH_DURATION;
              const isHealed =
                player.lastHealedTimestamp &&
                now - player.lastHealedTimestamp < HEAL_FLASH_DURATION;
              const isBerserker = player.health < player.maxHealth * 0.3;
              const hasShield = player.shield && player.shield > 0;

              // Character-specific emoji
              const characterEmoji =
                player.characterType === "spray-n-pray"
                  ? "🔫"
                  : player.characterType === "boom-bringer"
                  ? "💣"
                  : player.characterType === "glass-cannon-carl"
                  ? "🎯"
                  : player.characterType === "pet-pal-percy"
                  ? "🐾"
                  : player.characterType === "vampire-vex"
                  ? "🧛"
                  : player.characterType === "turret-tina"
                  ? "🏗️"
                  : player.characterType === "dash-dynamo"
                  ? "⚡"
                  : "🔫";

              return (
                <React.Fragment key={player.id}>
                  {/* Vampire Vex drain aura */}
                  {player.characterType === "vampire-vex" &&
                    player.status === "alive" &&
                    player.vampireDrainRadius && (
                      <Circle
                        x={player.position.x}
                        y={player.position.y}
                        radius={player.vampireDrainRadius}
                        fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                        fillRadialGradientStartRadius={0}
                        fillRadialGradientEndRadius={player.vampireDrainRadius}
                        fillRadialGradientColorStops={[
                          0,
                          "#FF000055",
                          0.7,
                          "#FF000022",
                          1,
                          "#FF000000",
                        ]}
                        opacity={0.6 + Math.sin(now / 200) * 0.2}
                      />
                    )}
                  {/* Pickup radius (local player only) */}
                  {player.id === localPlayerId && player.status === "alive" && (
                    <Circle
                      x={player.position.x}
                      y={player.position.y}
                      radius={player.pickupRadius || 100}
                      fillEnabled={false}
                      stroke="#a855f7"
                      opacity={0.2}
                      dash={[6, 6]}
                    />
                  )}
                  {/* Shield ring */}
                  {hasShield && player.status === "alive" && (
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
                  {isBerserker && player.status === "alive" && (
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
                  {/* God Mode invulnerability aura */}
                  {player.isInvulnerable && player.status === "alive" && (
                    <Circle
                      x={player.position.x}
                      y={player.position.y}
                      radius={22}
                      stroke="#FFFFFF"
                      strokeWidth={3}
                      shadowColor="#FFFFFF"
                      shadowBlur={20}
                      opacity={0.8 + Math.sin(now / 100) * 0.2}
                    />
                  )}
                  {/* Omni-Glitch indicator */}
                  {player.hasOmniGlitch && player.status === "alive" && (
                    <Ring
                      x={player.position.x}
                      y={player.position.y}
                      innerRadius={18}
                      outerRadius={21}
                      fill="#FF00FF"
                      opacity={0.5}
                      rotation={now / 5}
                    />
                  )}
                  {/* Lucky upgrade indicator */}
                  {player.hasLucky && player.status === "alive" && (
                    <Text
                      text="🍀"
                      x={player.position.x + 18}
                      y={player.position.y - 18}
                      fontSize={14}
                      offsetX={7}
                      offsetY={7}
                      opacity={0.8 + Math.sin(now / 150) * 0.2}
                    />
                  )}
                  {/* TimeWarp upgrade indicator */}
                  {player.hasTimeWarp && player.status === "alive" && (
                    <Text
                      text="⏰"
                      x={player.position.x - 18}
                      y={player.position.y - 18}
                      fontSize={14}
                      offsetX={7}
                      offsetY={7}
                      opacity={0.8 + Math.sin(now / 150) * 0.2}
                    />
                  )}
                  <Circle
                    x={player.position.x}
                    y={player.position.y}
                    radius={15}
                    fill={isHit ? "#FFFFFF" : player.color}
                    stroke={
                      player.id === localPlayerId && player.status === "alive"
                        ? "#FFFFFF"
                        : player.color
                    }
                    strokeWidth={
                      player.id === localPlayerId && player.status === "alive"
                        ? 3
                        : 2
                    }
                    shadowColor={isBerserker ? "#FF0000" : player.color}
                    shadowBlur={isBerserker ? 30 : 20}
                    opacity={player.status === "dead" ? 0.3 : 1}
                  />
                  {/* Character emoji indicator */}
                  <Text
                    text={characterEmoji}
                    x={player.position.x}
                    y={player.position.y}
                    fontSize={20}
                    offsetX={10}
                    offsetY={10}
                    opacity={player.status === "dead" ? 0.3 : 1}
                  />
                  {/* Heal flash */}
                  {isHealed && player.status === "alive" && (
                    <Ring
                      x={player.position.x}
                      y={player.position.y}
                      innerRadius={18}
                      outerRadius={22}
                      fill="#00FF00"
                      opacity={0.5}
                    />
                  )}
                  {player.status === "dead" && player.reviveProgress > 0 && (
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
          {enemies &&
            enemies.length > 0 &&
            enemies.map((enemy) => {
              const isHit =
                enemy.lastHitTimestamp &&
                now - enemy.lastHitTimestamp < HIT_FLASH_DURATION;
              const isCrit =
                enemy.lastCritTimestamp &&
                now - enemy.lastCritTimestamp < CRIT_FLASH_DURATION;

              // Check for status effects
              const isBurning = enemy.statusEffects?.some(
                (e) => e.type === "burning"
              );
              const isPoisoned = enemy.statusEffects?.some(
                (e) => e.type === "poisoned"
              );
              const isSlowed = enemy.statusEffects?.some(
                (e) => e.type === "slowed"
              );

              // Check if timeWarp is active
              const hasTimeWarp = players.some((p) => p.hasTimeWarp);

              // Enemy type specific colors and sizes
              let fill = "#FFFF00"; // default yellow for grunt
              let shadow = "#FFFF00";
              let size = 20;

              if (enemy.type === "slugger") {
                fill = "#FF8800"; // orange for slugger
                shadow = "#FF8800";
                size = 24; // slightly larger
              } else if (enemy.type === "hellhound") {
                fill = "#8B0000"; // dark red for hellhound
                shadow = "#FF0000";
                size = 22; // medium size
              } else if (enemy.type === "splitter") {
                fill = "#9D00FF"; // purple/magenta for splitter
                shadow = "#9D00FF";
                size = 26; // medium-large
              } else if (enemy.type === "mini-splitter") {
                fill = "#C77DFF"; // lighter purple for mini-splitter
                shadow = "#C77DFF";
                size = 16; // smaller
              } else if (enemy.type === "neon-pulse") {
                fill = "#00FFFF";
                shadow = "#00FFFF";
                size = 20;
              } else if (enemy.type === "glitch-spider") {
                fill = "#FF00AA";
                shadow = "#FF00AA";
                size = 15;
              } else if (enemy.type === "tank-bot") {
                fill = "#555555";
                shadow = "#555555";
                size = 35;
              }

              if (isCrit) {
                fill = "#FF5A5A";
                shadow = "#FF5A5A";
              } else if (isHit) {
                fill = "#FFFFFF";
              } else if (isBurning) {
                fill = "#FF6600"; // orange/red for fire
                shadow = "#FF6600";
              } else if (isPoisoned) {
                fill = "#00FF00"; // green for poison
                shadow = "#00FF00";
              } else if (isSlowed) {
                fill = "#00CCFF"; // cyan/blue for ice
                shadow = "#00CCFF";
              }

              return (
                <React.Fragment key={enemy.id}>
                  {/* TimeWarp slow-motion indicator */}
                  {hasTimeWarp && (
                    <Circle
                      x={enemy.position.x}
                      y={enemy.position.y}
                      radius={size / 2 + 5}
                      fillEnabled={false}
                      stroke="#87CEEB"
                      strokeWidth={2}
                      opacity={0.5 + Math.sin(now / 200) * 0.3}
                      dash={[4, 4]}
                    />
                  )}
                  {enemy.type === "hellhound" ? (
                    // Hellhound with dog emoji and wiggle animation
                    <>
                      <Circle
                        x={enemy.position.x}
                        y={enemy.position.y}
                        radius={size / 2}
                        fill={fill}
                        shadowColor={shadow}
                        shadowBlur={18}
                        opacity={isHit ? 1 : 0.8}
                      />
                      <Text
                        text="🐕"
                        x={enemy.position.x}
                        y={enemy.position.y}
                        fontSize={24}
                        offsetX={12}
                        offsetY={12}
                        rotation={Math.sin(now / 100 + enemy.position.x) * 15}
                      />
                    </>
                  ) : enemy.type === "glitch-spider" ? (
                    <>
                      <Circle
                        x={enemy.position.x}
                        y={enemy.position.y}
                        radius={size / 2}
                        fill={fill}
                        shadowColor={shadow}
                        shadowBlur={15}
                        opacity={isHit ? 1 : 0.8}
                      />
                      <Text
                        text="🕷️"
                        x={enemy.position.x}
                        y={enemy.position.y}
                        fontSize={18}
                        offsetX={9}
                        offsetY={9}
                        rotation={Math.sin(now / 50 + enemy.position.x) * 20}
                      />
                    </>
                  ) : enemy.type === "tank-bot" ? (
                    <>
                      <Rect
                        x={enemy.position.x - size / 2}
                        y={enemy.position.y - size / 2}
                        width={size}
                        height={size}
                        fill={fill}
                        shadowColor={shadow}
                        shadowBlur={20}
                        cornerRadius={4}
                        stroke="#333333"
                        strokeWidth={2}
                        opacity={isHit ? 1 : 0.9}
                      />
                      <Circle
                        x={enemy.position.x}
                        y={enemy.position.y}
                        radius={size / 2 - 5}
                        fill="#222222"
                        opacity={0.3}
                      />
                      <Text
                        text="🤖"
                        x={enemy.position.x}
                        y={enemy.position.y}
                        fontSize={28}
                        offsetX={14}
                        offsetY={14}
                      />
                    </>
                  ) : enemy.type === "neon-pulse" ? (
                    <>
                      <Circle
                        x={enemy.position.x}
                        y={enemy.position.y}
                        radius={size / 2 + Math.sin(now / 200) * 3}
                        fill={fill}
                        shadowColor={shadow}
                        shadowBlur={25}
                        opacity={0.4}
                      />
                      <Circle
                        x={enemy.position.x}
                        y={enemy.position.y}
                        radius={size / 2}
                        fill={fill}
                        shadowColor={shadow}
                        shadowBlur={15}
                        opacity={isHit ? 1 : 0.8}
                      />
                      <Text
                        text="💠"
                        x={enemy.position.x}
                        y={enemy.position.y}
                        fontSize={20}
                        offsetX={10}
                        offsetY={10}
                      />
                    </>
                  ) : (
                    <Rect
                      x={enemy.position.x - size / 2}
                      y={enemy.position.y - size / 2}
                      width={size}
                      height={size}
                      fill={fill}
                      shadowColor={shadow}
                      shadowBlur={18}
                    />
                  )}
                  {/* TimeWarp clock emoji indicator */}
                  {hasTimeWarp && (
                    <Text
                      text="⏰"
                      x={enemy.position.x}
                      y={enemy.position.y - size / 2 - 8}
                      fontSize={10}
                      offsetX={5}
                      offsetY={5}
                      opacity={0.7}
                    />
                  )}
                  {/* Damage Numbers */}
                  {enemy.damageNumbers?.map((dmg) => {
                    const age = now - dmg.timestamp;
                    if (age > DAMAGE_NUMBER_DURATION) return null;
                    const progress = age / DAMAGE_NUMBER_DURATION;
                    const yOffset = -20 - progress * 30;
                    const opacity = 1 - progress;
                    const fontSize = dmg.isCrit ? 18 : 14;
                    const color = dmg.isCrit ? "#FF3333" : "#FFFFFF";
                    return (
                      <Text
                        key={dmg.id}
                        text={dmg.damage.toString()}
                        x={dmg.position.x}
                        y={dmg.position.y + yOffset}
                        fontSize={fontSize}
                        fontFamily='"Press Start 2P"'
                        fontStyle={dmg.isCrit ? "bold" : "normal"}
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

          {/* Render Boss */}
          {boss && (
            <React.Fragment>
              {/* Boss telegraph indicators */}
              {boss.currentAttack && boss.currentAttack.type === "charge" && (
                <>
                  {/* Red glow during telegraph */}
                  <Circle
                    x={boss.position.x}
                    y={boss.position.y}
                    radius={50}
                    fill="#FF0000"
                    opacity={0.3}
                    shadowColor="#FF0000"
                    shadowBlur={30}
                  />
                  {/* Direction indicator */}
                  {boss.currentAttack.direction && (
                    <Line
                      points={[
                        boss.position.x,
                        boss.position.y,
                        boss.position.x + boss.currentAttack.direction.x * 200,
                        boss.position.y + boss.currentAttack.direction.y * 200,
                      ]}
                      stroke="#FF0000"
                      strokeWidth={4}
                      opacity={0.6}
                      dash={[10, 5]}
                    />
                  )}
                </>
              )}
              {boss.currentAttack && boss.currentAttack.type === "slam" && (
                <>
                  {/* Slam telegraph - expanding circle */}
                  <Circle
                    x={boss.position.x}
                    y={boss.position.y}
                    radius={60}
                    stroke="#FF6600"
                    strokeWidth={4}
                    opacity={0.7}
                    dash={[8, 4]}
                  />
                  <Circle
                    x={boss.position.x}
                    y={boss.position.y}
                    radius={120}
                    stroke="#FF6600"
                    strokeWidth={3}
                    opacity={0.5}
                    dash={[8, 4]}
                  />
                  <Circle
                    x={boss.position.x}
                    y={boss.position.y}
                    radius={180}
                    stroke="#FF6600"
                    strokeWidth={2}
                    opacity={0.3}
                    dash={[8, 4]}
                  />
                </>
              )}

              {/* Summoner teleport telegraph */}
              {boss.currentAttack &&
                boss.currentAttack.type === "teleport" &&
                boss.currentAttack.targetPosition && (
                  <>
                    {/* Destination indicator */}
                    <Circle
                      x={boss.currentAttack.targetPosition.x}
                      y={boss.currentAttack.targetPosition.y}
                      radius={40}
                      fill="#9370DB"
                      opacity={0.3}
                      shadowColor="#9370DB"
                      shadowBlur={25}
                    />
                    <Circle
                      x={boss.currentAttack.targetPosition.x}
                      y={boss.currentAttack.targetPosition.y}
                      radius={30}
                      stroke="#9370DB"
                      strokeWidth={3}
                      opacity={0.6}
                      dash={[5, 5]}
                    />
                  </>
                )}

              {/* Summoner beam telegraph */}
              {boss.currentAttack &&
                boss.currentAttack.type === "beam" &&
                boss.currentAttack.targetPosition && (
                  <Line
                    points={[
                      boss.position.x,
                      boss.position.y,
                      boss.currentAttack.targetPosition.x,
                      boss.currentAttack.targetPosition.y,
                    ]}
                    stroke="#9370DB"
                    strokeWidth={6}
                    opacity={0.4}
                    dash={[10, 5]}
                    shadowColor="#9370DB"
                    shadowBlur={15}
                  />
                )}

              {/* Architect laser grid */}
              {boss.currentAttack &&
                boss.currentAttack.type === "laser-grid" && (
                  <>
                    {[0, 1, 2, 3].map((i) => {
                      const isActive =
                        boss.currentAttack!.executeTime &&
                        now >= boss.currentAttack!.executeTime;
                      const elapsed = isActive
                        ? (now - boss.currentAttack!.executeTime!) / 1000
                        : 0;
                      const rotationSpeed = 0.5 * (boss.isEnraged ? 1.5 : 1);
                      const angle = (i * Math.PI) / 2 + elapsed * rotationSpeed;
                      const length = Math.max(
                        SERVER_ARENA_WIDTH,
                        SERVER_ARENA_HEIGHT
                      );
                      return (
                        <Line
                          key={i}
                          points={[
                            boss.position.x,
                            boss.position.y,
                            boss.position.x + Math.cos(angle) * length,
                            boss.position.y + Math.sin(angle) * length,
                          ]}
                          stroke={isActive ? "#00FFFF" : "#00CCCC"}
                          strokeWidth={isActive ? 6 : 4}
                          opacity={isActive ? 0.8 : 0.4}
                          shadowColor="#00CCCC"
                          shadowBlur={isActive ? 30 : 20}
                        />
                      );
                    })}
                  </>
                )}

              {/* Boss body */}
              <Circle
                x={boss.position.x}
                y={boss.position.y}
                radius={40}
                fill={
                  boss.type === "berserker"
                    ? boss.isEnraged
                      ? "#8B0000"
                      : "#FF0000"
                    : boss.type === "summoner"
                    ? boss.isEnraged
                      ? "#4B0082"
                      : "#9370DB"
                    : boss.type === "architect"
                    ? boss.isEnraged
                      ? "#006666"
                      : "#00CCCC"
                    : "#FF0000"
                }
                stroke={
                  boss.lastHitTimestamp &&
                  now - boss.lastHitTimestamp < HIT_FLASH_DURATION
                    ? "#FFFFFF"
                    : "#000000"
                }
                strokeWidth={3}
                shadowColor={
                  boss.type === "berserker"
                    ? boss.isEnraged
                      ? "#FF0000"
                      : "#8B0000"
                    : boss.type === "summoner"
                    ? boss.isEnraged
                      ? "#9370DB"
                      : "#4B0082"
                    : boss.type === "architect"
                    ? boss.isEnraged
                      ? "#00CCCC"
                      : "#006666"
                    : "#8B0000"
                }
                shadowBlur={boss.isEnraged ? 40 : 25}
                opacity={boss.isInvulnerable ? 0.5 : 1}
              />

              {/* Boss emoji/icon */}
              <Text
                text={
                  boss.type === "berserker"
                    ? "👹"
                    : boss.type === "summoner"
                    ? "🧙"
                    : boss.type === "architect"
                    ? "🤖"
                    : "👹"
                }
                x={boss.position.x}
                y={boss.position.y}
                fontSize={48}
                offsetX={24}
                offsetY={24}
              />

              {/* Boss health bar */}
              <Rect
                x={boss.position.x - 50}
                y={boss.position.y - 60}
                width={100}
                height={8}
                fill="#333333"
                stroke="#000000"
                strokeWidth={1}
              />
              <Rect
                x={boss.position.x - 50}
                y={boss.position.y - 60}
                width={100 * (boss.health / boss.maxHealth)}
                height={8}
                fill={boss.isEnraged ? "#FF0000" : "#00FF00"}
                shadowColor={boss.isEnraged ? "#FF0000" : "#00FF00"}
                shadowBlur={8}
              />

              {/* Boss name */}
              <Text
                text={boss.type.toUpperCase()}
                x={boss.position.x}
                y={boss.position.y - 75}
                fontSize={12}
                fontFamily='"Press Start 2P"'
                fill={
                  boss.type === "berserker"
                    ? "#FF0000"
                    : boss.type === "summoner"
                    ? "#9370DB"
                    : boss.type === "architect"
                    ? "#00CCCC"
                    : "#FF0000"
                }
                offsetX={50}
                shadowColor="#000000"
                shadowBlur={4}
              />
            </React.Fragment>
          )}

          {/* Render Portals (Summoner) */}
          {boss &&
            boss.portals &&
            boss.portals.map((portal) => (
              <React.Fragment key={portal.id}>
                <Circle
                  x={portal.position.x}
                  y={portal.position.y}
                  radius={25}
                  fill="#9370DB"
                  opacity={0.6}
                  shadowColor="#9370DB"
                  shadowBlur={20}
                />
                <Circle
                  x={portal.position.x}
                  y={portal.position.y}
                  radius={15}
                  fill="#4B0082"
                  opacity={0.8}
                  shadowColor="#4B0082"
                  shadowBlur={15}
                />
                {/* Portal health bar */}
                <Rect
                  x={portal.position.x - 20}
                  y={portal.position.y - 35}
                  width={40}
                  height={4}
                  fill="#333333"
                />
                <Rect
                  x={portal.position.x - 20}
                  y={portal.position.y - 35}
                  width={40 * (portal.health / portal.maxHealth)}
                  height={4}
                  fill="#9370DB"
                />
              </React.Fragment>
            ))}

          {/* Render Shield Generators (Architect) */}
          {boss &&
            boss.shieldGenerators &&
            boss.shieldGenerators.map((generator) => (
              <React.Fragment key={generator.id}>
                <Circle
                  x={generator.position.x}
                  y={generator.position.y}
                  radius={30}
                  fill="#00CCCC"
                  opacity={0.4}
                  shadowColor="#00CCCC"
                  shadowBlur={25}
                />
                <Circle
                  x={generator.position.x}
                  y={generator.position.y}
                  radius={20}
                  fill="#006666"
                  opacity={0.8}
                  shadowColor="#00CCCC"
                  shadowBlur={15}
                />
                {/* Generator health bar */}
                <Rect
                  x={generator.position.x - 25}
                  y={generator.position.y - 40}
                  width={50}
                  height={5}
                  fill="#333333"
                />
                <Rect
                  x={generator.position.x - 25}
                  y={generator.position.y - 40}
                  width={50 * (generator.health / generator.maxHealth)}
                  height={5}
                  fill="#00CCCC"
                />
              </React.Fragment>
            ))}

          {/* Render Shockwave Rings */}
          {shockwaveRings &&
            shockwaveRings.map((ring) => (
              <Circle
                key={ring.id}
                x={ring.position.x}
                y={ring.position.y}
                radius={ring.currentRadius}
                stroke="#FF6600"
                strokeWidth={20}
                opacity={0.6}
                shadowColor="#FF6600"
                shadowBlur={15}
              />
            ))}

          {/* Render Boss Projectiles */}
          {bossProjectiles &&
            bossProjectiles.map((proj) => (
              <Circle
                key={proj.id}
                x={proj.position.x}
                y={proj.position.y}
                radius={proj.radius}
                fill="#9370DB"
                opacity={0.8}
                shadowColor="#9370DB"
                shadowBlur={20}
              />
            ))}

          {/* Render Projectiles */}
          {projectiles &&
            projectiles.length > 0 &&
            projectiles.map((p) => {
              const owner = players.find((pl) => pl.id === p.ownerId);
              const isEnemyProjectile = enemies.some((e) => e.id === p.ownerId);
              const hasHoming =
                owner?.homingStrength && owner.homingStrength > 0;
              const hasRicochet =
                owner?.ricochetCount && owner.ricochetCount > 0;

              if (p.kind === "bananarang") {
                const color = p.isCrit ? "#FFD166" : "#FFF176";
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
                    rotation={(Date.now() / 10) % 360}
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
                    radius={6}
                    fill="#FF8800"
                    shadowColor="#FF8800"
                    shadowBlur={15}
                  />
                );
              }

              // Enhanced bullet visuals for upgrades
              let bulletColor = p.isCrit ? "#FF3B3B" : "#FFFFFF";
              let bulletRadius = p.isCrit ? 5 : 4;
              let bulletGlow = 12;

              if (hasRicochet) {
                bulletColor = "#FF00FF"; // Magenta for ricochet
                bulletGlow = 16;
              } else if (hasHoming) {
                bulletColor = "#00FFFF"; // Cyan for homing
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
          {chainLightning &&
            chainLightning.length > 0 &&
            chainLightning.map((chain) => {
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
          {/* Render Fire Trails */}
          {fireTrails &&
            fireTrails.length > 0 &&
            fireTrails.map((trail) => {
              const age = now - trail.timestamp;
              const maxDuration = 2000; // 2 seconds
              if (age > maxDuration) return null;
              const progress = age / maxDuration;
              const opacity = (1 - progress) * 0.5; // Fade out over time
              const pulseScale = 1 + Math.sin(now / 100) * 0.1; // Pulsing effect

              return (
                <React.Fragment key={trail.id}>
                  {/* Outer glow */}
                  <Circle
                    x={trail.position.x}
                    y={trail.position.y}
                    radius={trail.radius * pulseScale}
                    fill="#FF6600"
                    opacity={opacity * 0.3}
                    shadowColor="#FF6600"
                    shadowBlur={25}
                  />
                  {/* Inner fire */}
                  <Circle
                    x={trail.position.x}
                    y={trail.position.y}
                    radius={trail.radius * 0.6 * pulseScale}
                    fill="#FF3300"
                    opacity={opacity * 0.6}
                    shadowColor="#FF9900"
                    shadowBlur={15}
                  />
                </React.Fragment>
              );
            })}
          {/* Render Orbital Skulls */}
          {orbitalSkulls &&
            orbitalSkulls.length > 0 &&
            orbitalSkulls.map((skull) => {
              const owner = players.find((p) => p.id === skull.ownerId);
              if (!owner) return null;

              // Calculate skull position
              const skullX =
                owner.position.x + Math.cos(skull.angle) * skull.radius;
              const skullY =
                owner.position.y + Math.sin(skull.angle) * skull.radius;

              // Pulsing fire glow effect
              const pulseIntensity = 0.7 + Math.sin(now / 150) * 0.3;

              return (
                <React.Fragment key={skull.id}>
                  {/* Fire aura around skull */}
                  <Circle
                    x={skullX}
                    y={skullY}
                    radius={18}
                    fill="#FF6600"
                    opacity={pulseIntensity * 0.4}
                    shadowColor="#FF3300"
                    shadowBlur={30}
                  />
                  {/* Inner fire glow */}
                  <Circle
                    x={skullX}
                    y={skullY}
                    radius={12}
                    fill="#FF9900"
                    opacity={pulseIntensity * 0.6}
                    shadowColor="#FFAA00"
                    shadowBlur={20}
                  />
                  {/* Skull emoji */}
                  <Text
                    text="💀"
                    x={skullX}
                    y={skullY}
                    fontSize={24}
                    offsetX={12}
                    offsetY={12}
                    shadowColor="#FF0000"
                    shadowBlur={15}
                  />
                </React.Fragment>
              );
            })}
          {/* Render Explosions */}
          {explosions &&
            explosions.length > 0 &&
            explosions.map((explosion) => {
              const age = now - explosion.timestamp;
              const maxDuration = 500; // ms
              if (age > maxDuration) return null;
              const progress = age / maxDuration;
              const currentRadius = Math.max(
                0,
                explosion.radius * (0.3 + progress * 0.7)
              );
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
          <Text
            text={`Game Code: ${gameId}`}
            x={20}
            y={SERVER_ARENA_HEIGHT - 30}
            fontFamily='"Press Start 2P"'
            fontSize={14}
            fill="#FF00FF"
          />
        </Group>
      </Layer>
    </Stage>
  );
}
