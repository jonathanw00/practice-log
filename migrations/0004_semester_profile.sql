-- Single-row table holding the semester overview from the instructor's
-- template: which semester, who's teaching, the semester goals, and the
-- technical requirements. Assigned pieces are NOT stored here — they're the
-- `assigned` flag on the pieces table (migrations/0003_pieces_assigned.sql),
-- so there's only one list of pieces in the app.
-- The CHECK (id = 1) is what makes it single-row: every write is an upsert
-- against id 1.
CREATE TABLE IF NOT EXISTS semester_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  semester_label TEXT,
  instructor_name TEXT,
  goals TEXT,
  technical_requirements TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
