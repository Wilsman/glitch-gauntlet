import { Hono } from 'hono';
import type { Env } from './core-utils';
import type { GameMode, LeaderboardSubmission, LeaderboardCategory, LeaderboardEntry, LeaderboardResponse } from '@shared/types';
import { getCurrentResetTimestamp, getNextResetTimestamp } from './leaderboardUtils';
import { validatePlayerName } from '@shared/nameValidation';

// One definition per board: which column ranks it, which direction, and any extra eligibility filter.
// Ranking a new score counts rows strictly better than it within the same mode + weekly period.
interface CategoryDef { column: string; dir: 'ASC' | 'DESC'; filter?: string; eligible?: (s: LeaderboardSubmission) => boolean; value: (s: LeaderboardSubmission) => number | null | undefined }
const CATEGORIES: Record<GameMode, Partial<Record<LeaderboardCategory, CategoryDef>>> = {
  arena: {
    'highest-wave': { column: 'wave_reached', dir: 'DESC', value: s => s.waveReached },
    'most-kills': { column: 'enemies_killed', dir: 'DESC', value: s => s.enemiesKilled },
    'longest-survival': { column: 'survival_time_ms', dir: 'DESC', value: s => s.survivalTimeMs },
    'fastest-victory': { column: 'survival_time_ms', dir: 'ASC', filter: 'is_victory = 1', eligible: s => s.isVictory, value: s => s.survivalTimeMs },
  },
  rift: {
    'most-stages': { column: 'stages_cleared', dir: 'DESC', value: s => s.stagesCleared },
    'most-kills': { column: 'enemies_killed', dir: 'DESC', value: s => s.enemiesKilled },
    'best-combo': { column: 'best_combo', dir: 'DESC', value: s => s.bestCombo },
    'fastest-stage3': { column: 'stage3_time_ms', dir: 'ASC', filter: 'stage3_time_ms IS NOT NULL', eligible: s => s.stage3TimeMs != null, value: s => s.stage3TimeMs },
  },
};

const parseMode = (raw: string | undefined | null): GameMode | null => (raw === undefined || raw === null || raw === '' ? 'arena' : raw === 'rift' || raw === 'arena' ? raw : null);

interface EntryRow {
  id: number; player_name: string; character_type: string; wave_reached: number; enemies_killed: number; survival_time_ms: number;
  is_victory: number; created_at: number; game_mode: string; stages_cleared: number; best_combo: number; stage3_time_ms: number | null;
}

