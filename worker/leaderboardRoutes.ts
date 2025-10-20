import { Hono } from 'hono';
import type { Env } from './core-utils';
import type { LeaderboardSubmission, LeaderboardCategory, LeaderboardEntry, LeaderboardResponse } from '@shared/types';
import { getCurrentResetTimestamp, getNextResetTimestamp } from './leaderboardUtils';

export function leaderboardRoutes(app: Hono<{ Bindings: Env }>) {
  // Submit a leaderboard entry
  app.post('/api/leaderboard/submit', async (c) => {
    try {
      const db = c.env.prod_d1_cnk;
      const submission = await c.req.json<LeaderboardSubmission>();

      // Validate submission
      if (!submission.playerName || !submission.characterType || 
          submission.waveReached === undefined || submission.enemiesKilled === undefined ||
          submission.survivalTimeMs === undefined) {
        return c.json({ success: false, error: 'Missing required fields' }, 400);
      }

      // Validate reasonable values to prevent cheating
      if (submission.waveReached < 1 || submission.waveReached > 1000 ||
          submission.enemiesKilled < 0 || submission.enemiesKilled > 100000 ||
          submission.survivalTimeMs < 0 || submission.survivalTimeMs > 86400000) {
        return c.json({ success: false, error: 'Invalid stat values' }, 400);
      }

      // Get current reset timestamp
      const resetTimestamp = getCurrentResetTimestamp();

      // Insert entry
      const result = await db.prepare(`
        INSERT INTO leaderboard_entries 
        (player_name, character_type, wave_reached, enemies_killed, survival_time_ms, is_victory, created_at, reset_timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        submission.playerName,
        submission.characterType,
        submission.waveReached,
        submission.enemiesKilled,
        submission.survivalTimeMs,
        submission.isVictory ? 1 : 0,
        Date.now(),
        resetTimestamp
      ).run();

      // Get ranks for each category
      const ranks: Record<string, number | null> = {};

      // Highest wave rank (only current week)
      const waveRank = await db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM leaderboard_entries
        WHERE wave_reached > ? AND reset_timestamp = ?
      `).bind(submission.waveReached, resetTimestamp).first<{ rank: number }>();
      ranks['highest-wave'] = waveRank?.rank || 1;

      // Most kills rank (only current week)
      const killsRank = await db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM leaderboard_entries
        WHERE enemies_killed > ? AND reset_timestamp = ?
      `).bind(submission.enemiesKilled, resetTimestamp).first<{ rank: number }>();
      ranks['most-kills'] = killsRank?.rank || 1;

      // Longest survival rank (only current week)
      const timeRank = await db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM leaderboard_entries
        WHERE survival_time_ms > ? AND reset_timestamp = ?
      `).bind(submission.survivalTimeMs, resetTimestamp).first<{ rank: number }>();
      ranks['longest-survival'] = timeRank?.rank || 1;

      // Fastest victory rank (only if this is a victory, only current week)
      if (submission.isVictory) {
        const victoryRank = await db.prepare(`
          SELECT COUNT(*) + 1 as rank
          FROM leaderboard_entries
          WHERE is_victory = 1 AND survival_time_ms < ? AND reset_timestamp = ?
        `).bind(submission.survivalTimeMs, resetTimestamp).first<{ rank: number }>();
        ranks['fastest-victory'] = victoryRank?.rank || 1;
      } else {
        ranks['fastest-victory'] = null;
      }

      return c.json({
        success: true,
        data: {
          entryId: result.meta.last_row_id,
          ranks,
        },
      });
    } catch (error) {
      console.error('Error submitting leaderboard entry:', error);
      return c.json({ success: false, error: 'Failed to submit entry' }, 500);
    }
  });

  // Get leaderboard by category
  app.get('/api/leaderboard/:category', async (c) => {
    try {
      const db = c.env.prod_d1_cnk;
      const category = c.req.param('category') as LeaderboardCategory;
      const limit = Math.min(parseInt(c.req.query('limit') || '10'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const resetTimestamp = getCurrentResetTimestamp();

      let query = `WHERE reset_timestamp = ${resetTimestamp}`;
      let orderBy = '';

      switch (category) {
        case 'highest-wave':
          orderBy = 'wave_reached DESC, created_at DESC';
          break;
        case 'most-kills':
          orderBy = 'enemies_killed DESC, created_at DESC';
          break;
        case 'longest-survival':
          orderBy = 'survival_time_ms DESC, created_at DESC';
          break;
        case 'fastest-victory':
          query = `WHERE is_victory = 1 AND reset_timestamp = ${resetTimestamp}`;
          orderBy = 'survival_time_ms ASC, created_at DESC';
          break;
        default:
          return c.json({ success: false, error: 'Invalid category' }, 400);
      }

      const entries = await db.prepare(`
        SELECT 
          id,
          player_name,
          character_type,
          wave_reached,
          enemies_killed,
          survival_time_ms,
          is_victory,
          created_at
        FROM leaderboard_entries
        ${query}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all<{
        id: number;
        player_name: string;
        character_type: string;
        wave_reached: number;
        enemies_killed: number;
        survival_time_ms: number;
        is_victory: number;
        created_at: number;
      }>();

      // Get total count
      const countResult = await db.prepare(`
        SELECT COUNT(*) as total
        FROM leaderboard_entries
        ${query}
      `).first<{ total: number }>();

      const leaderboardEntries: LeaderboardEntry[] = entries.results.map(row => ({
        id: row.id,
        playerName: row.player_name,
        characterType: row.character_type as any,
        waveReached: row.wave_reached,
        enemiesKilled: row.enemies_killed,
        survivalTimeMs: row.survival_time_ms,
        isVictory: row.is_victory === 1,
        createdAt: row.created_at,
      }));

      const response: LeaderboardResponse = {
        category,
        entries: leaderboardEntries,
        total: countResult?.total || 0,
      };

      return c.json({ success: true, data: response });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return c.json({ success: false, error: 'Failed to fetch leaderboard' }, 500);
    }
  });

  // Get player's best scores
  app.get('/api/leaderboard/player/:playerName', async (c) => {
    try {
      const db = c.env.prod_d1_cnk;
      const playerName = c.req.param('playerName');

      // Get best scores for each category
      const bestWave = await db.prepare(`
        SELECT wave_reached, enemies_killed, survival_time_ms, is_victory
        FROM leaderboard_entries
        WHERE player_name = ?
        ORDER BY wave_reached DESC
        LIMIT 1
      `).bind(playerName).first();

      const bestKills = await db.prepare(`
        SELECT wave_reached, enemies_killed, survival_time_ms, is_victory
        FROM leaderboard_entries
        WHERE player_name = ?
        ORDER BY enemies_killed DESC
        LIMIT 1
      `).bind(playerName).first();

      const bestTime = await db.prepare(`
        SELECT wave_reached, enemies_killed, survival_time_ms, is_victory
        FROM leaderboard_entries
        WHERE player_name = ?
        ORDER BY survival_time_ms DESC
        LIMIT 1
      `).bind(playerName).first();

      const bestVictory = await db.prepare(`
        SELECT wave_reached, enemies_killed, survival_time_ms, is_victory
        FROM leaderboard_entries
        WHERE player_name = ? AND is_victory = 1
        ORDER BY survival_time_ms ASC
        LIMIT 1
      `).bind(playerName).first();

      const totalGames = await db.prepare(`
        SELECT COUNT(*) as total
        FROM leaderboard_entries
        WHERE player_name = ?
      `).bind(playerName).first<{ total: number }>();

      return c.json({
        success: true,
        data: {
          playerName,
          bestScores: {
            'highest-wave': bestWave,
            'most-kills': bestKills,
            'longest-survival': bestTime,
            'fastest-victory': bestVictory,
          },
          totalGames: totalGames?.total || 0,
        },
      });
    } catch (error) {
      console.error('Error fetching player stats:', error);
      return c.json({ success: false, error: 'Failed to fetch player stats' }, 500);
    }
  });

  // Get next reset timestamp
  app.get('/api/leaderboard/next-reset', async (c) => {
    try {
      const nextReset = getNextResetTimestamp();
      return c.json({
        success: true,
        data: {
          nextResetTimestamp: nextReset,
          currentResetTimestamp: getCurrentResetTimestamp(),
        },
      });
    } catch (error) {
      console.error('Error getting next reset:', error);
      return c.json({ success: false, error: 'Failed to get reset info' }, 500);
    }
  });

  // Manual reset endpoint (for testing/admin purposes)
  app.post('/api/leaderboard/manual-reset', async (c) => {
    try {
      const db = c.env.prod_d1_cnk;
      const { archiveAndResetLeaderboard } = await import('./leaderboardUtils');
      
      await archiveAndResetLeaderboard(db);
      
      return c.json({
        success: true,
        data: {
          message: 'Leaderboard reset completed',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error during manual reset:', error);
      return c.json({ success: false, error: 'Failed to reset leaderboard' }, 500);
    }
  });
}
