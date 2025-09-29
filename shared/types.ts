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
}
export interface Projectile {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  ownerId: string; // ID of the player who shot it
  damage: number;
}
export interface XpOrb {
  id: string;
  position: Vector2D;
  value: number;
}
export type UpgradeType = 'attackSpeed' | 'projectileDamage' | 'playerSpeed';
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