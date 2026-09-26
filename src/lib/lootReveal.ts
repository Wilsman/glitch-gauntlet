import type { ItemFeedEntry } from '@shared/exploration';

// Matches ExplorationStage's REVEAL_MS: an entry is a big reveal card for BIG_MS, then a compact feed row.
export const REVEAL_MS = 5200;
export const BIG_MS = 2400;

// While a loot reveal is on screen it owns the spotlight; the hover card waits.
export const isRevealing = (feed: ItemFeedEntry[]) => feed.some(e => REVEAL_MS - e.ms < BIG_MS);
