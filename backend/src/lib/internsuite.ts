import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { hashPassword } from './security.js';

export const industryFields = [
  'IT',
  'MANUFACTURING',
  'HEALTHCARE',
  'FINANCE',
  'EDUCATION',
  'RETAIL',
  'LOGISTICS',
  'AGRICULTURE',
  'MEDIA',
  'GOVERNMENT',
  'OTHER',
] as const;

export const internshipVisibility = ['PUBLIC', 'SELECTED', 'INTERNAL'] as const;
export const applicationStatuses = ['APPLIED', 'APPROVED', 'REJECTED'] as const;
export const attendanceStatuses = ['PRESENT', 'ABSENT'] as const;
export const subscriptionPlans = ['FOUNDATION', 'GROWTH'] as const;

type Role = 'college' | 'student' | 'industry' | 'super_admin';
type RegistrationRole = Exclude<Role, 'super_admin'>;
type UserStatus = 'pending_verification' | 'verified' | 'active';

export interface AuthUserRecord {
  id: string;
  tenantId: string;
  email: string;
  passwordHash?: string;
  role: Role;
  isVerified: boolean;
  status: UserStatus;
  createdAt: string;
  fullName: string;
  collegeId?: string;
  industryId?: string;
  studentId?: string;
  profile?: Record<string, unknown>;
}

export interface VerificationRecord {
  email: string;
  purpose: 'registration' | 'password_reset';
  otpHash: string;
  expiresAt: string;
  consumedAt?: string;
}

export interface CollegeProfile {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  logoUrl?: string;
  address: string;
  university: string;
  isAutonomous: boolean;
  subscriptionPlan: (typeof subscriptionPlans)[number];
  isActive: boolean;
  createdAt: string;
}

export interface IndustryProfile {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  logoUrl?: string;
  industryField: (typeof industryFields)[number];
  description?: string;
  internshipRoles: string[];
  createdAt: string;
}

export interface StudentProfile {
  id: string;
  tenantId: string;
  userId: string;
  collegeId: string;
  email: string;
  fullName: string;
  universityRegNo: string;
  dob: string;
  whatsappNumber: string;
  address: string;
  programme: string;
  year: number;
  semester: number;
  photoUrl?: string;
  createdAt: string;
}

export interface InternshipRecord {
  id: string;
  tenantId: string;
  collegeId?: string;
  title: string;
  description: string;
  field: (typeof industryFields)[number];
  duration: string;
  stipend?: number;
  createdByIndustryId: string;
  visibility: (typeof internshipVisibility)[number];
  createdAt: string;
  approvedByCollege: boolean;
}

export interface ApplicationRecord {
  id: string;
  tenantId: string;
  collegeId: string;
  studentId: string;
  internshipId: string;
  industryId: string;
  status: (typeof applicationStatuses)[number];
  createdAt: string;
  approvalLetterUrl?: string;
}

export interface MouRecord {
  id: string;
  tenantId: string;
  collegeId: string;
  industryId: string;
  fileUrl: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  collegeId: string;
  studentId: string;
  industryId: string;
  date: string;
  status: (typeof attendanceStatuses)[number];
  approvedByCollege: boolean;
}

export interface EvaluationRecord {
  id: string;
  tenantId: string;
  collegeId: string;
  studentId: string;
  marks: number;
  grade: string;
  remarks?: string;
}

export interface MarksheetRecord {
  id: string;
  tenantId: string;
  collegeId: string;
  studentId: string;
  fileUrl: string;
}

export const authUsers = new Map<string, AuthUserRecord>();
export const verificationChallenges = new Map<string, VerificationRecord>();
export const passwordResetChallenges = new Map<string, VerificationRecord>();
export const colleges = new Map<string, CollegeProfile>();
export const industries = new Map<string, IndustryProfile>();
export const students = new Map<string, StudentProfile>();
export const internships = new Map<string, InternshipRecord>();
export const applications = new Map<string, ApplicationRecord>();
export const mous = new Map<string, MouRecord>();
export const attendanceRecords = new Map<string, AttendanceRecord>();
export const evaluations = new Map<string, EvaluationRecord>();
export const marksheets = new Map<string, MarksheetRecord>();

