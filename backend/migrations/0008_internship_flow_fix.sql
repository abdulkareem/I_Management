PRAGMA foreign_keys = ON;

ALTER TABLE internships ADD COLUMN student_visibility INTEGER NOT NULL DEFAULT 0;
ALTER TABLE internships ADD COLUMN programme TEXT;

UPDATE internships
SET status = 'DRAFT'
WHERE status IS NULL OR trim(status) = '';

UPDATE internships
SET student_visibility = 0
WHERE student_visibility IS NULL;

CREATE INDEX IF NOT EXISTS idx_internships_status_visibility
  ON internships(status, student_visibility);
