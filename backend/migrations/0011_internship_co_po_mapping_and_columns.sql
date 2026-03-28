ALTER TABLE internships ADD COLUMN internship_po TEXT;
ALTER TABLE internships ADD COLUMN internship_co TEXT;

CREATE TABLE IF NOT EXISTS internship_co_mapping (
  id TEXT PRIMARY KEY,
  internship_id TEXT NOT NULL,
  co_code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
  UNIQUE (internship_id, co_code)
);

CREATE TABLE IF NOT EXISTS internship_po_mapping (
  id TEXT PRIMARY KEY,
  internship_id TEXT NOT NULL,
  po_code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
  UNIQUE (internship_id, po_code)
);

CREATE INDEX IF NOT EXISTS idx_internship_co_mapping_internship ON internship_co_mapping(internship_id);
CREATE INDEX IF NOT EXISTS idx_internship_po_mapping_internship ON internship_po_mapping(internship_id);
