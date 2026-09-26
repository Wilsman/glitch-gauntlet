import type { PlayerProgression, CharacterType, PetCoat, UnlockRoute, UnlockStat, CharacterStats } from '@shared/types';
import { getAllCharacters } from '@shared/characterConfig';

const STORAGE_KEY = 'glitch-gauntlet-progression';
const STORAGE_VERSION = 3;
const STARTER_CHARACTERS: CharacterType[] = ['spray-n-pray', 'null-ronin'];

const DEFAULT_PROGRESSION: PlayerProgression = {
  playerName: undefined,
  timesReachedLevel10: 0,
  unlockedCharacters: [...STARTER_CHARACTERS],
  highestWaveReached: 0,
  totalGamesPlayed: 0,
  totalEnemiesKilled: 0,
  totalBossesDefeated: 0,
  successfulExtractions: 0,
  bestSurvivalTimeMs: 0,
  noHitAfterWave5Wins: 0,
  bestRiftStagesCleared: 0,
  riftSRanks: 0,
  riftFlawlessStages: 0,
  riftSecretChests: 0,
  lastUpdated: Date.now(),
};

interface StorageData {
  version: number;
  progression: PlayerProgression;
}

function mergeStarterCharacters(unlockedCharacters: CharacterType[] = []): CharacterType[] {
  return Array.from(new Set([...STARTER_CHARACTERS, ...unlockedCharacters]));
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
        unlockedCharacters: mergeStarterCharacters(data.progression.unlockedCharacters),
      };
      const { updated } = applyUnlocks(merged);
      saveProgression(updated);
      return updated;
    }

    // Merge with defaults to ensure all fields exist (for backwards compatibility)
    return {
      ...DEFAULT_PROGRESSION,
      ...data.progression,
      unlockedCharacters: mergeStarterCharacters(data.progression.unlockedCharacters),
    };
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
  return updateProgression({
    unlockedCharacters: getAllCharacters().map((character) => character.type),
  });
}

function statValue(progression: PlayerProgression, stat: UnlockStat): number {
  switch (stat) {
    case 'bossesDefeated': return progression.totalBossesDefeated;
    case 'enemiesKilled': return progression.totalEnemiesKilled;
    case 'waveReached': return progression.highestWaveReached;
    case 'survivalMinutes': return Math.floor(progression.bestSurvivalTimeMs / 60000);
    case 'extractions': return progression.successfulExtractions;
    case 'noHitAfterWave5Win': return progression.noHitAfterWave5Wins;
    case 'riftStagesCleared': return progression.bestRiftStagesCleared;
    case 'riftSRanks': return progression.riftSRanks;
    case 'riftFlawlessStages': return progression.riftFlawlessStages;
    case 'riftSecretChests': return progression.riftSecretChests;
  }
}

export interface UnlockRouteProgress {
  route: UnlockRoute;
  current: number;
  done: boolean;
}

function routeProgress(progression: PlayerProgression, character: CharacterStats): UnlockRouteProgress[] {
  return (character.unlockRoutes ?? []).map((route) => {
    const current = Math.min(statValue(progression, route.stat), route.required);
    return { route, current, done: current >= route.required };
  });
}

function applyUnlocks(
  progression: PlayerProgression
): { updated: PlayerProgression; newlyUnlocked: CharacterType[] } {
  const unlocked = new Set(progression.unlockedCharacters);
  const newlyUnlocked: CharacterType[] = [];

  // Any completed route unlocks the character.
  for (const character of getAllCharacters()) {
    if (unlocked.has(character.type)) continue;
    if (routeProgress(progression, character).some((progress) => progress.done)) {
      unlocked.add(character.type);
      newlyUnlocked.push(character.type);
    }
  }

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
 * Progress toward each unlock route of a character (empty for starters)
 */
export function getUnlockProgress(characterType: CharacterType): UnlockRouteProgress[] {
  const character = getAllCharacters().find((candidate) => candidate.type === characterType);
  return character ? routeProgress(getProgression(), character) : [];
}

/**
 * The locked character route closest to completion, optionally limited to routes a mode can advance
 */
export function getNearestUnlock(
  mode?: UnlockRoute['mode']
): { character: CharacterStats; progress: UnlockRouteProgress } | null {
  const progression = getProgression();
  let best: { character: CharacterStats; progress: UnlockRouteProgress } | null = null;
  let bestRatio = -1;
  for (const character of getAllCharacters()) {
    if (progression.unlockedCharacters.includes(character.type)) continue;
    for (const progress of routeProgress(progression, character)) {
      if (mode && progress.route.mode !== 'any' && progress.route.mode !== mode) continue;
      const ratio = progress.current / progress.route.required;
      if (ratio > bestRatio) {
        best = { character, progress };
        bestRatio = ratio;
      }
    }
  }
  return best;
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

const PET_COAT_KEY = 'glitch-gauntlet-pet-coat';
const PET_COATS: readonly PetCoat[] = ['red', 'black-tan', 'chocolate-tan', 'cream', 'dapple'];

export function getPetCoat(): PetCoat {
  try {
    const stored = localStorage.getItem(PET_COAT_KEY) as PetCoat | null;
    return stored && PET_COATS.includes(stored) ? stored : 'red';
  } catch {
    return 'red';
  }
}

export function setPetCoat(coat: PetCoat): void {
  try {
    localStorage.setItem(PET_COAT_KEY, coat);
  } catch {
    // Storage unavailable; the choice just won't persist.
  }
}

/**
 * Record game completion stats
 */
export function recordGameEnd(enemiesKilled: number, arenaWave?: number): void {
  const current = getProgression();
  updateProgression({
    totalGamesPlayed: current.totalGamesPlayed + 1,
    highestWaveReached: Math.max(current.highestWaveReached, arenaWave ?? 0),
    totalEnemiesKilled: current.totalEnemiesKilled + enemiesKilled,
  });
}

/**
 * The Rift: record a cleared stage as soon as its relic is claimed
 */
export function recordRiftStageClear(stagesCleared: number, rank: string, damageTaken: number): PlayerProgression {
  const current = getProgression();
  return updateProgression({
    bestRiftStagesCleared: Math.max(current.bestRiftStagesCleared, stagesCleared),
    riftSRanks: current.riftSRanks + (rank === 'S' ? 1 : 0),
    riftFlawlessStages: current.riftFlawlessStages + (damageTaken <= 0 ? 1 : 0),
  });
}

export function recordRiftSecretChest(): PlayerProgression {
  const current = getProgression();
  return updateProgression({ riftSecretChests: current.riftSecretChests + 1 });
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
