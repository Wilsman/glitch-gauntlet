import type { UpgradeOption, UpgradeRarity, Vector2D } from './types';

export type BiomeId = 'yard' | 'frost' | 'foundry' | 'bloom' | 'marsh' | 'void' | 'arcade';
export type StageModifierId = 'goldRush' | 'bloodMoon' | 'overclock' | 'treasure' | 'blackMarket' | 'darkness' | 'hordeNight';
export interface WorldWall { id: string; x: number; y: number; width: number; height: number; shape?: 'rect' | 'circle'; cracked?: boolean; hp?: number }
export interface WorldChest { id: string; kind: 'small' | 'large' | 'shrine'; position: Vector2D; cost: number; opened: boolean; uses: number; openedMs: number; secret?: boolean }
export interface BoostPad { id: string; position: Vector2D; angle: number }
export interface WorldHazard { id: string; kind: 'ice' | 'lava' | 'sludge' | 'warp'; x: number; y: number; radius: number }
export interface WorldRegion { id: string; biome: BiomeId; name: string; x: number; y: number; width: number; height: number; neon: string; discovered: boolean }
export interface WorldProp { id: string; x: number; y: number; kind: string }
export interface WorldPedestal { id: string; kind: 'boss' | 'treasure' | 'shop' | 'heal'; position: Vector2D; taken: boolean; cost?: number; option?: UpgradeOption }
export interface WorldPortal { id: string; position: Vector2D; modifier: StageModifierId }
export interface WorldFx { id: number; kind: 'ring' | 'text' | 'burst' | 'beam'; position: Vector2D; color: string; ms: number; maxMs: number; size: number; text?: string }
export interface ItemFeedEntry { id: number; title: string; emoji: string; rarity: UpgradeRarity; description: string; ms: number }
export interface StageResults { rank: 'S' | 'A' | 'B' | 'C' | 'D'; bonus: number; kills: number; bestCombo: number; items: number; damageTaken: number; seconds: number; ms: number }
export interface RunStats { stagesCleared: number; totalKills: number; bestCombo: number; items: { emoji: string; title: string; rarity: UpgradeRarity }[]; maxTier: number }
export interface ExplorationState {
  seed: number;
  stage: number;
  modifier: StageModifierId | null;
  hasYard: boolean;
  landing: Vector2D;
  width: number;
  height: number;
  phase: 'exploring' | 'anchorActive' | 'pedestals' | 'results' | 'portals';
  elapsedMs: number;
  stageStartMs: number;
  pressure: number;
  camera: Vector2D;
  walls: WorldWall[];
  hazards: WorldHazard[];
  biomes: WorldRegion[];
  currentRegionId: string;
  biomeBanner: { name: string; neon: string; ms: number; sub?: string } | null;
  stageBanner: { title: string; subtitle: string; neon: string; ms: number } | null;
  results: StageResults | null;
  pedestals: WorldPedestal[];
  portals: WorldPortal[];
  pendingModifier: StageModifierId | null;
  warpMs: number;
  props: WorldProp[];
  doorways: { x: number; y: number; width: number; height: number }[];
  lamps: { x: number; y: number; color: string }[];
  visited: number[];
  anchor: { position: Vector2D; discovered: boolean; chargeMs: number; radius: number; guardianDefeated: boolean; occupied: boolean };
  cache: { position: Vector2D; discovered: boolean; claimed: boolean };
  elite: { position: Vector2D; discovered: boolean; started: boolean; defeated: boolean; id: string };
  gateOpen: boolean;
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
  metrics: { discoveryMs: number | null; damageTaken: number; outsideChargeMs: number; detourRewards: number; itemsTaken: number };
  run: RunStats;
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
