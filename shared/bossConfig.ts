import type { Boss, BossType, Vector2D } from '@shared/types';

export interface BossConfig {
  type: BossType;
  baseHealth: number;
  baseDamage: number;
  baseSpeed: number;
  size: number; // radius
  healthScaling: number; // multiplier per wave
  damageScaling: number;
  enrageThreshold: number; // health percentage
  attackCooldown: number; // ms between attacks
  enragedAttackCooldown: number; // ms between attacks when enraged
}

export const BOSS_CONFIGS: Record<BossType, BossConfig> = {
  berserker: {
    type: 'berserker',
    baseHealth: 2000,
    baseDamage: 20,
    baseSpeed: 1.5,
    size: 40,
    healthScaling: 1.5, // +50% per 10 waves
    damageScaling: 1.3, // +30% per 10 waves
    enrageThreshold: 0.3, // enrage at 30% HP
    attackCooldown: 2000, // 2s between attacks
    enragedAttackCooldown: 1000, // 1s when enraged
  },
  summoner: {
    type: 'summoner',
    baseHealth: 1500,
    baseDamage: 15,
    baseSpeed: 1.0,
    size: 35,
    healthScaling: 1.5,
    damageScaling: 1.3,
    enrageThreshold: 0.5, // phase 2 at 50% HP
    attackCooldown: 3000,
    enragedAttackCooldown: 2000,
  },
  architect: {
    type: 'architect',
    baseHealth: 2500,
    baseDamage: 25,
    baseSpeed: 0.5, // slow, relies on hazards
    size: 45,
    healthScaling: 1.5,
    damageScaling: 1.3,
    enrageThreshold: 0.4, // phase 2 at 40% HP
    attackCooldown: 4000,
    enragedAttackCooldown: 3000,
  },
};

export function createBoss(
  id: string,
  position: Vector2D,
  type: BossType,
  wave: number
): Boss {
  const config = BOSS_CONFIGS[type];
  
  // Scale based on which boss wave this is (wave 10 = 1, wave 20 = 2, etc.)
  const bossWaveNumber = Math.floor(wave / 10);
  const waveMultiplier = bossWaveNumber - 1; // wave 10 = no scaling
  
  const health = Math.round(config.baseHealth * Math.pow(config.healthScaling, waveMultiplier));
  
  const boss: Boss = {
    id,
    type,
    position,
    health,
    maxHealth: health,
    phase: 1,
    attackCooldown: 0, // Start ready to attack
    isEnraged: false,
  };
  
  return boss;
}

export function getBossForWave(wave: number): BossType | null {
  // Boss every 10 waves
  if (wave % 10 !== 0) return null;
  
  // Randomly select from all boss types
  const bossTypes: BossType[] = ['berserker', 'summoner', 'architect'];
  const randomIndex = Math.floor(Math.random() * bossTypes.length);
  return bossTypes[randomIndex];
}

// Attack configuration for Berserker
export const BERSERKER_CHARGE_TELEGRAPH = 1000; // 1s telegraph
export const BERSERKER_CHARGE_SPEED = 8; // Fast dash
export const BERSERKER_CHARGE_DURATION = 800; // How long the charge lasts
export const BERSERKER_SLAM_TELEGRAPH = 1500; // 1.5s telegraph
export const BERSERKER_SLAM_RINGS = 3; // Number of shockwave rings
export const BERSERKER_SLAM_RING_SPACING = 60; // Distance between rings
export const BERSERKER_SLAM_RING_SPEED = 200; // Pixels per second expansion
export const BERSERKER_SLAM_DAMAGE = 30; // Damage per ring hit

// Attack configuration for Summoner
export const SUMMONER_PORTAL_TELEGRAPH = 2000; // 2s before first spawn
export const SUMMONER_PORTAL_SPAWN_INTERVAL = 3000; // 3s between spawns
export const SUMMONER_PORTAL_HEALTH = 200; // Portal HP
export const SUMMONER_PORTAL_COUNT = 3; // Number of portals
export const SUMMONER_TELEPORT_TELEGRAPH = 1500; // 1.5s telegraph
export const SUMMONER_BEAM_TELEGRAPH = 1000; // 1s channel time
export const SUMMONER_BEAM_SPEED = 3; // Slow-moving beam
export const SUMMONER_BEAM_DAMAGE = 25;
export const SUMMONER_CURSE_DURATION = 5000; // 5s curse duration
export const SUMMONER_CURSE_MULTIPLIER = 1.5; // +50% damage taken

// Attack configuration for Architect
export const ARCHITECT_LASER_COUNT = 4; // Number of rotating lasers
export const ARCHITECT_LASER_ROTATION_SPEED = 0.75; // Radians per second
export const ARCHITECT_LASER_TELEGRAPH = 1000; // 1s before activating
export const ARCHITECT_LASER_DAMAGE = 20; // Damage per tick
export const ARCHITECT_FLOOR_HAZARD_TELEGRAPH = 2000; // 2s warning
export const ARCHITECT_FLOOR_HAZARD_SIZE = 80; // Size of hazard zone
export const ARCHITECT_FLOOR_HAZARD_DAMAGE = 40;
export const ARCHITECT_FLOOR_HAZARD_COUNT = 5; // Number of hazards per attack
export const ARCHITECT_SHIELD_GENERATOR_HEALTH = 150;
export const ARCHITECT_SHIELD_GENERATOR_COUNT = 4;
