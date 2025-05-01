-- Create widget_team_access table if it doesn't exist
CREATE TABLE IF NOT EXISTS widget_team_access (
  id SERIAL PRIMARY KEY,
  widget_id INTEGER NOT NULL,
  team_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT widget_team_unique UNIQUE(widget_id, team_id)
);

-- Add foreign key constraints if the referenced tables exist
DO $$
BEGIN
  -- Check if widgets table exists and add foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'widgets') THEN
    BEGIN
      ALTER TABLE widget_team_access 
      ADD CONSTRAINT fk_widget 
      FOREIGN KEY (widget_id) 
      REFERENCES widgets(widget_id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;

  -- Check if team table exists and add foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team') THEN
    BEGIN
      ALTER TABLE widget_team_access 
      ADD CONSTRAINT fk_team 
      FOREIGN KEY (team_id) 
      REFERENCES team(team_id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END
$$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_widget_team_access_widget_id ON widget_team_access(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_team_access_team_id ON widget_team_access(team_id); 