export const baseTenantId = 'tenant-platform';
export const demoCollegeId = 'college-demo';
export const demoIndustryId = 'industry-demo';
export const demoStudentId = 'student-demo';

const now = () => new Date().toISOString();

export const emailDiscoverySchema = z.object({
  email: z.string().email(),
  role: z.enum(['college', 'student', 'industry']).optional(),
  registration: z.record(z.any()).optional(),
});

export const studentRegistrationSchema = z.object({
  fullName: z.string().min(2),
  universityRegNo: z.string().min(4),
  photoUrl: z.string().url().optional(),
  photoSizeBytes: z.number().int().positive().max(200_000),
  dob: z.string().date(),
  whatsappNumber: z.string().min(10).max(15),
  address: z.string().min(10),
  programme: z.string().min(2),
  year: z.number().int().min(1).max(8),
  semester: z.number().int().min(1).max(12),
  collegeId: z.string().min(2),
});

export const collegeRegistrationSchema = z.object({
  collegeName: z.string().min(2),
  logoUrl: z.string().url().optional(),
  logoSizeBytes: z.number().int().positive().max(200_000).optional(),
  address: z.string().min(10),
  university: z.string().min(2),
  isAutonomous: z.boolean(),
  subscriptionPlan: z.enum(subscriptionPlans).default('FOUNDATION'),
});

export const industryRegistrationSchema = z.object({
  industryName: z.string().min(2),
  logoUrl: z.string().url().optional(),
  logoSizeBytes: z.number().int().positive().max(200_000).optional(),
  industryField: z.enum(industryFields),
  description: z.string().min(20).max(1000),
  internshipRoles: z.array(z.string().min(2)).min(1),
});

export const otpSendSchema = z
  .object({
    email: z.string().email(),
    role: z.enum(['college', 'student', 'industry']).optional(),
    registration: z.record(z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    const existing = authUsers.get(value.email);
    if (!existing && !value.role) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['role'],
        message: 'Role is required when registering a new account.',
      });
    }
    if (!existing && !value.registration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['registration'],
        message: 'Registration payload is required for new account onboarding.',
      });
    }
  });

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/),
});

export const passwordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\W_]{12,}$/),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
});

export const internshipSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(20),
  field: z.enum(industryFields),
  duration: z.string().min(2),
  stipend: z.number().nonnegative().optional(),
  visibility: z.enum(internshipVisibility),
  collegeId: z.string().optional(),
});

export const applicationSchema = z.object({
  internshipId: z.string().min(2),
});

export const approvalSchema = z.object({
  entity: z.enum(['internship', 'application', 'attendance']),
  targetId: z.string().min(2),
  status: z.enum(['APPROVED', 'REJECTED']),
  remarks: z.string().max(500).optional(),
});

export const attendanceSchema = z.object({
  studentId: z.string().min(2),
  date: z.string().date(),
  status: z.enum(attendanceStatuses),
});

export const evaluationSchema = z.object({
  studentId: z.string().min(2),
  marks: z.number().min(0).max(100),
  grade: z.string().min(1).max(2).optional(),
  remarks: z.string().max(500).optional(),
});

function createPdfUrl(type: string, id: string) {
  return `https://cdn.internsuite.app/${type}/${id}.pdf`;
}

