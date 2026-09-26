-- Game modes: 'rift' (open world, the main mode) and 'arena' (classic waves).
-- Existing rows predate the Rift and are all arena runs.
ALTER TABLE leaderboard_entries ADD COLUMN game_mode TEXT NOT NULL DEFAULT 'arena';
-- Rift-only stats (arena rows keep the defaults).
ALTER TABLE leaderboard_entries ADD COLUMN stages_cleared INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leaderboard_entries ADD COLUMN best_combo INTEGER NOT NULL DEFAULT 0;
-- Play time (pause/shop time excluded) when stage 3 was cleared; NULL if the run never got there.
ALTER TABLE leaderboard_entries ADD COLUMN stage3_time_ms INTEGER;

ALTER TABLE leaderboard_archive ADD COLUMN game_mode TEXT NOT NULL DEFAULT 'arena';
ALTER TABLE leaderboard_archive ADD COLUMN stages_cleared INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leaderboard_archive ADD COLUMN best_combo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leaderboard_archive ADD COLUMN stage3_time_ms INTEGER;

-- Every board query filters by mode + weekly period, then orders by one stat.
CREATE INDEX IF NOT EXISTS idx_mode_period ON leaderboard_entries(game_mode, reset_timestamp);
CREATE INDEX IF NOT EXISTS idx_mode_stages ON leaderboard_entries(game_mode, reset_timestamp, stages_cleared DESC);
CREATE INDEX IF NOT EXISTS idx_mode_combo ON leaderboard_entries(game_mode, reset_timestamp, best_combo DESC);
CREATE INDEX IF NOT EXISTS idx_mode_stage3 ON leaderboard_entries(game_mode, reset_timestamp, stage3_time_ms ASC);
CREATE INDEX IF NOT EXISTS idx_archive_mode ON leaderboard_archive(game_mode, reset_timestamp DESC);
