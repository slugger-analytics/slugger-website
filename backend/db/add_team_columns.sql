-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(team_id),
ADD COLUMN IF NOT EXISTS team_role VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Fix the last_name column typo in your schema
ALTER TABLE users 
RENAME COLUMN lat_name TO last_name;