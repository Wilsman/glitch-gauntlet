import type { CharacterStats, CharacterType } from './types';

/**
 * Character Configuration
 * 
 * Four distinct playstyles:
 * 1. Spray 'n' Pray - Balanced rapid-fire character
 * 2. Boom Bringer - AoE explosion specialist
 * 3. Glass Cannon Carl - High damage, low survivability sniper
 * 4. Pet Pal Percy - Starts with a companion pet (UNLOCKABLE)
 */

export const CHARACTERS: Record<CharacterType, CharacterStats> = {
  'spray-n-pray': {
    type: 'spray-n-pray',
    name: "Spray 'n' Pray",
    emoji: '🔫',
    weaponType: 'rapid-fire',
    baseHealth: 100,
    baseDamage: 8,
    baseAttackSpeed: 300, // Fast fire rate
    baseSpeed: 4,
    description: 'Balanced rapid-fire specialist with consistent DPS',
    pro: 'High fire rate = excellent on-hit item procs',
    con: 'Low individual damage, needs upgrades to scale',
  },
  'boom-bringer': {
    type: 'boom-bringer',
    name: 'Boom Bringer',
    emoji: '💣',
    weaponType: 'grenade-launcher',
    baseHealth: 120,
    baseDamage: 18,
    baseAttackSpeed: 700, // Slow fire rate
    baseSpeed: 3.5,
    description: 'Explosive AoE specialist with built-in splash damage',
    pro: 'Built-in AoE explosions, safe distance combat',
    con: 'Slow fire rate, poor single-target burst',
  },
  'glass-cannon-carl': {
    type: 'glass-cannon-carl',
    name: 'Glass Cannon Carl',
    emoji: '🎯',
    weaponType: 'sniper-shot',
    baseHealth: 75,
    baseDamage: 35,
    baseAttackSpeed: 900, // Very slow, must reload
    baseSpeed: 4,
    description: 'High-risk sniper with devastating single-shot damage',
    pro: 'Massive damage per shot, high base crit multiplier (3x)',
    con: 'Very low HP, slow fire rate, vulnerable up close',
  },
  'pet-pal-percy': {
    type: 'pet-pal-percy',
    name: 'Pet Pal Percy',
    emoji: '🐾',
    weaponType: 'rapid-fire',
    baseHealth: 90,
    baseDamage: 10,
    baseAttackSpeed: 450, // Medium fire rate
    baseSpeed: 4.2,
    description: 'Companion specialist who starts with a loyal pet',
    pro: 'Starts with a pet companion for extra DPS from wave 1',
    con: 'Slightly lower HP, requires unlocking',
    locked: true,
    startsWithPet: true,
    unlockCriteria: {
      type: 'level10Count',
      required: 3,
      description: 'Reach level 10 in 3 different games',
    },
  },
};

export function getCharacter(type: CharacterType): CharacterStats {
  return CHARACTERS[type];
}

export function getAllCharacters(): CharacterStats[] {
  return Object.values(CHARACTERS);
}
