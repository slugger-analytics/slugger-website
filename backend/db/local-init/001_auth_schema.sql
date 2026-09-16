-- Minimal schema so local login can complete without cloning RDS.
-- Applied automatically on first `npm run db:local:start` (empty volume).
-- Login still authenticates against production Cognito; this only stores the
-- local users row created after a successful Cognito sign-in.

CREATE TABLE IF NOT EXISTS team (
  team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  cognito_user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role VARCHAR(255) NOT NULL,
  fav_widgets_ids INTEGER[] DEFAULT '{}',
  team_id UUID REFERENCES team(team_id),
  team_role VARCHAR(255),
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pending_developers (
  request_id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  cognito_user_id VARCHAR(255) NOT NULL,
  email_confirmed BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_developers_email
  ON pending_developers (LOWER(email));

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
