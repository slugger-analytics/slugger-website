-- Create a lightweight players table for SuperWidget parameterized API testing
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  player_id VARCHAR(64) UNIQUE,
  player_name VARCHAR(255),
  team_name VARCHAR(255),
  position VARCHAR(16),
  -- batting metrics
  avg NUMERIC(5,3),
  hr INTEGER,
  rbi INTEGER,
  runs INTEGER,
  hits INTEGER,
  sb INTEGER,
  -- pitching metrics
  era NUMERIC(4,2),
  so INTEGER,
  ip NUMERIC(6,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Simple index to speed up team lookups
CREATE INDEX IF NOT EXISTS idx_players_team_name ON players(team_name);
