ALTER TABLE internships ADD COLUMN internship_po TEXT;
ALTER TABLE internships ADD COLUMN internship_co TEXT;
ALTER TABLE internships ADD COLUMN created_by TEXT NOT NULL DEFAULT 'INDUSTRY';
ALTER TABLE internships ADD COLUMN is_external INTEGER NOT NULL DEFAULT 0;
ALTER TABLE internships ADD COLUMN available_vacancy INTEGER NOT NULL DEFAULT 0;

UPDATE internships
SET available_vacancy = MAX(COALESCE(total_vacancy, vacancy, 0) - COALESCE(filled_vacancy, 0), 0)
WHERE available_vacancy IS NULL OR available_vacancy < 0;

CREATE TABLE IF NOT EXISTS compliance_violations (
  id TEXT PRIMARY KEY,
  rule_code TEXT NOT NULL,
  message TEXT NOT NULL,
  internship_id TEXT,
  student_id TEXT,
  college_id TEXT,
  level TEXT NOT NULL DEFAULT 'ERROR' CHECK (level IN ('INFO', 'WARNING', 'ERROR')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE SET NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_compliance_violations_college ON compliance_violations(college_id, created_at);
