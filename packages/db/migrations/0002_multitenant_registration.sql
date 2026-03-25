PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS colleges (
  id TEXT PRIMARY KEY,
  collegeName TEXT NOT NULL,
  address TEXT,
  university TEXT,
  mobile TEXT,
  coordinatorName TEXT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  collegeId TEXT NOT NULL,
  FOREIGN KEY (collegeId) REFERENCES colleges(id)
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  departmentId TEXT NOT NULL,
  FOREIGN KEY (departmentId) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  studentName TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  universityRegNumber TEXT NOT NULL,
  programme TEXT NOT NULL,
  collegeId TEXT NOT NULL,
  departmentId TEXT NOT NULL,
  courseId TEXT NOT NULL,
  FOREIGN KEY (collegeId) REFERENCES colleges(id),
  FOREIGN KEY (departmentId) REFERENCES departments(id),
  FOREIGN KEY (courseId) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS industry_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS industries (
  id TEXT PRIMARY KEY,
  companyName TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  businessActivity TEXT NOT NULL,
  industryTypeId TEXT NOT NULL,
  FOREIGN KEY (industryTypeId) REFERENCES industry_types(id)
);

CREATE INDEX IF NOT EXISTS idx_colleges_email ON colleges(email);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_departments_collegeId ON departments(collegeId);
CREATE INDEX IF NOT EXISTS idx_courses_departmentId ON courses(departmentId);
CREATE INDEX IF NOT EXISTS idx_industries_email ON industries(email);
CREATE INDEX IF NOT EXISTS idx_industries_typeId ON industries(industryTypeId);
