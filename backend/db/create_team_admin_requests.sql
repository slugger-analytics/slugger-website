-- Create table for team admin requests
CREATE TABLE IF NOT EXISTS team_admin_requests (
  request_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES team(team_id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, team_id)
);

-- Create index for faster lookups by status
CREATE INDEX IF NOT EXISTS idx_team_admin_requests_status ON team_admin_requests(status);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_team_admin_requests_user_id ON team_admin_requests(user_id);
