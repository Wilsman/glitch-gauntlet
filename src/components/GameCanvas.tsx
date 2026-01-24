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
  Image as KonvaImage,
} from "react-konva";
import { SPRITE_MAP } from "@/lib/spriteMap";
import { useGameStore } from "@/hooks/useGameStore";
import { useShallow } from "zustand/react/shallow";
import type { Particle, Hazard } from "@shared/types";

// Fixed server-side arena dimensions
const SERVER_ARENA_WIDTH = 1280;
const SERVER_ARENA_HEIGHT = 720;

const HIT_FLASH_DURATION = 100;
const CRIT_FLASH_DURATION = 160;
const HEAL_FLASH_DURATION = 180;
const REVIVE_DURATION = 3000;
const EXTRACTION_DURATION = 5000;
const DAMAGE_NUMBER_DURATION = 800;
const WAVE_DURATION = 20000;

const VAMPIRE_DRAIN_STOPS = [0, "#FF000055", 0.7, "#FF000022", 1, "#FF000000"];
const LOW_HEALTH_VIGNETTE_STOPS = [0, "transparent", 1, "rgba(255, 0, 0, 0.2)"];

const useSprite = (url?: string) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.src = url;
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
  }, [url]);

  return image;
};

const useAnimatedSprite = (framePath?: string, frames?: number) => {
  const [images, setImages] = useState<HTMLImageElement[]>([]);

  useEffect(() => {
    if (!framePath || !frames) {
      setImages([]);
      return;
    }

    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;

    for (let i = 0; i < frames; i++) {
      const img = new window.Image();
      img.src = framePath.replace("{i}", i.toString());
      img.onload = () => {
        loadedCount++;
        if (loadedCount === frames) {
          setImages(loadedImages);
        }
      };
      img.onerror = (e) => {
        console.error(`Failed to load frame ${i}`, e);
        loadedCount++;
        if (loadedCount === frames) {
          setImages(loadedImages);
        }
      };
      loadedImages[i] = img;
    }
  }, [framePath, frames]);

  return images;
};

const RenderParticles = memo(({ particles }: { particles: Particle[] }) => {
  return (
    <Group listening={false}>
      {particles.map((p) => (
        <Rect
          key={p.id}
          x={p.position.x}
          y={p.position.y}
          width={p.size}
          height={p.size}
          fill={p.color}
          opacity={p.life}
          listening={false}
        />
      ))}
    </Group>
  );
});

const RenderHazards = memo(({ hazards }: { hazards: Hazard[] }) => {
  return (
    <Group listening={false}>
      {hazards.map((h) => (
        <Group key={h.id} x={h.position.x} y={h.position.y}>
          {h.type === "spike-trap" ? (
            <Group>
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
                <Group>
                  <Rect
                    key={`hazard-active-${h.id}`}
                    x={-15}
                    y={-15}
                    width={30}
                    height={30}
                    fill="#FF0000"
                    opacity={0.3 + Math.sin(Date.now() / 100) * 0.2}
                  />
                  <Text
                    key={`hazard-text-${h.id}`}
                    text="🔺"
                    x={-12}
                    y={-12}
                    fontSize={24}
                    shadowColor="#FF0000"
                    shadowBlur={10}
                  />
                </Group>
              ) : (
                <Group>
                  {/* Priming telegraph: Glows yellow if about to toggle (approximate based on time) */}
                  {h.lastToggle && (Date.now() - h.lastToggle) % 5000 > 4000 ? (
                    <Rect
                      key={`hazard-prime-${h.id}`}
                      x={-18}
                      y={-18}
                      width={36}
                      height={36}
                      fill="#FFFF00"
                      opacity={0.2 + Math.sin(Date.now() / 150) * 0.1}
                      shadowColor="#FFFF00"
                      shadowBlur={15}
                    />
                  ) : null}
                  <Text
                    key={`hazard-idle-${h.id}`}
                    text="◾"
                    x={-10}
                    y={-10}
                    fontSize={20}
                    fill="#444"
                  />
                </Group>
              )}
            </Group>
          ) : (
            <Group>
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
                text={h.type === "explosive-barrel" ? "TNT" : "❄️"}
                x={h.type === "explosive-barrel" ? -14 : -10}
                y={-8}
                fontSize={h.type === "explosive-barrel" ? 10 : 14}
                fill="#FFFFFF"
                fontFamily='"Press Start 2P"'
              />
            </Group>
          )}
        </Group>
      ))}
    </Group>
  );
});

const RenderBinaryDrops = memo(({ drops }: { drops: any[] }) => {
  return (
    <Group>
      {drops.map((d) => (
        <Group key={d.id} x={d.position.x} y={d.position.y}>
          <Circle
            radius={10}
            fill={d.type === "1" ? "#00FF00" : "#00FFFF"}
            opacity={0.6 + Math.sin(Date.now() / 100) * 0.2}
            shadowColor={d.type === "1" ? "#00FF00" : "#00FFFF"}
            shadowBlur={15}
          />
          <Text
            text={d.type}
            fontSize={12}
            offsetX={4}
            offsetY={6}
            fill="#FFFFFF"
            fontFamily='"Press Start 2P"'
          />
        </Group>
      ))}
    </Group>
  );
});

