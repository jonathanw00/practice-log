CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  session_num INTEGER DEFAULT 1,
  energy TEXT DEFAULT 'good',
  recording INTEGER DEFAULT 0,
  win TEXT,
  technique_json TEXT,
  repertoire_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);

-- Shared list backing the Technical piece / Traditionally notated / Lead
-- sheet chip pickers; category keeps the pickers from mixing etudes into
-- the song list or vice versa. See migrations/0001_pieces_category.sql and
-- migrations/0003_pieces_assigned.sql.
CREATE TABLE IF NOT EXISTS pieces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'technical',
  assigned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(name, category)
);
CREATE INDEX IF NOT EXISTS idx_pieces_category ON pieces(category);

-- Semester overview (goals, instructor, technical requirements). Single row,
-- enforced by CHECK (id = 1). Assigned pieces live on pieces.assigned rather
-- than here, so there's one list of pieces in the app.
-- See migrations/0004_semester_profile.sql.
CREATE TABLE IF NOT EXISTS semester_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  semester_label TEXT,
  instructor_name TEXT,
  goals TEXT,
  technical_requirements TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
