import type { LeaderboardSubmission, LeaderboardCategory, LeaderboardEntry, LeaderboardResponse, ApiResponse } from '@shared/types';

/**
 * Submit a score to the leaderboard
 */
export async function submitLeaderboardScore(submission: LeaderboardSubmission): Promise<{
  entryId: number;
  ranks: Record<string, number | null>;
}> {
  try {
    const response = await fetch('/api/leaderboard/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    });

    const result = await response.json() as ApiResponse<{
      entryId: number;
      ranks: Record<string, number | null>;
    }>;

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to submit score');
    }

    return result.data;
  } catch (error) {
    console.error('Error submitting leaderboard score:', error);
    throw error;
  }
}

/**
 * Get leaderboard entries for a specific category
 */
export async function getLeaderboard(
  category: LeaderboardCategory,
  limit: number = 10,
  offset: number = 0
): Promise<LeaderboardResponse> {
  try {
    const response = await fetch(
      `/api/leaderboard/${category}?limit=${limit}&offset=${offset}`
    );

    const result = await response.json() as ApiResponse<LeaderboardResponse>;

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch leaderboard');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
}

/**
 * Get next leaderboard reset timestamp
 */
export async function getNextResetTime(): Promise<{
  nextResetTimestamp: number;
  currentResetTimestamp: number;
}> {
  try {
    const response = await fetch('/api/leaderboard/next-reset');
    const result = await response.json() as ApiResponse<{
      nextResetTimestamp: number;
      currentResetTimestamp: number;
    }>;

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch reset time');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching reset time:', error);
    throw error;
  }
}

/**
 * Get a player's best scores across all categories
 */
export async function getPlayerStats(playerName: string): Promise<{
  playerName: string;
  bestScores: Record<string, any>;
  totalGames: number;
}> {
  try {
    const response = await fetch(`/api/leaderboard/player/${encodeURIComponent(playerName)}`);

    const result = await response.json() as ApiResponse<{
      playerName: string;
      bestScores: Record<string, any>;
      totalGames: number;
    }>;

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch player stats');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching player stats:', error);
    throw error;
  }
}
