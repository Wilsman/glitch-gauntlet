import type { UpgradeOption, UpgradeRarity, Vector2D } from './types';

export type BiomeId = 'yard' | 'frost' | 'foundry' | 'bloom' | 'marsh' | 'void' | 'arcade' | 'cave';
export type StageModifierId = 'goldRush' | 'bloodMoon' | 'overclock' | 'treasure' | 'blackMarket' | 'darkness' | 'hordeNight';
export interface WorldWall { id: string; x: number; y: number; width: number; height: number; shape?: 'rect' | 'circle'; cracked?: boolean; hp?: number }
export interface WorldChest { id: string; kind: 'small' | 'large' | 'shrine'; position: Vector2D; cost: number; opened: boolean; uses: number; openedMs: number; secret?: boolean }
export interface BoostPad { id: string; position: Vector2D; angle: number }
export interface WorldHazard { id: string; kind: 'ice' | 'lava' | 'sludge' | 'warp'; x: number; y: number; radius: number }
export interface WorldRegion { id: string; biome: BiomeId; name: string; x: number; y: number; width: number; height: number; neon: string; discovered: boolean }
export interface WorldProp { id: string; x: number; y: number; kind: string }
export interface WorldPedestal { id: string; kind: 'boss' | 'treasure' | 'shop' | 'heal'; position: Vector2D; taken: boolean; cost?: number; option?: UpgradeOption }
// A 'cave' portal leads to the shop interlude; modifier portals lead to the next stage.
export interface WorldPortal { id: string; position: Vector2D; kind?: 'cave'; modifier?: StageModifierId }
export interface WorldFx { id: number; kind: 'ring' | 'text' | 'burst' | 'beam'; position: Vector2D; color: string; ms: number; maxMs: number; size: number; text?: string }
// Loot reveal: pops as a big animated card, then settles into the compact feed.
export interface ItemFeedEntry { id: number; title: string; emoji: string; rarity: UpgradeRarity; description: string; ms: number; kind?: 'item' | 'fail' | 'heal'; source?: string }
// Hover card for whatever the player is standing on; the interact button performs `action`.
export interface InteractCard {
  id: string;
  kind: 'relic' | 'shop' | 'heal' | 'chest' | 'vault' | 'shrine' | 'portal' | 'cache' | 'anchor' | 'elite';
  anchor: Vector2D;
  lift: number;
  title: string;
  tag: string;
  body: string;
  emoji: string;
  color: string;
  rarity?: UpgradeRarity;
  action: string;
  cost?: number;
  ready: boolean;
  note?: string;
  pros?: string;
  cons?: string;
}
export interface StageResults { rank: 'S' | 'A' | 'B' | 'C' | 'D'; bonus: number; kills: number; bestCombo: number; items: number; damageTaken: number; seconds: number; ms: number }
// clearTimesMs: play time (elapsedMs) at each boss-relic claim; length = stages actually cleared.
export interface RunStats { stagesCleared: number; totalKills: number; bestCombo: number; items: { emoji: string; title: string; rarity: UpgradeRarity }[]; maxTier: number; clearTimesMs: number[] }
export interface ExplorationState {
  seed: number;
  stage: number;
  modifier: StageModifierId | null;
  hasYard: boolean;
  // Safe shop cave between stages: no anchor, no spawns, exits through the modifier rifts.
  interlude?: boolean;
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
  pendingCave?: boolean;
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
  // Pedestal or portal the player is standing on (highlighted; the interact button confirms it).
  focusId?: string | null;
  interact?: InteractCard | null;
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
