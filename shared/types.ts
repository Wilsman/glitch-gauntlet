// Base API response structure
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
// Game-specific types
export interface Vector2D {
  x: number;
  y: number;
}
export type InputState = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};
export type PlayerStatus = 'alive' | 'dead';

export type CharacterType = 'spray-n-pray' | 'boom-bringer' | 'glass-cannon-carl' | 'pet-pal-percy' | 'vampire-vex' | 'turret-tina' | 'dash-dynamo';

export type WeaponType = 'rapid-fire' | 'grenade-launcher' | 'sniper-shot' | 'burst-fire' | 'heavy-cannon' | 'shotgun';

export type UnlockCriteriaType = 'level10Count' | 'waveReached' | 'gamesPlayed' | 'enemiesKilled' | 'surviveWithoutHealth';

export interface UnlockCriteria {
  type: UnlockCriteriaType;
  required: number;
  description: string;
}

export interface CharacterStats {
  type: CharacterType;
  name: string;
  emoji: string;
  weaponType: WeaponType;
  baseHealth: number;
  baseDamage: number;
  baseAttackSpeed: number;
  baseSpeed: number;
  description: string;
  pro: string;
  con: string;
  locked?: boolean;
  unlockCriteria?: UnlockCriteria;
  startsWithPet?: boolean;
}

export interface LastRunStats {
  characterType: CharacterType;
  waveReached: number;
  enemiesKilled: number;
  survivalTimeMs: number;
  isVictory: boolean;
  timestamp: number;
}

export interface PlayerProgression {
  playerName?: string;
  timesReachedLevel10: number;
  unlockedCharacters: CharacterType[];
  highestWaveReached: number;
  totalGamesPlayed: number;
  totalEnemiesKilled: number;
  lastUpdated: number;
  lastRunStats?: LastRunStats;
}

export interface Pet {
  id: string;
  ownerId: string;
  position: Vector2D;
  health: number;
  maxHealth: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  damage: number;
  attackSpeed: number;
  attackCooldown: number;
  emoji: string; // Visual representation
  lastHitTimestamp?: number;
}

export interface Player {
  id: string;
  name?: string;
  position: Vector2D;
  health: number;
  maxHealth: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  lastInput?: InputState;
  color: string;
  attackCooldown: number;
  attackSpeed: number; // Lower is faster
  status: PlayerStatus;
  speed: number;
  projectileDamage: number;
  lastHitTimestamp?: number;
  reviveProgress: number;
  // Character system
  characterType?: CharacterType;
  weaponType?: WeaponType;
  // Upgrades
  pickupRadius: number; // XP pickup radius
  projectilesPerShot: number; // Multishot count
  critChance: number; // 0..1
  critMultiplier: number; // e.g., 2.0x
  lifeSteal: number; // 0..1 portion of damage healed
  // Arsenal
  hasBananarang?: boolean; // unlocked via upgrade
  bananarangsPerShot?: number; // how many bananas when attacking
  // UI cues
  lastHealedTimestamp?: number;
  // Collected upgrades
  collectedUpgrades?: CollectedUpgrade[];
  // Upgrade effects
  armor?: number; // damage reduction percentage
  dodge?: number; // dodge chance
  regeneration?: number; // HP per second
  thorns?: number; // reflect damage percentage
  shield?: number; // absorb damage amount
  maxShield?: number;
  // Elemental/Status upgrades
  fireDamage?: number; // fire DoT percentage
  poisonDamage?: number; // poison DoT percentage
  iceSlow?: number; // slow percentage
  explosionDamage?: number; // explosion damage multiplier
  pierceCount?: number; // number of enemies to pierce
  chainCount?: number; // number of enemies to chain to
  ricochetCount?: number; // number of bounces
  homingStrength?: number; // homing bullet strength
  knockbackForce?: number; // knockback distance
  // Pet
  hasPet?: boolean;
  // Orbital
  orbitalCount?: number; // number of flaming skulls orbiting
  // Clone
  cloneCount?: number; // number of clone stacks
  lastCloneSpawnTime?: number; // timestamp of last clone spawn
  // Extraction
  extractionProgress?: number; // ms in extraction zone
  // Character-specific abilities
  vampireDrainRadius?: number; // Vampire Vex: drain radius
  blinkCooldown?: number; // Dash Dynamo: blink ability cooldown
  blinkReady?: boolean; // Dash Dynamo: is blink ready
  burstShotsFired?: number; // Burst fire: track shots in current burst
  // Legendary upgrade effects
  hasLucky?: boolean; // Lucky upgrade: double drops
  hasTimeWarp?: boolean; // TimeWarp upgrade: slow enemies
  // Active Abilities
  abilityCooldown?: number; // ms remaining
  abilityDuration?: number; // ms remaining if active
  isAbilityActive?: boolean;
  // New Legendary effects
  hasOmniGlitch?: boolean;
  hasSystemOverload?: boolean;
  hasGodMode?: boolean;
  godModeCooldown?: number;
  isInvulnerable?: boolean;
  invulnerableUntil?: number;
}
export interface DamageNumber {
  id: string;
  damage: number;
  isCrit: boolean;
  position: Vector2D;
  timestamp: number;
}
export interface StatusEffect {
  type: 'burning' | 'poisoned' | 'frozen' | 'slowed';
  damage?: number; // DoT damage per tick
  duration: number; // remaining duration in ms
  slowAmount?: number; // movement speed multiplier (0-1)
}

