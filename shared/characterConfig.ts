import type { CharacterStats, CharacterType } from './types';

/**
 * Character Configuration
 * 
 * Seven distinct playstyles:
 * 1. Spray 'n' Pray - Balanced rapid-fire character
 * 2. Boom Bringer - AoE explosion specialist
 * 3. Glass Cannon Carl - High damage, low survivability sniper
 * 4. Pet Pal Percy - Starts with a companion pet (UNLOCKABLE)
 * 5. Vampire Vex - Life drain specialist with AoE drain (UNLOCKABLE)
 * 6. Turret Tina - Deploys time-limited turrets (UNLOCKABLE)
 * 7. Dash Dynamo - High mobility with blink dash (UNLOCKABLE)
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
  'vampire-vex': {
    type: 'vampire-vex',
    name: 'Vampire Vex',
    emoji: '🧛',
    weaponType: 'burst-fire',
    baseHealth: 85,
    baseDamage: 12,
    baseAttackSpeed: 600, // Medium-slow (3-round burst)
    baseSpeed: 3.8,
    description: 'Life drain specialist with growing AoE drain aura',
    pro: 'Passive AoE drain heals you, grows with level, 3-round burst',
    con: 'Low HP, drain radius starts small, medium fire rate',
    locked: true,
    unlockCriteria: {
      type: 'waveReached',
      required: 10,
      description: 'Reach wave 10 in any game',
    },
  },
  'turret-tina': {
    type: 'turret-tina',
    name: 'Turret Tina',
    emoji: '🏗️',
    weaponType: 'heavy-cannon',
    baseHealth: 130,
    baseDamage: 8,
    baseAttackSpeed: 800, // Slow personal fire rate
    baseSpeed: 3.2,
    description: 'Defense builder who deploys time-limited turrets',
    pro: 'Deploys auto-firing turrets, high HP, large projectiles',
    con: 'Very slow movement, low personal damage, turrets expire',
    locked: true,
    unlockCriteria: {
      type: 'enemiesKilled',
      required: 500,
      description: 'Kill 500 total enemies across all games',
    },
  },
  'dash-dynamo': {
    type: 'dash-dynamo',
    name: 'Dash Dynamo',
    emoji: '⚡',
    weaponType: 'shotgun',
    baseHealth: 70,
    baseDamage: 15,
    baseAttackSpeed: 500, // Medium fire rate
    baseSpeed: 5.5,
    description: 'High mobility speedster with instant blink dash',
    pro: 'Very high speed, blink dash ability, short-range shotgun',
    con: 'Very low HP, short weapon range, blink has cooldown',
    locked: true,
    unlockCriteria: {
      type: 'waveReached',
      required: 15,
      description: 'Reach wave 15 in any game',
    },
  },
};

export function getCharacter(type: CharacterType): CharacterStats {
  return CHARACTERS[type];
}

export function getAllCharacters(): CharacterStats[] {
  return Object.values(CHARACTERS);
}
