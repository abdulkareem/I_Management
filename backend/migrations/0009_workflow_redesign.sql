PRAGMA foreign_keys = ON;

ALTER TABLE internships ADD COLUMN ipo_id TEXT;
ALTER TABLE internships ADD COLUMN college_id TEXT;
ALTER TABLE internships ADD COLUMN duration TEXT;
ALTER TABLE internships ADD COLUMN total_vacancy INTEGER NOT NULL DEFAULT 0;
ALTER TABLE internships ADD COLUMN filled_vacancy INTEGER NOT NULL DEFAULT 0;
ALTER TABLE internships ADD COLUMN remaining_vacancy INTEGER NOT NULL DEFAULT 0;
ALTER TABLE internships ADD COLUMN requirements TEXT;
ALTER TABLE internships ADD COLUMN published INTEGER NOT NULL DEFAULT 0;

UPDATE internships
SET total_vacancy = CASE WHEN total_vacancy IS NULL OR total_vacancy < 0 THEN 0 ELSE total_vacancy END,
    filled_vacancy = CASE WHEN filled_vacancy IS NULL OR filled_vacancy < 0 THEN 0 ELSE filled_vacancy END,
    remaining_vacancy = CASE
      WHEN remaining_vacancy IS NULL THEN MAX(total_vacancy - filled_vacancy, 0)
      WHEN remaining_vacancy < 0 THEN 0
      ELSE remaining_vacancy
    END,
    status = CASE WHEN status IN ('DRAFT','SENT_TO_DEPT','ACCEPTED','PUBLISHED','CLOSED') THEN status ELSE 'DRAFT' END;

CREATE TABLE IF NOT EXISTS internship_mappings (
  id TEXT PRIMARY KEY,
  internship_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  po_ids TEXT NOT NULL,
  pso_ids TEXT NOT NULL,
  co_ids TEXT NOT NULL,
  internship_po TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  UNIQUE (internship_id, department_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  internship_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'ACCEPTED', 'REJECTED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
  UNIQUE(student_id, internship_id)
);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL UNIQUE,
  marks REAL NOT NULL,
  feedback TEXT,
  co_po_score TEXT NOT NULL,
  evaluated_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS internship_feedback (
  id TEXT PRIMARY KEY,
  internship_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  ipo_feedback TEXT NOT NULL,
  rating REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(internship_id, student_id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'DEPARTMENT', 'IPO', 'STUDENT')),
  linked_entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workflow_internships_college_dept_status ON internships(college_id, department_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_internships_ipo ON internships(ipo_id);
CREATE INDEX IF NOT EXISTS idx_workflow_applications_internship ON applications(internship_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_feedback_internship ON internship_feedback(internship_id);
