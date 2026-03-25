PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS internship_allocations (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  external_student_id TEXT,
  industry_id TEXT NOT NULL,
  internship_id TEXT NOT NULL,
  project_details TEXT,
  status TEXT NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated','active','completed','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (external_student_id) REFERENCES external_students(id) ON DELETE CASCADE,
  FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE,
  FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
  CHECK (
    (student_id IS NOT NULL AND external_student_id IS NULL) OR
    (student_id IS NULL AND external_student_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_internship_allocations_student ON internship_allocations(student_id);
CREATE INDEX IF NOT EXISTS idx_internship_allocations_external_student ON internship_allocations(external_student_id);
CREATE INDEX IF NOT EXISTS idx_internship_allocations_industry ON internship_allocations(industry_id);