export function seedPlatformData() {
  if (colleges.size > 0) {
    return;
  }

  const collegeUserId = 'user-college-demo';
  const industryUserId = 'user-industry-demo';
  const studentUserId = 'user-student-demo';

  authUsers.set('college@internsuite.app', {
    id: collegeUserId,
    tenantId: baseTenantId,
    email: 'college@internsuite.app',
    passwordHash: hashPassword('SecurePass123'),
    role: 'college',
    isVerified: true,
    status: 'active',
    createdAt: now(),
    fullName: 'InternSuite College Admin',
    collegeId: demoCollegeId,
  });

  authUsers.set('industry@internsuite.app', {
    id: industryUserId,
    tenantId: baseTenantId,
    email: 'industry@internsuite.app',
    passwordHash: hashPassword('SecurePass123'),
    role: 'industry',
    isVerified: true,
    status: 'active',
    createdAt: now(),
    fullName: 'InternSuite Industry Lead',
    industryId: demoIndustryId,
  });

  authUsers.set('student@internsuite.app', {
    id: studentUserId,
    tenantId: baseTenantId,
    email: 'student@internsuite.app',
    passwordHash: hashPassword('SecurePass123'),
    role: 'student',
    isVerified: true,
    status: 'active',
    createdAt: now(),
    fullName: 'Arun Student',
    collegeId: demoCollegeId,
    studentId: demoStudentId,
  });

  colleges.set(demoCollegeId, {
    id: demoCollegeId,
    tenantId: baseTenantId,
    userId: collegeUserId,
    name: 'InternSuite College of Engineering',
    logoUrl: 'https://cdn.internsuite.app/logo/college-demo.png',
    address: 'Calicut, Kerala, India',
    university: 'APJ Abdul Kalam Technological University',
    isAutonomous: true,
    subscriptionPlan: 'FOUNDATION',
    isActive: true,
    createdAt: now(),
  });

  industries.set(demoIndustryId, {
    id: demoIndustryId,
    tenantId: baseTenantId,
    userId: industryUserId,
    name: 'Northstar Digital Labs',
    logoUrl: 'https://cdn.internsuite.app/logo/industry-demo.png',
    industryField: 'IT',
    description: 'Industry partner for software engineering and analytics internships.',
    internshipRoles: ['Backend Intern', 'QA Intern', 'Data Analyst Intern'],
    createdAt: now(),
  });

  students.set(demoStudentId, {
    id: demoStudentId,
    tenantId: baseTenantId,
    userId: studentUserId,
    collegeId: demoCollegeId,
    email: 'student@internsuite.app',
    fullName: 'Arun Student',
    universityRegNo: 'REG2026001',
    dob: '2005-08-11',
    whatsappNumber: '919876543210',
    address: 'Kozhikode, Kerala',
    programme: 'B.Tech CSE',
    year: 3,
    semester: 6,
    photoUrl: 'https://cdn.internsuite.app/photo/student-demo.jpg',
    createdAt: now(),
  });

  const internshipId = 'internship-demo';
  internships.set(internshipId, {
    id: internshipId,
    tenantId: baseTenantId,
    collegeId: demoCollegeId,
    title: 'Backend Platform Intern',
    description: 'Build and maintain APIs, workflow automation, and operational dashboards.',
    field: 'IT',
    duration: '16 weeks',
    stipend: 12000,
    createdByIndustryId: demoIndustryId,
    visibility: 'PUBLIC',
    createdAt: now(),
    approvedByCollege: true,
  });

  const appId = 'application-demo';
  applications.set(appId, {
    id: appId,
    tenantId: baseTenantId,
    collegeId: demoCollegeId,
    studentId: demoStudentId,
    internshipId,
    industryId: demoIndustryId,
    status: 'APPROVED',
    createdAt: now(),
    approvalLetterUrl: createPdfUrl('approval-letter', appId),
  });

  const mouId = 'mou-demo';
  mous.set(mouId, {
    id: mouId,
    tenantId: baseTenantId,
    collegeId: demoCollegeId,
    industryId: demoIndustryId,
    fileUrl: createPdfUrl('mou', mouId),
    createdAt: now(),
  });

  attendanceRecords.set('attendance-demo', {
    id: 'attendance-demo',
    tenantId: baseTenantId,
    collegeId: demoCollegeId,
    studentId: demoStudentId,
    industryId: demoIndustryId,
    date: '2026-03-21',
    status: 'PRESENT',
    approvedByCollege: true,
  });

  evaluations.set('evaluation-demo', {
    id: 'evaluation-demo',
    tenantId: baseTenantId,
    collegeId: demoCollegeId,
    studentId: demoStudentId,
    marks: 91,
    grade: 'A+',
    remarks: 'Strong delivery, punctuality, and production-quality backend contributions.',
  });

  marksheets.set('marksheet-demo', {
    id: 'marksheet-demo',
    tenantId: baseTenantId,
    collegeId: demoCollegeId,
    studentId: demoStudentId,
    fileUrl: createPdfUrl('marksheet', 'marksheet-demo'),
  });
}

seedPlatformData();

export function generateId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

