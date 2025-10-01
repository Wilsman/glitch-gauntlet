import type { PlayerProgression, CharacterType } from '@shared/types';

const STORAGE_KEY = 'glitch-gauntlet-progression';
const STORAGE_VERSION = 1;

const DEFAULT_PROGRESSION: PlayerProgression = {
  playerName: undefined,
  timesReachedLevel10: 0,
  unlockedCharacters: ['spray-n-pray', 'boom-bringer', 'glass-cannon-carl'],
  highestWaveReached: 0,
  totalGamesPlayed: 0,
  totalEnemiesKilled: 0,
  lastUpdated: Date.now(),
};

interface StorageData {
  version: number;
  progression: PlayerProgression;
}

/**
 * Load player progression from localStorage
 */
export function getProgression(): PlayerProgression {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_PROGRESSION };

    const data: StorageData = JSON.parse(stored);
    
    // Version migration logic (for future use)
    if (data.version !== STORAGE_VERSION) {
      console.warn('Progression version mismatch, using defaults');
      return { ...DEFAULT_PROGRESSION };
    }

    return data.progression;
  } catch (error) {
    console.error('Failed to load progression:', error);
    return { ...DEFAULT_PROGRESSION };
  }
}

/**
 * Save player progression to localStorage
 */
export function saveProgression(progression: PlayerProgression): void {
  try {
    const data: StorageData = {
      version: STORAGE_VERSION,
      progression: {
        ...progression,
        lastUpdated: Date.now(),
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save progression:', error);
  }
}

/**
 * Update specific progression fields
 */
export function updateProgression(updates: Partial<PlayerProgression>): PlayerProgression {
  const current = getProgression();
  const updated = { ...current, ...updates };
  saveProgression(updated);
  return updated;
}

/**
 * Increment the level 10 achievement counter
 */
export function incrementLevel10Count(): PlayerProgression {
  const current = getProgression();
  return updateProgression({
    timesReachedLevel10: current.timesReachedLevel10 + 1,
  });
}

/**
 * Check if a character is unlocked
 */
export function isCharacterUnlocked(characterType: CharacterType): boolean {
  const progression = getProgression();
  return progression.unlockedCharacters.includes(characterType);
}

/**
 * Unlock a character
 */
export function unlockCharacter(characterType: CharacterType): PlayerProgression {
  const current = getProgression();
  if (!current.unlockedCharacters.includes(characterType)) {
    return updateProgression({
      unlockedCharacters: [...current.unlockedCharacters, characterType],
    });
  }
  return current;
}

/**
 * Check if any characters should be unlocked based on current progression
 * Returns array of newly unlocked character types
 */
export function checkUnlocks(): CharacterType[] {
  const progression = getProgression();
  const newlyUnlocked: CharacterType[] = [];

  // Check Pet Pal Percy unlock (3 times reached level 10)
  if (
    progression.timesReachedLevel10 >= 3 &&
    !progression.unlockedCharacters.includes('pet-pal-percy')
  ) {
    unlockCharacter('pet-pal-percy');
    newlyUnlocked.push('pet-pal-percy');
  }

  // Check Vampire Vex unlock (reach wave 10)
  if (
    progression.highestWaveReached >= 10 &&
    !progression.unlockedCharacters.includes('vampire-vex')
  ) {
    unlockCharacter('vampire-vex');
    newlyUnlocked.push('vampire-vex');
  }

  // Check Turret Tina unlock (500 total enemies killed)
  if (
    progression.totalEnemiesKilled >= 500 &&
    !progression.unlockedCharacters.includes('turret-tina')
  ) {
    unlockCharacter('turret-tina');
    newlyUnlocked.push('turret-tina');
  }

  // Check Dash Dynamo unlock (reach wave 15)
  if (
    progression.highestWaveReached >= 15 &&
    !progression.unlockedCharacters.includes('dash-dynamo')
  ) {
    unlockCharacter('dash-dynamo');
    newlyUnlocked.push('dash-dynamo');
  }

  return newlyUnlocked;
}

/**
 * Get progress toward unlocking a specific character
 */
export function getUnlockProgress(characterType: CharacterType): { current: number; required: number } | null {
  const progression = getProgression();

  switch (characterType) {
    case 'pet-pal-percy':
      return {
        current: progression.timesReachedLevel10,
        required: 3,
      };
    case 'vampire-vex':
      return {
        current: progression.highestWaveReached,
        required: 10,
      };
    case 'turret-tina':
      return {
        current: progression.totalEnemiesKilled,
        required: 500,
      };
    case 'dash-dynamo':
      return {
        current: progression.highestWaveReached,
        required: 15,
      };
    default:
      return null;
  }
}

/**
 * Reset all progression (for testing/debugging)
 */
export function resetProgression(): void {
  saveProgression({ ...DEFAULT_PROGRESSION });
}

/**
 * Get the player's name
 */
export function getPlayerName(): string | undefined {
  const progression = getProgression();
  return progression.playerName;
}

/**
 * Set the player's name
 */
export function setPlayerName(name: string): PlayerProgression {
  return updateProgression({ playerName: name });
}

/**
 * Check if player has set their name
 */
export function hasPlayerName(): boolean {
  const name = getPlayerName();
  return !!name && name.trim().length > 0;
}

/**
 * Record game completion stats
 */
export function recordGameEnd(wave: number, enemiesKilled: number): void {
  const current = getProgression();
  updateProgression({
    totalGamesPlayed: current.totalGamesPlayed + 1,
    highestWaveReached: Math.max(current.highestWaveReached, wave),
    totalEnemiesKilled: current.totalEnemiesKilled + enemiesKilled,
  });
}

/**
 * Save last run stats
 */
export function saveLastRunStats(stats: import('@shared/types').LastRunStats): void {
  updateProgression({ lastRunStats: stats });
}

/**
 * Get last run stats
 */
export function getLastRunStats(): import('@shared/types').LastRunStats | undefined {
  const progression = getProgression();
  return progression.lastRunStats;
}
