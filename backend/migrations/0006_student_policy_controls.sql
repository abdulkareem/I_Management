PRAGMA foreign_keys = ON;

ALTER TABLE internship_applications ADD COLUMN completed_at TEXT;
CREATE INDEX IF NOT EXISTS idx_internship_applications_student_status_completed
  ON internship_applications(student_id, status, completed_at);
