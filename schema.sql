CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  session_num INTEGER DEFAULT 1,
  energy TEXT DEFAULT 'good',
  win TEXT,
  technique_json TEXT,
  repertoire_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);
