CREATE TABLE IF NOT EXISTS internship_performance_feedback (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL UNIQUE,
  internship_id TEXT NOT NULL,
  student_id TEXT,
  external_student_id TEXT,
  industry_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  register_number TEXT NOT NULL,
  organization TEXT NOT NULL,
  duration TEXT NOT NULL,
  supervisor_name TEXT NOT NULL,
  attendance_punctuality INTEGER NOT NULL,
  technical_skills INTEGER NOT NULL,
  problem_solving_ability INTEGER NOT NULL,
  communication_skills INTEGER NOT NULL,
  teamwork INTEGER NOT NULL,
  professional_ethics INTEGER NOT NULL,
  overall_performance TEXT NOT NULL CHECK (overall_performance IN ('Excellent', 'Good', 'Average', 'Poor')),
  remarks TEXT,
  recommendation TEXT,
  supervisor_signature TEXT,
  feedback_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES internship_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
  FOREIGN KEY (external_student_id) REFERENCES external_students(id) ON DELETE SET NULL,
  FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_perf_feedback_industry ON internship_performance_feedback(industry_id, feedback_date);
CREATE INDEX IF NOT EXISTS idx_perf_feedback_internship ON internship_performance_feedback(internship_id);