export type EnemyType = 'grunt' | 'slugger' | 'hellhound' | 'splitter' | 'mini-splitter' | "neon-pulse"
  | "glitch-spider"
  | "tank-bot";

export interface Enemy {
  id: string;
  position: Vector2D;
  health: number;
  maxHealth: number;
  type: EnemyType;
  xpValue: number;
  damage: number;
  speed: number;
  lastHitTimestamp?: number;
  // UI cues
  lastCritTimestamp?: number;
  damageNumbers?: DamageNumber[];
  // Status effects
  statusEffects?: StatusEffect[];
  baseSpeed?: number; // for calculating slow effects
  // Shooting enemies
  attackCooldown?: number;
  attackSpeed?: number;
  projectileSpeed?: number;
}
export interface Projectile {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  ownerId: string; // ID of the player who shot it
  damage: number;
  // UI cues
  isCrit?: boolean;
  // Projectile flavor
  kind?: 'bananarang' | 'bullet';
  // Bananarang-specific fields
  spawnPosition?: Vector2D;
  maxRange?: number; // distance before returning
  state?: 'outbound' | 'returning';
  returnSpeedMultiplier?: number; // multiplier for return speed
  radius?: number; // hitbox radius
  // Pierce tracking
  hitEnemies?: string[]; // IDs of enemies already hit
  pierceRemaining?: number; // how many more enemies can be pierced
  // Ricochet tracking
  ricochetRemaining?: number; // how many more bounces
}
export interface XpOrb {
  id: string;
  position: Vector2D;
  value: number;
  isDoubled?: boolean; // Visual indicator for lucky upgrade
}
export type UpgradeRarity = 'common' | 'uncommon' | 'legendary' | 'boss' | 'lunar' | 'void';

export type UpgradeType =
  | 'attackSpeed'
  | 'projectileDamage'
  | 'playerSpeed'
  | 'maxHealth'
  | 'pickupRadius'
  | 'multiShot'
  | 'critChance'
  | 'lifeSteal'
  | 'bananarang'
  | 'critDamage'
  | 'armor'
  | 'dodge'
  | 'thorns'
  | 'explosion'
  | 'chain'
  | 'pierce'
  | 'vampiric'
  | 'berserker'
  | 'lucky'
  | 'magnetic'
  | 'regeneration'
  | 'shield'
  | 'timeWarp'
  | 'ghostBullets'
  | 'ricochet'
  | 'homingShots'
  | 'poisonDamage'
  | 'fireDamage'
  | 'iceSlow'
  | 'knockback'
  | 'executioner'
  | 'doubleJump'
  | 'dash'
  | 'invincibility'
  | 'clone'
  | 'orbital'
  | 'turret'
  | 'pet'
  | 'aura'
  | 'omniGlitch'
  | 'systemOverload'
  | 'godMode'
  | 'reflect';

export interface UpgradeOption {
  id: string;
  type: UpgradeType;
  title: string;
  description: string;
  rarity: UpgradeRarity;
  emoji: string;
}

export interface CollectedUpgrade {
  type: UpgradeType;
  title: string;
  rarity: UpgradeRarity;
  emoji: string;
  count: number;
}
export interface Teleporter {
  id: string;
  position: Vector2D;
  radius: number;
}
export interface Explosion {
  id: string;
  position: Vector2D;
  radius: number;
  timestamp: number;
  damage: number;
  ownerId: string;
}

export interface ChainLightning {
  id: string;
  from: Vector2D;
  to: Vector2D;
  timestamp: number;
}

export interface OrbitalSkull {
  id: string;
  ownerId: string;
  angle: number; // current angle in radians
  radius: number; // distance from player
  damage: number; // damage per tick
  lastDamageTimestamp?: number;
}

export interface FireTrail {
  id: string;
  position: Vector2D;
  timestamp: number;
  radius: number;
  damage: number; // damage per tick
  ownerId: string;
}

export interface Turret {
  id: string;
  ownerId: string;
  position: Vector2D;
  health: number;
  maxHealth: number;
  damage: number;
  attackSpeed: number;
  attackCooldown: number;
  range: number;
  expiresAt: number; // timestamp when turret expires
}

