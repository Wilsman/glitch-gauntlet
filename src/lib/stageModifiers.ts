import type { StageModifierId, StageResults } from '@shared/exploration';
import { rng } from './worldGen';

export interface StageModifier {
  id: StageModifierId;
  name: string;
  color: string;
  flavour: string;
  reward: string;
  risk: string;
}

export const STAGE_MODIFIERS: Record<StageModifierId, StageModifier> = {
  goldRush: { id: 'goldRush', name: 'GOLD RUSH', color: '#facc15', flavour: 'Every glitch bleeds coins.', reward: 'Chest & shrine costs −30% · coin drops ×1.5', risk: 'Enemy packs +1' },
  bloodMoon: { id: 'bloodMoon', name: 'BLOOD MOON', color: '#f43f5e', flavour: 'The elites are hunting tonight.', reward: 'Elites may drop items (25%) · +2 legendary vaults', risk: 'Elite chance ×3' },
  overclock: { id: 'overclock', name: 'OVERCLOCK', color: '#22d3ee', flavour: 'Everything runs hot — including you.', reward: 'XP ×1.75 · your speed ×1.15', risk: 'Enemy speed ×1.2' },
  treasure: { id: 'treasure', name: 'TREASURE ROOM', color: '#fbbf24', flavour: 'A vault door left open.', reward: '3 legendary pedestals at landing (take 1)', risk: 'Enemy health ×1.15' },
  blackMarket: { id: 'blackMarket', name: 'BLACK MARKET', color: '#a78bfa', flavour: 'A dealer followed you through the rift.', reward: 'Shop & heal pedestals at landing', risk: 'No free chests · small chests +$10' },
  darkness: { id: 'darkness', name: 'CURSE OF THE DARK', color: '#64748b', flavour: 'The light gave up on this place.', reward: 'Every chest drops 2 items', risk: 'Vision limited to a small halo' },
  hordeNight: { id: 'hordeNight', name: 'HORDE NIGHT', color: '#fb923c', flavour: 'They just keep coming.', reward: 'Combo XP bonus doubled · coins ×1.25', risk: 'Enemy caps ×1.5 · spawns ×0.75 interval' },
};

export const MODIFIER_IDS = Object.keys(STAGE_MODIFIERS) as StageModifierId[];

// Seeded pick of 3 distinct modifiers for the rift portals at a stage exit.
export function rollStageModifiers(seed: number, stage: number): StageModifierId[] {
  const random = rng(seed * 31337 + stage * 1013 + 7);
  const pool = [...MODIFIER_IDS];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3);
}

export const RANK_BONUS: Record<StageResults['rank'], number> = { S: 60, A: 40, B: 25, C: 15, D: 5 };

export function computeRank(stats: { kills: number; bestCombo: number; items: number; damageTaken: number; seconds: number }): StageResults['rank'] {
  const score = stats.kills + stats.bestCombo * 2 + stats.items * 15 - stats.damageTaken * 0.5 - stats.seconds * 0.3;
  return score >= 220 ? 'S' : score >= 150 ? 'A' : score >= 90 ? 'B' : score >= 40 ? 'C' : 'D';
}
