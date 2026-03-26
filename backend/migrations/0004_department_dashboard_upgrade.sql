PRAGMA foreign_keys = ON;

ALTER TABLE internships ADD COLUMN is_external INTEGER NOT NULL DEFAULT 0;
ALTER TABLE internships ADD COLUMN is_paid INTEGER NOT NULL DEFAULT 0;
ALTER TABLE internships ADD COLUMN fee INTEGER;
ALTER TABLE internships ADD COLUMN industry_id TEXT;
ALTER TABLE internships ADD COLUMN status TEXT NOT NULL DEFAULT 'OPEN';

ALTER TABLE internship_applications ADD COLUMN is_external INTEGER NOT NULL DEFAULT 0;
ALTER TABLE students ADD COLUMN is_external INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS industry_requests (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL,
  industry_id TEXT NOT NULL,
  internship_title TEXT NOT NULL,
  description TEXT NOT NULL,
  mapped_po TEXT,
  mapped_pso TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  email_type TEXT NOT NULL,
  recipient TEXT,
  status TEXT NOT NULL CHECK (status IN ('FAILED', 'SENT')),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_internships_external_status ON internships(is_external, status);
CREATE INDEX IF NOT EXISTS idx_applications_external_status ON internship_applications(is_external, status);
CREATE INDEX IF NOT EXISTS idx_industry_requests_department ON industry_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_industry_requests_industry ON industry_requests(industry_id, status);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status, created_at);
