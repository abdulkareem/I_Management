CREATE TABLE IF NOT EXISTS feedbacks (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  internship_id TEXT NOT NULL,
  ipo_id TEXT NOT NULL,
  rating REAL NOT NULL,
  comments TEXT,
  skills_assessed TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, internship_id)
);

CREATE TABLE IF NOT EXISTS outcomes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  internship_id TEXT NOT NULL,
  po1_score REAL NOT NULL DEFAULT 0,
  po2_score REAL NOT NULL DEFAULT 0,
  po3_score REAL NOT NULL DEFAULT 0,
  po4_score REAL NOT NULL DEFAULT 0,
  attainment_level TEXT NOT NULL DEFAULT 'Low' CHECK (attainment_level IN ('Low', 'Medium', 'High')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, internship_id)
);

ALTER TABLE evaluations ADD COLUMN student_id TEXT;
ALTER TABLE evaluations ADD COLUMN internship_id TEXT;
ALTER TABLE evaluations ADD COLUMN attendance_marks REAL NOT NULL DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN skill_marks REAL NOT NULL DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN report_marks REAL NOT NULL DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN viva_marks REAL NOT NULL DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN discipline_marks REAL NOT NULL DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN total REAL NOT NULL DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN grade TEXT NOT NULL DEFAULT 'F';

CREATE INDEX IF NOT EXISTS idx_feedbacks_student_internship ON feedbacks(student_id, internship_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluations_student_internship_unique ON evaluations(student_id, internship_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_student_internship ON outcomes(student_id, internship_id);
