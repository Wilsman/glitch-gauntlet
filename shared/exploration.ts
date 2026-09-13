import type { Vector2D } from './types';

export interface WorldWall { id: string; x: number; y: number; width: number; height: number }
export interface ExplorationState {
  seed: number;
  width: number;
  height: number;
  phase: 'exploring' | 'anchorActive' | 'exitReady';
  elapsedMs: number;
  pressure: number;
  camera: Vector2D;
  walls: WorldWall[];
  visited: number[];
  anchor: { position: Vector2D; discovered: boolean; chargeMs: number; radius: number; guardianDefeated: boolean; occupied: boolean };
  cache: { position: Vector2D; discovered: boolean; claimed: boolean };
  elite: { position: Vector2D; discovered: boolean; started: boolean; defeated: boolean; id: string };
  gateOpen: boolean;
  rewardClaimed: boolean;
  prompt: string;
  notice: string;
  noticeMs: number;
  momentum: number;
  velocity: Vector2D;
  slideMs: number;
  slideCooldownMs: number;
  stationaryMs: number;
  established: boolean;
  spawnsEnabled: boolean;
  debugInvulnerable?: boolean;
  spawnWarnings?: { position: Vector2D; remainingMs: number }[];
  metrics: { discoveryMs: number | null; damageTaken: number; outsideChargeMs: number; detourRewards: number };
}
