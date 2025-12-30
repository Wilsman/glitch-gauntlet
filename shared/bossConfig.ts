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
    healthScaling: 1.5,
    damageScaling: 1.3,
    enrageThreshold: 0.3, // 30% HP
    attackCooldown: 2000,
    enragedAttackCooldown: 1000,
  },
  summoner: {
    type: 'summoner',
    baseHealth: 1500,
    baseDamage: 15,
    baseSpeed: 1.0,
    size: 35,
    healthScaling: 1.5,
    damageScaling: 1.3,
    enrageThreshold: 0.3,
    attackCooldown: 3000,
    enragedAttackCooldown: 2000,
  },
  architect: {
    type: 'architect',
    baseHealth: 2500,
    baseDamage: 25,
    baseSpeed: 0.5,
    size: 45,
    healthScaling: 1.5,
    damageScaling: 1.3,
    enrageThreshold: 0.3,
    attackCooldown: 4000,
    enragedAttackCooldown: 3000,
  },
  'glitch-golem': {
    type: 'glitch-golem',
    baseHealth: 3000,
    baseDamage: 15,
    baseSpeed: 0.4,
    size: 50,
    healthScaling: 1.4,
    damageScaling: 1.2,
    enrageThreshold: 0.3,
    attackCooldown: 3000,
    enragedAttackCooldown: 1500,
  },
  'viral-swarm': {
    type: 'viral-swarm',
    baseHealth: 1200,
    baseDamage: 10,
    baseSpeed: 1.8,
    size: 30,
    healthScaling: 1.4,
    damageScaling: 1.2,
    enrageThreshold: 0.35,
    attackCooldown: 1500,
    enragedAttackCooldown: 800,
  },
  'overclocker': {
    type: 'overclocker',
    baseHealth: 2200,
    baseDamage: 20,
    baseSpeed: 1.2,
    size: 35,
    healthScaling: 1.5,
    damageScaling: 1.4,
    enrageThreshold: 0.3,
    attackCooldown: 2500,
    enragedAttackCooldown: 1200,
  },
  'magnetic-magnus': {
    type: 'magnetic-magnus',
    baseHealth: 2400,
    baseDamage: 18,
    baseSpeed: 0.8,
    size: 40,
    healthScaling: 1.5,
    damageScaling: 1.3,
    enrageThreshold: 0.3,
    attackCooldown: 3000,
    enragedAttackCooldown: 1500,
  },
  'neon-reaper': {
    type: 'neon-reaper',
    baseHealth: 1800,
    baseDamage: 35,
    baseSpeed: 2.2,
    size: 35,
    healthScaling: 1.6,
    damageScaling: 1.5,
    enrageThreshold: 0.3,
    attackCooldown: 2000,
    enragedAttackCooldown: 1000,
  },
  'core-destroyer': {
    type: 'core-destroyer',
    baseHealth: 4000,
    baseDamage: 30,
    baseSpeed: 0.3,
    size: 60,
    healthScaling: 1.7,
    damageScaling: 1.4,
    enrageThreshold: 0.3,
    attackCooldown: 4000,
    enragedAttackCooldown: 2000,
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

  if (type === 'magnetic-magnus') {
    boss.teslaBalls = [];
    for (let i = 0; i < MAGNUS_TESLA_BALL_COUNT; i++) {
      boss.teslaBalls.push({
        id: `tesla-${id}-${i}`,
        angle: (Math.PI * 2 * i) / MAGNUS_TESLA_BALL_COUNT,
        radius: MAGNUS_TESLA_BALL_BASE_RADIUS,
      });
    }
  }

  return boss;
}

