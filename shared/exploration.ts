import type { UpgradeRarity, Vector2D } from './types';

export interface WorldWall { id: string; x: number; y: number; width: number; height: number }
export interface WorldChest { id: string; kind: 'small' | 'large' | 'shrine'; position: Vector2D; cost: number; opened: boolean; uses: number; openedMs: number }
export interface BoostPad { id: string; position: Vector2D; angle: number }
export interface WorldFx { id: number; kind: 'ring' | 'text' | 'burst' | 'beam'; position: Vector2D; color: string; ms: number; maxMs: number; size: number; text?: string }
export interface ItemFeedEntry { id: number; title: string; emoji: string; rarity: UpgradeRarity; description: string; ms: number }
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
  chests: WorldChest[];
  pads: BoostPad[];
  boostMs: number;
  boostAngle: number;
  combo: { count: number; timerMs: number; best: number; milestone: string; milestoneMs: number };
  kills: number;
  hitStopMs: number;
  hurtMs: number;
  fx: WorldFx[];
  itemFeed: ItemFeedEntry[];
}
