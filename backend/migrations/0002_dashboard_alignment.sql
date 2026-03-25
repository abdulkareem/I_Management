PRAGMA foreign_keys = ON;

ALTER TABLE departments ADD COLUMN is_first_login INTEGER NOT NULL DEFAULT 1 CHECK (is_first_login IN (0,1));

CREATE TABLE IF NOT EXISTS college_industry_links_new (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  industry_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed','requested','approved','rejected')),
  requested_by TEXT CHECK (requested_by IN ('college', 'industry')),
  reviewed_by_admin_id TEXT,
  reviewed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
  FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  UNIQUE (college_id, industry_id)
);

INSERT INTO college_industry_links_new (
  id, college_id, industry_id, status, requested_by, reviewed_by_admin_id, reviewed_at, notes, created_at, updated_at
)
SELECT
  id,
  college_id,
  industry_id,
  CASE
    WHEN status = 'approved' THEN 'active'
    WHEN status = 'rejected' THEN 'removed'
    ELSE status
  END,
  requested_by,
  reviewed_by_admin_id,
  reviewed_at,
  notes,
  created_at,
  updated_at
FROM college_industry_links;

DROP TABLE college_industry_links;
ALTER TABLE college_industry_links_new RENAME TO college_industry_links;

CREATE INDEX IF NOT EXISTS idx_college_industry_links_college_id ON college_industry_links(college_id);
CREATE INDEX IF NOT EXISTS idx_college_industry_links_industry_id ON college_industry_links(industry_id);
CREATE INDEX IF NOT EXISTS idx_college_industry_links_status ON college_industry_links(status);

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
