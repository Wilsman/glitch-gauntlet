import type { GameMode } from '@shared/types';

// Display info for each game mode, shared by the home-screen mode buttons and the leaderboard.
export interface GameModeInfo {
  name: string;
  short: string;
  tag: string;
  accent: string;
  blurb: string;
  features: string[];
}

export const GAME_MODES: Record<GameMode, GameModeInfo> = {
  rift: {
    name: 'THE RIFT',
    short: 'RIFT',
    tag: 'OPEN WORLD',
    accent: '#22d3ee',
    blurb: 'Roam a glitched open world, loot what you find, stabilise the anchor and dive deeper through the rifts.',
    features: ['Explore sprawling biomes', 'Boss relics & a shop grotto between stages', 'How many stages can you clear?'],
  },
  arena: {
    name: 'THE ARENA',
    short: 'ARENA',
    tag: 'CLASSIC WAVES',
    accent: '#facc15',
    blurb: 'Pick a route through the gauntlet and survive wave after wave of fights, shops and boss rounds.',
    features: ['Route map of fights, shops & bosses', 'Survive the waves, then extract', 'Autoplay available'],
  },
};
