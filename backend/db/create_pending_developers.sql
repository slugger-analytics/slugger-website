-- Pending widget developer signups awaiting email confirmation and admin approval.
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

CREATE INDEX IF NOT EXISTS idx_pending_developers_status
  ON pending_developers (status);

CREATE INDEX IF NOT EXISTS idx_pending_developers_email_confirmed
  ON pending_developers (email_confirmed);
