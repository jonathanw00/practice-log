-- Adds a per-session "recorded myself" flag, for the class practice-chart
-- Recording column. Boolean stored as 0/1; existing rows default to 0.
ALTER TABLE sessions ADD COLUMN recording INTEGER DEFAULT 0;
