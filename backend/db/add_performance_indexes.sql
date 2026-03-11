-- Performance Optimization: Add Indexes for Widget Fetch Operations
-- These indexes significantly speed up the most frequently executed queries

-- Index for widgets table filtering by visibility and status
CREATE INDEX IF NOT EXISTS idx_widgets_visibility_status 
ON widgets(visibility, status);

-- Index for widget lookups by widget_id (if not already primary key)
CREATE INDEX IF NOT EXISTS idx_widgets_id 
ON widgets(widget_id);

-- Index for user lookups in getAllWidgets query
CREATE INDEX IF NOT EXISTS idx_users_id 
ON users(user_id);

-- Index for user_widget relationships (developer assignments)
CREATE INDEX IF NOT EXISTS idx_user_widget_widget_id 
ON user_widget(widget_id);

CREATE INDEX IF NOT EXISTS idx_user_widget_user_id 
ON user_widget(user_id);

-- Composite index for user_widget lookups
CREATE INDEX IF NOT EXISTS idx_user_widget_composite 
ON user_widget(widget_id, user_id);

-- Index for widget_team_access queries
CREATE INDEX IF NOT EXISTS idx_widget_team_access_widget_id 
ON widget_team_access(widget_id);

CREATE INDEX IF NOT EXISTS idx_widget_team_access_team_id 
ON widget_team_access(team_id);

-- Index for widget_categories lookups
CREATE INDEX IF NOT EXISTS idx_widget_categories_widget_id 
ON widget_categories(widget_id);

CREATE INDEX IF NOT EXISTS idx_widget_categories_category_id 
ON widget_categories(category_id);

-- Index for widget_metrics queries (commonly filtered by widget_id and timeframe)
CREATE INDEX IF NOT EXISTS idx_widget_metrics_widget_id 
ON widget_metrics(widget_id);

CREATE INDEX IF NOT EXISTS idx_widget_metrics_composite 
ON widget_metrics(widget_id, timeframe_type);

-- Index for user lookups by team_id and role
CREATE INDEX IF NOT EXISTS idx_users_team_id 
ON users(team_id, role);

-- Index for scores queries (frequently filtered by date)
CREATE INDEX IF NOT EXISTS idx_scores_date 
ON scores(date DESC NULLS LAST);

-- Index for league/standings queries
CREATE INDEX IF NOT EXISTS idx_team_name 
ON teams(team_name);

-- Index for requests table (pending widget status)
CREATE INDEX IF NOT EXISTS idx_requests_status 
ON requests(status);

CREATE INDEX IF NOT EXISTS idx_requests_user_id 
ON requests(user_id);

-- Analyze tables to update query planner statistics
ANALYZE widgets;
ANALYZE users;
ANALYZE user_widget;
ANALYZE widget_team_access;
ANALYZE widget_categories;
ANALYZE widget_metrics;
ANALYZE teams;
ANALYZE scores;
ANALYZE requests;