export function dynamicRolesForField(field: (typeof industryFields)[number]) {
  const catalog: Record<(typeof industryFields)[number], string[]> = {
    IT: ['Backend Intern', 'Frontend Intern', 'QA Intern', 'DevOps Intern'],
    MANUFACTURING: ['Production Intern', 'Quality Intern', 'Supply Chain Intern'],
    HEALTHCARE: ['Clinical Ops Intern', 'Health Data Intern', 'Lab Support Intern'],
    FINANCE: ['Financial Analyst Intern', 'Audit Intern', 'Operations Intern'],
    EDUCATION: ['Curriculum Intern', 'EdTech Support Intern', 'Research Assistant'],
    RETAIL: ['Store Operations Intern', 'Merchandising Intern'],
    LOGISTICS: ['Logistics Planner Intern', 'Warehouse Analytics Intern'],
    AGRICULTURE: ['Agri Operations Intern', 'Field Research Intern'],
    MEDIA: ['Content Intern', 'Production Intern', 'Brand Intern'],
    GOVERNMENT: ['Policy Intern', 'Administrative Intern'],
    OTHER: ['General Operations Intern'],
  };

  return catalog[field];
}

export function gradeFromMarks(marks: number) {
  if (marks >= 90) return 'A+';
  if (marks >= 80) return 'A';
  if (marks >= 70) return 'B+';
  if (marks >= 60) return 'B';
  if (marks >= 50) return 'C';
  return 'F';
}

export function renderPdfDocument(type: 'MOU' | 'APPROVAL_LETTER' | 'ATTENDANCE_REPORT' | 'MARKSHEET', id: string) {
  const generatedAt = now();

  if (type === 'MOU') {
    const mou = mous.get(id);
    if (!mou) throw new Error('MOU not found.');
    const college = colleges.get(mou.collegeId)!;
    const industry = industries.get(mou.industryId)!;
    return {
      id: mou.id,
      type,
      fileUrl: mou.fileUrl,
      generatedAt,
      html: `<!doctype html><html><body><header><img src="${college.logoUrl}" alt="College logo" /><img src="${industry.logoUrl}" alt="Industry logo" /></header><h1>Memorandum of Understanding</h1><p>${college.name} and ${industry.name} agree to manage internship governance through InternSuite.</p><ol><li>Student safety and compliance obligations</li><li>Attendance and evaluation responsibilities</li><li>Confidentiality and data processing</li></ol><footer><div>Authorized College Signature</div><div>Authorized Industry Signature</div></footer></body></html>`,
    };
  }

  if (type === 'APPROVAL_LETTER') {
    const application = applications.get(id);
    if (!application) throw new Error('Application not found.');
    const student = students.get(application.studentId)!;
    const internship = internships.get(application.internshipId)!;
    const college = colleges.get(application.collegeId)!;
    return {
      id: application.id,
      type,
      fileUrl: application.approvalLetterUrl,
      generatedAt,
      html: `<!doctype html><html><body><h1>Internship Approval Letter</h1><p>${student.fullName} (${student.universityRegNo}) is approved for ${internship.title}.</p><p>Issued by ${college.name} for ${internship.duration} in the ${internship.field} stream.</p></body></html>`,
    };
  }

  if (type === 'ATTENDANCE_REPORT') {
    const attendance = attendanceRecords.get(id);
    if (!attendance) throw new Error('Attendance record not found.');
    const student = students.get(attendance.studentId)!;
    const industry = industries.get(attendance.industryId)!;
    const college = colleges.get(attendance.collegeId)!;
    return {
      id: attendance.id,
      type,
      fileUrl: createPdfUrl('attendance-report', attendance.id),
      generatedAt,
      html: `<!doctype html><html><body><h1>Attendance Report</h1><p>Student: ${student.fullName}</p><p>Industry: ${industry.name}</p><p>College: ${college.name}</p><table><tr><th>Date</th><th>Status</th></tr><tr><td>${attendance.date}</td><td>${attendance.status}</td></tr></table></body></html>`,
    };
  }

  const marksheet = marksheets.get(id);
  if (!marksheet) throw new Error('Marksheet not found.');
  const student = students.get(marksheet.studentId)!;
  const evaluation = Array.from(evaluations.values()).find((entry) => entry.studentId === student.id);
  const college = colleges.get(marksheet.collegeId)!;
  return {
    id: marksheet.id,
    type,
    fileUrl: marksheet.fileUrl,
    generatedAt,
    html: `<!doctype html><html><body><h1>Internship Marksheet</h1><p>${college.name}</p><p>Student: ${student.fullName}</p><p>Programme: ${student.programme}</p><p>Marks: ${evaluation?.marks ?? 0}</p><p>Grade: ${evaluation?.grade ?? 'NA'}</p><p>Remarks: ${evaluation?.remarks ?? 'Pending'}</p></body></html>`,
  };
}