const RenderTrailSegments = memo(({ segments }: { segments: any[] }) => {
  return (
    <Group>
      {segments.map((s) => (
        <Circle
          key={s.id}
          x={s.position.x}
          y={s.position.y}
          radius={15}
          fill="#00FFFF"
          opacity={Math.max(0, 0.4 * (1 - (Date.now() - s.timestamp) / 2000))}
          listening={false}
        />
      ))}
    </Group>
  );
});

const PlayerVisuals = memo(
  ({
    player,
    now,
    localPlayerId,
    enemiesCount,
  }: {
    player: any;
    now: number;
    localPlayerId: string;
    enemiesCount: number;
  }) => {
    const isHit =
      player.lastHitTimestamp &&
      now - player.lastHitTimestamp < HIT_FLASH_DURATION;
    const isHealed =
      player.lastHealedTimestamp &&
      now - player.lastHealedTimestamp < HEAL_FLASH_DURATION;
    const isBerserker = player.health < player.maxHealth * 0.3;
    const hasShield = (player.shield ?? 0) > 0;
    const isLocal = player.id === localPlayerId;
    const isDead = player.status === "dead";

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

    const spriteConfig = (SPRITE_MAP.characters as any)[player.characterType];
    const staticSprite = useSprite(spriteConfig?.url);
    const animatedFrames = useAnimatedSprite(
      spriteConfig?.framePath,
      spriteConfig?.frames,
    );

    // Calculate current frame if it's an animation
    const currentFrameIndex = spriteConfig?.frames
      ? Math.floor(now / (spriteConfig.animationSpeed || 100)) %
        spriteConfig.frames
      : 0;
    const sprite = spriteConfig?.frames
      ? animatedFrames[currentFrameIndex]
      : staticSprite;

    const color = player.color || "#00FFFF";
    const glowColor = isBerserker ? "#FF0000" : color;

    return (
      <Group>
        {/* Movement Trail */}
        {!isDead &&
          player.history?.map((pos: any, i: number) => (
            <Circle
              key={`trail-${player.id}-${i}`}
              x={pos.x}
              y={pos.y}
              radius={Math.max(0, 12 - (5 - i) * 2)}
              fill={color}
              opacity={0.1 * (i / 5)}
              listening={false}
            />
          ))}
        <Group x={player.position.x} y={player.position.y}>
          {/* Vampire Vex drain aura */}
          {player.characterType === "vampire-vex" &&
            !isDead &&
            player.vampireDrainRadius > 0 && (
              <Circle
                radius={player.vampireDrainRadius}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndRadius={player.vampireDrainRadius}
                fillRadialGradientColorStops={VAMPIRE_DRAIN_STOPS}
                opacity={0.6 + Math.sin(now / 200) * 0.2}
              />
            )}

          {/* Pickup radius (local player only) */}
          {isLocal && !isDead && (
            <Circle
              radius={player.pickupRadius || 100}
              fillEnabled={false}
              stroke="#a855f7"
              opacity={0.15}
              dash={[6, 6]}
            />
          )}

          {/* Threat Ring */}
          {isLocal && !isDead && enemiesCount > 0 && (
            <Circle
              radius={120}
              fillEnabled={false}
              stroke="#FF0000"
              opacity={(0.6 + Math.sin(now / 100) * 0.4) * 0.3}
              strokeWidth={2}
            />
          )}

          {/* Layered Player Body */}
          {/* 1. Outer Glow/Aura */}
          {!isDead && (
            <Circle
              radius={18}
              fillRadialGradientEndRadius={22}
              fillRadialGradientColorStops={[
                0,
                `${glowColor}44`,
                1,
                `${glowColor}00`,
              ]}
              opacity={0.5 + Math.sin(now / 150) * 0.2}
            />
          )}

          {/* 2. Character-Specific Geometry */}
          {player.characterType === "spray-n-pray" && !isDead && (
            <Group rotation={now / 5}>
              <Rect
                x={12}
                y={-4}
                width={8}
                height={8}
                fill={color}
                cornerRadius={2}
              />
              <Rect
                x={-20}
                y={-4}
                width={8}
                height={8}
                fill={color}
                cornerRadius={2}
              />
            </Group>
          )}

          {player.characterType === "boom-bringer" && !isDead && (
            <Ring
              innerRadius={16}
              outerRadius={20}
              fill={glowColor}
              opacity={0.6 + Math.sin(now / 100) * 0.3}
            />
          )}

          {player.characterType === "glass-cannon-carl" && !isDead && (
            <Line
              points={[0, -22, 10, 5, -10, 5]}
              closed
              fill={color}
              opacity={0.4}
              rotation={now / 10}
            />
          )}

          {/* 3. Main Body - only show if no sprite or for hit effect if desired */}
          {!sprite && (
            <Circle
              radius={15}
              fill={isHit ? "#FFFFFF" : color}
              stroke={isLocal && !isDead ? "#FFFFFF" : color}
              strokeWidth={isLocal && !isDead ? 3 : 2}
              shadowColor={glowColor}
              shadowBlur={isBerserker ? 30 : 15}
              opacity={isDead ? 0.3 : 1}
            />
          )}

          {/* 4. Core Inner Pulse */}
          {!isDead && !sprite && (
            <Circle
              radius={8}
              fill="#FFFFFF"
              opacity={0.2 + Math.sin(now / 100) * 0.1}
            />
          )}

          {/* 5. Sprite or Emoji */}
          {sprite ? (
            <KonvaImage
              image={sprite}
              width={40}
              height={40}
              offsetX={20}
              offsetY={20}
              opacity={isDead ? 0.3 : 1}
            />
          ) : (
            <Text
              text={characterEmoji}
              fontSize={18}
              offsetX={9}
              offsetY={9}
              opacity={isDead ? 0.3 : 0.9}
            />
          )}

          {/* Status Indicators */}
          {hasShield && !isDead && (
            <Circle
              radius={18}
              stroke="#00CCFF"
              strokeWidth={2}
              opacity={0.7}
            />
          )}

          {player.isInvulnerable && !isDead && (
            <Circle
              radius={22}
              stroke="#FFFFFF"
              strokeWidth={3}
              shadowColor="#FFFFFF"
              shadowBlur={20}
              opacity={0.8 + Math.sin(now / 100) * 0.2}
            />
          )}

          {player.hasOmniGlitch && !isDead && (
            <Ring
              innerRadius={18}
              outerRadius={21}
              fill="#FF00FF"
              opacity={0.5}
              rotation={now / 5}
            />
          )}

          {/* Heal flash */}
          {isHealed && !isDead && (
            <Ring
              innerRadius={18}
              outerRadius={22}
              fill="#00FF00"
              opacity={0.5}
            />
          )}

          {/* Revive Progress */}
          {isDead && player.reviveProgress > 0 && (
            <Ring
              innerRadius={25}
              outerRadius={30}
              fill="#00FF00"
              angle={(player.reviveProgress / REVIVE_DURATION) * 360}
              rotation={-90}
            />
          )}

          {/* Satellite Ring Orbs */}
          {player.hasSatelliteRing &&
            (player.satelliteOrbs || []).map((orb: any, i: number) => {
              const orbX = Math.cos(orb.angle) * orb.distance;
              const orbY = Math.sin(orb.angle) * orb.distance;
              return (
                <Group key={`sat-orb-${i}`} x={orbX} y={orbY}>
                  <Circle
                    radius={10}
                    fill="#00FFFF"
                    shadowColor="#00FFFF"
                    shadowBlur={15}
                    opacity={0.8 + Math.sin(now / 100) * 0.2}
                  />
                  <Circle radius={6} fill="#FFFFFF" opacity={0.5} />
                </Group>
              );
            })}
        </Group>
      </Group>
    );
  },
);

