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
export interface Player {
  id: string;
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
  // Upgrades
  pickupRadius: number; // XP pickup radius
  projectilesPerShot: number; // Multishot count
  critChance: number; // 0..1
  critMultiplier: number; // e.g., 2.0x
  lifeSteal: number; // 0..1 portion of damage healed
  // UI cues
  lastHealedTimestamp?: number;
}
export interface Enemy {
  id: string;
  position: Vector2D;
  health: number;
  maxHealth: number;
  type: 'grunt';
  xpValue: number;
  damage: number;
  lastHitTimestamp?: number;
  // UI cues
  lastCritTimestamp?: number;
}
export interface Projectile {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  ownerId: string; // ID of the player who shot it
  damage: number;
  // UI cues
  isCrit?: boolean;
}
export interface XpOrb {
  id: string;
  position: Vector2D;
  value: number;
}
export type UpgradeType =
  | 'attackSpeed'
  | 'projectileDamage'
  | 'playerSpeed'
  | 'maxHealth'
  | 'pickupRadius'
  | 'multiShot'
  | 'critChance'
  | 'lifeSteal';
export interface UpgradeOption {
  id: string;
  type: UpgradeType;
  title: string;
  description: string;
}
export interface Teleporter {
  id: string;
  position: Vector2D;
  radius: number;
}
export type GameStatus = 'playing' | 'gameOver' | 'won';
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
}
