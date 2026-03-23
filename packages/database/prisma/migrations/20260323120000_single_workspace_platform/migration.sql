-- CreateEnum
CREATE TYPE "Role" AS ENUM ('COLLEGE_COORDINATOR', 'INDUSTRY', 'STUDENT');
CREATE TYPE "MouStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'ACCEPTED', 'REJECTED');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "College" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "emblem" TEXT,
  "address" TEXT NOT NULL,
  "coordinatorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "College_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Industry" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "emblem" TEXT,
  "description" TEXT,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Industry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Department" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Student" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  "departmentId" TEXT,
  "universityRegNo" TEXT NOT NULL,
  "dob" TIMESTAMP(3) NOT NULL,
  "whatsapp" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MoU" (
  "id" TEXT NOT NULL,
  "collegeId" TEXT NOT NULL,
  "industryId" TEXT NOT NULL,
  "status" "MouStatus" NOT NULL DEFAULT 'PENDING',
  "signedAt" TIMESTAMP(3),
  "pdfUrl" TEXT,
  CONSTRAINT "MoU_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternshipOpportunity" (
  "id" TEXT NOT NULL,
  "industryId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InternshipOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Application" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
  "acceptanceUrl" TEXT,
  CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attendance" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "industryId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "status" "AttendanceStatus" NOT NULL,
  CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE UNIQUE INDEX "College_coordinatorId_key" ON "College"("coordinatorId");
CREATE INDEX "College_name_idx" ON "College"("name");
CREATE INDEX "College_createdAt_idx" ON "College"("createdAt");
CREATE UNIQUE INDEX "Industry_userId_key" ON "Industry"("userId");
CREATE INDEX "Industry_name_idx" ON "Industry"("name");
CREATE INDEX "Industry_createdAt_idx" ON "Industry"("createdAt");
CREATE UNIQUE INDEX "Department_collegeId_name_key" ON "Department"("collegeId", "name");
CREATE INDEX "Department_collegeId_idx" ON "Department"("collegeId");
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");
CREATE UNIQUE INDEX "Student_universityRegNo_key" ON "Student"("universityRegNo");
CREATE INDEX "Student_collegeId_idx" ON "Student"("collegeId");
CREATE INDEX "Student_departmentId_idx" ON "Student"("departmentId");
CREATE INDEX "Student_createdAt_idx" ON "Student"("createdAt");
CREATE UNIQUE INDEX "MoU_collegeId_industryId_key" ON "MoU"("collegeId", "industryId");
CREATE INDEX "MoU_collegeId_status_idx" ON "MoU"("collegeId", "status");
CREATE INDEX "MoU_industryId_status_idx" ON "MoU"("industryId", "status");
CREATE INDEX "InternshipOpportunity_industryId_idx" ON "InternshipOpportunity"("industryId");
CREATE INDEX "InternshipOpportunity_createdAt_idx" ON "InternshipOpportunity"("createdAt");
CREATE UNIQUE INDEX "Application_studentId_opportunityId_key" ON "Application"("studentId", "opportunityId");
CREATE INDEX "Application_opportunityId_status_idx" ON "Application"("opportunityId", "status");
CREATE INDEX "Application_studentId_status_idx" ON "Application"("studentId", "status");
CREATE UNIQUE INDEX "Attendance_studentId_date_key" ON "Attendance"("studentId", "date");
CREATE INDEX "Attendance_industryId_date_idx" ON "Attendance"("industryId", "date");

ALTER TABLE "College" ADD CONSTRAINT "College_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Industry" ADD CONSTRAINT "Industry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MoU" ADD CONSTRAINT "MoU_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MoU" ADD CONSTRAINT "MoU_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternshipOpportunity" ADD CONSTRAINT "InternshipOpportunity_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "InternshipOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
