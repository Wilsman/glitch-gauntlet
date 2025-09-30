import type { Enemy, EnemyType } from '@shared/types';

export interface EnemyConfig {
  type: EnemyType;
  baseHealth: number;
  baseDamage: number;
  baseSpeed: number;
  baseXpValue: number;
  healthScaling: number; // multiplier per wave
  damageScaling: number; // multiplier per wave
  speedScaling: number; // multiplier per wave
  xpScaling: number; // multiplier per wave
  spawnWeight: number; // relative spawn chance
  // Shooting config
  canShoot?: boolean;
  baseAttackSpeed?: number; // ms between shots
  baseProjectileSpeed?: number;
  attackSpeedScaling?: number; // multiplier per wave (lower = faster)
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  grunt: {
    type: 'grunt',
    baseHealth: 20,
    baseDamage: 5,
    baseSpeed: 2,
    baseXpValue: 5,
    healthScaling: 1.3, // +30% per wave
    damageScaling: 1.2, // +20% per wave
    speedScaling: 1.05, // +5% per wave
    xpScaling: 1.15, // +15% per wave
    spawnWeight: 1.0,
  },
  slugger: {
    type: 'slugger',
    baseHealth: 30,
    baseDamage: 3,
    baseSpeed: 1.0, // Noticeably slower than grunt (2.0)
    baseXpValue: 8,
    healthScaling: 1.4, // +40% per wave
    damageScaling: 1.15, // +15% per wave
    speedScaling: 1.03, // +3% per wave
    xpScaling: 1.2, // +20% per wave
    spawnWeight: 0.6,
    canShoot: true,
    baseAttackSpeed: 2500, // shoots every 2.5 seconds
    baseProjectileSpeed: 5, // Slightly faster projectiles
    attackSpeedScaling: 0.95, // -5% per wave (faster)
  },
  hellhound: {
    type: 'hellhound',
    baseHealth: 40,
    baseDamage: 8,
    baseSpeed: 4.0, // Very fast - faster than before
    baseXpValue: 15,
    healthScaling: 1.35, // +35% per wave
    damageScaling: 1.25, // +25% per wave
    speedScaling: 1.05, // +5% per wave (faster scaling)
    xpScaling: 1.3, // +30% per wave
    spawnWeight: 0, // Never spawns in normal rounds
  },
};

export function createEnemy(
  id: string,
  position: { x: number; y: number },
  type: EnemyType,
  wave: number
): Enemy {
  const config = ENEMY_CONFIGS[type];
  
  // Calculate scaled stats based on wave
  const waveMultiplier = wave - 1; // wave 1 = no scaling
  const health = Math.round(config.baseHealth * Math.pow(config.healthScaling, waveMultiplier));
  const damage = Math.round(config.baseDamage * Math.pow(config.damageScaling, waveMultiplier));
  const speed = config.baseSpeed * Math.pow(config.speedScaling, waveMultiplier);
  const xpValue = Math.round(config.baseXpValue * Math.pow(config.xpScaling, waveMultiplier));
  
  const enemy: Enemy = {
    id,
    position,
    health,
    maxHealth: health,
    type,
    xpValue,
    damage,
    speed,
    baseSpeed: speed,
  };
  
  // Add shooting capabilities if configured
  if (config.canShoot) {
    const attackSpeed = Math.round(
      config.baseAttackSpeed! * Math.pow(config.attackSpeedScaling!, waveMultiplier)
    );
    enemy.attackCooldown = attackSpeed; // Start with full cooldown
    enemy.attackSpeed = attackSpeed;
    enemy.projectileSpeed = config.baseProjectileSpeed;
  }
  
  return enemy;
}

export function selectRandomEnemyType(): EnemyType {
  const types = Object.keys(ENEMY_CONFIGS) as EnemyType[];
  const totalWeight = types.reduce((sum, type) => sum + ENEMY_CONFIGS[type].spawnWeight, 0);
  
  let random = Math.random() * totalWeight;
  for (const type of types) {
    random -= ENEMY_CONFIGS[type].spawnWeight;
    if (random <= 0) {
      return type;
    }
  }
  
  return types[0]; // fallback
}