export function getBossForWave(wave: number): BossType | null {
  // Boss every 10 waves
  if (wave % 10 !== 0) return null;

  // Randomly select from all boss types
  const bossTypes: BossType[] = [
    'berserker', 'summoner', 'architect',
    'glitch-golem', 'viral-swarm',
    'overclocker', 'magnetic-magnus',
    'neon-reaper', 'core-destroyer'
  ];
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
export const BERSERKER_ENRAGED_CHARGE_COUNT = 3;
export const BERSERKER_ENRAGED_SLAM_RINGS = 5;

// Easy Boss Constants
export const GOLEM_SLAM_TELEGRAPH = 2000;
export const GOLEM_GLITCH_ZONE_DURATION = 5000;
export const SWARM_DASH_TELEGRAPH = 800;
export const SWARM_DASH_SPEED = 12;
export const GOLEM_ENRAGED_SHOCKWAVE_COUNT = 8;

export const SWARM_ENRAGED_BIT_COUNT = 6;
export const SWARM_CLOUD_TELEGRAPH = 1000;

// Overclocker
export const OVERCLOCKER_BURST_TELEGRAPH = 800;
export const OVERCLOCKER_TIME_SLOW_RADIUS = 200;
export const OVERCLOCKER_TIME_SLOW_FACTOR = 0.4;
export const OVERCLOCKER_SLOW_TELEGRAPH = 1200;

// Magnus
export const MAGNUS_FLUX_TELEGRAPH = 1200;
export const MAGNUS_FLUX_DURATION = 3000;
export const MAGNUS_TESLA_BALL_COUNT = 4;
export const MAGNUS_TESLA_BALL_BASE_RADIUS = 120;
export const MAGNUS_TESLA_BALL_OSCILLATION_AMPLITUDE = 60;
export const MAGNUS_TESLA_BALL_ROTATION_SPEED = 2;
export const MAGNUS_TESLA_BALL_DAMAGE = 25;
export const MAGNUS_STORM_TELEGRAPH = 800;

// Reaper
export const REAPER_DASH_TELEGRAPH = 500;
export const REAPER_DECOY_COUNT = 3;
export const REAPER_ENRAGED_DECOY_COUNT = 6;

// Core Destroyer
export const CORE_SATELLITE_COUNT = 4;
export const CORE_BEAM_TELEGRAPH = 1500;
export const CORE_ENRAGED_ROTATION_SPEED = 1.0;

// Summoner
export const SUMMONER_PORTAL_TELEGRAPH = 1500;
export const SUMMONER_PORTAL_SPAWN_INTERVAL = 3000;
export const SUMMONER_PORTAL_HEALTH = 200;
export const SUMMONER_PORTAL_COUNT = 3;
export const SUMMONER_TELEPORT_TELEGRAPH = 1000;
export const SUMMONER_BEAM_TELEGRAPH = 800;
export const SUMMONER_BEAM_SPEED = 4;
export const SUMMONER_BEAM_DAMAGE = 25;
export const SUMMONER_VOID_WELL_PULL_FORCE = 3;

// Architect
export const ARCHITECT_LASER_COUNT = 4;
export const ARCHITECT_LASER_ROTATION_SPEED = 0.75;
export const ARCHITECT_LASER_TELEGRAPH = 1000;
export const ARCHITECT_LASER_DAMAGE = 20;
export const ARCHITECT_FLOOR_HAZARD_TELEGRAPH = 1500;
export const ARCHITECT_FLOOR_HAZARD_SIZE = 80;
export const ARCHITECT_FLOOR_HAZARD_DAMAGE = 40;
export const ARCHITECT_FLOOR_HAZARD_COUNT = 5;
export const ARCHITECT_SHIELD_GENERATOR_HEALTH = 150;
export const ARCHITECT_SHIELD_GENERATOR_COUNT = 4;
// Advanced Patterns
export const SHOTGUN_CONE_ANGLE = Math.PI / 4;
export const SHOTGUN_PROJECTILE_COUNT = 5;
export const RADIAL_PROJECTILE_COUNT = 12;
export const PROJECTILE_BOMB_DELAY = 1500;
export const PROJECTILE_BOMB_RADIUS = 150;