const EnemyVisuals = memo(
  ({
    enemy,
    now,
    hasTimeWarp,
  }: {
    enemy: any;
    now: number;
    hasTimeWarp: boolean;
  }) => {
    const isHit =
      enemy.lastHitTimestamp &&
      now - enemy.lastHitTimestamp < HIT_FLASH_DURATION;
    const isCrit =
      enemy.lastCritTimestamp &&
      now - enemy.lastCritTimestamp < CRIT_FLASH_DURATION;

    const isBurning = enemy.statusEffects?.some((e) => e.type === "burning");

    const spriteConfig = (SPRITE_MAP.enemies as any)[enemy.type];
    const staticSprite = useSprite(spriteConfig?.url);
    const animatedFrames = useAnimatedSprite(
      spriteConfig?.framePath,
      spriteConfig?.frames,
    );

    // Calculate current frame if it's an animation
    const currentFrameIndex = spriteConfig?.frames
      ? Math.floor(now / (spriteConfig.animationSpeed || 100)) %
        spriteConfig.frames
      : 0;
    const sprite = spriteConfig?.frames
      ? animatedFrames[currentFrameIndex]
      : staticSprite;
    const isPoisoned = enemy.statusEffects?.some((e) => e.type === "poisoned");
    const isSlowed = enemy.statusEffects?.some((e) => e.type === "slowed");

    let fill = "#FFFF00";
    let shadow = "#FFFF00";
    let size = 20;

    if (enemy.type === "slugger") {
      fill = "#FF8800";
      shadow = "#FF8800";
      size = 24;
    } else if (enemy.type === "hellhound") {
      fill = "#8B0000";
      shadow = "#FF0000";
      size = 22;
    } else if (enemy.type === "splitter") {
      fill = "#9D00FF";
      shadow = "#9D00FF";
      size = 26;
    } else if (enemy.type === "mini-splitter") {
      fill = "#C77DFF";
      shadow = "#C77DFF";
      size = 16;
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
      fill = "#FF6600";
      shadow = "#FF6600";
    } else if (isPoisoned) {
      fill = "#00FF00";
      shadow = "#00FF00";
    } else if (isSlowed) {
      fill = "#00CCFF";
      shadow = "#00CCFF";
    }

    const isLowHealth = enemy.health / enemy.maxHealth < 0.25;

    return (
      <Group>
        {/* Movement Trail */}
        {enemy.history?.map((pos: any, i: number) => (
          <Circle
            key={`enemy-trail-${enemy.id}-${i}`}
            x={pos.x}
            y={pos.y}
            radius={Math.max(0, size / 2 - (5 - i) * 2)}
            fill={fill}
            opacity={0.05 * (i / 5)}
            listening={false}
          />
        ))}
        <Group x={enemy.position.x} y={enemy.position.y}>
          {/* TimeWarp indicator */}
          {hasTimeWarp && (
            <Circle
              radius={size / 2 + 5}
              fillEnabled={false}
              stroke="#87CEEB"
              strokeWidth={2}
              opacity={0.5 + Math.sin(now / 200) * 0.3}
              dash={[4, 4]}
            />
          )}

          {/* Main Shape */}
          {sprite ? (
            <KonvaImage
              image={sprite}
              width={size * 1.5}
              height={size * 1.5}
              offsetX={size * 0.75}
              offsetY={size * 0.75}
              opacity={isHit ? 1 : 0.9}
            />
          ) : (
            <>
              {enemy.type === "hellhound" ? (
                <Group>
                  <Circle
                    radius={size / 2}
                    fill={fill}
                    shadowColor={shadow}
                    shadowBlur={18}
                    opacity={isHit ? 1 : 0.8}
                  />
                  <Text
                    text="🐕"
                    fontSize={24}
                    offsetX={12}
                    offsetY={12}
                    rotation={Math.sin(now / 100 + enemy.position.x) * 15}
                  />
                </Group>
              ) : enemy.type === "glitch-spider" ? (
                <Group>
                  <Circle
                    radius={size / 2}
                    fill={fill}
                    shadowColor={shadow}
                    shadowBlur={15}
                    opacity={isHit ? 1 : 0.8}
                  />
                  <Text
                    text="🕷️"
                    fontSize={18}
                    offsetX={9}
                    offsetY={9}
                    rotation={Math.sin(now / 50 + enemy.position.x) * 20}
                  />
                </Group>
              ) : enemy.type === "tank-bot" ? (
                <Group>
                  <Rect
                    x={-size / 2}
                    y={-size / 2}
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
                  <Circle radius={size / 2 - 5} fill="#222222" opacity={0.3} />
                  <Text text="🤖" fontSize={28} offsetX={14} offsetY={14} />
                </Group>
              ) : enemy.type === "neon-pulse" ? (
                <Group>
                  <Circle
                    radius={Math.max(0, size / 2 + Math.sin(now / 200) * 3)}
                    fill={fill}
                    shadowColor={shadow}
                    shadowBlur={25}
                    opacity={0.4}
                  />
                  <Circle
                    radius={size / 2}
                    fill={fill}
                    shadowColor={shadow}
                    shadowBlur={15}
                    opacity={isHit ? 1 : 0.8}
                  />
                  <Text text="💠" fontSize={20} offsetX={10} offsetY={10} />
                </Group>
              ) : enemy.type === "slugger" ? (
                <Group>
                  <Circle
                    radius={size / 2}
                    fill={fill}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    shadowColor={shadow}
                    shadowBlur={18}
                    opacity={isHit ? 1 : 0.9}
                  />
                  <Ring
                    innerRadius={size / 4}
                    outerRadius={size / 2 - 2}
                    fill="#FFFFFF"
                    opacity={0.3}
                  />
                </Group>
              ) : enemy.type === "splitter" ? (
                <Group rotation={now / 10}>
                  {[0, 90, 180, 270].map((rot) => (
                    <Rect
                      key={rot}
                      x={2}
                      y={2}
                      width={size / 2 - 2}
                      height={size / 2 - 2}
                      fill={fill}
                      shadowColor={shadow}
                      shadowBlur={15}
                      rotation={rot}
                      cornerRadius={2}
                    />
                  ))}
                </Group>
              ) : (
                /* Grunts & Minis: Jagged Star / Polygon */
                <Line
                  points={[
                    0,
                    -size / 2,
                    size / 4,
                    -size / 4,
                    size / 2,
                    0,
                    size / 4,
                    size / 4,
                    0,
                    size / 2,
                    -size / 4,
                    size / 4,
                    -size / 2,
                    0,
                    -size / 4,
                    -size / 4,
                  ]}
                  closed
                  fill={fill}
                  shadowColor={shadow}
                  shadowBlur={18}
                  opacity={isLowHealth ? 0.7 + Math.sin(now / 50) * 0.3 : 1}
                />
              )}
            </>
          )}

          {/* Low Health Sparkles - use deterministic position based on enemy.id + time */}
          {isLowHealth && (
            <Rect
              x={Math.sin(enemy.id.charCodeAt(0) + now / 50) * 15}
              y={Math.cos(enemy.id.charCodeAt(1) + now / 50) * 15}
              width={4}
              height={4}
              fill="#FFFFFF"
              opacity={0.8}
              listening={false}
            />
          )}

          {/* Reactive Health Ring */}
          {enemy.health < enemy.maxHealth &&
            enemy.lastHitTimestamp &&
            now - enemy.lastHitTimestamp < 3000 && (
              <Ring
                radius={size / 2 + 5}
                innerRadius={size / 2 + 4}
                outerRadius={size / 2 + 7}
                fill="#FF3333"
                opacity={Math.max(0, 1 - (now - enemy.lastHitTimestamp) / 3000)}
                angle={(enemy.health / enemy.maxHealth) * 360}
                rotation={-90}
              />
            )}

          {/* Damage Numbers */}
          {enemy.damageNumbers
            ?.filter((dmg) => now - dmg.timestamp <= DAMAGE_NUMBER_DURATION)
            .map((dmg) => {
              const age = now - dmg.timestamp;
              const progress = age / DAMAGE_NUMBER_DURATION;
              const yOffset = -20 - progress * 40;
              const opacity = 1 - Math.pow(progress, 2);
              const scale =
                progress < 0.2
                  ? 1 + progress * 2.5
                  : progress < 0.4
                    ? 1.5 - (progress - 0.2) * 2.5
                    : 1;
              const jitterX = Math.sin(dmg.timestamp + age * 0.01) * 2;
              const fontSize = dmg.isCrit ? 20 : 14;
              const color = dmg.isCrit ? "#FF3333" : "#FFFFFF";

              return (
                <Text
                  key={dmg.id}
                  text={Math.round(dmg.damage).toString()}
                  x={jitterX}
                  y={yOffset}
                  fontSize={fontSize}
                  scaleX={scale}
                  scaleY={scale}
                  fontFamily='"Press Start 2P"'
                  fontStyle={dmg.isCrit ? "bold" : "normal"}
                  fill={color}
                  opacity={opacity}
                  shadowColor={color}
                  shadowBlur={dmg.isCrit ? 12 : 6}
                  offsetX={fontSize}
                  align="center"
                />
              );
            })}
        </Group>
      </Group>
    );
  },
);

