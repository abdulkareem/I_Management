PRAGMA foreign_keys = ON;

-- =========================================================
-- Internship Management Platform - Production Schema (D1)
-- =========================================================

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  verified_at TEXT,
  CHECK (length(otp) BETWEEN 4 AND 10)
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_verified ON otp_codes(email, verified);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);

CREATE TABLE IF NOT EXISTS colleges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  university TEXT,
  mobile TEXT,
  coordinator_name TEXT NOT NULL,
  coordinator_email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  approved_by_admin_id TEXT,
  approved_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (approved_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_colleges_status_active ON colleges(status, is_active);
CREATE INDEX IF NOT EXISTS idx_colleges_university ON colleges(university);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  name TEXT NOT NULL,
  coordinator_name TEXT NOT NULL,
  coordinator_email TEXT NOT NULL UNIQUE,
  coordinator_mobile TEXT,
  password TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  activated_by_college_id TEXT,
  activated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
  FOREIGN KEY (activated_by_college_id) REFERENCES colleges(id) ON DELETE SET NULL,
  UNIQUE (college_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_college_id ON departments(college_id);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);

CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL,
  name TEXT NOT NULL,
  program_outcomes TEXT,
  program_specific_outcomes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  UNIQUE (department_id, name)
);

CREATE INDEX IF NOT EXISTS idx_programs_department_id ON programs(department_id);

CREATE TABLE IF NOT EXISTS industry_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS industries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  business_activity TEXT NOT NULL,
  industry_type_id TEXT NOT NULL,
  password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  approved_by_admin_id TEXT,
  approved_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (industry_type_id) REFERENCES industry_types(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_industries_status_active ON industries(status, is_active);
CREATE INDEX IF NOT EXISTS idx_industries_type_id ON industries(industry_type_id);

CREATE TABLE IF NOT EXISTS college_industry_links (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  industry_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected')),
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

CREATE INDEX IF NOT EXISTS idx_college_industry_links_college_id ON college_industry_links(college_id);
CREATE INDEX IF NOT EXISTS idx_college_industry_links_industry_id ON college_industry_links(industry_id);
CREATE INDEX IF NOT EXISTS idx_college_industry_links_status ON college_industry_links(status);

CREATE TABLE IF NOT EXISTS internships (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  po_mapping TEXT,
  pso_mapping TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_internships_department_id ON internships(department_id);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  university_reg_number TEXT,
  college_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  program_id TEXT NOT NULL,
  password TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE RESTRICT,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_students_college_department ON students(college_id, department_id);
CREATE INDEX IF NOT EXISTS idx_students_program_id ON students(program_id);

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
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS internship_applications (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  external_student_id TEXT,
  internship_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  reviewed_by_industry_id TEXT,
  reviewed_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (external_student_id) REFERENCES external_students(id) ON DELETE CASCADE,
  FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by_industry_id) REFERENCES industries(id) ON DELETE SET NULL,
  CHECK (
    (student_id IS NOT NULL AND external_student_id IS NULL) OR
    (student_id IS NULL AND external_student_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_student_internship
  ON internship_applications(student_id, internship_id)
  WHERE student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_external_student_internship
  ON internship_applications(external_student_id, internship_id)
  WHERE external_student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_internship_applications_internship_status
  ON internship_applications(internship_id, status);

CREATE TABLE IF NOT EXISTS industry_internships (
  id TEXT PRIMARY KEY,
  industry_id TEXT NOT NULL,
  title TEXT NOT NULL,
  criteria TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_industry_internships_industry_id ON industry_internships(industry_id);

-- Unified role-to-entity mapping for RBAC resolution in Worker middleware.
CREATE TABLE IF NOT EXISTS auth_identities (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'college', 'department', 'industry', 'student', 'external_student')),
  entity_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(role, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_identities_role_entity ON auth_identities(role, entity_id);

CREATE TABLE IF NOT EXISTS approval_audit_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('college', 'industry', 'department_link', 'college_industry_link')),
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('requested', 'approved', 'rejected', 'activated', 'deactivated', 'deleted')),
  previous_status TEXT,
  new_status TEXT,
  actor_admin_id TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (actor_admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_approval_audit_entity ON approval_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_actor ON approval_audit_log(actor_admin_id);