export interface Clone {
  id: string;
  ownerId: string;
  position: Vector2D;
  damage: number; // percentage of owner's damage (0-1)
  attackSpeed: number;
  attackCooldown: number;
  range: number; // attack range
  expiresAt: number; // timestamp when clone expires
  opacity: number; // for fade-in/fade-out effect
}

export type HazardType = 'explosive-barrel' | 'freeze-barrel' | 'spike-trap';

export interface Hazard {
  id: string;
  position: Vector2D;
  type: HazardType;
  health: number;
  maxHealth: number;
  isActive?: boolean;
  lastToggle?: number;
}

export type BossType = 'berserker' | 'summoner' | 'architect';

export interface BossAttack {
  type: 'charge' | 'slam' | 'summon' | 'teleport' | 'beam' | 'laser-grid' | 'floor-hazard';
  telegraphStartTime: number;
  telegraphDuration: number;
  executeTime?: number;
  targetPosition?: Vector2D;
  direction?: Vector2D;
}

export interface Boss {
  id: string;
  type: BossType;
  position: Vector2D;
  health: number;
  maxHealth: number;
  phase: 1 | 2;
  currentAttack?: BossAttack;
  attackCooldown: number;
  lastHitTimestamp?: number;
  // Specific to boss type
  portals?: Portal[];
  shieldGenerators?: ShieldGenerator[];
  shieldHealth?: number;
  maxShieldHealth?: number;
  isInvulnerable?: boolean;
  isEnraged?: boolean;
}

export interface ShockwaveRing {
  id: string;
  position: Vector2D;
  currentRadius: number;
  maxRadius: number;
  damage: number;
  timestamp: number;
  speed: number; // expansion speed
  hitPlayers?: Set<string>; // Track which players already hit
}

export interface Portal {
  id: string;
  position: Vector2D;
  health: number;
  maxHealth: number;
  spawnCooldown: number;
  spawnInterval: number;
}

export interface ShieldGenerator {
  id: string;
  position: Vector2D;
  health: number;
  maxHealth: number;
}

export interface BossProjectile {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  damage: number;
  radius: number;
  type: 'beam'; // Can extend for other projectile types
  hitPlayers?: Set<string>;
}

export interface Particle {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  color: string;
  size: number;
  life: number; // 0..1
  maxLife: number; // ms
  timestamp: number;
  type: 'pixel' | 'glitch' | 'nebula' | 'blood';
}

export interface ScreenShake {
  intensity: number;
  duration: number;
  startTime: number;
}

export type GameStatus = 'playing' | 'bossFight' | 'bossDefeated' | 'gameOver' | 'won';

export interface LeaderboardEntry {
  id: number;
  playerName: string;
  characterType: CharacterType;
  waveReached: number;
  enemiesKilled: number;
  survivalTimeMs: number;
  isVictory: boolean;
  createdAt: number;
}

export interface LeaderboardSubmission {
  playerName: string;
  characterType: CharacterType;
  waveReached: number;
  enemiesKilled: number;
  survivalTimeMs: number;
  isVictory: boolean;
}

export type LeaderboardCategory =
  | 'highest-wave'
  | 'most-kills'
  | 'longest-survival'
  | 'fastest-victory';

export interface LeaderboardResponse {
  category: LeaderboardCategory;
  entries: LeaderboardEntry[];
  total?: number;
}
export interface GameState {
  gameId: string;
  status: GameStatus;
  players: Player[];
  enemies: Enemy[];
  projectiles: Projectile[];
  xpOrbs: XpOrb[];
  levelingUpPlayerId?: string | null;
  wave: number;
  teleporter: Teleporter | null;
  explosions?: Explosion[];
  chainLightning?: ChainLightning[];
  pets?: Pet[];
  orbitalSkulls?: OrbitalSkull[];
  fireTrails?: FireTrail[];
  turrets?: Turret[];
  clones?: Clone[];
  isHellhoundRound?: boolean;
  hellhoundRoundPending?: boolean; // Set when hellhound round should start, but waiting for enemies to clear
  hellhoundRoundComplete?: boolean;
  waitingForHellhoundRound?: boolean; // Set when wave timer expires but waiting for enemies to clear before starting hellhound round
  totalHellhoundsInRound?: number;
  hellhoundsKilled?: number;
  hellhoundSpawnTimer?: number;
  waveTimer?: number; // Current wave elapsed time in ms
  boss?: Boss | null;
  shockwaveRings?: ShockwaveRing[];
  bossProjectiles?: BossProjectile[];
  bossDefeatedRewardClaimed?: boolean;
  particles?: Particle[];
  screenShake?: ScreenShake;
  hazards?: Hazard[];
}
