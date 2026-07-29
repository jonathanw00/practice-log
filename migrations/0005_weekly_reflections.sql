-- Weekly Summary & Instructor Communication from the instructor's template.
-- One row per calendar week, keyed by the Sunday's date (week_start), matching
-- the Sun-Sat ranges the "Last week" / "This week" export buttons already use.
-- Total hours and categories are computed by the report, so only the
-- reflective fields are stored here.
CREATE TABLE IF NOT EXISTS weekly_reflections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL UNIQUE,       -- the Sunday's date, e.g. '2026-07-26'
  key_achievement TEXT,
  primary_challenge TEXT,
  measures_for_review TEXT,
  questions_for_instructor TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
