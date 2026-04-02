BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'role' AND e.enumlabel = 'IPO'
    ) THEN
      ALTER TYPE role ADD VALUE 'IPO';
    END IF;
  END IF;
END $$;

ALTER TABLE IF EXISTS departments
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS coordinator_mobile TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS colleges
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS university TEXT,
  ADD COLUMN IF NOT EXISTS mobile TEXT,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT;

ALTER TABLE IF EXISTS industries
  ADD COLUMN IF NOT EXISTS business_activity TEXT,
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS company_address TEXT,
  ADD COLUMN IF NOT EXISTS contact_number TEXT,
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS registration_year INTEGER,
  ADD COLUMN IF NOT EXISTS supervisor_name TEXT;

ALTER TABLE IF EXISTS internships
  ADD COLUMN IF NOT EXISTS ipo_id TEXT,
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fee INTEGER,
  ADD COLUMN IF NOT EXISTS internship_category TEXT NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS vacancy INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS student_visibility BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS industry_request_id TEXT,
  ADD COLUMN IF NOT EXISTS stipend_amount INTEGER,
  ADD COLUMN IF NOT EXISTS stipend_duration TEXT,
  ADD COLUMN IF NOT EXISTS minimum_days INTEGER,
  ADD COLUMN IF NOT EXISTS maximum_days INTEGER,
  ADD COLUMN IF NOT EXISTS requirements TEXT,
  ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS programme TEXT,
  ADD COLUMN IF NOT EXISTS mapped_co JSONB,
  ADD COLUMN IF NOT EXISTS mapped_po JSONB,
  ADD COLUMN IF NOT EXISTS mapped_pso JSONB,
  ADD COLUMN IF NOT EXISTS gender_preference TEXT NOT NULL DEFAULT 'BOTH';

CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  program_outcomes JSONB,
  program_specific_outcomes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, name)
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  university_reg_number TEXT,
  college_id TEXT NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
  password TEXT NOT NULL,
  sex TEXT NOT NULL DEFAULT 'MALE',
  is_external BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  whatsapp TEXT,
  college TEXT,
  university TEXT,
  reg_number TEXT,
  department TEXT,
  password TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS internship_applications (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  external_student_id TEXT REFERENCES external_students(id) ON DELETE CASCADE,
  internship_id TEXT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  is_external BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by_industry_id TEXT REFERENCES industries(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  completed_at TIMESTAMPTZ,
  industry_feedback TEXT,
  industry_score REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_one_student_type CHECK (
    (student_id IS NOT NULL AND external_student_id IS NULL)
    OR (student_id IS NULL AND external_student_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_student_internship
  ON internship_applications(student_id, internship_id)
  WHERE student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_external_student_internship
  ON internship_applications(external_student_id, internship_id)
  WHERE external_student_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS college_industry_links (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  industry_id TEXT NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'requested',
  requested_by TEXT,
  requested_at TIMESTAMPTZ,
  reviewed_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (college_id, industry_id)
);

CREATE TABLE IF NOT EXISTS internship_performance_feedback (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL UNIQUE REFERENCES internship_applications(id) ON DELETE CASCADE,
  internship_id TEXT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  student_id TEXT,
  external_student_id TEXT,
  industry_id TEXT NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
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
  overall_performance TEXT NOT NULL,
  remarks TEXT,
  recommendation TEXT,
  supervisor_signature TEXT,
  feedback_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_overall_performance CHECK (overall_performance IN ('Excellent','Good','Average','Poor'))
);

CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_colleges_status_active ON colleges(status, is_active);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);
CREATE INDEX IF NOT EXISTS idx_industries_status_active ON industries(status, is_active);
CREATE INDEX IF NOT EXISTS idx_internships_external_status ON internships(is_external, status);
CREATE INDEX IF NOT EXISTS idx_internship_applications_internship_status ON internship_applications(internship_id, status);
CREATE INDEX IF NOT EXISTS idx_programs_department_id ON programs(department_id);
CREATE INDEX IF NOT EXISTS idx_students_college_department ON students(college_id, department_id);
CREATE INDEX IF NOT EXISTS idx_logs_entity ON logs(entity, timestamp);

COMMIT;