export function leaderboardRoutes(app: Hono<{ Bindings: Env }>) {
  // Submit a leaderboard entry. `gameMode` defaults to 'arena' so older clients keep working.
  app.post('/api/leaderboard/submit', async (c) => {
    try {
      const db = c.env.prod_d1_cnk;
      const submission = await c.req.json<LeaderboardSubmission>();
      const mode = parseMode(submission.gameMode);
      if (!mode) return c.json({ success: false, error: 'Invalid game mode' }, 400);

      if (!submission.playerName || !submission.characterType ||
          submission.waveReached === undefined || submission.enemiesKilled === undefined ||
          submission.survivalTimeMs === undefined) {
        return c.json({ success: false, error: 'Missing required fields' }, 400);
      }

      const { error: nameError, normalizedName } = validatePlayerName(submission.playerName);
      if (nameError) {
        return c.json({ success: false, error: nameError }, 400);
      }

      // Validate reasonable values to prevent cheating
      if (submission.waveReached < 1 || submission.waveReached > 1000 ||
          submission.enemiesKilled < 0 || submission.enemiesKilled > 100000 ||
          submission.survivalTimeMs < 0 || submission.survivalTimeMs > 86400000) {
        return c.json({ success: false, error: 'Invalid stat values' }, 400);
      }
      const stagesCleared = mode === 'rift' ? Math.floor(submission.stagesCleared ?? 0) : 0;
      const bestCombo = mode === 'rift' ? Math.floor(submission.bestCombo ?? 0) : 0;
      const stage3TimeMs = mode === 'rift' && submission.stage3TimeMs != null ? Math.floor(submission.stage3TimeMs) : null;
      if (stagesCleared < 0 || stagesCleared > 500 || bestCombo < 0 || bestCombo > 100000 ||
          (stage3TimeMs !== null && (stage3TimeMs <= 0 || stage3TimeMs > submission.survivalTimeMs || stagesCleared < 3))) {
        return c.json({ success: false, error: 'Invalid stat values' }, 400);
      }
      const normalized: LeaderboardSubmission = { ...submission, gameMode: mode, stagesCleared, bestCombo, stage3TimeMs };

      const resetTimestamp = getCurrentResetTimestamp();
      const result = await db.prepare(`
        INSERT INTO leaderboard_entries
        (player_name, character_type, wave_reached, enemies_killed, survival_time_ms, is_victory, created_at, reset_timestamp,
         game_mode, stages_cleared, best_combo, stage3_time_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        normalizedName,
        submission.characterType,
        submission.waveReached,
        submission.enemiesKilled,
        submission.survivalTimeMs,
        mode === 'arena' && submission.isVictory ? 1 : 0,
        Date.now(),
        resetTimestamp,
        mode,
        stagesCleared,
        bestCombo,
        stage3TimeMs,
      ).run();

      // Rank on every board of this mode (null where the run isn't eligible, e.g. no victory / no stage 3).
      const ranks: Record<string, number | null> = {};
      for (const [category, def] of Object.entries(CATEGORIES[mode]) as [LeaderboardCategory, CategoryDef][]) {
        if (def.eligible && !def.eligible(normalized)) { ranks[category] = null; continue; }
        const value = def.value(normalized) ?? 0;
        const row = await db.prepare(`
          SELECT COUNT(*) + 1 as rank FROM leaderboard_entries
          WHERE game_mode = ? AND reset_timestamp = ? ${def.filter ? `AND ${def.filter}` : ''}
            AND ${def.column} ${def.dir === 'DESC' ? '>' : '<'} ?
        `).bind(mode, resetTimestamp, value).first<{ rank: number }>();
        ranks[category] = row?.rank || 1;
      }

      return c.json({ success: true, data: { entryId: result.meta.last_row_id, ranks } });
    } catch (error) {
      console.error('Error submitting leaderboard entry:', error);
      return c.json({ success: false, error: 'Failed to submit entry' }, 500);
    }
  });

  // Registered before '/:category' so these paths are not swallowed as category names.
  app.get('/api/leaderboard/next-reset', async (c) => {
    try {
      return c.json({
        success: true,
        data: { nextResetTimestamp: getNextResetTimestamp(), currentResetTimestamp: getCurrentResetTimestamp() },
      });
    } catch (error) {
      console.error('Error getting next reset:', error);
      return c.json({ success: false, error: 'Failed to get reset info' }, 500);
    }
  });

  // Player's best score on each board of a mode (?mode=rift|arena, default arena).
  app.get('/api/leaderboard/player/:playerName', async (c) => {
    try {
      const db = c.env.prod_d1_cnk;
      const playerName = c.req.param('playerName');
      const mode = parseMode(c.req.query('mode'));
      if (!mode) return c.json({ success: false, error: 'Invalid game mode' }, 400);

      const bestScores: Record<string, unknown> = {};
      for (const [category, def] of Object.entries(CATEGORIES[mode]) as [LeaderboardCategory, CategoryDef][]) {
        bestScores[category] = await db.prepare(`
          SELECT wave_reached, enemies_killed, survival_time_ms, is_victory, stages_cleared, best_combo, stage3_time_ms
          FROM leaderboard_entries
          WHERE player_name = ? AND game_mode = ? ${def.filter ? `AND ${def.filter}` : ''}
          ORDER BY ${def.column} ${def.dir}
          LIMIT 1
        `).bind(playerName, mode).first();
      }
      const totalGames = await db.prepare(`
        SELECT COUNT(*) as total FROM leaderboard_entries WHERE player_name = ? AND game_mode = ?
      `).bind(playerName, mode).first<{ total: number }>();

      return c.json({ success: true, data: { playerName, gameMode: mode, bestScores, totalGames: totalGames?.total || 0 } });
    } catch (error) {
      console.error('Error fetching player stats:', error);
      return c.json({ success: false, error: 'Failed to fetch player stats' }, 500);
    }
  });

  // Get a board: /api/leaderboard/:category?mode=rift|arena (default arena).
  app.get('/api/leaderboard/:category', async (c) => {
    try {
      const db = c.env.prod_d1_cnk;
      const category = c.req.param('category') as LeaderboardCategory;
      const mode = parseMode(c.req.query('mode'));
      if (!mode) return c.json({ success: false, error: 'Invalid game mode' }, 400);
      const def = CATEGORIES[mode][category];
      if (!def) return c.json({ success: false, error: 'Invalid category' }, 400);
      const limit = Math.max(1, Math.min(parseInt(c.req.query('limit') || '10') || 10, 100));
      const offset = Math.max(0, parseInt(c.req.query('offset') || '0') || 0);
      const where = `WHERE game_mode = ? AND reset_timestamp = ? ${def.filter ? `AND ${def.filter}` : ''}`;
      const resetTimestamp = getCurrentResetTimestamp();

      const entries = await db.prepare(`
        SELECT id, player_name, character_type, wave_reached, enemies_killed, survival_time_ms, is_victory, created_at,
               game_mode, stages_cleared, best_combo, stage3_time_ms
        FROM leaderboard_entries
        ${where}
        ORDER BY ${def.column} ${def.dir}, created_at DESC
        LIMIT ? OFFSET ?
      `).bind(mode, resetTimestamp, limit, offset).all<EntryRow>();

      const countResult = await db.prepare(`SELECT COUNT(*) as total FROM leaderboard_entries ${where}`)
        .bind(mode, resetTimestamp).first<{ total: number }>();

      const leaderboardEntries: LeaderboardEntry[] = entries.results.map(row => ({
        id: row.id,
        playerName: row.player_name,
        characterType: row.character_type as LeaderboardEntry['characterType'],
        waveReached: row.wave_reached,
        enemiesKilled: row.enemies_killed,
        survivalTimeMs: row.survival_time_ms,
        isVictory: row.is_victory === 1,
        createdAt: row.created_at,
        gameMode: row.game_mode === 'rift' ? 'rift' : 'arena',
        stagesCleared: row.stages_cleared,
        bestCombo: row.best_combo,
        stage3TimeMs: row.stage3_time_ms,
      }));

      const response: LeaderboardResponse = { category, entries: leaderboardEntries, total: countResult?.total || 0 };
      return c.json({ success: true, data: response });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return c.json({ success: false, error: 'Failed to fetch leaderboard' }, 500);
    }
  });

  // No HTTP reset endpoint: the weekly archive/reset runs only from the `scheduled` cron handler
  // (worker/index.ts). An unauthenticated route here previously let anyone wipe the current week.
  // To trigger it locally: `wrangler dev --test-scheduled`, then GET /__scheduled?cron=0+8+*+*+1.
}
