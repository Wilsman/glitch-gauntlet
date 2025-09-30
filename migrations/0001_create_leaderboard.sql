-- Create leaderboard entries table
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  character_type TEXT NOT NULL,
  wave_reached INTEGER NOT NULL,
  enemies_killed INTEGER NOT NULL,
  survival_time_ms INTEGER NOT NULL,
  is_victory INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_wave ON leaderboard_entries(wave_reached DESC);
CREATE INDEX IF NOT EXISTS idx_kills ON leaderboard_entries(enemies_killed DESC);
CREATE INDEX IF NOT EXISTS idx_time ON leaderboard_entries(survival_time_ms DESC);
CREATE INDEX IF NOT EXISTS idx_victory ON leaderboard_entries(is_victory, survival_time_ms ASC);
CREATE INDEX IF NOT EXISTS idx_player ON leaderboard_entries(player_name);
