/**
 * Utility functions for weekly leaderboard resets
 */

/**
 * Get the timestamp for the start of the current weekly reset period (Monday 08:00 UTC)
 */
export function getCurrentResetTimestamp(): number {
  const now = new Date();
  const currentDay = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentHour = now.getUTCHours();
  
  // Calculate days since last Monday 08:00 UTC
  let daysSinceReset: number;
  if (currentDay === 0) {
    // Sunday - go back 6 days to Monday
    daysSinceReset = 6;
  } else {
    // Monday-Saturday
    daysSinceReset = currentDay - 1;
  }
  
  // If it's Monday but before 08:00, go back to previous Monday
  if (currentDay === 1 && currentHour < 8) {
    daysSinceReset = 7;
  }
  
  // Calculate the reset timestamp
  const resetDate = new Date(now);
  resetDate.setUTCDate(now.getUTCDate() - daysSinceReset);
  resetDate.setUTCHours(8, 0, 0, 0);
  
  return resetDate.getTime();
}

/**
 * Get the timestamp for the next weekly reset (Monday 08:00 UTC)
 */
export function getNextResetTimestamp(): number {
  const now = new Date();
  const currentDay = now.getUTCDay();
  const currentHour = now.getUTCHours();
  
  // Calculate days until next Monday 08:00 UTC
  let daysUntilReset: number;
  if (currentDay === 0) {
    // Sunday - 1 day until Monday
    daysUntilReset = 1;
  } else if (currentDay === 1 && currentHour < 8) {
    // Monday before 08:00 - reset is today
    daysUntilReset = 0;
  } else {
    // Monday after 08:00 through Saturday - days until next Monday
    daysUntilReset = 8 - currentDay;
  }
  
  const nextResetDate = new Date(now);
  nextResetDate.setUTCDate(now.getUTCDate() + daysUntilReset);
  nextResetDate.setUTCHours(8, 0, 0, 0);
  
  return nextResetDate.getTime();
}

/**
 * Archive old leaderboard entries and reset for the new week
 */
export async function archiveAndResetLeaderboard(db: D1Database): Promise<void> {
  const currentResetTimestamp = getCurrentResetTimestamp();
  
  try {
    // Move old entries to archive
    await db.prepare(`
      INSERT INTO leaderboard_archive 
      (player_name, character_type, wave_reached, enemies_killed, survival_time_ms, is_victory, created_at, reset_timestamp, archived_at)
      SELECT 
        player_name, character_type, wave_reached, enemies_killed, survival_time_ms, is_victory, created_at, reset_timestamp, ?
      FROM leaderboard_entries
      WHERE reset_timestamp < ?
    `).bind(Date.now(), currentResetTimestamp).run();
    
    // Delete archived entries from main table
    await db.prepare(`
      DELETE FROM leaderboard_entries
      WHERE reset_timestamp < ?
    `).bind(currentResetTimestamp).run();
    
    console.log(`Leaderboard reset completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('Error during leaderboard reset:', error);
    throw error;
  }
}
