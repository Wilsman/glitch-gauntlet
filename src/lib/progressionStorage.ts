import type { PlayerProgression, CharacterType } from '@shared/types';

const STORAGE_KEY = 'glitch-gauntlet-progression';
const STORAGE_VERSION = 2;

const DEFAULT_PROGRESSION: PlayerProgression = {
  playerName: undefined,
  timesReachedLevel10: 0,
  unlockedCharacters: ['spray-n-pray'],
  highestWaveReached: 0,
  totalGamesPlayed: 0,
  totalEnemiesKilled: 0,
  totalBossesDefeated: 0,
  successfulExtractions: 0,
  bestSurvivalTimeMs: 0,
  noHitAfterWave5Wins: 0,
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
      console.warn('Progression version mismatch, migrating progression');
      const merged: PlayerProgression = {
        ...DEFAULT_PROGRESSION,
        ...data.progression,
        unlockedCharacters: [...DEFAULT_PROGRESSION.unlockedCharacters],
      };
      const { updated } = applyUnlocks(merged);
      saveProgression(updated);
      return updated;
    }

    // Merge with defaults to ensure all fields exist (for backwards compatibility)
    return { ...DEFAULT_PROGRESSION, ...data.progression };
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

export function incrementBossDefeats(count: number = 1): PlayerProgression {
  const current = getProgression();
  return updateProgression({
    totalBossesDefeated: current.totalBossesDefeated + count,
  });
}

export function recordExtractionWin(): PlayerProgression {
  const current = getProgression();
  return updateProgression({
    successfulExtractions: current.successfulExtractions + 1,
  });
}

export function recordSurvivalTime(survivalTimeMs: number): PlayerProgression {
  const current = getProgression();
  return updateProgression({
    bestSurvivalTimeMs: Math.max(current.bestSurvivalTimeMs, survivalTimeMs),
  });
}

export function recordNoHitAfterWave5Win(): PlayerProgression {
  const current = getProgression();
  return updateProgression({
    noHitAfterWave5Wins: current.noHitAfterWave5Wins + 1,
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
 * Unlock all characters (cheat command)
 */
export function unlockAllCharacters(): PlayerProgression {
  const allTypes: CharacterType[] = [
    'spray-n-pray',
    'boom-bringer',
    'glass-cannon-carl',
    'pet-pal-percy',
    'vampire-vex',
    'turret-tina',
    'dash-dynamo'
  ];

  return updateProgression({
    unlockedCharacters: allTypes,
  });
}

function applyUnlocks(
  progression: PlayerProgression
): { updated: PlayerProgression; newlyUnlocked: CharacterType[] } {
  const unlocked = new Set(progression.unlockedCharacters);
  const newlyUnlocked: CharacterType[] = [];

  const unlockIf = (characterType: CharacterType, condition: boolean) => {
    if (condition && !unlocked.has(characterType)) {
      unlocked.add(characterType);
      newlyUnlocked.push(characterType);
    }
  };

  // Pet Pal Percy unlock (survive 15 minutes)
  unlockIf(
    'pet-pal-percy',
    progression.bestSurvivalTimeMs >= 15 * 60 * 1000
  );

  // Vampire Vex unlock (reach wave 10)
  unlockIf('vampire-vex', progression.highestWaveReached >= 10);

  // Turret Tina unlock (500 total enemies killed)
  unlockIf('turret-tina', progression.totalEnemiesKilled >= 500);

  // Dash Dynamo unlock (extract 5 times)
  unlockIf('dash-dynamo', progression.successfulExtractions >= 5);

  // Boom Bringer unlock (defeat 3 bosses total)
  unlockIf('boom-bringer', progression.totalBossesDefeated >= 3);

  // Glass Cannon Carl unlock (win without damage after wave 5)
  unlockIf('glass-cannon-carl', progression.noHitAfterWave5Wins >= 1);

  return {
    updated: { ...progression, unlockedCharacters: Array.from(unlocked) },
    newlyUnlocked,
  };
}

/**
 * Check if any characters should be unlocked based on current progression
 * Returns array of newly unlocked character types
 */
export function checkUnlocks(): CharacterType[] {
  const progression = getProgression();
  const { updated, newlyUnlocked } = applyUnlocks(progression);
  if (newlyUnlocked.length > 0) {
    saveProgression(updated);
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
        current: Math.floor(progression.bestSurvivalTimeMs / 60000),
        required: 15,
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
        current: progression.successfulExtractions,
        required: 5,
      };
    case 'boom-bringer':
      return {
        current: progression.totalBossesDefeated,
        required: 3,
      };
    case 'glass-cannon-carl':
      return {
        current: progression.noHitAfterWave5Wins,
        required: 1,
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