export const apiCatalog = {
  auth: [
    {
      method: 'POST',
      path: '/auth/send-otp',
      purpose: 'Email-first discovery. Existing users are routed to password login; new users receive a 6-digit OTP after registration payload validation.',
    },
    {
      method: 'POST',
      path: '/auth/verify-otp',
      purpose: 'Consumes a 6-digit registration OTP and unlocks password creation.',
    },
    {
      method: 'POST',
      path: '/auth/set-password',
      purpose: 'Sets a bcrypt-hashed password after OTP verification. Enforces minimum 12 characters with letters and digits.',
    },
    {
      method: 'POST',
      path: '/auth/login',
      purpose: 'Authenticates a verified user, issues a JWT, and returns tenant-safe principal metadata.',
    },
  ],
  college: [
    { method: 'GET', path: '/college/dashboard' },
    { method: 'POST', path: '/college/students' },
    { method: 'GET', path: '/college/applications' },
    { method: 'POST', path: '/college/approve' },
    { method: 'POST', path: '/college/evaluation' },
  ],
  student: [
    { method: 'GET', path: '/student/dashboard' },
    { method: 'POST', path: '/student/apply' },
    { method: 'GET', path: '/student/applications' },
  ],
  industry: [
    { method: 'POST', path: '/industry/internship' },
    { method: 'GET', path: '/industry/applications' },
    { method: 'POST', path: '/industry/attendance' },
  ],
  pdf: [
    { method: 'GET', path: '/pdf/mou/:id' },
    { method: 'GET', path: '/pdf/approval-letter/:id' },
    { method: 'GET', path: '/pdf/attendance/:id' },
    { method: 'GET', path: '/pdf/marksheet/:id' },
  ],
};

export const frontendBlueprint = {
  authEntry: {
    buttonLabel: 'Register / Login',
    firstScreen: 'Ask only for email address.',
    routing: [
      'If the email exists, route to password login.',
      'If the email does not exist, collect role-specific registration fields and call POST /auth/send-otp.',
      'After OTP verification, route to password setup, then redirect to the role dashboard.',
    ],
  },
  pages: [
    { path: '/', purpose: 'Landing page with value proposition, automation flow, and pricing.' },
    { path: '/auth', purpose: 'Email-first authentication gateway for register/login discovery.' },
    { path: '/pricing', purpose: 'Foundation and Growth plans with college CTA.' },
    { path: '/portal/college', purpose: 'Operational dashboard for approvals, students, attendance review, and evaluations.' },
    { path: '/portal/student', purpose: 'Student profile, internship applications, approvals, and marksheet downloads.' },
    { path: '/portal/industry', purpose: 'Internship posting, applicant review, and attendance marking.' },
  ],
  pwaReadiness: [
    'Responsive single-column mobile layouts first.',
    'Manifest and icon metadata included.',
    'Critical actions exposed as sticky CTA buttons on small screens.',
  ],
};

export const validationAndSecurityBlueprint = {
  validation: [
    'Student photos and logos must be 200 KB or below.',
    'Email addresses must be globally unique in User.',
    'Students must also satisfy unique (email + universityRegNo) and (collegeId + universityRegNo).',
    'Passwords require minimum 12 characters and must include letters and digits.',
    'One student can submit only one application per internship.',
  ],
  security: [
    'JWT contains role, tenantId, audience, and scoped entity IDs for route-level authorization.',
    'Every operational query filters by tenantId and role-owned collegeId or industryId to prevent cross-tenant leakage.',
    'OTP hashes are stored instead of plain codes.',
    'All document URLs are stored against tenant-aware records for auditable download authorization.',
  ],
  pricing: [
    { plan: 'FOUNDATION', annualPriceInInr: 12000, studentLimit: 500, summary: 'Basic internship ERP operations.' },
    { plan: 'GROWTH', annualPriceInInr: 25000, studentLimit: 2000, summary: 'Advanced analytics and higher throughput.' },
  ],
};
