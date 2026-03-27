PRAGMA foreign_keys = ON;

-- ================================================
-- Internship Platform V2 (Cloudflare D1 / SQLite)
-- ================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','DEPARTMENT','IPO','STUDENT')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  college_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  business_activity TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS internship_ideas (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  workflow_state TEXT NOT NULL CHECK (workflow_state IN (
    'IDEA_SUBMITTED','IPO_REVIEW','ACCEPTED','REJECTED','PUBLISHED','STUDENT_APPLY','ALLOCATED','COMPLETED','EVALUATED'
  )),
  submitted_by_user_id TEXT NOT NULL,
  reviewed_by_user_id TEXT,
  review_note TEXT,
  accepted_at TEXT,
  rejected_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
  FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ideas_tenant_state ON internship_ideas(tenant_id, workflow_state);
CREATE INDEX IF NOT EXISTS idx_ideas_dept_org ON internship_ideas(department_id, organization_id);

CREATE TABLE IF NOT EXISTS internships (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  idea_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  workflow_state TEXT NOT NULL CHECK (workflow_state IN (
    'ACCEPTED','PUBLISHED','STUDENT_APPLY','ALLOCATED','COMPLETED','EVALUATED'
  )),
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0,1)),
  total_vacancy INTEGER NOT NULL CHECK (total_vacancy >= 0),
  filled_vacancy INTEGER NOT NULL DEFAULT 0 CHECK (filled_vacancy >= 0),
  remaining_vacancy INTEGER NOT NULL CHECK (remaining_vacancy >= 0),
  version INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (idea_id) REFERENCES internship_ideas(id) ON DELETE RESTRICT,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
  CHECK (total_vacancy = filled_vacancy + remaining_vacancy)
);

CREATE INDEX IF NOT EXISTS idx_internships_visibility ON internships(tenant_id, is_published, workflow_state);
CREATE INDEX IF NOT EXISTS idx_internships_org ON internships(organization_id, workflow_state);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  internship_id TEXT NOT NULL,
  student_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','WITHDRAWN','SHORTLISTED','REJECTED','ALLOCATED')),
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by_user_id TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
  FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (internship_id, student_user_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_tenant_status ON applications(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_student ON applications(student_user_id, status);

CREATE TABLE IF NOT EXISTS allocations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  internship_id TEXT NOT NULL,
  application_id TEXT NOT NULL,
  student_user_id TEXT NOT NULL,
  allocated_by_user_id TEXT NOT NULL,
  allocation_status TEXT NOT NULL DEFAULT 'ALLOCATED' CHECK (allocation_status IN ('ALLOCATED','IN_PROGRESS','COMPLETED','CANCELLED')),
  allocated_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE RESTRICT,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE RESTRICT,
  FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (allocated_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (application_id)
);

CREATE INDEX IF NOT EXISTS idx_allocations_tenant_status ON allocations(tenant_id, allocation_status);

CREATE TABLE IF NOT EXISTS workflow_transitions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('INTERNSHIP_IDEA','INTERNSHIP','APPLICATION','ALLOCATION')),
  entity_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  reason TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_transitions_entity ON workflow_transitions(entity_type, entity_id, created_at);

CREATE TABLE IF NOT EXISTS evaluation_schemes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  pass_threshold REAL NOT NULL,
  formula_text TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  UNIQUE (tenant_id, department_id, version)
);

CREATE TABLE IF NOT EXISTS evaluation_components (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  scheme_id TEXT NOT NULL,
  component_key TEXT NOT NULL,
  component_name TEXT NOT NULL,
  max_marks REAL NOT NULL,
  weight REAL NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scheme_id) REFERENCES evaluation_schemes(id) ON DELETE CASCADE,
  UNIQUE (scheme_id, component_key)
);

CREATE TABLE IF NOT EXISTS evaluation_results (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  allocation_id TEXT NOT NULL,
  scheme_id TEXT NOT NULL,
  calculated_score REAL NOT NULL,
  attainment_level TEXT NOT NULL CHECK (attainment_level IN ('L1','L2','L3')),
  formula_snapshot TEXT NOT NULL,
  calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (allocation_id) REFERENCES allocations(id) ON DELETE CASCADE,
  FOREIGN KEY (scheme_id) REFERENCES evaluation_schemes(id) ON DELETE RESTRICT,
  UNIQUE (allocation_id)
);

CREATE TABLE IF NOT EXISTS evaluation_result_lines (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  result_id TEXT NOT NULL,
  component_id TEXT NOT NULL,
  obtained_marks REAL NOT NULL,
  normalized_score REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (result_id) REFERENCES evaluation_results(id) ON DELETE CASCADE,
  FOREIGN KEY (component_id) REFERENCES evaluation_components(id) ON DELETE RESTRICT,
  UNIQUE (result_id, component_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('IN_APP','EMAIL')),
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSED','FAILED')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_events(status, next_attempt_at);