// Memoized background grid for performance
const BackgroundGrid = memo(({ isSandbox }: { isSandbox?: boolean }) => (
  <Group listening={false}>
    {[...Array(Math.floor(SERVER_ARENA_WIDTH / 40))].map((_, i) => (
      <Rect
        key={`v-${i}`}
        x={i * 40}
        y={0}
        width={1}
        height={SERVER_ARENA_HEIGHT}
        fill={isSandbox ? "#00FFFF" : "#FF00FF"}
        opacity={isSandbox ? 0.1 : 0.2}
      />
    ))}
    {[...Array(Math.floor(SERVER_ARENA_HEIGHT / 40))].map((_, i) => (
      <Rect
        key={`h-${i}`}
        x={0}
        y={i * 40}
        width={SERVER_ARENA_WIDTH}
        height={1}
        fill={isSandbox ? "#00FFFF" : "#FF00FF"}
        opacity={isSandbox ? 0.1 : 0.2}
      />
    ))}
    {isSandbox && (
      <Rect
        x={0}
        y={0}
        width={SERVER_ARENA_WIDTH}
        height={SERVER_ARENA_HEIGHT}
        fill="#00FFFF"
        opacity={0.03}
      />
    )}
  </Group>
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

const selectGameState = (state: any) => ({
  gameState: state.gameState,
  localPlayerId: state.localPlayerId,
});

export default function GameCanvas() {
  const { gameState, localPlayerId } = useGameStore(
    useShallow(selectGameState),
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
    trailSegments = [],
    binaryDrops = [],
  } = gameState || {};

  const now = Date.now();
  const [displaySize, setDisplaySize] = useState(getDisplaySize());

  useEffect(() => {
    const handleResize = () => setDisplaySize(getDisplaySize());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scale = displaySize.scaleX;

  // Calculate screen shake offset - use deterministic seed instead of Math.random
  const shakeOffset = useMemo(() => {
    if (!screenShake || !screenShake.startTime) return { x: 0, y: 0 };

    const elapsed = now - screenShake.startTime;
    if (elapsed >= screenShake.duration) return { x: 0, y: 0 };

    const remainingRatio = 1 - elapsed / screenShake.duration;
    const currentIntensity = screenShake.intensity * remainingRatio;

    // Use deterministic pseudo-random based on elapsed time
    const seed = elapsed * 0.1;
    return {
      x: Math.sin(seed * 7.3) * currentIntensity,
      y: Math.cos(seed * 11.7) * currentIntensity,
    };
  }, [screenShake, now]);

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
        {/* Render Trail Segments (behind everything) */}
        <RenderTrailSegments segments={trailSegments} />
        {/* Background Grid */}
        <BackgroundGrid isSandbox={gameState?.isSandboxMode} />
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
        <RenderBinaryDrops drops={binaryDrops} />
        <Group x={shakeOffset.x} y={shakeOffset.y}>
          {/* Hazards */}
          <RenderHazards hazards={hazards} />
          {/* Particles */}
          <RenderParticles particles={particles} />
          {/* Teleporter */}
          {teleporter && (
            <Group listening={false}>
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
                    p.extractionProgress > 0,
                )
                .map((player) => {
                  const progress =
                    (player.extractionProgress || 0) / EXTRACTION_DURATION;
                  const timeRemaining = Math.ceil(
                    (EXTRACTION_DURATION - (player.extractionProgress || 0)) /
                      1000,
                  );
                  const pulseOpacity = 0.7 + Math.sin(now / 100) * 0.3;

                  return (
                    <Group key={`extraction-${player.id}`}>
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
                    </Group>
                  );
                })}
            </Group>
          )}
          {/* Render XP Orbs */}
          {xpOrbs &&
            xpOrbs.length > 0 &&
            xpOrbs.map((orb) => {
              const isDoubled = orb.isDoubled;
              const pulseScale = isDoubled ? 1 + Math.sin(now / 100) * 0.2 : 1;
              const glowIntensity = isDoubled ? 20 : 10;

              return (
                <Group key={orb.id}>
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
                </Group>
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
                <Group key={turret.id}>
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
                </Group>
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
                <Group key={pet.id}>
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
                </Group>
              );
            })}
          {/* Render Clones */}
          {clones &&
            clones.length > 0 &&
            clones
              .filter((clone) => players.some((p) => p.id === clone.ownerId))
              .map((clone) => {
                const owner = players.find((p) => p.id === clone.ownerId)!;

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
                  <Group key={clone.id}>
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
                  </Group>
                );
              })}
          {/* Render Players */}
          {players?.map((player) => (
            <PlayerVisuals
              key={player.id}
              player={player}
              now={now}
              localPlayerId={localPlayerId}
              enemiesCount={enemies.length}
            />
          ))}
          {/* Render Enemies */}
          {enemies?.map((enemy) => {
            const hasTimeWarp = players.some((p) => p.hasTimeWarp);
            return (
              <EnemyVisuals
                key={enemy.id}
                enemy={enemy}
                now={now}
                hasTimeWarp={hasTimeWarp}
              />
            );
          })}

          {/* Render Boss */}
          {boss && (
            <Group>
              {/* Boss telegraph indicators */}
              {boss.currentAttack && boss.currentAttack.type === "charge" && (
                <Group>
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
                </Group>
              )}
              {boss.currentAttack && boss.currentAttack.type === "slam" && (
                <Group>
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
                </Group>
              )}

              {/* Summoner teleport telegraph */}
              {boss.currentAttack &&
                boss.currentAttack.type === "teleport" &&
                boss.currentAttack.targetPosition && (
                  <Group>
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
                  </Group>
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
                  <Group>
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
                        SERVER_ARENA_HEIGHT,
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
                  </Group>
                )}

              {/* Viral Swarm dash trail */}
              {boss.currentAttack &&
                boss.currentAttack.type === "viral-dash" && (
                  <Line
                    points={[
                      boss.position.x,
                      boss.position.y,
                      boss.position.x - boss.currentAttack.direction!.x * 100,
                      boss.position.y - boss.currentAttack.direction!.y * 100,
                    ]}
                    stroke="#00FF00"
                    strokeWidth={20}
                    opacity={0.3}
                    lineCap="round"
                  />
                )}

              {/* Magnetic Magnus flux indicator */}
              {boss.currentAttack &&
                boss.currentAttack.type === "magnetic-flux" && (
                  <Circle
                    x={boss.position.x}
                    y={boss.position.y}
                    radius={500}
                    stroke="#FF00FF"
                    strokeWidth={2}
                    opacity={0.15 + Math.sin(now / 100) * 0.05}
                    dash={[10, 10]}
                  />
                )}

              {/* Neon Reaper stealth/dash effect */}
              {boss.currentAttack &&
                boss.currentAttack.type === "reaper-dash" &&
                boss.currentAttack.direction && (
                  <Line
                    points={[
                      boss.position.x,
                      boss.position.y,
                      boss.position.x + boss.currentAttack.direction.x * 300,
                      boss.position.y + boss.currentAttack.direction.y * 300,
                    ]}
                    stroke="#00FFFF"
                    strokeWidth={2}
                    opacity={0.4}
                    dash={[4, 4]}
                  />
                )}

              {/* Core Destroyer satellites */}
              {boss.type === "core-destroyer" &&
                [0, 1, 2, 3].map((i) => {
                  const angle = (Math.PI * 2 * i) / 4 + now / 1000;
                  const satX = boss.position.x + Math.cos(angle) * 150;
                  const satY = boss.position.y + Math.sin(angle) * 150;
                  const isFiring =
                    boss.currentAttack?.type === "satellite-beam" &&
                    now >= boss.currentAttack.executeTime!;

                  return (
                    <React.Fragment key={`sat-${i}`}>
                      <Circle
                        x={satX}
                        y={satY}
                        radius={15}
                        fill="#FF0000"
                        stroke="#000000"
                        strokeWidth={2}
                        shadowColor="#FF0000"
                        shadowBlur={10}
                      />
                      {isFiring && (
                        <Line
                          points={[
                            satX,
                            satY,
                            players[0]?.position.x || satX,
                            players[0]?.position.y || satY,
                          ]}
                          stroke="#FF0000"
                          strokeWidth={4}
                          opacity={0.6}
                          shadowColor="#FF0000"
                          shadowBlur={20}
                        />
                      )}
                    </React.Fragment>
                  );
                })}

              {/* Magnetic Magnus Tesla Balls */}
              {boss.type === "magnetic-magnus" &&
                boss.teslaBalls &&
                boss.teslaBalls.map((ball) => {
                  const ballX =
                    boss.position.x + Math.cos(ball.angle) * ball.radius;
                  const ballY =
                    boss.position.y + Math.sin(ball.angle) * ball.radius;

                  return (
                    <React.Fragment key={ball.id}>
                      {/* Connection beam (visual only) */}
                      <Line
                        points={[
                          boss.position.x,
                          boss.position.y,
                          ballX,
                          ballY,
                        ]}
                        stroke="#00FFFF"
                        strokeWidth={1}
                        opacity={0.1 + Math.sin(now / 100) * 0.1}
                        dash={[5, 5]}
                      />
                      {/* Outer Glow */}
                      <Circle
                        x={ballX}
                        y={ballY}
                        radius={20}
                        fillRadialGradientEndRadius={24}
                        fillRadialGradientColorStops={[
                          0,
                          "#00FFFF66",
                          1,
                          "#00FFFF00",
                        ]}
                        opacity={0.6 + Math.sin(now / 50) * 0.3}
                      />
                      {/* Ball Body */}
                      <Circle
                        x={ballX}
                        y={ballY}
                        radius={12}
                        fill="#00FFFF"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        shadowColor="#00FFFF"
                        shadowBlur={20}
                      />
                      {/* Core sparkle */}
                      <Circle
                        x={ballX}
                        y={ballY}
                        radius={5}
                        fill="#FFFFFF"
                        opacity={0.8 + Math.sin(now / 30) * 0.2}
                      />
                      {/* Lightning arcs (simple circles rotating around ball) */}
                      {[0, 1, 2].map((i) => {
                        const arcAngle = now / 100 + (i * Math.PI * 2) / 3;
                        const arcDist = 15;
                        return (
                          <Circle
                            key={`arc-${i}`}
                            x={ballX + Math.cos(arcAngle) * arcDist}
                            y={ballY + Math.sin(arcAngle) * arcDist}
                            radius={2}
                            fill="#FFFFFF"
                            opacity={0.6}
                          />
                        );
                      })}
                    </React.Fragment>
                  );
                })}

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
                        : boss.type === "glitch-golem"
                          ? "#555555"
                          : boss.type === "viral-swarm"
                            ? "#00FF00"
                            : boss.type === "overclocker"
                              ? "#FFFF00"
                              : boss.type === "magnetic-magnus"
                                ? "#FF00FF"
                                : boss.type === "neon-reaper"
                                  ? "#0000FF"
                                  : boss.type === "core-destroyer"
                                    ? "#FF8800"
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
                        : boss.type === "glitch-golem"
                          ? "#888888"
                          : boss.type === "viral-swarm"
                            ? "#AAFF00"
                            : boss.type === "overclocker"
                              ? "#FFCC00"
                              : boss.type === "magnetic-magnus"
                                ? "#CC00CC"
                                : boss.type === "neon-reaper"
                                  ? "#00FFFF"
                                  : boss.type === "core-destroyer"
                                    ? "#FF0000"
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
                        : boss.type === "glitch-golem"
                          ? "🗿"
                          : boss.type === "viral-swarm"
                            ? "🦠"
                            : boss.type === "overclocker"
                              ? "⏲️"
                              : boss.type === "magnetic-magnus"
                                ? "🧲"
                                : boss.type === "neon-reaper"
                                  ? "👤"
                                  : boss.type === "core-destroyer"
                                    ? "☄️"
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
            </Group>
          )}

          {/* Render Portals (Summoner) */}
          {boss &&
            boss.portals &&
            boss.portals.map((portal) => (
              <Group key={portal.id}>
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
              </Group>
            ))}

          {/* Render Shield Generators (Architect) */}
          {boss &&
            boss.shieldGenerators &&
            boss.shieldGenerators.map((generator) => (
              <Group key={generator.id}>
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
              </Group>
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
              let bulletRadius = p.radius || (p.isCrit ? 5 : 4);
              let bulletGlow = 12;
              let opacity = 1;

              if (hasRicochet) {
                bulletColor = "#FF00FF"; // Magenta for ricochet
                bulletGlow = 16;
              } else if (hasHoming) {
                bulletColor = "#00FFFF"; // Cyan for homing
                bulletGlow = 14;
              } else if (p.isEcho) {
                bulletColor = "#FFFFFF";
                bulletGlow = 8;
                opacity = 0.4; // Ghostly echo
              } else if (p.isPrism) {
                // Rainbow cycling for prism shards
                const hues = [0, 60, 120, 180, 240, 300];
                const hue =
                  hues[Math.floor((now / 50 + p.id.length) % hues.length)];
                bulletColor = `hsl(${hue}, 100%, 70%)`;
                bulletGlow = 20;
              } else if (p.isGravity) {
                bulletColor = "#9333EA"; // Purple for gravity
                bulletGlow = 15;
              }

              return (
                <Group key={p.id}>
                  {p.isGravity && (
                    <Ring
                      x={p.position.x}
                      y={p.position.y}
                      innerRadius={bulletRadius + 5}
                      outerRadius={bulletRadius + 15}
                      fill="#9333EA"
                      opacity={0.2}
                      rotation={now / 2}
                    />
                  )}
                  <Circle
                    x={p.position.x}
                    y={p.position.y}
                    radius={bulletRadius}
                    fill={bulletColor}
                    shadowColor={bulletColor}
                    shadowBlur={bulletGlow}
                    opacity={opacity}
                  />
                </Group>
              );
            })}
          {/* Render Chain Lightning */}
          {chainLightning &&
            chainLightning.length > 0 &&
            chainLightning
              .filter((chain) => now - chain.timestamp <= 200)
              .map((chain) => {
                const age = now - chain.timestamp;
                const maxDuration = 200; // ms
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
                  // Use deterministic offset based on chain.id + segment index
                  const perpX = -dy;
                  const perpY = dx;
                  const length = Math.hypot(perpX, perpY) || 1;
                  // Deterministic "random" offset using sin with chain-specific seed
                  const seed = chain.id.charCodeAt(i % chain.id.length) + i * 7;
                  const offset = Math.sin(seed) * 10;
                  points.push(
                    baseX + (perpX / length) * offset,
                    baseY + (perpY / length) * offset,
                  );
                }

                points.push(chain.to.x, chain.to.y);

                return (
                  <Group key={chain.id}>
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
                      listening={false}
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
                      listening={false}
                    />
                  </Group>
                );
              })}
          {/* Render Fire Trails */}
          {fireTrails &&
            fireTrails.length > 0 &&
            fireTrails
              .filter((trail) => now - trail.timestamp <= 2000)
              .map((trail) => {
                const age = now - trail.timestamp;
                const maxDuration = 2000; // 2 seconds
                const progress = age / maxDuration;
                const opacity = (1 - progress) * 0.5; // Fade out over time
                const pulseScale = 1 + Math.sin(now / 100) * 0.1; // Pulsing effect

                return (
                  <Group key={trail.id}>
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
                  </Group>
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
                <Group key={skull.id}>
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
                </Group>
              );
            })}
          {/* Render Explosions */}
          {explosions &&
            explosions.length > 0 &&
            explosions
              .filter((explosion) => now - explosion.timestamp <= 500)
              .map((explosion) => {
                const age = now - explosion.timestamp;
                const maxDuration = 500; // ms
                const progress = age / maxDuration;
                const currentRadius = Math.max(
                  0,
                  explosion.radius * (0.3 + progress * 0.7),
                );
                const opacity = 1 - progress;

                if (explosion.type === "void") {
                  const pulse = Math.sin(now / 50) * 10;
                  return (
                    <Group key={explosion.id}>
                      {/* Outer void aura */}
                      <Circle
                        x={explosion.position.x}
                        y={explosion.position.y}
                        radius={currentRadius + 20 + pulse}
                        fillRadialGradientStartRadius={0}
                        fillRadialGradientEndRadius={currentRadius + 20}
                        fillRadialGradientColorStops={[
                          0,
                          "#4B0082",
                          0.6,
                          "#9400D3",
                          1,
                          "transparent",
                        ]}
                        opacity={opacity * 0.4}
                      />
                      {/* Event horizon / Black core */}
                      <Circle
                        x={explosion.position.x}
                        y={explosion.position.y}
                        radius={currentRadius * 0.8}
                        fill="#000000"
                        stroke="#9400D3"
                        strokeWidth={2}
                        shadowColor="#9400D3"
                        shadowBlur={20}
                        opacity={opacity}
                      />
                      {/* Implosion sparkles */}
                      {progress < 0.5 &&
                        [...Array(8)].map((_, i) => {
                          const angle = (i * Math.PI * 2) / 8 + progress * 5;
                          const dist = (1 - progress * 2) * currentRadius * 1.5;
                          return (
                            <Rect
                              key={`void-sparkle-${i}`}
                              x={explosion.position.x + Math.cos(angle) * dist}
                              y={explosion.position.y + Math.sin(angle) * dist}
                              width={4}
                              height={4}
                              fill="#FFFFFF"
                              opacity={opacity}
                              rotation={angle * 50}
                            />
                          );
                        })}
                    </Group>
                  );
                }

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
      {/* Post-processing Layer for UI Overlays */}
      <Layer>
        {/* Low Health Vignette */}
        {(function () {
          const lp = players.find((p) => p.id === localPlayerId);
          if (!lp || lp.health / lp.maxHealth >= 0.3) return null;
          return (
            <Group key="low-health-vignette-group">
              <Rect
                x={0}
                y={0}
                width={SERVER_ARENA_WIDTH}
                height={SERVER_ARENA_HEIGHT}
                fillRadialGradientStartPoint={{
                  x: SERVER_ARENA_WIDTH / 2,
                  y: SERVER_ARENA_HEIGHT / 2,
                }}
                fillRadialGradientEndPoint={{
                  x: SERVER_ARENA_WIDTH / 2,
                  y: SERVER_ARENA_HEIGHT / 2,
                }}
                fillRadialGradientStartRadius={SERVER_ARENA_WIDTH / 4}
                fillRadialGradientEndRadius={SERVER_ARENA_WIDTH}
                fillRadialGradientColorStops={LOW_HEALTH_VIGNETTE_STOPS}
                opacity={0.5 + Math.sin(now / 200) * 0.5}
                listening={false}
              />
            </Group>
          );
        })()}
      </Layer>
    </Stage>
  );
}
