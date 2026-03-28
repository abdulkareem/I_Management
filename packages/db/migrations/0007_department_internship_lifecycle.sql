-- Department internship lifecycle + outcome mapping
ALTER TABLE internships ADD COLUMN type TEXT NOT NULL DEFAULT 'external';
ALTER TABLE internships ADD COLUMN duration_hours INTEGER;
ALTER TABLE internships ADD COLUMN internship_type TEXT;
ALTER TABLE internships ADD COLUMN fee_amount REAL;
ALTER TABLE internships ADD COLUMN stipend_frequency TEXT;
ALTER TABLE internships ADD COLUMN gender TEXT;

CREATE TABLE IF NOT EXISTS internship_outcome_mappings (
  id TEXT PRIMARY KEY,
  internship_id TEXT NOT NULL,
  po_id TEXT,
  pso_id TEXT,
  co_id TEXT,
  ipo_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_internship_outcome_map_internship_id
  ON internship_outcome_mappings(internship_id);
