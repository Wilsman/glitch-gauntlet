-- Add reset_timestamp to track weekly periods
ALTER TABLE leaderboard_entries ADD COLUMN reset_timestamp INTEGER NOT NULL DEFAULT 0;

-- Create index for efficient filtering by reset period
CREATE INDEX IF NOT EXISTS idx_reset_timestamp ON leaderboard_entries(reset_timestamp DESC);

-- Create archive table for historical leaderboard data
CREATE TABLE IF NOT EXISTS leaderboard_archive (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  character_type TEXT NOT NULL,
  wave_reached INTEGER NOT NULL,
  enemies_killed INTEGER NOT NULL,
  survival_time_ms INTEGER NOT NULL,
  is_victory INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  reset_timestamp INTEGER NOT NULL,
  archived_at INTEGER NOT NULL
);

-- Create indexes for archive table
CREATE INDEX IF NOT EXISTS idx_archive_reset ON leaderboard_archive(reset_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_archive_player ON leaderboard_archive(player_name);
