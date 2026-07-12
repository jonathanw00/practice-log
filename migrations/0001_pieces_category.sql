-- Generalizes technical_pieces into a shared "pieces" list with a category,
-- so the same picker component/table backs both the Technique > Technical
-- piece chip picker and the new Repertoire pickers (Traditionally notated /
-- Lead sheet), without mixing etudes into the song list or vice versa.
CREATE TABLE pieces_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'technical',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(name, category)
);

INSERT INTO pieces_new (id, name, category, created_at)
  SELECT id, name, 'technical', created_at FROM technical_pieces;

DROP TABLE technical_pieces;
ALTER TABLE pieces_new RENAME TO pieces;

CREATE INDEX IF NOT EXISTS idx_pieces_category ON pieces(category);
