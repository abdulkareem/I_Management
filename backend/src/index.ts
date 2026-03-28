import { z } from 'zod';

interface EnvBindings {
  DB: D1Database;
  INTERNSHIP_STATE?: DurableObjectNamespace;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  JWT_SECRET?: string;
}

type Role =
  | 'superadmin'
  | 'admin'
  | 'college'
  | 'department'
  | 'industry'
  | 'student'
  | 'external_student';

type JsonMap = Record<string, unknown>;
type DocumentType = 'approval' | 'reply' | 'allotment' | 'feedback';

type AuthSession = {
  token: string;
  user: {
    id: string;
    email: string;
    role:
      | 'SUPER_ADMIN'
      | 'ADMIN'
      | 'COLLEGE'
      | 'DEPARTMENT_COORDINATOR'
      | 'COORDINATOR'
      | 'INDUSTRY'
      | 'STUDENT'
      | 'EXTERNAL_STUDENT';
  };
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data?: T;
};

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const DEFAULT_SUPERADMIN_EMAIL = 'abdulkareem@psmocollege.ac.in';
const DEFAULT_SUPERADMIN_ID = 'admin_super_psmo';
const INTERNSHIP_STATUS = {
  DRAFT: 'DRAFT',
  SENT_TO_DEPARTMENT: 'SENT_TO_DEPARTMENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
} as const;

type InternshipStatus = (typeof INTERNSHIP_STATUS)[keyof typeof INTERNSHIP_STATUS];
const ALLOWED_INTERNSHIP_STATUS = new Set<InternshipStatus>(Object.values(INTERNSHIP_STATUS));
const WORKFLOW_INTERNSHIP_STATUS = ['DRAFT', 'SENT_TO_DEPT', 'ACCEPTED', 'PUBLISHED', 'CLOSED'] as const;
const MAX_ACTIVE_APPLICATIONS = 3;

const ipoInternshipCreateSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().min(10),
  duration: z.string().trim().min(2),
  total_vacancy: z.coerce.number().int().min(1),
  requirements: z.string().trim().min(2),
  college_id: z.string().trim().min(1),
  department_id: z.string().trim().min(1).optional().nullable(),
});

const mapInternshipSchema = z.object({
  internship_id: z.string().trim().min(1),
  po_ids: z.array(z.string().trim().min(1)).min(1),
  pso_ids: z.array(z.string().trim().min(1)).min(1),
  co_ids: z.array(z.string().trim().min(1)).min(1),
  internship_po: z.array(z.string().trim().min(1)).default([]),
});

const publishInternshipSchema = z.object({
  internship_id: z.string().trim().min(1),
});

const studentApplySchema = z.object({
  internship_id: z.string().trim().min(1),
});

const acceptApplicationSchema = z.object({
  application_id: z.string().trim().min(1),
});

const ipoCompleteSchema = z.object({
  application_id: z.string().trim().min(1),
  feedback: z.string().trim().min(3),
  rating: z.coerce.number().min(1).max(5),
});

const evaluateSchema = z.object({
  application_id: z.string().trim().min(1),
  marks: z.coerce.number().min(0).max(100),
  feedback: z.string().trim().optional(),
  co_po_score: z.record(z.string(), z.coerce.number().min(0).max(100)),
});

export default {
  async fetch(request: Request, env: EnvBindings): Promise<Response> {
    const url = new URL(request.url);
    console.log('PATH:', url.pathname);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      if (!env.DB) {
        return errorResponse(500, 'DB binding missing');
      }

      return await routeRequest(request, env, url);
    } catch (err) {
      console.error('DB_ERROR:', err);
      return errorResponse(500, err instanceof Error ? err.message : 'Unexpected server error');
    }
  },
};

async function routeRequest(request: Request, env: EnvBindings, url: URL): Promise<Response> {
  const { pathname } = url;

  if (pathname.startsWith('/api/department') || pathname === '/api/college/login' || pathname === '/api/auth/login') {
    await ensureDepartmentCompatibility(env);
  }
  if (
    pathname.startsWith('/api/department')
    || pathname.startsWith('/api/industry')
    || pathname.startsWith('/api/documents')
    || pathname.startsWith('/api/dashboard/industry')
    || pathname === '/industry/dashboard'
    || pathname.startsWith('/api/ipo')
    || pathname.startsWith('/api/applications')
    || pathname.startsWith('/api/industry-requests')
    || pathname.startsWith('/api/internships')
    || pathname.startsWith('/api/outcome')
    || pathname.startsWith('/api/dashboard/student')
    || pathname === '/student/dashboard'
    || pathname.startsWith('/api/student/applications')
    || pathname.startsWith('/api/dashboard/college/control-center')
  ) {
    await ensureDepartmentDashboardSchema(env);
  }
  if (
    pathname === '/api/ipo/internship'
    || pathname === '/api/department/map-internship'
    || pathname === '/api/department/publish'
    || pathname === '/api/student/internships'
    || pathname === '/api/student/apply'
    || pathname === '/api/ipo/application/accept'
    || pathname === '/api/ipo/complete'
    || pathname === '/api/department/evaluate'
    || pathname.startsWith('/api/documents')
  ) {
    await ensureInternshipWorkflowSchema(env);
    await ensureDocumentSchema(env);
  }
  if (pathname === '/api/student/register') {
    await ensureStudentRegistrationSchema(env);
  }

  if (request.method === 'GET' && pathname === '/api/health') {
    return ok('API healthy', { now: new Date().toISOString() });
  }

  if (request.method === 'GET' && pathname === '/api/colleges') {
    const rows = await env.DB.prepare(
      `SELECT id, name
       FROM colleges
       WHERE status = 'approved' AND is_active = 1
       ORDER BY name ASC`,
    ).all<{ id: string; name: string }>();
    return ok('Colleges fetched', (rows.results ?? []).map((row) => ({ id: row.id, collegeName: row.name })));
  }

  if (request.method === 'GET' && pathname === '/api/departments') {
    const collegeId = toText(url.searchParams.get('collegeId'));
    if (!collegeId) return badRequest('collegeId is required');

    const rows = await env.DB.prepare('SELECT id, name, college_id FROM departments WHERE college_id = ? ORDER BY name ASC')
      .bind(collegeId)
      .all<{ id: string; name: string; college_id: string }>();

    return ok('Departments fetched',
      (rows.results ?? []).map((row) => ({ id: row.id, name: row.name, collegeId: row.college_id })),
    );
  }

  if (request.method === 'GET' && pathname === '/api/courses') {
    const departmentId = toText(url.searchParams.get('departmentId'));
    if (!departmentId) return badRequest('departmentId is required');

    const rows = await env.DB.prepare('SELECT id, name, department_id FROM programs WHERE department_id = ? ORDER BY name ASC')
      .bind(departmentId)
      .all<{ id: string; name: string; department_id: string }>();

    return ok('Programs fetched',
      (rows.results ?? []).map((row) => ({ id: row.id, name: row.name, departmentId: row.department_id })),
    );
  }

  if (request.method === 'GET' && pathname === '/api/programs') {
    const departmentId = toText(url.searchParams.get('departmentId'));
    if (!departmentId) return badRequest('departmentId is required');

    const rows = await env.DB.prepare('SELECT id, name, department_id FROM programs WHERE department_id = ? ORDER BY name ASC')
      .bind(departmentId)
      .all<{ id: string; name: string; department_id: string }>();

    return ok('Programs fetched',
      (rows.results ?? []).map((row) => ({ id: row.id, name: row.name, departmentId: row.department_id })),
    );
  }

  if (request.method === 'GET' && pathname === '/api/industry-types') {
    const rows = await env.DB.prepare('SELECT id, name FROM industry_types WHERE is_active = 1 ORDER BY name ASC').all();
    return ok('Industry types fetched', rows.results ?? []);
  }

  const industryTypeByIdMatch = pathname.match(/^\/api\/industry-types\/([^/]+)$/);
  if (industryTypeByIdMatch && request.method === 'PUT') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const name = required(body, ['name']);
    if (!name) return badRequest('name is required');

    const existing = await env.DB.prepare('SELECT id FROM industry_types WHERE lower(name) = lower(?) AND id <> ?')
      .bind(name, industryTypeByIdMatch[1])
      .first<{ id: string }>();
    if (existing) return conflict('Industry type already exists');

    const result = await env.DB.prepare('UPDATE industry_types SET name = ? WHERE id = ?').bind(name.trim(), industryTypeByIdMatch[1]).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry type not found');
    return ok('Industry type updated');
  }

  if (industryTypeByIdMatch && request.method === 'DELETE') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const result = await env.DB.prepare('UPDATE industry_types SET is_active = 0 WHERE id = ?').bind(industryTypeByIdMatch[1]).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry type not found');
    return ok('Industry type deleted');
  }

  if (request.method === 'POST' && pathname === '/api/industry-types') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const name = required(body, ['name']);
    if (!name) return badRequest('name is required');

    const existing = await env.DB.prepare('SELECT id FROM industry_types WHERE lower(name) = lower(?)').bind(name).first<{ id: string }>();
    if (existing) return conflict('Industry type already exists');

    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO industry_types (id, name, is_active) VALUES (?, ?, 1)').bind(id, name.trim()).run();
    return created('Industry type added', { id, name: name.trim() });
  }

  if (request.method === 'POST' && pathname === '/api/college/register') {
    const body = await readBody(request);
    console.log('BODY:', body);

    const name = required(body, ['name', 'collegeName']);
    const coordinatorName = required(body, ['coordinator_name', 'coordinatorName']);
    const coordinatorEmail = normalizeEmail(required(body, ['coordinator_email', 'email']));
    const password = required(body, ['password']);
    const address = optional(body, ['address']);
    const university = optional(body, ['university']);
    const mobile = optional(body, ['mobile']);

    if (!name || !coordinatorName || !coordinatorEmail || !password) {
      return badRequest('name, coordinator_name, coordinator_email and password are required');
    }

    const existing = await env.DB.prepare('SELECT id FROM colleges WHERE coordinator_email = ?').bind(coordinatorEmail).first();
    if (existing) return conflict('College coordinator email already exists');

    const collegeId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO colleges (id, name, address, university, mobile, coordinator_name, coordinator_email, password, status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
    )
      .bind(collegeId, name, address, university, mobile, coordinatorName, coordinatorEmail, password)
      .run();

    await upsertIdentity(env, { role: 'college', entityId: collegeId, email: coordinatorEmail, isActive: 1 });

    return created('College registration submitted', { id: collegeId, status: 'pending' });
  }

  if (request.method === 'POST' && pathname === '/api/industry/register') {
    const body = await readBody(request);
    console.log('BODY:', body);

    const name = required(body, ['name', 'companyName']);
    const email = normalizeEmail(required(body, ['email']));
    const password = required(body, ['password']);
    const businessActivity = required(body, ['business_activity', 'businessActivity']);
    const industryTypeId = required(body, ['industry_type_id', 'industryTypeId']);

    if (!name || !email || !password || !businessActivity || !industryTypeId) {
      return badRequest('name, email, password, business_activity, industry_type_id are required');
    }

    const [existingIndustry, type] = await Promise.all([
      env.DB.prepare('SELECT id FROM industries WHERE email = ?').bind(email).first(),
      env.DB.prepare('SELECT id FROM industry_types WHERE id = ? AND is_active = 1').bind(industryTypeId).first(),
    ]);

    if (existingIndustry) return conflict('Industry email already exists');
    if (!type) return badRequest('Invalid industry_type_id');

    const industryId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO industries (id, name, email, business_activity, industry_type_id, password, status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)`,
    )
      .bind(industryId, name, email, businessActivity, industryTypeId, password)
      .run();

    await upsertIdentity(env, { role: 'industry', entityId: industryId, email, isActive: 1 });

    return created('Industry registration submitted', { id: industryId, status: 'pending' });
  }

  if (request.method === 'POST' && pathname === '/api/student/register') {
    const body = await readBody(request);
    console.log('BODY:', body);

    const name = required(body, ['name', 'studentName']);
    const email = normalizeEmail(required(body, ['email']));
    const password = required(body, ['password']);
    const providedCollegeId = optional(body, ['college_id', 'collegeId']);
    const providedDepartmentId = optional(body, ['department_id', 'departmentId']);
    const providedProgramId = optional(body, ['program_id', 'courseId', 'programId']);
    const customCollegeName = optional(body, ['custom_college_name', 'customCollegeName']);
    const customDepartmentName = optional(body, ['custom_department_name', 'customDepartmentName']);
    const customProgramName = optional(body, ['custom_program_name', 'customProgramName']);
    const universityRegNumber = optional(body, ['university_reg_number', 'universityRegNumber']);
    const phone = optional(body, ['phone']);
    const sexRaw = toText(optional(body, ['sex', 'gender'])).toUpperCase();
    const sex = sexRaw === 'MALE' || sexRaw === 'FEMALE' ? sexRaw : null;

    let collegeId = providedCollegeId;
    let departmentId = providedDepartmentId;
    let programId = providedProgramId;

    if (!collegeId && customCollegeName && customDepartmentName && customProgramName) {
      const path = await ensureAcademicPathForUnlistedStudent(env, {
        collegeName: customCollegeName,
        departmentName: customDepartmentName,
        programName: customProgramName,
      });
      collegeId = path.collegeId;
      departmentId = path.departmentId;
      programId = path.programId;
    }

    if (!name || !email || !password || !collegeId || !departmentId || !programId || !sex) {
      return badRequest('name, email, password, and either selected IDs or custom college/department/program are required');
    }

    const [existing, college, department, program] = await Promise.all([
      env.DB.prepare('SELECT id FROM students WHERE email = ?').bind(email).first(),
      env.DB.prepare("SELECT id, status, is_active FROM colleges WHERE id = ?").bind(collegeId).first<{ id: string; status: string; is_active: number }>(),
      env.DB.prepare('SELECT id, college_id FROM departments WHERE id = ?').bind(departmentId).first<{ id: string; college_id: string }>(),
      env.DB.prepare('SELECT id, department_id FROM programs WHERE id = ?').bind(programId).first<{ id: string; department_id: string }>(),
    ]);

    if (existing) return conflict('Student email already exists');
    if (!college) return badRequest('Invalid college_id');
    if (college.status !== 'approved' || Number(college.is_active) !== 1) return forbidden('Waiting for approval');
    if (!department || department.college_id !== collegeId) return badRequest('department_id does not belong to selected college');
    if (!program || program.department_id !== departmentId) return badRequest('program_id does not belong to selected department');

    const studentId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO students (
        id, name, email, phone, university_reg_number,
        college_id, department_id, program_id,
        custom_college_name, custom_department_name, custom_program_name,
        sex, password, is_active
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    )
      .bind(
        studentId,
        name,
        email,
        phone,
        universityRegNumber,
        collegeId,
        departmentId,
        programId,
        customCollegeName,
        customDepartmentName,
        customProgramName,
        sex,
        password,
      )
      .run();

    await upsertIdentity(env, { role: 'student', entityId: studentId, email, isActive: 1 });

    return created('Student registered', { id: studentId });
  }

  if (request.method === 'POST' && (pathname === '/api/external-student/apply' || pathname === '/external/apply')) {
    const body = await readBody(request);
    console.log('BODY:', body);

    const name = required(body, ['name', 'fullName']);
    const email = normalizeEmail(required(body, ['email']));
    const password = required(body, ['password']);
    const phone = optional(body, ['phone']);
    const whatsapp = optional(body, ['whatsapp']);
    const college = optional(body, ['college']);
    const university = optional(body, ['university']);
    const regNumber = optional(body, ['reg_number', 'regNumber']);
    const department = optional(body, ['department']);
    const internshipId = required(body, ['internship_id', 'internshipId']);

    if (!name || !email || !password || !internshipId) {
      return badRequest('name, email, password, internship_id are required');
    }

    const [existingExternal, internship] = await Promise.all([
      env.DB.prepare('SELECT id FROM external_students WHERE email = ?').bind(email).first<{ id: string }>(),
      env.DB.prepare('SELECT id FROM internships WHERE id = ?').bind(internshipId).first<{ id: string }>(),
    ]);

    if (!internship) return badRequest('Invalid internship_id');

    let externalStudentId = existingExternal?.id;
    if (!externalStudentId) {
      externalStudentId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO external_students (id, name, email, phone, whatsapp, college, university, reg_number, department, password, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      )
        .bind(externalStudentId, name, email, phone, whatsapp, college, university, regNumber, department, password)
        .run();

      await upsertIdentity(env, { role: 'external_student', entityId: externalStudentId, email, isActive: 1 });
    }

    const duplicate = await env.DB.prepare(
      'SELECT id FROM internship_applications WHERE external_student_id = ? AND internship_id = ?',
    )
      .bind(externalStudentId, internshipId)
      .first();

    if (duplicate) return conflict('Application already submitted for this internship');

    await env.DB.prepare(
      `INSERT INTO internship_applications (id, external_student_id, internship_id, status)
       VALUES (?, ?, ?, 'pending')`,
    )
      .bind(crypto.randomUUID(), externalStudentId, internshipId)
      .run();

    return created('Application submitted', { externalStudentId, internshipId, status: 'pending' });
  }

  if (request.method === 'POST' && pathname === '/api/college/login') {
    return passwordLogin(request, env, 'college');
  }

  if (request.method === 'POST' && pathname === '/api/industry/login') {
    return passwordLogin(request, env, 'industry');
  }

  if (request.method === 'POST' && pathname === '/api/student/login') {
    return passwordLogin(request, env, 'student');
  }

  if (request.method === 'POST' && pathname === '/api/auth/login') {
    return unifiedLogin(request, env);
  }

  if (request.method === 'POST' && pathname === '/api/admin/send-otp') {
    const body = await readBody(request);
    console.log('BODY:', body);

    const email = normalizeEmail(required(body, ['email']));
    if (!email) return badRequest('email is required');

    await ensureDefaultSuperadmin(env, email);

    const admin = await env.DB.prepare("SELECT id, role FROM admins WHERE lower(email) = lower(?) AND lower(role) = 'superadmin' AND is_active = 1")
      .bind(email)
      .first<{ id: string; role: string }>();
    if (!admin) return forbidden('Not authorized as superadmin');

    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    const expiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await env.DB.prepare('UPDATE otp_codes SET verified = 0 WHERE email = ? AND verified = 0').bind(email).run();
    await env.DB.prepare('INSERT INTO otp_codes (id, email, otp, expires_at, verified, attempts) VALUES (?, ?, ?, ?, 0, 0)')
      .bind(crypto.randomUUID(), email, otp, expiry)
      .run();

    if (!env.RESEND_API_KEY) {
      console.log('RESEND_API_KEY missing, OTP generated for debug only');
      return ok('OTP generated (email provider not configured)', { otpSent: true, expiresAt: expiry });
    }

    await sendOtpEmail(env, email, otp);
    return ok('OTP sent successfully', { otpSent: true, expiresAt: expiry });
  }

  if (request.method === 'POST' && pathname === '/api/admin/verify-otp') {
    const body = await readBody(request);
    console.log('BODY:', body);

    const email = normalizeEmail(required(body, ['email']));
    const otp = required(body, ['otp']);
    if (!email || !otp) return badRequest('email and otp are required');

    const row = await env.DB.prepare(
      'SELECT id, otp, expires_at, attempts FROM otp_codes WHERE email = ? AND verified = 0 ORDER BY created_at DESC LIMIT 1',
    )
      .bind(email)
      .first<{ id: string; otp: string; expires_at: string; attempts: number }>();

    if (!row) return unauthorized('Invalid OTP');
    if (new Date(row.expires_at).getTime() < Date.now()) return unauthorized('OTP expired');

    if (row.otp !== otp) {
      await env.DB.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').bind(row.id).run();
      return unauthorized('Invalid OTP');
    }

    await env.DB.prepare("UPDATE otp_codes SET verified = 1, verified_at = datetime('now') WHERE id = ?").bind(row.id).run();

    await ensureDefaultSuperadmin(env, email);

    const admin = await env.DB.prepare("SELECT id, email, role FROM admins WHERE lower(email) = lower(?) AND lower(role) = 'superadmin' AND is_active = 1")
      .bind(email)
      .first<{ id: string; email: string; role: string }>();

    if (!admin) return forbidden('Not authorized as superadmin');

    const session = createSession({
      id: admin.id,
      email: admin.email,
      role: 'SUPER_ADMIN',
    });

    return ok('OTP verified', session);
  }

  if (request.method === 'GET' && (pathname === '/internships/public' || pathname === '/api/internships/public')) {
    const rows = await env.DB.prepare(
      `SELECT i.id,
              i.title,
              i.description,
              d.id AS department_id,
              d.name AS department_name,
              c.id AS college_id,
              c.name AS college_name
       FROM internships i
       INNER JOIN departments d ON d.id = i.department_id
       INNER JOIN colleges c ON c.id = d.college_id
       WHERE c.status = 'approved'
         AND c.is_active = 1
         AND i.status = 'ACCEPTED'
         AND COALESCE(i.student_visibility, 0) = 1
       ORDER BY i.created_at DESC`,
    ).all<{
      id: string;
      title: string;
      description: string;
      department_id: string;
      department_name: string;
      college_id: string;
      college_name: string;
    }>();

    return ok('Public internships fetched',
      (rows.results ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        departmentId: row.department_id,
        departmentName: row.department_name,
        collegeId: row.college_id,
        collegeName: row.college_name,
      })),
    );
  }

  if (request.method === 'GET' && pathname === '/api/public/stats') {
    const [students, colleges, industries, vacancies, applied, completed] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) AS count FROM students').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM colleges WHERE is_active = 1').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM industries WHERE is_active = 1').first<{ count: number }>(),
      env.DB.prepare('SELECT COALESCE(SUM(vacancy), 0) AS count FROM internships WHERE status = \'OPEN\'').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM internship_applications').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM internship_applications WHERE completed_at IS NOT NULL').first<{ count: number }>(),
    ]);

    return ok('Public stats fetched', {
      students: Number(students?.count ?? 0),
      colleges: Number(colleges?.count ?? 0),
      industries: Number(industries?.count ?? 0),
      vacancies: Number(vacancies?.count ?? 0),
      applied: Number(applied?.count ?? 0),
      completed: Number(completed?.count ?? 0),
    });
  }

  if (request.method === 'GET' && (pathname === '/api/dashboard/superadmin' || pathname === '/super-admin/dashboard')) {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;

    const [colleges, industries, apps, internships, users, loginLogs, industryTypes] = await Promise.all([
      env.DB.prepare('SELECT id, name, coordinator_name, coordinator_email, mobile, status FROM colleges ORDER BY created_at DESC').all(),
      env.DB.prepare(
        `SELECT i.id, i.name, i.email, i.status, it.name AS category
         FROM industries i
         LEFT JOIN industry_types it ON it.id = i.industry_type_id
         ORDER BY i.created_at DESC`,
      ).all(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM internship_applications').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM internships').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM auth_identities').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM approval_audit_log').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM industry_types').first<{ count: number }>(),
    ]);

    return ok('Superadmin dashboard loaded', {
      colleges: (colleges.results ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        coordinatorName: c.coordinator_name,
        email: c.coordinator_email,
        phone: c.mobile,
        status: c.status,
        studentsCount: 0,
      })),
      industries: (industries.results ?? []).map((i: any) => ({
        id: i.id,
        name: i.name,
        email: i.email,
        phone: '',
        category: i.category,
        status: i.status,
      })),
      analytics: {
        totalApplications: Number(apps?.count ?? 0),
        totalInternships: Number(internships?.count ?? 0),
        totalUsers: Number(users?.count ?? 0),
        totalLoginLogs: Number(loginLogs?.count ?? 0),
        totalIndustryTypes: Number(industryTypes?.count ?? 0),
      },
    });
  }

  if (request.method === 'GET' && pathname === '/api/admin/colleges') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT id, name, address, university, mobile, coordinator_name, coordinator_email, status, is_active, created_at, updated_at
       FROM colleges
       ORDER BY created_at DESC`,
    ).all();

    return ok('Admin colleges fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/admin/industries') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT i.id, i.name, i.email, i.business_activity, i.status, i.is_active, i.created_at, i.updated_at,
              it.name AS industry_type_name
       FROM industries i
       LEFT JOIN industry_types it ON it.id = i.industry_type_id
       ORDER BY i.created_at DESC`,
    ).all();

    return ok('Admin industries fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/admin/students') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT s.id, s.name, s.email, s.phone, s.is_active, s.created_at,
              c.name AS college_name,
              d.name AS department_name,
              p.name AS program_name
       FROM students s
       INNER JOIN colleges c ON c.id = s.college_id
       INNER JOIN departments d ON d.id = s.department_id
       INNER JOIN programs p ON p.id = s.program_id
       ORDER BY s.created_at DESC`,
    ).all();

    return ok('Admin students fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/admin/departments') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT d.id, d.name, d.coordinator_name, d.coordinator_email, d.coordinator_mobile, d.is_active, d.created_at,
              c.id AS college_id, c.name AS college_name
       FROM departments d
       INNER JOIN colleges c ON c.id = d.college_id
       ORDER BY d.created_at DESC`,
    ).all();

    return ok('Admin departments fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && (pathname === '/api/dashboard/college' || pathname === '/college/dashboard')) {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;

    const collegeId = actor.id;
    const [college, pendingMous, approvedIndustries, studentsCount, appCount] = await Promise.all([
      env.DB.prepare('SELECT id, name, address FROM colleges WHERE id = ?').bind(collegeId).first(),
      env.DB.prepare(
        `SELECT l.id, i.name AS industry_name, i.business_activity, l.created_at
         FROM college_industry_links l
         INNER JOIN industries i ON i.id = l.industry_id
         WHERE l.college_id = ? AND l.status = 'requested'
         ORDER BY l.created_at DESC`,
      ).bind(collegeId).all(),
      env.DB.prepare(
        `SELECT i.id, i.name
         FROM college_industry_links l
         INNER JOIN industries i ON i.id = l.industry_id
         WHERE l.college_id = ? AND l.status = 'active'
         ORDER BY i.name ASC`,
      ).bind(collegeId).all(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM students WHERE college_id = ?').bind(collegeId).first<{ count: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS count
         FROM internship_applications ia
         INNER JOIN students s ON s.id = ia.student_id
         WHERE s.college_id = ?`,
      ).bind(collegeId).first<{ count: number }>(),
    ]);

    return ok('College dashboard loaded', {
      college,
      stats: {
        pendingMous: (pendingMous.results ?? []).length,
        approvedIndustries: (approvedIndustries.results ?? []).length,
        activeStudents: Number(studentsCount?.count ?? 0),
        applicationsSubmitted: Number(appCount?.count ?? 0),
      },
      pendingMous: (pendingMous.results ?? []).map((row: any) => ({
        id: row.id,
        industryName: row.industry_name,
        industryDescription: row.business_activity,
        createdAtLabel: row.created_at,
      })),
      approvedIndustries: approvedIndustries.results ?? [],
    });
  }

  if (request.method === 'GET' && pathname === '/api/dashboard/college/control-center') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;

    const collegeId = actor.id;
    const [summary, departmentPerformance, internships, approvalQueue, applications, evaluationStatus, ipoSummary, alerts] = await Promise.all([
      env.DB.prepare(
        `SELECT
          COUNT(DISTINCT i.id) AS total_internships,
          SUM(CASE WHEN UPPER(COALESCE(i.status, '')) IN ('PUBLISHED','ACCEPTED') THEN 1 ELSE 0 END) AS active_internships,
          COUNT(DISTINCT a.id) AS total_students_applied,
          SUM(CASE WHEN UPPER(COALESCE(a.status, '')) IN ('ALLOTTED','SELECTED','COMPLETED','ACCEPTED') THEN 1 ELSE 0 END) AS students_placed,
          SUM(CASE WHEN UPPER(COALESCE(a.status, '')) IN ('APPLIED','PENDING') THEN 1 ELSE 0 END) AS pending_allocations,
          SUM(CASE WHEN COALESCE(a.is_external, 0) = 1 THEN 1 ELSE 0 END) AS external_applications_count
         FROM internships i
         LEFT JOIN applications a ON a.internship_id = i.id
         WHERE i.college_id = ?`,
      ).bind(collegeId).first<any>(),
      env.DB.prepare(
        `SELECT
          d.id,
          d.name AS department_name,
          COUNT(DISTINCT s.id) AS total_students,
          COUNT(DISTINCT a.id) AS applications_submitted,
          SUM(CASE WHEN UPPER(COALESCE(a.status, '')) IN ('SELECTED','ALLOTTED','COMPLETED','ACCEPTED') THEN 1 ELSE 0 END) AS students_selected,
          ROUND(
            CASE WHEN COUNT(DISTINCT s.id) = 0 THEN 0
              ELSE (SUM(CASE WHEN UPPER(COALESCE(a.status, '')) IN ('COMPLETED','ACCEPTED') THEN 1 ELSE 0 END) * 100.0) / COUNT(DISTINCT s.id)
            END, 2
          ) AS completion_rate,
          CASE
            WHEN SUM(CASE WHEN ie.id IS NULL AND UPPER(COALESCE(a.status, '')) IN ('COMPLETED','ACCEPTED') THEN 1 ELSE 0 END) > 0 THEN 'PENDING'
            ELSE 'SUBMITTED'
          END AS evaluation_status
         FROM departments d
         LEFT JOIN students s ON s.department_id = d.id
         LEFT JOIN applications a ON a.student_id = s.id
         LEFT JOIN internship_evaluations ie ON ie.application_id = a.id
         WHERE d.college_id = ?
         GROUP BY d.id, d.name
         ORDER BY d.name ASC`,
      ).bind(collegeId).all<any>(),
      env.DB.prepare(
        `SELECT
          i.id,
          i.title,
          COALESCE(i.created_by, i.source_type, 'INDUSTRY') AS created_by,
          COALESCE(d.name, 'All Departments') AS target_department,
          printf('%d / %d', COALESCE(i.filled_vacancy, 0), COALESCE(i.total_vacancy, COALESCE(i.vacancy, 0))) AS vacancy,
          COUNT(DISTINCT a.id) AS applications_count,
          COALESCE(i.status, 'DRAFT') AS status,
          CASE
            WHEN COALESCE(i.total_vacancy, COALESCE(i.vacancy, 0)) <= COALESCE(i.filled_vacancy, 0) AND COALESCE(i.total_vacancy, COALESCE(i.vacancy, 0)) > 0 THEN 'Vacancy full'
            WHEN COUNT(DISTINCT a.id) = 0 THEN 'No applicants'
            ELSE 'Healthy'
          END AS alert
         FROM internships i
         LEFT JOIN departments d ON d.id = i.department_id
         LEFT JOIN applications a ON a.internship_id = i.id
         WHERE i.college_id = ?
         GROUP BY i.id, i.title, i.created_by, i.source_type, d.name, i.filled_vacancy, i.total_vacancy, i.vacancy, i.status
         ORDER BY i.created_at DESC`,
      ).bind(collegeId).all<any>(),
      env.DB.prepare(
        `SELECT
          i.id,
          i.title,
          ind.name AS industry_name,
          COALESCE(d.name, 'Unassigned') AS assigned_department,
          i.status,
          i.created_at
         FROM internships i
         LEFT JOIN industries ind ON ind.id = i.industry_id
         LEFT JOIN departments d ON d.id = i.department_id
         WHERE i.college_id = ?
           AND UPPER(COALESCE(i.created_by, i.source_type, 'INDUSTRY')) = 'INDUSTRY'
           AND UPPER(COALESCE(i.status, 'DRAFT')) IN ('DRAFT', 'SENT_TO_DEPARTMENT', 'SENT_TO_DEPT')
         ORDER BY i.created_at DESC`,
      ).bind(collegeId).all<any>(),
      env.DB.prepare(
        `SELECT
          a.id,
          a.status,
          a.created_at,
          i.title AS internship_title,
          CASE WHEN COALESCE(a.is_external, 0) = 1 THEN 'EXTERNAL' ELSE 'INTERNAL' END AS application_type,
          COALESCE(s.name, 'Student') AS student_name,
          COALESCE(s.email, '') AS student_email
         FROM applications a
         INNER JOIN internships i ON i.id = a.internship_id
         LEFT JOIN students s ON s.id = a.student_id
         WHERE i.college_id = ?
         ORDER BY a.created_at DESC`,
      ).bind(collegeId).all<any>(),
      env.DB.prepare(
        `SELECT
          d.name AS department,
          SUM(CASE WHEN ie.id IS NOT NULL THEN 1 ELSE 0 END) AS students_evaluated,
          SUM(CASE WHEN ie.id IS NULL AND UPPER(COALESCE(a.status, '')) IN ('COMPLETED','ACCEPTED') THEN 1 ELSE 0 END) AS pending_evaluations,
          CASE
            WHEN SUM(CASE WHEN ie.id IS NULL AND UPPER(COALESCE(a.status, '')) IN ('COMPLETED','ACCEPTED') THEN 1 ELSE 0 END) > 0 THEN 'Pending'
            ELSE 'Submitted'
          END AS submission_status
         FROM departments d
         LEFT JOIN students s ON s.department_id = d.id
         LEFT JOIN applications a ON a.student_id = s.id
         LEFT JOIN internship_evaluations ie ON ie.application_id = a.id
         WHERE d.college_id = ?
         GROUP BY d.id, d.name
         ORDER BY d.name ASC`,
      ).bind(collegeId).all<any>(),
      env.DB.prepare(
        `SELECT
          ind.id AS ipo_id,
          ind.name AS ipo_name,
          COUNT(DISTINCT i.id) AS internship_count,
          SUM(CASE WHEN UPPER(COALESCE(i.status, '')) IN ('PUBLISHED','ACCEPTED') THEN 1 ELSE 0 END) AS active_engagements
         FROM industries ind
         INNER JOIN college_industry_links cil ON cil.industry_id = ind.id AND cil.college_id = ?
         LEFT JOIN internships i ON i.industry_id = ind.id AND i.college_id = ?
         GROUP BY ind.id, ind.name
         ORDER BY ind.name ASC`,
      ).bind(collegeId, collegeId).all<any>(),
      env.DB.prepare(
        `SELECT message, level, created_at FROM compliance_violations
         WHERE college_id = ?
         ORDER BY created_at DESC
         LIMIT 10`,
      ).bind(collegeId).all<any>(),
    ]);

    const appRows = applications.results ?? [];
    const internalApplications = appRows.filter((row: any) => row.application_type === 'INTERNAL');
    const externalApplications = appRows.filter((row: any) => row.application_type === 'EXTERNAL');
    const byStatus = (rows: any[], status: string) => rows.filter((row) => String(row.status ?? '').toUpperCase() === status.toUpperCase()).length;

    return ok('College control center loaded', {
      summary: {
        totalInternships: Number(summary?.total_internships ?? 0),
        activeInternships: Number(summary?.active_internships ?? 0),
        totalStudentsApplied: Number(summary?.total_students_applied ?? 0),
        studentsPlaced: Number(summary?.students_placed ?? 0),
        pendingAllocations: Number(summary?.pending_allocations ?? 0),
        externalApplicationsCount: Number(summary?.external_applications_count ?? 0),
      },
      approvalQueue: approvalQueue.results ?? [],
      departmentPerformance: departmentPerformance.results ?? [],
      internships: internships.results ?? [],
      applications: {
        internal: internalApplications,
        external: externalApplications,
        internalByStatus: {
          pending: byStatus(internalApplications, 'APPLIED'),
          approved: byStatus(internalApplications, 'ACCEPTED'),
          rejected: byStatus(internalApplications, 'REJECTED'),
          allotted: byStatus(internalApplications, 'ALLOTTED'),
        },
        externalByStatus: {
          pending: byStatus(externalApplications, 'APPLIED'),
          approved: byStatus(externalApplications, 'ACCEPTED'),
          rejected: byStatus(externalApplications, 'REJECTED'),
          allotted: byStatus(externalApplications, 'ALLOTTED'),
        },
      },
      evaluationStatus: evaluationStatus.results ?? [],
      analytics: {
        departmentParticipation: (departmentPerformance.results ?? []).map((row: any) => ({
          label: row.department_name,
          value: Number(row.applications_submitted ?? 0),
        })),
        internshipDistribution: (internships.results ?? []).map((row: any) => ({
          label: row.title,
          value: Number(row.applications_count ?? 0),
        })),
        externalInternalRatio: {
          internal: internalApplications.length,
          external: externalApplications.length,
        },
        completionRate: (departmentPerformance.results ?? []).map((row: any) => ({
          label: row.department_name,
          value: Number(row.completion_rate ?? 0),
        })),
      },
      reportCenter: {
        collegeReportReady: true,
        departmentReportsReady: true,
        studentReportsReady: true,
        coPoSummaryReady: true,
      },
      notifications: alerts.results ?? [],
      ipoSummary: ipoSummary.results ?? [],
    });
  }

  if (request.method === 'GET' && (pathname === '/api/dashboard/department' || pathname === '/department/dashboard')) {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR']);
    if (actor instanceof Response) return actor;

    const [programs, internships, students] = await Promise.all([
      env.DB.prepare('SELECT id, name FROM programs WHERE department_id = ? ORDER BY name ASC').bind(actor.id).all(),
      env.DB.prepare('SELECT id, title, description, created_at FROM internships WHERE department_id = ? ORDER BY created_at DESC').bind(actor.id).all(),
      env.DB.prepare(
        `SELECT s.id, s.name, s.email, s.phone, p.name AS program_name
         FROM students s
         INNER JOIN programs p ON p.id = s.program_id
         WHERE s.department_id = ?
         ORDER BY s.created_at DESC`,
      ).bind(actor.id).all(),
    ]);

    return ok('Department dashboard loaded', {
      programs: programs.results ?? [],
      internships: internships.results ?? [],
      students: students.results ?? [],
    });
  }

  if (request.method === 'GET' && (pathname === '/api/dashboard/industry' || pathname === '/industry/dashboard')) {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;

    const [industry, internships, applications] = await Promise.all([
      env.DB.prepare('SELECT id, name, business_activity FROM industries WHERE id = ?').bind(actor.id).first(),
      env.DB.prepare(
        `SELECT id, title, description
         FROM internships
         WHERE industry_id = ?
         ORDER BY created_at DESC`,
      ).bind(actor.id).all(),
      env.DB.prepare(
        `SELECT ia.id,
                ia.status,
                ia.created_at,
                ia.completed_at,
                ia.industry_feedback,
                ia.industry_score,
                COALESCE(s.name, es.name) AS student_name,
                COALESCE(s.email, es.email) AS student_email,
                COALESCE(c.name, es.college, 'External') AS college_name,
                i.title AS opportunity_title
         FROM internship_applications ia
         INNER JOIN internships i ON i.id = ia.internship_id
         LEFT JOIN students s ON s.id = ia.student_id
         LEFT JOIN external_students es ON es.id = ia.external_student_id
         LEFT JOIN colleges c ON c.id = s.college_id
         WHERE i.industry_id = ?
         ORDER BY ia.created_at DESC`,
      ).bind(actor.id).all(),
    ]);

    const appRows = applications.results ?? [];

    return ok('Industry dashboard loaded', {
      industry: {
        id: (industry as any)?.id,
        name: (industry as any)?.name,
        description: (industry as any)?.business_activity,
      },
      stats: {
        internships: (internships.results ?? []).length,
        liveOpportunities: (internships.results ?? []).length,
        pendingApplications: appRows.filter((a: any) => String(a.status ?? '').toLowerCase() === 'pending').length,
        acceptedApplications: appRows.filter((a: any) => String(a.status ?? '').toLowerCase() === 'accepted').length,
        attendanceToday: 0,
      },
      opportunities: (internships.results ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        applications: appRows.filter((a: any) => a.opportunity_title === row.title).length,
      })),
      applications: appRows.map((row: any) => ({
        id: row.id,
        studentName: row.student_name,
        studentEmail: row.student_email,
        collegeName: row.college_name,
        opportunityTitle: row.opportunity_title,
        status: row.status.toUpperCase(),
        createdAt: row.created_at,
        completedAt: row.completed_at,
        industryFeedback: row.industry_feedback,
        industryScore: row.industry_score,
      })),
    });
  }

  if (request.method === 'GET' && (pathname === '/api/dashboard/student' || pathname === '/student/dashboard')) {
    const actor = requireRole(request, ['STUDENT', 'EXTERNAL_STUDENT']);
    if (actor instanceof Response) return actor;

    if (actor.role === 'STUDENT') {
      return loadStudentDashboard(env, actor.id);
    }

    const [internships, applications] = await Promise.all([
      env.DB.prepare(
        `SELECT i.id, i.title, i.description, ind.name AS industry_name,
                ia.id AS application_id, ia.status AS application_status
         FROM internships i
         LEFT JOIN industry_internships ii ON ii.title = i.title
         LEFT JOIN industries ind ON ind.id = ii.industry_id
         LEFT JOIN internship_applications ia ON ia.internship_id = i.id AND ia.external_student_id = ?
         ORDER BY i.created_at DESC`,
      ).bind(actor.id).all(),
      env.DB.prepare(
        `SELECT ia.id, ia.status, i.title, COALESCE(ind.name, 'Industry') AS industry_name
         FROM internship_applications ia
         INNER JOIN internships i ON i.id = ia.internship_id
         LEFT JOIN industry_internships ii ON ii.title = i.title
         LEFT JOIN industries ind ON ind.id = ii.industry_id
         WHERE ia.external_student_id = ?
         ORDER BY ia.created_at DESC`,
      ).bind(actor.id).all(),
    ]);

    const applicationRows = applications.results ?? [];

    return ok('External student dashboard loaded', {
      internships: (internships.results ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        industryName: row.industry_name,
        applied: Boolean(row.application_id),
        status: row.application_status ? String(row.application_status).toUpperCase() : undefined,
      })),
      applications: applicationRows.map((row: any) => ({
        id: row.id,
        internshipTitle: row.title,
        industryName: row.industry_name,
        status: String(row.status).toUpperCase(),
      })),
      journeyCompletion: applicationRows.length > 0 ? 60 : 25,
      journeySteps: [
        { label: 'Profile created', done: true },
        { label: 'Applied to internship', done: applicationRows.length > 0 },
      ],
    });
  }

  if (request.method === 'POST' && pathname === '/api/documents/generate/approval') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const internshipId = required(body, ['internshipId', 'internship_id']);
    if (!internshipId) return badRequest('internshipId is required');
    const generated = await generateDocument(env, { type: 'approval', internshipId, actor });
    return ok('Approval letter generated', generated);
  }

  if (request.method === 'POST' && pathname === '/api/documents/generate/reply') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const internshipId = required(body, ['internshipId', 'internship_id']);
    const supervisorName = required(body, ['supervisorName', 'supervisor_name']);
    const supervisorDesignation = required(body, ['supervisorDesignation', 'supervisor_designation']);
    if (!internshipId || !supervisorName || !supervisorDesignation) return badRequest('internshipId, supervisorName, supervisorDesignation are required');
    const generated = await generateDocument(env, { type: 'reply', internshipId, actor, supervisorName, supervisorDesignation });
    return ok('Industry reply letter generated', generated);
  }

  if (request.method === 'POST' && pathname === '/api/documents/generate/allotment') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const internshipId = required(body, ['internshipId', 'internship_id']);
    const studentId = required(body, ['studentId', 'student_id']);
    if (!internshipId || !studentId) return badRequest('internshipId and studentId are required');
    const generated = await generateDocument(env, { type: 'allotment', internshipId, studentId, actor });
    return ok('Allotment letter generated', generated);
  }

  if (request.method === 'POST' && pathname === '/api/documents/generate/feedback') {
    const actor = requireRole(request, ['INDUSTRY', 'DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const internshipId = required(body, ['internshipId', 'internship_id']);
    const studentId = required(body, ['studentId', 'student_id']);
    if (!internshipId || !studentId) return badRequest('internshipId and studentId are required');
    const generated = await generateDocument(env, { type: 'feedback', internshipId, studentId, actor });
    return ok('Performance feedback form generated', generated);
  }

  const downloadDocumentMatch = pathname.match(/^\/api\/documents\/([^/]+)\/download$/);
  if (request.method === 'GET' && downloadDocumentMatch) {
    const actor = requireRole(request, ['INDUSTRY', 'STUDENT', 'EXTERNAL_STUDENT', 'DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    return downloadDocument(env, downloadDocumentMatch[1], actor);
  }

  const previewDocumentMatch = pathname.match(/^\/api\/documents\/([^/]+)\/preview$/);
  if (request.method === 'GET' && previewDocumentMatch) {
    const actor = requireRole(request, ['INDUSTRY', 'STUDENT', 'EXTERNAL_STUDENT', 'DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const payload = await fetchDocumentPayload(env, previewDocumentMatch[1], actor);
    if (!payload) return errorResponse(404, 'Document not found');
    return ok('Document preview loaded', payload);
  }

  if (request.method === 'GET' && pathname === '/api/documents/student-bundle') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const studentId = toText(url.searchParams.get('studentId'));
    if (!studentId) return badRequest('studentId is required');
    return downloadStudentBundle(env, studentId, actor);
  }

  if (request.method === 'GET' && pathname === '/api/documents/my') {
    const actor = requireRole(request, ['INDUSTRY', 'STUDENT', 'EXTERNAL_STUDENT', 'DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const docs = await listDocumentsForActor(env, actor);
    return ok('Documents loaded', docs);
  }



  if (request.method === 'POST' && pathname === '/api/department/create') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;

    const body = await readBody(request);
    console.log('BODY:', body);

    const collegeId = required(body, ['college_id', 'collegeId']) || actor.id;
    const name = required(body, ['name']);
    const coordinatorName = required(body, ['coordinator_name', 'coordinatorName']);
    const coordinatorEmail = normalizeEmail(required(body, ['coordinator_email', 'coordinatorEmail', 'email']));
    const coordinatorMobile = optional(body, ['coordinator_mobile', 'coordinatorMobile']);

    if (!collegeId || !name || !coordinatorName || !coordinatorEmail) {
      return badRequest('college_id, name, coordinator_name, coordinator_email are required');
    }

    const password = generatePassword(10);

    const exists = await env.DB.prepare('SELECT id FROM departments WHERE lower(coordinator_email) = lower(?)').bind(coordinatorEmail).first();
    if (exists) return conflict('Department coordinator email already exists');

    const departmentId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO departments (id, college_id, name, coordinator_name, coordinator_email, coordinator_mobile, password, is_first_login, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
    )
      .bind(departmentId, collegeId, name, coordinatorName, coordinatorEmail, coordinatorMobile, password)
      .run();

    await upsertIdentity(env, { role: 'department', entityId: departmentId, email: coordinatorEmail, isActive: 1 });

    await sendCredentialEmail(env, coordinatorEmail, name, password);

    return created('Department created and credentials sent', { id: departmentId, passwordSent: true });
  }

  if (request.method === 'GET' && pathname === '/api/department/list') {
    const actor = requireRole(request, ['COLLEGE', 'SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;

    const collegeId = toText(url.searchParams.get('college_id')) || toText(url.searchParams.get('collegeId')) || actor.id;
    if (!collegeId) return badRequest('college_id is required');

    const rows = await env.DB.prepare(
      `SELECT id, college_id, name, coordinator_name, coordinator_email, coordinator_mobile, is_first_login, is_active, created_at
       FROM departments
       WHERE college_id = ?
       ORDER BY created_at DESC`,
    ).bind(collegeId).all();

    return ok('Departments fetched', rows.results ?? []);
  }

  if (request.method === 'PUT' && pathname === '/api/department/update') {
    const actor = requireRole(request, ['COLLEGE', 'SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    console.log('BODY:', body);

    const id = required(body, ['id']);
    if (!id) return badRequest('id is required');

    const result = await env.DB.prepare(
      `UPDATE departments
       SET name = COALESCE(?, name),
           coordinator_name = COALESCE(?, coordinator_name),
           coordinator_email = COALESCE(?, coordinator_email),
           coordinator_mobile = COALESCE(?, coordinator_mobile),
           is_active = COALESCE(?, is_active),
           updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(optional(body, ['name']), optional(body, ['coordinator_name', 'coordinatorName']), optional(body, ['coordinator_email', 'coordinatorEmail']), optional(body, ['coordinator_mobile', 'coordinatorMobile']), toBooleanInt(optional(body, ['is_active', 'isActive'])), id)
      .run();

    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Department not found');
    return ok('Department updated');
  }

  if (request.method === 'DELETE' && pathname === '/api/department/delete') {
    const actor = requireRole(request, ['COLLEGE', 'SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;

    const departmentId = toText(url.searchParams.get('id'));
    if (!departmentId) return badRequest('id is required');

    const result = await env.DB.prepare("UPDATE departments SET is_active = 0, updated_at = datetime('now') WHERE id = ?")
      .bind(departmentId)
      .run();

    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Department not found');
    return ok('Department deleted');
  }

  if (request.method === 'POST' && pathname === '/api/department/login') {
    const body = await readBody(request);
    console.log('BODY:', body);

    const email = normalizeEmail(required(body, ['email', 'coordinator_email']));
    const password = required(body, ['password']);
    if (!email || !password) return badRequest('email and password are required');

    const dept = await env.DB.prepare(
      `SELECT id, coordinator_email, password, is_first_login, is_active
       FROM departments WHERE lower(coordinator_email) = lower(?)`,
    ).bind(email).first<{ id: string; coordinator_email: string; password: string; is_first_login: number; is_active: number }>();

    if (!dept || dept.password !== password) return unauthorized('Invalid credentials');
    if (Number(dept.is_active) !== 1) return forbidden('Department account inactive');

    return ok('Department login successful', {
      ...createSession({ id: dept.id, email: dept.coordinator_email, role: 'DEPARTMENT_COORDINATOR' }),
      mustChangePassword: Number(dept.is_first_login) === 1,
    });
  }

  if (request.method === 'POST' && pathname === '/api/department/change-password') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const body = await readBody(request);
    console.log('BODY:', body);

    const currentPassword = required(body, ['current_password', 'currentPassword']);
    const newPassword = required(body, ['new_password', 'newPassword']);
    if (!currentPassword || !newPassword) return badRequest('current_password and new_password are required');

    const row = await env.DB.prepare('SELECT id, password FROM departments WHERE id = ?').bind(actor.id).first<{ id: string; password: string }>();
    if (!row || row.password !== currentPassword) return unauthorized('Current password is incorrect');

    await env.DB.prepare("UPDATE departments SET password = ?, is_first_login = 0, updated_at = datetime('now') WHERE id = ?")
      .bind(newPassword, actor.id)
      .run();

    return ok('Password changed successfully');
  }

  if (request.method === 'GET' && pathname === '/api/industry/colleges') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT DISTINCT c.id, c.name
       FROM colleges c
       WHERE c.is_active = 1 AND c.status = 'approved'
       ORDER BY c.name ASC`,
    ).all();

    return ok('Industry colleges fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/industry/profile') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const row = await env.DB.prepare(
      `SELECT id, name, email, business_activity, company_address, contact_number, registration_number, registration_year
       FROM industries
       WHERE id = ?`,
    ).bind(actor.id).first();
    if (!row) return errorResponse(404, 'IPO profile not found');
    return ok('IPO profile fetched', row);
  }

  if (request.method === 'PUT' && pathname === '/api/industry/profile') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);

    await env.DB.prepare(
      `UPDATE industries
       SET company_address = COALESCE(?, company_address),
           contact_number = COALESCE(?, contact_number),
           email = COALESCE(?, email),
           registration_number = COALESCE(?, registration_number),
           registration_year = COALESCE(?, registration_year),
           updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(
        optional(body, ['company_address', 'companyAddress']),
        optional(body, ['contact_number', 'contactNumber']),
        optional(body, ['email']) ? normalizeEmail(toText(optional(body, ['email']))) : null,
        optional(body, ['registration_number', 'registrationNumber']),
        optional(body, ['registration_year', 'registrationYear']) ? Number(optional(body, ['registration_year', 'registrationYear'])) : null,
        actor.id,
      )
      .run();

    return ok('IPO profile updated');
  }

  const ipoProfileMatch = pathname.match(/^\/api\/ipo\/([^/]+)$/);
  if (ipoProfileMatch && request.method === 'GET') {
    const actor = requireRole(request, ['STUDENT', 'EXTERNAL_STUDENT', 'COLLEGE', 'DEPARTMENT_COORDINATOR', 'COORDINATOR', 'INDUSTRY']);
    if (actor instanceof Response) return actor;
    const row = await env.DB.prepare(
      `SELECT id, name, email, business_activity, company_address, contact_number, registration_number, registration_year
       FROM industries
       WHERE id = ?`,
    ).bind(ipoProfileMatch[1]).first();
    if (!row) return errorResponse(404, 'IPO profile not found');
    return ok('IPO profile fetched', row);
  }

  const industryCollegeDepartmentsMatch = pathname.match(/^\/api\/industry\/colleges\/([^/]+)\/departments$/);
  if (industryCollegeDepartmentsMatch && request.method === 'GET') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;

    const collegeId = industryCollegeDepartmentsMatch[1];

    const rows = await env.DB.prepare(
      `SELECT id, name
       FROM departments
       WHERE college_id = ? AND is_active = 1
       ORDER BY name ASC`,
    ).bind(collegeId).all();

    return ok('College departments fetched', rows.results ?? []);
  }

  if (request.method === 'POST' && pathname === '/api/industry/send-to-department') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    console.log('SEND TO DEPT:', body);

    const internshipTitle = required(body, ['internship_title', 'internshipTitle']);
    const college = required(body, ['college', 'collegeId']);
    const department = optional(body, ['department', 'departmentId']);
    const programme = optional(body, ['programme', 'program', 'programId']);
    const category = required(body, ['category', 'internshipCategory']);
    const vacancyRaw = optional(body, ['vacancy']);
    const vacancy = vacancyRaw ? Number(vacancyRaw) : 0;
    const description = optional(body, ['description', 'natureOfWork']) ?? 'Internship opportunity submitted by industry';
    const genderPreference = toText(optional(body, ['gender_preference', 'genderPreference'])).toUpperCase() || 'BOTH';
    const hourDuration = optional(body, ['hour_duration', 'hourDuration']) ? Number(optional(body, ['hour_duration', 'hourDuration'])) : null;
    const stipendAmount = optional(body, ['stipend_amount', 'stipendAmount']) ? Number(optional(body, ['stipend_amount', 'stipendAmount'])) : null;
    const stipendDuration = toText(optional(body, ['stipend_duration', 'stipendDuration'])) || null;
    const fee = optional(body, ['fee']) ? Number(optional(body, ['fee'])) : null;

    if (!internshipTitle || !college || !category || !vacancyRaw) {
      return badRequest('internship_title, college, category and vacancy are required');
    }
    if (department && !programme) return badRequest('programme is required when a department is selected');
    if (!department && programme) return badRequest('programme must be empty when department is no preference');
    if (Number.isNaN(vacancy) || vacancy <= 0) return badRequest('vacancy must be a positive number');
    if (!['FREE', 'PAID', 'STIPEND'].includes(category.toUpperCase())) {
      return badRequest('category must be FREE, PAID or STIPEND');
    }
    if (!['GIRLS', 'BOYS', 'BOTH'].includes(genderPreference)) return badRequest('gender_preference must be GIRLS, BOYS or BOTH');

    let departmentRow: { id: string } | null = null;
    if (department) {
      departmentRow = await env.DB.prepare(
        `SELECT d.id
         FROM departments d
         WHERE d.id = ? AND d.college_id = ?`,
      ).bind(department, college).first<{ id: string }>();
      if (!departmentRow) return badRequest('Invalid college/department mapping');
    }

    const duplicate = await env.DB.prepare(
      `SELECT id
       FROM internships
       WHERE industry_id = ?
         AND college_id = ?
         AND COALESCE(department_id, '') = COALESCE(?, '')
         AND lower(title) = lower(?)
         AND status IN (?, ?)`,
    ).bind(actor.id, college, departmentRow?.id ?? null, internshipTitle, INTERNSHIP_STATUS.DRAFT, INTERNSHIP_STATUS.SENT_TO_DEPARTMENT).first<{ id: string }>();
    if (duplicate) return conflict('A similar internship is already pending');

    const internshipId = crypto.randomUUID();
    const result = await env.DB.prepare(
      `INSERT INTO internships (
        id, title, description, college_id, department_id, industry_id, is_external, internship_category, vacancy, total_vacancy, remaining_vacancy, status, student_visibility, programme, duration, requirements, stipend_amount, stipend_duration, fee, gender_preference
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      internshipId,
      internshipTitle.trim(),
      description,
      college,
      departmentRow?.id ?? null,
      actor.id,
      category.toUpperCase(),
      Math.floor(vacancy),
      Math.floor(vacancy),
      Math.floor(vacancy),
      INTERNSHIP_STATUS.SENT_TO_DEPARTMENT,
      department ? (programme ?? '').trim() : null,
      hourDuration && hourDuration > 0 ? `${hourDuration} hours` : null,
      `Preference: ${genderPreference}`,
      category.toUpperCase() === 'STIPEND' ? stipendAmount : null,
      category.toUpperCase() === 'STIPEND' ? stipendDuration : null,
      category.toUpperCase() === 'PAID' ? fee : null,
      genderPreference,
    ).run();

    console.log('DB INSERT RESULT:', result);
    return created('Sent to Department', { id: internshipId, status: INTERNSHIP_STATUS.SENT_TO_DEPARTMENT });
  }

  if (request.method === 'POST' && pathname === '/api/industry/publish') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const internshipId = required(body, ['id', 'internship_id', 'internshipId']);
    const vacancy = Number(optional(body, ['vacancy']) ?? 0);
    const genderPreference = toText(optional(body, ['gender_preference', 'genderPreference'])).toUpperCase() || 'BOTH';
    const internshipCategory = toText(optional(body, ['internship_category', 'internshipCategory'])).toUpperCase() || null;
    const fee = optional(body, ['fee']) ? Number(optional(body, ['fee'])) : null;
    const stipendAmount = optional(body, ['stipend_amount', 'stipendAmount']) ? Number(optional(body, ['stipend_amount', 'stipendAmount'])) : null;
    const stipendDuration = toText(optional(body, ['stipend_duration', 'stipendDuration'])) || null;
    const hourDuration = optional(body, ['hour_duration', 'hourDuration', 'durationHours']) ? Number(optional(body, ['hour_duration', 'hourDuration', 'durationHours'])) : null;
    if (!internshipId) return badRequest('id is required');

    const internship = await env.DB.prepare(
      'SELECT id, status FROM internships WHERE id = ? AND industry_id = ?',
    ).bind(internshipId, actor.id).first<{ id: string; status: string }>();
    if (!internship) return errorResponse(404, 'Internship not found');
    if (!['SENT_TO_INDUSTRY', INTERNSHIP_STATUS.ACCEPTED].includes(internship.status)) return badRequest('Only sent internships can be published');
    if (!Number.isFinite(vacancy) || vacancy <= 0) return badRequest('vacancy must be greater than 0');
    if (!['GIRLS', 'BOYS', 'BOTH'].includes(genderPreference)) return badRequest('gender_preference must be GIRLS, BOYS or BOTH');
    if (hourDuration !== null && hourDuration < 60) return badRequest('duration must be at least 60 hours');
    if (internshipCategory && !['FREE', 'PAID', 'STIPEND'].includes(internshipCategory)) return badRequest('internshipCategory must be FREE, PAID or STIPEND');
    if ((internshipCategory === 'PAID' || (internshipCategory === null && fee !== null)) && (!fee || fee <= 0)) return badRequest('fee is required for paid internship');
    if (internshipCategory === 'STIPEND' && (!stipendAmount || stipendAmount < 0)) return badRequest('stipendAmount is required for stipend internship');

    const result = await env.DB.prepare(
      `UPDATE internships
       SET student_visibility = 1,
           status = 'PUBLISHED',
           vacancy = ?,
           total_vacancy = ?,
           remaining_vacancy = ?,
           available_vacancy = ?,
           gender_preference = ?,
           internship_category = COALESCE(?, internship_category),
           fee = CASE WHEN COALESCE(?, internship_category) = 'PAID' THEN ? ELSE NULL END,
           stipend_amount = CASE WHEN COALESCE(?, internship_category) = 'STIPEND' THEN ? ELSE NULL END,
           stipend_duration = CASE WHEN COALESCE(?, internship_category) = 'STIPEND' THEN ? ELSE NULL END,
           minimum_days = COALESCE(?, minimum_days),
           updated_at = datetime('now')
       WHERE id = ? AND industry_id = ?`,
    ).bind(
      Math.floor(vacancy),
      Math.floor(vacancy),
      Math.floor(vacancy),
      Math.floor(vacancy),
      genderPreference,
      internshipCategory,
      internshipCategory,
      fee,
      internshipCategory,
      stipendAmount,
      internshipCategory,
      stipendDuration,
      hourDuration ? Math.floor(hourDuration) : null,
      internshipId,
      actor.id,
    ).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(500, 'Unable to publish internship');
    return ok('Internship published for students');
  }

  if (request.method === 'GET' && pathname === '/api/industry/internships') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const rows = await env.DB.prepare(
      `SELECT i.id,
              i.title AS internship_title,
              c.id AS college_id,
              c.name AS college_name,
              d.id AS department_id,
              d.name AS department_name,
              i.programme,
              i.internship_category AS category,
              COALESCE(i.vacancy, i.remaining_vacancy, i.total_vacancy, 0) AS vacancy,
              i.status,
              COALESCE(i.student_visibility, 0) AS student_visibility
       FROM internships i
       INNER JOIN departments d ON d.id = i.department_id
       INNER JOIN colleges c ON c.id = d.college_id
       WHERE i.industry_id = ?
       ORDER BY i.created_at DESC`,
    ).bind(actor.id).all();
    return ok('Industry internships fetched', rows.results ?? []);
  }

  if (request.method === 'POST' && pathname === '/api/industry/connect-request') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const collegeId = required(body, ['college_id', 'collegeId']);
    const departmentId = optional(body, ['department_id', 'departmentId']);
    const internshipTitle = required(body, ['internship_title', 'internshipTitle']);
    const natureOfWork = required(body, ['nature_of_work', 'natureOfWork']);
    const preference = toText(optional(body, ['gender_preference', 'genderPreference'])).toUpperCase() || 'BOTH';
    const durationLabel = toText(optional(body, ['duration_label', 'durationLabel'])) || null;
    const internshipCategory = toText(optional(body, ['internship_category', 'internshipCategory'])).toUpperCase() || 'FREE';
    const stipendAmount = optional(body, ['stipend_amount', 'stipendAmount']) ? Number(optional(body, ['stipend_amount', 'stipendAmount'])) : null;
    const stipendDuration = toText(optional(body, ['stipend_duration', 'stipendDuration'])) || null;
    const fee = optional(body, ['fee']) ? Number(optional(body, ['fee'])) : null;
    const hourDuration = optional(body, ['hour_duration', 'hourDuration']) ? Number(optional(body, ['hour_duration', 'hourDuration'])) : null;
    const vacancy = Number(required(body, ['vacancy', 'vacancies']));

    if (!collegeId || !internshipTitle || !natureOfWork) {
      return badRequest('college_id, internship_title and nature_of_work are required');
    }
    if (!['GIRLS', 'BOYS', 'BOTH'].includes(preference)) return badRequest('gender_preference must be GIRLS, BOYS or BOTH');
    if (!['FREE', 'PAID', 'STIPEND'].includes(internshipCategory)) return badRequest('internship_category must be FREE, PAID or STIPEND');
    if (Number.isNaN(vacancy) || vacancy <= 0) return badRequest('vacancy must be a positive number');

    const linked = await env.DB.prepare(
      `SELECT id FROM college_industry_links
       WHERE industry_id = ? AND college_id = ? AND status IN ('approved', 'active')`,
    ).bind(actor.id, collegeId).first<{ id: string }>();
    if (!linked) {
      const linkId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT OR IGNORE INTO college_industry_links (
          id,
          college_id,
          industry_id,
          status,
          requested_by,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 'approved', 'industry', datetime('now'), datetime('now'))`,
      ).bind(linkId, collegeId, actor.id).run();
    }

    const targetDepartments = departmentId
      ? await env.DB.prepare(
        `SELECT id FROM departments
         WHERE id = ? AND college_id = ? AND is_active = 1`,
      ).bind(departmentId, collegeId).all<{ id: string }>()
      : await env.DB.prepare(
        `SELECT id FROM departments
         WHERE college_id = ? AND is_active = 1`,
      ).bind(collegeId).all<{ id: string }>();
    const departmentRows = targetDepartments.results ?? [];
    if (!departmentRows.length) return badRequest('No active departments found for selected college');

    const details: string[] = [
      `Nature of work: ${natureOfWork}`,
      `Preference: ${preference}`,
      `Duration: ${durationLabel ?? (hourDuration && hourDuration > 0 ? `${hourDuration} hours` : '-')}`,
      `Internship type: ${internshipCategory}`,
      `Vacancy: ${vacancy}`,
    ];
    if (internshipCategory === 'PAID' && fee && fee > 0) details.push(`Fee: ${fee}`);
    if (internshipCategory === 'STIPEND') details.push(`Stipend: ${stipendAmount ?? 0} per ${stipendDuration ?? '-'}`);
    if (hourDuration && hourDuration > 0) details.push(`Hours: ${hourDuration}`);

    const createdIds: string[] = [];
    for (const department of departmentRows) {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO industry_requests (
          id,
          department_id,
          industry_id,
          internship_title,
          description,
          status,
          suggested_vacancy,
          suggested_internship_category,
          suggested_fee,
          suggested_stipend_amount,
          suggested_stipend_duration,
          gender_preference
        )
         VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id,
        department.id,
        actor.id,
        internshipTitle,
        details.join(' | '),
        Math.floor(vacancy),
        internshipCategory,
        internshipCategory === 'PAID' ? fee : null,
        internshipCategory === 'STIPEND' ? stipendAmount : null,
        internshipCategory === 'STIPEND' ? stipendDuration : null,
        preference,
      ).run();
      createdIds.push(id);
    }

    return created('Industry connect request submitted', { ids: createdIds, appliedToAllDepartments: !departmentId });
  }

  if (request.method === 'GET' && pathname === '/api/college/industries') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT l.id AS link_id, l.status, l.created_at,
              i.id AS industry_id, i.name, i.email, i.business_activity
       FROM college_industry_links l
       INNER JOIN industries i ON i.id = l.industry_id
       WHERE l.college_id = ?
       ORDER BY l.created_at DESC`,
    ).bind(actor.id).all();

    return ok('College industries fetched', rows.results ?? []);
  }

  if (request.method === 'DELETE' && pathname === '/api/college/industries') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;

    const linkId = toText(url.searchParams.get('link_id')) || toText(url.searchParams.get('id'));
    if (!linkId) return badRequest('link_id is required');

    const result = await env.DB.prepare(
      `UPDATE college_industry_links
       SET status = 'removed', updated_at = datetime('now')
       WHERE id = ? AND college_id = ?`,
    ).bind(linkId, actor.id).run();

    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Link not found');
    return ok('Industry removed from college list');
  }

  if (request.method === 'GET' && pathname === '/api/applications/internal') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT ia.id, ia.status, ia.created_at,
              s.id AS student_id, s.name AS student_name, s.email AS student_email,
              i.title AS internship_title,
              d.name AS department_name
       FROM internship_applications ia
       INNER JOIN students s ON s.id = ia.student_id
       INNER JOIN internships i ON i.id = ia.internship_id
       INNER JOIN departments d ON d.id = s.department_id
       WHERE s.college_id = ?
         AND ia.status = 'pending'
       ORDER BY ia.created_at DESC`,
    ).bind(actor.id).all();

    return ok('Internal applications fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/applications/external') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT ia.id, ia.status, ia.created_at,
              COALESCE(es.name, s.name) AS student_name,
              COALESCE(es.email, s.email) AS student_email,
              i.title AS internship_title,
              c.name AS college_name
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       INNER JOIN departments d ON d.id = i.department_id
       INNER JOIN colleges c ON c.id = d.college_id
       LEFT JOIN students s ON s.id = ia.student_id
       LEFT JOIN external_students es ON es.id = ia.external_student_id
       WHERE c.id = ?
         AND (s.college_id IS NULL OR s.college_id <> c.id)
         AND ia.status = 'pending'
       ORDER BY ia.created_at DESC`,
    ).bind(actor.id).all();

    return ok('External applications fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/internships/allocated') {
    const actor = requireRole(request, ['COLLEGE', 'INDUSTRY', 'DEPARTMENT_COORDINATOR']);
    if (actor instanceof Response) return actor;
    await ensureInternshipAllocationsTable(env);

    let query = `SELECT a.id, a.project_details, a.status, a.created_at,
                        COALESCE(s.name, es.name) AS student_name,
                        ind.name AS industry_name,
                        i.title AS internship_title
                 FROM internship_allocations a
                 LEFT JOIN students s ON s.id = a.student_id
                 LEFT JOIN external_students es ON es.id = a.external_student_id
                 INNER JOIN industries ind ON ind.id = a.industry_id
                 INNER JOIN internships i ON i.id = a.internship_id`;
    const params: string[] = [];

    if (actor.role === 'COLLEGE') {
      query += ` LEFT JOIN departments d ON d.id = i.department_id WHERE d.college_id = ?`;
      params.push(actor.id);
    } else if (actor.role === 'INDUSTRY') {
      query += ` WHERE a.industry_id = ?`;
      params.push(actor.id);
    } else {
      query += ` WHERE i.department_id = ?`;
      params.push(actor.id);
    }

    query += ` ORDER BY a.created_at DESC`;
    console.log('QUERY:', query);
    let rows;
    try {
      const stmt = env.DB.prepare(query);
      rows = params.length ? await stmt.bind(...params).all() : await stmt.all();
    } catch (error) {
      if (error instanceof Error && error.message.includes('no such table: internship_allocations')) {
        return ok('Allocated internships table not available yet', []);
      }
      throw error;
    }

    return ok('Allocated internships fetched', rows.results ?? []);
  }

  const collegeAppActionMatch = pathname.match(/^\/api\/college\/applications\/([^/]+)\/(accept|reject)$/);
  if (collegeAppActionMatch && request.method === 'POST') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;
    const [, applicationId, action] = collegeAppActionMatch;

    const app = await env.DB.prepare(
      `SELECT ia.id, ia.student_id, ia.external_student_id
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       INNER JOIN departments d ON d.id = i.department_id
       WHERE ia.id = ? AND d.college_id = ?`,
    ).bind(applicationId, actor.id).first<{ id: string; student_id: string | null; external_student_id: string | null }>();
    if (!app) return errorResponse(404, 'Application not found');

    if (action === 'reject') {
      await env.DB.prepare("UPDATE internship_applications SET status = 'rejected', updated_at = datetime('now') WHERE id = ?")
        .bind(applicationId)
        .run();
      return ok('Application rejected');
    }

    await env.DB.prepare("UPDATE internship_applications SET status = 'accepted', updated_at = datetime('now') WHERE id = ?")
      .bind(applicationId)
      .run();

    if (app.student_id) {
      await env.DB.prepare(
        `UPDATE internship_applications
         SET status = 'rejected', updated_at = datetime('now')
         WHERE student_id = ? AND id <> ? AND status = 'pending'`,
      ).bind(app.student_id, applicationId).run();
    }
    if (app.external_student_id) {
      await env.DB.prepare(
        `UPDATE internship_applications
         SET status = 'rejected', updated_at = datetime('now')
         WHERE external_student_id = ? AND id <> ? AND status = 'pending'`,
      ).bind(app.external_student_id, applicationId).run();
    }

    return ok('Application accepted and competing applications rejected');
  }

  if (request.method === 'PUT' && pathname === '/api/college/applications/bulk-status') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const ids = Array.isArray(body?.application_ids) ? body.application_ids.map((v) => toText(v)).filter(Boolean) : [];
    const action = toText(body?.action).toLowerCase();
    if (!ids.length) return badRequest('application_ids is required');
    if (!['accept', 'reject'].includes(action)) return badRequest('action must be accept or reject');

    const placeholders = ids.map(() => '?').join(',');
    const rows = await env.DB.prepare(
      `SELECT ia.id
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       WHERE ia.id IN (${placeholders}) AND i.college_id = ?`,
    ).bind(...ids, actor.id).all<{ id: string }>();
    const validIds = (rows.results ?? []).map((row) => row.id);
    if (!validIds.length) return badRequest('No applications belong to this college');

    const updatePlaceholders = validIds.map(() => '?').join(',');
    const nextStatus = action === 'accept' ? 'accepted' : 'rejected';
    await env.DB.prepare(
      `UPDATE internship_applications
       SET status = ?, updated_at = datetime('now')
       WHERE id IN (${updatePlaceholders})`,
    ).bind(nextStatus, ...validIds).run();

    return ok('Bulk action completed', { affected: validIds.length, status: nextStatus });
  }

  const collegeInternshipActionMatch = pathname.match(/^\/api\/college\/internships\/([^/]+)\/(approve|reject|force-close|assign-department)$/);
  if (collegeInternshipActionMatch && request.method === 'PUT') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;
    const [, internshipId, action] = collegeInternshipActionMatch;
    const body = await readBody(request);

    const internship = await env.DB.prepare(
      'SELECT id, college_id FROM internships WHERE id = ?',
    ).bind(internshipId).first<{ id: string; college_id: string | null }>();
    if (!internship || internship.college_id !== actor.id) return errorResponse(404, 'Internship not found');

    if (action === 'assign-department') {
      const departmentId = toText(body?.department_id);
      if (!departmentId) return badRequest('department_id is required');
      const department = await env.DB.prepare(
        'SELECT id FROM departments WHERE id = ? AND college_id = ?',
      ).bind(departmentId, actor.id).first<{ id: string }>();
      if (!department) return badRequest('Invalid department');
      await env.DB.prepare(
        `UPDATE internships
         SET department_id = ?, updated_at = datetime('now')
         WHERE id = ?`,
      ).bind(departmentId, internshipId).run();
      return ok('Department assigned');
    }

    if (action === 'force-close') {
      await env.DB.prepare(
        `UPDATE internships
         SET status = 'CLOSED', available_vacancy = 0, remaining_vacancy = 0, updated_at = datetime('now')
         WHERE id = ?`,
      ).bind(internshipId).run();
      return ok('Internship force closed');
    }

    const nextStatus = action === 'approve' ? 'SENT_TO_DEPARTMENT' : 'REJECTED';
    await env.DB.prepare('UPDATE internships SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(nextStatus, internshipId).run();
    return ok(action === 'approve' ? 'Internship approved' : 'Internship rejected');
  }


  const actionMatch = pathname.match(/^\/api\/admin\/(college|industry|student|department)\/([^/]+)\/(approve|reject|delete|edit)$/);
  if (actionMatch) {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const [, entity, entityId, action] = actionMatch;
    if (request.method !== 'POST') return errorResponse(405, 'Method not allowed');

    if (action === 'delete') {
      return deleteAdminEntity(env, entity, entityId);
    }
    if (action === 'approve') {
      return approveAdminEntity(env, entity, entityId, actor.id);
    }
    if (action === 'reject') {
      return rejectAdminEntity(env, entity, entityId, actor.id);
    }
    return editAdminEntity(request, env, entity, entityId);
  }



  const externalApplyMatch = pathname.match(/^\/api\/external\/applications\/([^/]+)$/);
  if (externalApplyMatch && request.method === 'POST') {
    const actor = requireRole(request, ['EXTERNAL_STUDENT']);
    if (actor instanceof Response) return actor;
    const internshipId = externalApplyMatch[1];

    const internship = await env.DB.prepare('SELECT id FROM internships WHERE id = ?').bind(internshipId).first();
    if (!internship) return badRequest('Invalid internship id');

    const duplicate = await env.DB.prepare('SELECT id FROM internship_applications WHERE external_student_id = ? AND internship_id = ?')
      .bind(actor.id, internshipId)
      .first();
    if (duplicate) return conflict('Application already submitted for this internship');

    await env.DB.prepare(
      `INSERT INTO internship_applications (id, external_student_id, internship_id, status)
       VALUES (?, ?, ?, 'pending')`,
    )
      .bind(crypto.randomUUID(), actor.id, internshipId)
      .run();

    return created('External student application submitted', { internshipId, status: 'pending' });
  }

  const studentApplyMatch = pathname.match(/^\/api\/student\/applications\/([^/]+)$/);
  if (studentApplyMatch && request.method === 'POST') {
    const actor = requireRole(request, ['STUDENT']);
    if (actor instanceof Response) return actor;
    const internshipId = studentApplyMatch[1];

    const internship = await env.DB.prepare(
      `SELECT i.id, i.vacancy, d.college_id
       FROM internships i
       INNER JOIN departments d ON d.id = i.department_id
       WHERE i.id = ?`,
    ).bind(internshipId).first<{ id: string; vacancy: number | null; college_id: string }>();
    if (!internship) return badRequest('Invalid internship id');

    const student = await env.DB.prepare('SELECT college_id FROM students WHERE id = ?').bind(actor.id).first<{ college_id: string }>();
    if (!student) return unauthorized('Student not found');
    if (student.college_id === internship.college_id) return forbidden('You can apply only for internships from other colleges.');
    if (internship.vacancy !== null && Number(internship.vacancy) <= 0) return forbidden('No vacancy available for this internship');

    const duplicate = await env.DB.prepare('SELECT id FROM internship_applications WHERE student_id = ? AND internship_id = ?')
      .bind(actor.id, internshipId)
      .first();
    if (duplicate) return conflict('Application already submitted for this internship');

    const eligibility = await getStudentApplicationEligibility(env, actor.id);
    if (eligibility.activeLock) return forbidden('Your accepted internship is in progress. Department must mark completion before new applications.');
    if (eligibility.openApplications >= 3) return forbidden('You can only keep three active applications at a time.');

    await env.DB.prepare(
      `INSERT INTO internship_applications (id, student_id, internship_id, status)
       VALUES (?, ?, ?, 'pending')`,
    )
      .bind(crypto.randomUUID(), actor.id, internshipId)
      .run();

    return created('Student application submitted', { internshipId, status: 'pending' });
  }

  const industryRejectMatch = pathname.match(/^\/api\/industry\/applications\/([^/]+)\/reject$/);
  if (industryRejectMatch && request.method === 'POST') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const applicationId = industryRejectMatch[1];

    const result = await env.DB.prepare(
      `UPDATE internship_applications
       SET status = 'rejected',
           reviewed_by_industry_id = ?,
           reviewed_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?
         AND internship_id IN (SELECT id FROM internships WHERE industry_id = ?)`,
    )
      .bind(actor.id, applicationId, actor.id)
      .run();

    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'Application not found');
    return ok('Application rejected');
  }

  const industryAcceptMatch = pathname.match(/^\/api\/industry\/applications\/([^/]+)\/accept$/);
  if (industryAcceptMatch && request.method === 'POST') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const applicationId = industryAcceptMatch[1];

    const result = await env.DB.prepare(
      `UPDATE internship_applications
       SET status = 'accepted',
           reviewed_by_industry_id = ?,
           reviewed_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?
         AND internship_id IN (SELECT id FROM internships WHERE industry_id = ?)`,
    )
      .bind(actor.id, applicationId, actor.id)
      .run();

    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'Application not found');

    const application = await env.DB.prepare('SELECT student_id, external_student_id, internship_id FROM internship_applications WHERE id = ?').bind(applicationId).first<{ student_id: string | null; external_student_id: string | null; internship_id: string }>();
    if (application) {
      await ensureInternshipAllocationsTable(env);
      const internship = await env.DB.prepare(`SELECT ii.industry_id FROM internships i LEFT JOIN industry_internships ii ON ii.title = i.title WHERE i.id = ? LIMIT 1`).bind(application.internship_id).first<{ industry_id: string | null }>();
      await env.DB.prepare(
        `INSERT INTO internship_allocations (id, student_id, external_student_id, industry_id, internship_id, project_details, status)
         VALUES (?, ?, ?, ?, ?, ?, 'allocated')`,
      )
        .bind(crypto.randomUUID(), application.student_id, application.external_student_id, internship?.industry_id ?? actor.id, application.internship_id, 'Allocated from accepted application')
        .run();
    }

    return ok('Application accepted');
  }

  const industryCompleteMatch = pathname.match(/^\/api\/industry\/applications\/([^/]+)\/complete$/);
  if (industryCompleteMatch && request.method === 'POST') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const result = await env.DB.prepare(
      `UPDATE internship_applications
       SET completed_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?
         AND status = 'accepted'
         AND internship_id IN (SELECT id FROM internships WHERE industry_id = ?)`,
    ).bind(industryCompleteMatch[1], actor.id).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Accepted application not found');
    return ok('Application marked completed');
  }

  const industryFeedbackMatch = pathname.match(/^\/api\/industry\/applications\/([^/]+)\/feedback$/);
  if (industryFeedbackMatch && request.method === 'POST') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const feedback = toText(required(body, ['feedback']));
    const score = Number(required(body, ['score']));
    if (!feedback) return badRequest('feedback is required');
    if (Number.isNaN(score) || score < 0 || score > 10) return badRequest('score must be between 0 and 10');
    const result = await env.DB.prepare(
      `UPDATE internship_applications
       SET industry_feedback = ?,
           industry_score = ?,
           updated_at = datetime('now')
       WHERE id = ?
         AND internship_id IN (SELECT id FROM internships WHERE industry_id = ?)`,
    ).bind(feedback, score, industryFeedbackMatch[1], actor.id).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Application not found');
    return ok('Feedback saved');
  }

  if (request.method === 'GET' && pathname === '/api/internships') {
    const externalOnly = toText(url.searchParams.get('external')).toLowerCase() === 'true';
    const query = externalOnly
      ? `SELECT i.id, i.title, i.description, i.department_id, i.is_paid, i.fee, i.is_external, i.status, i.created_at, d.name AS department_name
         FROM internships i
         INNER JOIN departments d ON d.id = i.department_id
         WHERE i.is_external = 1 AND i.status = 'OPEN'
         ORDER BY i.created_at DESC`
      : `SELECT i.id, i.title, i.description, i.department_id, i.is_paid, i.fee, i.is_external, i.status, i.created_at, d.name AS department_name
         FROM internships i
         INNER JOIN departments d ON d.id = i.department_id
         ORDER BY i.created_at DESC`;

    const rows = await env.DB.prepare(query).all();
    return ok('Internships fetched', rows.results ?? []);
  }

  if (request.method === 'POST' && pathname === '/api/ipo/internship') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const parsed = ipoInternshipCreateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request');

    const payload = parsed.data;
    const department = payload.department_id
      ? await env.DB.prepare('SELECT id, college_id FROM departments WHERE id = ?').bind(payload.department_id).first<{ id: string; college_id: string }>()
      : null;
    if (payload.department_id && !department) return badRequest('department_id is invalid');
    if (department?.college_id && department.college_id !== payload.college_id) return badRequest('department_id does not belong to college_id');

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO internships
       (id, title, description, ipo_id, college_id, department_id, duration, total_vacancy, filled_vacancy, remaining_vacancy, available_vacancy, requirements, status, published, created_by, visibility_type, is_external)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'SENT_TO_DEPT', 0, 'INDUSTRY', 'ALL_TARGETS', 0)`,
    ).bind(
      id,
      payload.title,
      payload.description,
      actor.id,
      payload.college_id,
      payload.department_id ?? null,
      payload.duration,
      payload.total_vacancy,
      payload.total_vacancy,
      payload.total_vacancy,
      payload.requirements,
    ).run();

    return created('Internship created and sent to department', { id, status: 'SENT_TO_DEPT' });
  }

  if (request.method === 'GET' && pathname === '/api/department/internships') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT i.id, i.title, i.description,
              COALESCE(i.duration, '') AS duration,
              COALESCE(i.total_vacancy, 0) AS total_vacancy,
              COALESCE(i.filled_vacancy, 0) AS filled_vacancy,
              COALESCE(i.remaining_vacancy, COALESCE(i.vacancy, 0)) AS remaining_vacancy,
              COALESCE(i.requirements, '') AS requirements,
              i.status,
              COALESCE(i.published, 0) AS published,
              i.created_at, i.updated_at, i.department_id, d.college_id,
              COALESCE(i.is_paid, 0) AS is_paid, i.fee, i.internship_category, i.is_external, COALESCE(i.vacancy, 0) AS vacancy,
              i.programme, i.mapped_po, i.mapped_pso, i.mapped_co, COALESCE(i.student_visibility, 0) AS student_visibility
       FROM internships i
       INNER JOIN departments d ON d.id = ?
       WHERE i.college_id = d.college_id
         AND (i.department_id IS NULL OR i.department_id = ?)
       ORDER BY i.created_at DESC`,
    ).bind(actor.id, actor.id).all();

    return ok('Department internships fetched', rows.results ?? []);
  }

  if (request.method === 'POST' && pathname === '/api/department/map-internship') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const parsed = mapInternshipSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request');
    const payload = parsed.data;

    const internship = await env.DB.prepare(
      `SELECT i.id, i.college_id, i.department_id, i.status, d.college_id AS dept_college_id
       FROM internships i
       INNER JOIN departments d ON d.id = ?
       WHERE i.id = ?`,
    ).bind(actor.id, payload.internship_id).first<{ id: string; college_id: string; department_id: string | null; status: string; dept_college_id: string }>();
    if (!internship) return errorResponse(404, 'Internship not found');
    if (internship.college_id !== internship.dept_college_id) return forbidden('Internship does not belong to your college');
    if (internship.department_id && internship.department_id !== actor.id) return forbidden('Internship targeted to a different department');

    await env.DB.prepare(
      `INSERT INTO internship_mappings (id, internship_id, department_id, po_ids, pso_ids, co_ids, internship_po, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(internship_id, department_id) DO UPDATE SET
         po_ids = excluded.po_ids,
         pso_ids = excluded.pso_ids,
         co_ids = excluded.co_ids,
         internship_po = excluded.internship_po,
         updated_at = datetime('now')`,
    ).bind(
      crypto.randomUUID(),
      payload.internship_id,
      actor.id,
      JSON.stringify(payload.po_ids),
      JSON.stringify(payload.pso_ids),
      JSON.stringify(payload.co_ids),
      JSON.stringify(payload.internship_po),
    ).run();

    await env.DB.prepare(
      `UPDATE internships
       SET status = CASE WHEN status = 'SENT_TO_DEPT' THEN 'ACCEPTED' ELSE status END,
           updated_at = datetime('now')
       WHERE id = ?`,
    ).bind(payload.internship_id).run();

    return ok('Internship mappings saved');
  }

  if (request.method === 'POST' && pathname === '/api/department/publish') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const parsed = publishInternshipSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request');

    const internship = await env.DB.prepare(
      `SELECT i.id, i.total_vacancy, i.college_id, i.department_id, d.college_id AS dept_college
       FROM internships i
       INNER JOIN departments d ON d.id = ?
       WHERE i.id = ?`,
    ).bind(actor.id, parsed.data.internship_id).first<{ id: string; total_vacancy: number; college_id: string; department_id: string | null; dept_college: string }>();
    if (!internship) return errorResponse(404, 'Internship not found');
    if (internship.college_id !== internship.dept_college) return forbidden('Internship does not belong to your college');
    if (internship.department_id && internship.department_id !== actor.id) return forbidden('Internship targeted to a different department');

    const mapping = await env.DB.prepare(
      `SELECT id, po_ids, pso_ids, co_ids FROM internship_mappings WHERE internship_id = ? AND department_id = ?`,
    ).bind(parsed.data.internship_id, actor.id).first<{ id: string; po_ids: string; pso_ids: string; co_ids: string }>();
    if (!mapping) return badRequest('Department mappings must be completed before publishing');
    if (!hasNonEmptyJsonArray(mapping.po_ids) || !hasNonEmptyJsonArray(mapping.pso_ids) || !hasNonEmptyJsonArray(mapping.co_ids)) {
      return badRequest('PO, PSO and CO mappings are required before publishing');
    }
    if (!internship.total_vacancy || internship.total_vacancy < 1) return badRequest('Vacancy must be defined before publishing');

    await env.DB.prepare(
      `UPDATE internships
       SET status = 'PUBLISHED',
           published = 1,
           remaining_vacancy = MAX(total_vacancy - filled_vacancy, 0),
           available_vacancy = MAX(total_vacancy - filled_vacancy, 0),
           updated_at = datetime('now')
       WHERE id = ?`,
    ).bind(parsed.data.internship_id).run();
    return ok('Internship published');
  }

  if (request.method === 'GET' && pathname === '/api/student/internships') {
    const actor = requireRole(request, ['STUDENT']);
    if (actor instanceof Response) return actor;
    const student = await env.DB.prepare('SELECT college_id, department_id FROM students WHERE id = ?').bind(actor.id).first<{ college_id: string; department_id: string }>();
    if (!student) return unauthorized('Student not found');
    const rows = await env.DB.prepare(
      `SELECT i.id, i.title, i.description, i.duration, i.total_vacancy, i.filled_vacancy, i.remaining_vacancy, i.status,
              COALESCE(i.created_by, i.source_type, 'INDUSTRY') AS created_by,
              CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END AS applied, a.status AS application_status
       FROM internships i
       LEFT JOIN applications a ON a.internship_id = i.id AND a.student_id = ?
       WHERE i.status IN ('PUBLISHED', 'published')
         AND (
              (UPPER(COALESCE(i.created_by, i.source_type, 'INDUSTRY')) = 'INDUSTRY')
              OR
              (UPPER(COALESCE(i.created_by, i.source_type, 'COLLEGE')) IN ('COLLEGE', 'DEPARTMENT')
                AND COALESCE(i.is_external, 0) = 0
                AND i.college_id = ?
                AND (i.department_id IS NULL OR i.department_id = ?))
              OR
              (UPPER(COALESCE(i.created_by, i.source_type, 'COLLEGE')) IN ('COLLEGE', 'DEPARTMENT')
                AND COALESCE(i.is_external, 0) = 1
                AND i.college_id IS NOT NULL
                AND i.college_id <> ?)
         )
       ORDER BY i.created_at DESC`,
    ).bind(actor.id, student.college_id, student.department_id, student.college_id).all();
    return ok('Student internships fetched', rows.results ?? []);
  }

  if (request.method === 'POST' && pathname === '/api/student/apply') {
    const actor = requireRole(request, ['STUDENT']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const parsed = studentApplySchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request');
    const internshipId = parsed.data.internship_id;

    const internship = await env.DB.prepare(
      `SELECT i.id, i.status, i.published, i.remaining_vacancy, COALESCE(i.is_external, 0) AS is_external, i.college_id, d.college_id AS department_college_id
       FROM internships i
       LEFT JOIN departments d ON d.id = i.department_id
       WHERE i.id = ?`,
    ).bind(internshipId).first<{ id: string; status: string; published: number; remaining_vacancy: number; is_external: number; college_id: string | null; department_college_id: string | null }>();
    if (!internship) return errorResponse(404, 'Internship not found');
    if (internship.status !== 'PUBLISHED' || Number(internship.published) !== 1) return forbidden('Internship is not open for applications');
    if ((internship.remaining_vacancy ?? 0) <= 0) return forbidden('No vacancy available');

    const student = await env.DB.prepare('SELECT college_id FROM students WHERE id = ?').bind(actor.id).first<{ college_id: string | null }>();
    if (!student) return unauthorized('Student not found');
    const hostCollegeId = internship.college_id ?? internship.department_college_id;
    if (hostCollegeId && student.college_id && hostCollegeId === student.college_id) {
      await env.DB.prepare(
        `INSERT INTO compliance_violations (id, rule_code, message, internship_id, student_id, college_id, level, created_at)
         VALUES (?, 'SAME_INSTITUTION_BLOCK', ?, ?, ?, ?, 'ERROR', datetime('now'))`,
      ).bind(
        crypto.randomUUID(),
        'Application blocked: students cannot apply to internships hosted by their own institution.',
        internshipId,
        actor.id,
        student.college_id,
      ).run();
      return forbidden('Students cannot apply to internships hosted by the same institution.');
    }

    const existing = await env.DB.prepare('SELECT id FROM applications WHERE student_id = ? AND internship_id = ?').bind(actor.id, internshipId).first<{ id: string }>();
    if (existing) return conflict('You already applied to this internship');

    const activeApplicationStats = await env.DB.prepare(
      `SELECT COUNT(*) AS count
       FROM applications
       WHERE student_id = ?
         AND status IN ('APPLIED', 'ACCEPTED')`,
    ).bind(actor.id).first<{ count: number }>();
    if (Number(activeApplicationStats?.count ?? 0) >= MAX_ACTIVE_APPLICATIONS) {
      return forbidden('Application limit reached');
    }

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO applications (id, student_id, internship_id, status) VALUES (?, ?, ?, 'APPLIED')`,
    ).bind(id, actor.id, internshipId).run();
    return created('Application submitted', { id, status: 'APPLIED' });
  }

  if (request.method === 'POST' && pathname === '/api/ipo/application/accept') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const parsed = acceptApplicationSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request');

    const app = await env.DB.prepare(
      `SELECT a.id, a.status, a.internship_id, i.ipo_id, i.total_vacancy, i.filled_vacancy
       FROM applications a
       INNER JOIN internships i ON i.id = a.internship_id
       WHERE a.id = ?`,
    ).bind(parsed.data.application_id).first<{ id: string; status: string; internship_id: string; ipo_id: string; total_vacancy: number; filled_vacancy: number }>();
    if (!app) return errorResponse(404, 'Application not found');
    if (app.ipo_id !== actor.id) return forbidden('You can only accept applications for your internships');
    if (app.status === 'ACCEPTED') return ok('Application already accepted');
    if ((app.filled_vacancy ?? 0) >= (app.total_vacancy ?? 0)) return conflict('Vacancy limit reached');

    try {
      await runAtomic(env, null, async () => {
        const updateInternship = await env.DB.prepare(
          `UPDATE internships
           SET filled_vacancy = (
             SELECT COUNT(*)
             FROM applications a
             WHERE a.internship_id = internships.id
               AND a.status = 'ACCEPTED'
           ) + 1,
               remaining_vacancy = MAX(total_vacancy - (
                 SELECT COUNT(*)
                 FROM applications a
                 WHERE a.internship_id = internships.id
                   AND a.status = 'ACCEPTED'
               ) - 1, 0),
               available_vacancy = MAX(total_vacancy - (
                 SELECT COUNT(*)
                 FROM applications a
                 WHERE a.internship_id = internships.id
                   AND a.status = 'ACCEPTED'
               ) - 1, 0),
               updated_at = datetime('now')
           WHERE id = ?
             AND (
               SELECT COUNT(*)
               FROM applications a
               WHERE a.internship_id = internships.id
                 AND a.status = 'ACCEPTED'
             ) < total_vacancy`,
        ).bind(app.internship_id).run();
        if ((updateInternship.meta.changes ?? 0) === 0) throw new Error('Vacancy limit reached');
        await env.DB.prepare(
          `UPDATE applications SET status = 'ACCEPTED' WHERE id = ?`,
        ).bind(parsed.data.application_id).run();
      });
    } catch (error) {
      return conflict(error instanceof Error ? error.message : 'Unable to accept application');
    }

    return ok('Application accepted and vacancy updated');
  }

  if (request.method === 'POST' && pathname === '/api/ipo/complete') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const parsed = ipoCompleteSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request');

    const app = await env.DB.prepare(
      `SELECT a.id, a.student_id, a.internship_id, i.ipo_id
       FROM applications a
       INNER JOIN internships i ON i.id = a.internship_id
       WHERE a.id = ?`,
    ).bind(parsed.data.application_id).first<{ id: string; student_id: string; internship_id: string; ipo_id: string }>();
    if (!app) return errorResponse(404, 'Application not found');
    if (app.ipo_id !== actor.id) return forbidden('You can only complete applications for your internships');

    await env.DB.prepare(
      `INSERT INTO internship_feedback (id, internship_id, student_id, ipo_feedback, rating, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(internship_id, student_id) DO UPDATE SET
         ipo_feedback = excluded.ipo_feedback,
         rating = excluded.rating,
         created_at = datetime('now')`,
    ).bind(crypto.randomUUID(), app.internship_id, app.student_id, parsed.data.feedback, parsed.data.rating).run();
    await env.DB.prepare(`UPDATE internships SET status = CASE WHEN remaining_vacancy <= 0 THEN 'CLOSED' ELSE status END, updated_at = datetime('now') WHERE id = ?`)
      .bind(app.internship_id).run();
    return ok('Internship completion feedback saved');
  }

  if (request.method === 'POST' && pathname === '/api/department/evaluate') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const parsed = evaluateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid request');

    const app = await env.DB.prepare(
      `SELECT a.id, a.internship_id, i.college_id, i.department_id, d.college_id AS dept_college
       FROM applications a
       INNER JOIN internships i ON i.id = a.internship_id
       INNER JOIN departments d ON d.id = ?
       WHERE a.id = ?`,
    ).bind(actor.id, parsed.data.application_id).first<{ id: string; internship_id: string; college_id: string; department_id: string | null; dept_college: string }>();
    if (!app) return errorResponse(404, 'Application not found');
    if (app.college_id !== app.dept_college) return forbidden('Application does not belong to your college');
    if (app.department_id && app.department_id !== actor.id) return forbidden('Application does not belong to your department');

    await env.DB.prepare(
      `INSERT INTO evaluations (id, application_id, marks, feedback, co_po_score, evaluated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(application_id) DO UPDATE SET
         marks = excluded.marks,
         feedback = excluded.feedback,
         co_po_score = excluded.co_po_score,
         evaluated_by = excluded.evaluated_by,
         updated_at = datetime('now')`,
    ).bind(
      crypto.randomUUID(),
      parsed.data.application_id,
      parsed.data.marks,
      parsed.data.feedback ?? null,
      JSON.stringify(parsed.data.co_po_score),
      actor.id,
    ).run();
    return ok('Department evaluation saved');
  }

  if (request.method === 'POST' && pathname === '/api/department/internships') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const body = await readBody(request);
    const title = required(body, ['title']);
    const description = required(body, ['description']);
    const explicitIsPaidRaw = optional(body, ['is_paid', 'isPaid']);
    const explicitIsPaid = explicitIsPaidRaw ? toBoolean(explicitIsPaidRaw) : null;
    const isExternal = toBoolean(required(body, ['is_external', 'isExternal'])) ?? true;
    const feeRaw = optional(body, ['fee']);
    const fee = feeRaw ? Number(feeRaw) : null;
    const stipendAmountRaw = optional(body, ['stipend_amount', 'stipendAmount']);
    const stipendAmount = stipendAmountRaw ? Number(stipendAmountRaw) : null;
    const stipendDuration = toText(optional(body, ['stipend_duration', 'stipendDuration'])) || null;
    const minimumDaysRaw = optional(body, ['minimum_days', 'minimumDays', 'hourDuration']);
    const minimumDays = minimumDaysRaw ? Number(minimumDaysRaw) : null;
    const applicableTo = toText(optional(body, ['applicable_to', 'applicableTo'])).toUpperCase() || 'EXTERNAL';
    const action = toText(optional(body, ['action'])).toLowerCase();
    const industryId = toText(optional(body, ['industry_id', 'industryId'])) || null;
    const programId = toText(optional(body, ['program_id', 'programId'])) || null;
    const mappedPo = optional(body, ['mapped_po', 'mappedPo']);
    const mappedPso = optional(body, ['mapped_pso', 'mappedPso']);
    const mappedIpo = optional(body, ['mapped_ipo', 'mappedIpo']);
    const mappedCo = optional(body, ['mapped_co', 'mappedCo']);
    const genderPreference = toText(optional(body, ['gender_preference', 'genderPreference'])).toUpperCase() || 'BOTH';
    const categoryRaw = toText(optional(body, ['internship_category', 'internshipCategory'])).toUpperCase();
    const requestedCategory = ['FREE', 'PAID', 'STIPEND'].includes(categoryRaw) ? categoryRaw : null;
    const vacancyRaw = optional(body, ['vacancy']);
    const vacancy = vacancyRaw ? Number(vacancyRaw) : null;
    const isPaid = explicitIsPaid ?? Boolean(fee && fee > 0);
    const internshipCategory = isPaid ? 'PAID' : (requestedCategory ?? 'FREE');

    if (!title || !description) return badRequest('title and description are required');
    if (isPaid && (!fee || Number.isNaN(fee) || fee <= 0)) return badRequest('Valid fee is required for paid internships');
    if (internshipCategory === 'STIPEND' && (stipendAmount === null || Number.isNaN(stipendAmount) || stipendAmount < 0)) return badRequest('Valid stipendAmount is required for stipend internships');
    if (vacancy !== null && (Number.isNaN(vacancy) || vacancy <= 0)) return badRequest('vacancy must be a positive number');
    if (minimumDays !== null && (!Number.isFinite(minimumDays) || minimumDays < 60)) return badRequest('duration must be at least 60 hours');
    if (!['GIRLS', 'BOYS', 'BOTH'].includes(genderPreference)) return badRequest('gender_preference must be GIRLS, BOYS or BOTH');
    if (!['EXTERNAL', 'INTERNAL'].includes(applicableTo)) return badRequest('applicableTo must be INTERNAL or EXTERNAL');
    if (applicableTo === 'INTERNAL' && !industryId) return badRequest('industryId is required for internal internships');
    if (action === 'send_to_industry' && applicableTo !== 'INTERNAL') return badRequest('Only internal internships can be sent to industry');

    const department = await env.DB.prepare('SELECT college_id FROM departments WHERE id = ?').bind(actor.id).first<{ college_id: string }>();
    if (!department) return badRequest('Department not found');

    if (programId) {
      const program = await env.DB.prepare('SELECT id FROM programs WHERE id = ? AND department_id = ?').bind(programId, actor.id).first<{ id: string }>();
      if (!program) return badRequest('programId does not belong to this department');
    }

    if (action === 'send_to_industry') {
      const duplicate = await env.DB.prepare(
        `SELECT id FROM internships
         WHERE department_id = ?
           AND industry_id = ?
           AND lower(title) = lower(?)
           AND status = 'SENT_TO_INDUSTRY'`,
      ).bind(actor.id, industryId, title).first<{ id: string }>();
      if (duplicate) return conflict('This internship is already sent to the selected industry.');
    }

    const internshipId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO internships (id, title, description, department_id, college_id, industry_id, is_paid, fee, internship_category, vacancy, total_vacancy, remaining_vacancy, available_vacancy, is_external, created_by, source_type, visibility_type, status, stipend_amount, stipend_duration, minimum_days, gender_preference, programme, mapped_po, mapped_pso, mapped_co, internship_po, internship_co)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT name FROM programs WHERE id = ?), ?, ?, ?, ?, ?)`,
    )
      .bind(
        internshipId,
        title,
        description,
        actor.id,
        department.college_id,
        applicableTo === 'INTERNAL' ? industryId : null,
        isPaid ? 1 : 0,
        isPaid ? Math.round(fee ?? 0) : null,
        internshipCategory,
        Math.floor(vacancy ?? 0),
        Math.floor(vacancy ?? 0),
        Math.floor(vacancy ?? 0),
        Math.floor(vacancy ?? 0),
        applicableTo === 'EXTERNAL' ? 1 : 0,
        applicableTo === 'EXTERNAL' ? 'COLLEGE' : 'INDUSTRY',
        applicableTo === 'EXTERNAL' ? 'COLLEGE' : 'DEPARTMENT_SUGGESTED',
        applicableTo === 'EXTERNAL' ? 'ALL_TARGETS' : 'SAME_COLLEGE_DEPARTMENT',
        action === 'send_to_industry' ? 'SENT_TO_INDUSTRY' : 'PUBLISHED',
        internshipCategory === 'STIPEND' ? stipendAmount : null,
        internshipCategory === 'STIPEND' ? stipendDuration : null,
        minimumDays === null || Number.isNaN(minimumDays) ? null : Math.floor(minimumDays),
        genderPreference,
        programId ?? null,
        JSON.stringify(Array.isArray(mappedPo) ? mappedPo : []),
        JSON.stringify(Array.isArray(mappedPso) ? mappedPso : []),
        JSON.stringify(Array.isArray(mappedCo) ? mappedCo : []),
        JSON.stringify(Array.isArray(mappedIpo) ? mappedIpo : []),
        JSON.stringify(Array.isArray(mappedCo) ? mappedCo : []),
      )
      .run();

    const coCodes = Array.isArray(mappedCo) ? mappedCo.map((item) => toText(item)).filter(Boolean) : [];
    const poCodes = Array.isArray(mappedIpo) ? mappedIpo.map((item) => toText(item)).filter(Boolean) : [];
    if (applicableTo === 'EXTERNAL') {
      if (coCodes.length > 0) {
        for (const coCode of coCodes) {
          await env.DB.prepare(
            `INSERT INTO internship_co_mapping (id, internship_id, co_code, updated_at)
             VALUES (?, ?, ?, datetime('now'))
             ON CONFLICT(internship_id, co_code) DO UPDATE SET updated_at = datetime('now')`,
          ).bind(crypto.randomUUID(), internshipId, coCode).run();
        }
      }
      if (poCodes.length > 0) {
        for (const poCode of poCodes) {
          await env.DB.prepare(
            `INSERT INTO internship_po_mapping (id, internship_id, po_code, updated_at)
             VALUES (?, ?, ?, datetime('now'))
             ON CONFLICT(internship_id, po_code) DO UPDATE SET updated_at = datetime('now')`,
          ).bind(crypto.randomUUID(), internshipId, poCode).run();
        }
      }
    }

    return created(action === 'send_to_industry' ? 'Sent to Industry' : 'Published Successfully', { id: internshipId, status: action === 'send_to_industry' ? 'SENT_TO_INDUSTRY' : 'PUBLISHED' });
  }

  const updateDepartmentInternshipMatch = pathname.match(/^\/api\/department\/internships\/([^/]+)$/);
  if (updateDepartmentInternshipMatch && request.method === 'PUT') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const title = required(body, ['title']);
    const description = required(body, ['description']);
    const feeRaw = optional(body, ['fee']);
    const fee = feeRaw ? Number(feeRaw) : null;
    const explicitIsPaidRaw = optional(body, ['is_paid', 'isPaid']);
    const explicitIsPaid = explicitIsPaidRaw ? toBoolean(explicitIsPaidRaw) : null;
    const stipendAmountRaw = optional(body, ['stipend_amount', 'stipendAmount']);
    const stipendAmount = stipendAmountRaw ? Number(stipendAmountRaw) : null;
    const stipendDuration = toText(optional(body, ['stipend_duration', 'stipendDuration'])) || null;
    const minimumDaysRaw = optional(body, ['minimum_days', 'minimumDays', 'hourDuration']);
    const minimumDays = minimumDaysRaw ? Number(minimumDaysRaw) : null;
    const genderPreference = toText(optional(body, ['gender_preference', 'genderPreference'])).toUpperCase() || null;
    const categoryRaw = toText(optional(body, ['internship_category', 'internshipCategory'])).toUpperCase();
    const requestedCategory = ['FREE', 'PAID', 'STIPEND'].includes(categoryRaw) ? categoryRaw : null;
    const vacancyRaw = optional(body, ['vacancy']);
    const vacancy = vacancyRaw ? Number(vacancyRaw) : null;
    const isPaid = explicitIsPaid ?? Boolean(fee && fee > 0);
    const internshipCategory = isPaid ? 'PAID' : (requestedCategory ?? 'FREE');
    if (!title || !description) return badRequest('title and description are required');
    if (isPaid && (!fee || Number.isNaN(fee) || fee <= 0)) return badRequest('Valid fee is required for paid internships');
    if (internshipCategory === 'STIPEND' && stipendAmount !== null && (Number.isNaN(stipendAmount) || stipendAmount < 0)) return badRequest('Invalid stipendAmount');
    if (vacancy !== null && (Number.isNaN(vacancy) || vacancy < 0)) return badRequest('vacancy must be a non-negative number');
    if (genderPreference !== null && !['GIRLS', 'BOYS', 'BOTH'].includes(genderPreference)) return badRequest('gender_preference must be GIRLS, BOYS or BOTH');

    const result = await env.DB.prepare(
      `UPDATE internships
       SET title = ?, description = ?, is_paid = ?, fee = ?, internship_category = ?, vacancy = COALESCE(?, vacancy),
           total_vacancy = COALESCE(?, total_vacancy), remaining_vacancy = COALESCE(?, remaining_vacancy),
           available_vacancy = MAX(COALESCE(?, total_vacancy) - COALESCE(filled_vacancy, 0), 0),
           stipend_amount = ?, stipend_duration = ?, minimum_days = ?, gender_preference = COALESCE(?, gender_preference),
           updated_at = datetime('now')
       WHERE id = ? AND department_id = ?`,
    ).bind(
      title,
      description,
      isPaid ? 1 : 0,
      isPaid ? Math.round(fee ?? 0) : null,
      internshipCategory,
      vacancy === null ? null : Math.floor(vacancy),
      vacancy === null ? null : Math.floor(vacancy),
      vacancy === null ? null : Math.floor(vacancy),
      vacancy === null ? null : Math.floor(vacancy),
      internshipCategory === 'STIPEND' ? stipendAmount : null,
      internshipCategory === 'STIPEND' ? stipendDuration : null,
      minimumDays === null || Number.isNaN(minimumDays) ? null : Math.floor(minimumDays),
      genderPreference,
      updateDepartmentInternshipMatch[1],
      actor.id,
    ).run();

    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Internship not found');
    return ok('Department internship updated');
  }

  if (updateDepartmentInternshipMatch && request.method === 'DELETE') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const result = await env.DB.prepare('DELETE FROM internships WHERE id = ? AND department_id = ?')
      .bind(updateDepartmentInternshipMatch[1], actor.id)
      .run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Internship not found');
    return ok('Department internship deleted');
  }

  const submitDepartmentAdvertisementMatch = pathname.match(/^\/api\/department\/internships\/([^/]+)\/submit-advertisement$/);
  if (submitDepartmentAdvertisementMatch && request.method === 'POST') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);

    const programId = optional(body, ['program_id', 'programId']);
    const mappedCo = optional(body, ['mapped_co', 'mappedCo']);
    const mappedPo = optional(body, ['mapped_po', 'mappedPo']);
    const mappedPso = optional(body, ['mapped_pso', 'mappedPso']);

    if (programId) {
      const program = await env.DB.prepare('SELECT id FROM programs WHERE id = ? AND department_id = ?').bind(programId, actor.id).first<{ id: string }>();
      if (!program) return badRequest('program_id does not belong to this department');
    }

    const result = await env.DB.prepare(
      `UPDATE internships
       SET programme = COALESCE((SELECT name FROM programs WHERE id = ?), programme),
           mapped_co = ?,
           mapped_po = ?,
           mapped_pso = ?,
           status = ?,
           student_visibility = 1,
           published = 1,
           updated_at = datetime('now')
       WHERE id = ?
         AND (department_id = ? OR (department_id IS NULL AND college_id = (SELECT college_id FROM departments WHERE id = ?)))
         AND COALESCE(industry_id, '') <> ''`,
    ).bind(programId ?? null, mappedCo, mappedPo, mappedPso, INTERNSHIP_STATUS.ACCEPTED, submitDepartmentAdvertisementMatch[1], actor.id, actor.id).run();

    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry internship not found for this department');
    await generateDocument(env, { type: 'approval', internshipId: submitDepartmentAdvertisementMatch[1], actor });
    return ok('Internship advertisement published for students');
  }

  if (request.method === 'GET' && pathname === '/api/department/internships') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT id, title, description, is_paid, fee, internship_category, vacancy, is_external, status, created_at, industry_id, gender_preference, stipend_amount, stipend_duration, minimum_days
       FROM internships
       WHERE department_id = ?
       ORDER BY created_at DESC`,
    ).bind(actor.id).all();

    return ok('Department internships fetched', rows.results ?? []);
  }

  if (request.method === 'POST' && pathname === '/api/applications') {
    const body = await readBody(request);
    const internshipId = required(body, ['internship_id', 'internshipId']);
    if (!internshipId) return badRequest('internship_id is required');

    const actor = requireRole(request, ['STUDENT', 'EXTERNAL_STUDENT']);
    if (actor instanceof Response) return actor;

    const internship = await env.DB.prepare(
      `SELECT i.id, COALESCE(i.available_vacancy, i.vacancy, i.remaining_vacancy, i.total_vacancy, 0) AS available_vacancy, COALESCE(i.is_external, 0) AS is_external, d.college_id
       FROM internships i
       INNER JOIN departments d ON d.id = i.department_id
       WHERE i.id = ?`,
    ).bind(internshipId).first<{ id: string; available_vacancy: number | null; is_external: number; college_id: string }>();
    if (!internship) return badRequest('Invalid internship_id');
    if (actor.role === 'STUDENT') {
      const student = await env.DB.prepare('SELECT college_id FROM students WHERE id = ?').bind(actor.id).first<{ college_id: string }>();
      if (!student) return unauthorized('Student not found');
      if (Number(internship.is_external) === 1 && student.college_id === internship.college_id) {
        return forbidden('This internship is open only to external college students');
      }
      if (internship.available_vacancy !== null && Number(internship.available_vacancy) <= 0) return forbidden('No vacancy available for this internship');
    }

    const isExternal = actor.role === 'EXTERNAL_STUDENT' ? 1 : 0;
    const duplicate = actor.role === 'EXTERNAL_STUDENT'
      ? await env.DB.prepare('SELECT id FROM internship_applications WHERE external_student_id = ? AND internship_id = ?').bind(actor.id, internshipId).first()
      : await env.DB.prepare('SELECT id FROM internship_applications WHERE student_id = ? AND internship_id = ?').bind(actor.id, internshipId).first();
    if (duplicate) return conflict('Application already submitted for this internship');

    if (actor.role === 'STUDENT') {
      const eligibility = await getStudentApplicationEligibility(env, actor.id);
      if (eligibility.activeLock) return forbidden('Your accepted internship is in progress. Department must mark completion before new applications.');
      if (eligibility.openApplications >= 3) return forbidden('You can only keep three active applications at a time.');
    }

    const applicationId = crypto.randomUUID();
    try {
      await runAtomic(env, null, async () => {
        await env.DB.prepare(
          `INSERT INTO internship_applications (id, student_id, external_student_id, internship_id, status, is_external)
           VALUES (?, ?, ?, ?, 'pending', ?)`,
        )
          .bind(
            applicationId,
            actor.role === 'STUDENT' ? actor.id : null,
            actor.role === 'EXTERNAL_STUDENT' ? actor.id : null,
            internshipId,
            isExternal,
          )
          .run();
      });
    } catch (error) {
      if (error instanceof Error) return conflict(error.message);
      return conflict('Unable to submit application');
    }

    return created('Application submitted', { internshipId, status: 'pending' });
  }

  const studentMarksheetEmailMatch = pathname.match(/^\/api\/student\/applications\/([^/]+)\/marksheet\/email$/);
  if (studentMarksheetEmailMatch && request.method === 'POST') {
    const actor = requireRole(request, ['STUDENT']);
    if (actor instanceof Response) return actor;

    const app = await env.DB.prepare(
      `SELECT ia.id, ia.status, ia.industry_feedback, ia.industry_score,
              s.email AS student_email, s.name AS student_name,
              i.title AS internship_title,
              COALESCE(ind.name, 'Industry') AS industry_name,
              d.name AS department_name,
              c.name AS host_college_name,
              (
                SELECT AVG(orx.weighted_score)
                FROM outcome_results orx
                WHERE orx.application_id = ia.id
              ) AS outcome_marks
       FROM internship_applications ia
       INNER JOIN students s ON s.id = ia.student_id
       INNER JOIN internships i ON i.id = ia.internship_id
       INNER JOIN departments d ON d.id = i.department_id
       INNER JOIN colleges c ON c.id = d.college_id
       LEFT JOIN industries ind ON ind.id = i.industry_id
       WHERE ia.id = ?
         AND ia.student_id = ?`,
    ).bind(studentMarksheetEmailMatch[1], actor.id).first<any>();

    if (!app) return errorResponse(404, 'Application not found');

    await sendStudentMarksheetEmail(env, {
      to: app.student_email,
      studentName: app.student_name,
      internshipTitle: app.internship_title,
      industryName: app.industry_name,
      departmentName: app.department_name,
      collegeName: app.host_college_name,
      status: String(app.status ?? '').toUpperCase(),
      industryFeedback: app.industry_feedback ?? null,
      evaluationMarks: app.industry_score === null || app.industry_score === undefined ? null : Number(app.industry_score),
      outcomeMarks: app.outcome_marks === null || app.outcome_marks === undefined ? null : Number(app.outcome_marks),
    });

    return ok('Marksheet emailed successfully');
  }

  if (request.method === 'GET' && pathname === '/api/department/applications') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const statusFilter = toText(url.searchParams.get('status')).toLowerCase();
    const statusClause = ['pending', 'accepted', 'rejected'].includes(statusFilter) ? ' AND ia.status = ? ' : '';
    const stmt = env.DB.prepare(
      `SELECT ia.id, ia.status, ia.created_at, ia.is_external, ia.completed_at, ia.industry_feedback, ia.industry_score,
              ia.student_id, ia.external_student_id,
              i.id AS internship_id, i.title AS internship_title, i.is_paid, i.fee,
              d.name AS department_name, d.college_id AS department_college_id,
              COALESCE(es.name, s.name) AS student_name,
              COALESCE(es.email, s.email) AS student_email,
              s.department_id AS student_department_id,
              s.college_id AS student_college_id,
              CASE WHEN s.department_id = ? THEN 1 ELSE 0 END AS is_internal_student,
              CASE WHEN s.college_id IS NOT NULL AND s.college_id <> d.college_id THEN 1 ELSE 0 END AS is_external_by_college
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       INNER JOIN departments d ON d.id = i.department_id
       LEFT JOIN external_students es ON es.id = ia.external_student_id
       LEFT JOIN students s ON s.id = ia.student_id
       WHERE i.department_id = ? ${statusClause}
       ORDER BY ia.created_at DESC`,
    );
    const rows = statusClause
      ? await stmt.bind(actor.id, actor.id, statusFilter).all()
      : await stmt.bind(actor.id, actor.id).all();

    return ok('Department applications fetched', rows.results ?? []);
  }

  const acceptDepartmentAppMatch = pathname.match(/^\/api\/department\/applications\/([^/]+)\/accept$/);
  if (acceptDepartmentAppMatch && request.method === 'POST') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const applicationId = acceptDepartmentAppMatch[1];

    const app = await env.DB.prepare(
      `SELECT ia.id,
              ia.student_id,
              ia.external_student_id,
              ia.internship_id,
              COALESCE(es.email, s.email) AS student_email,
              COALESCE(es.name, s.name) AS student_name,
              i.title AS internship_title,
              i.industry_id,
              i.is_paid,
              i.fee,
              i.vacancy,
              d.name AS department_name
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       INNER JOIN departments d ON d.id = i.department_id
       LEFT JOIN external_students es ON es.id = ia.external_student_id
       LEFT JOIN students s ON s.id = ia.student_id
       WHERE ia.id = ? AND d.id = ?`,
    ).bind(applicationId, actor.id).first<any>();

    if (!app) return errorResponse(404, 'Application not found for this department');

    await env.DB.prepare(
      `UPDATE internship_applications
       SET status = 'accepted',
           reviewed_by_industry_id = COALESCE(?, reviewed_by_industry_id),
           reviewed_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`,
    ).bind(app.industry_id ?? null, applicationId).run();
    await env.DB.prepare(
      `UPDATE internships
       SET filled_vacancy = (
         SELECT COUNT(*)
         FROM internship_applications ia
         WHERE ia.internship_id = internships.id
           AND ia.status = 'accepted'
       ),
       available_vacancy = MAX(
         COALESCE(total_vacancy, vacancy, 0) - (
           SELECT COUNT(*)
           FROM internship_applications ia
           WHERE ia.internship_id = internships.id
             AND ia.status = 'accepted'
         ),
         0
       ),
       remaining_vacancy = MAX(
         COALESCE(total_vacancy, vacancy, 0) - (
           SELECT COUNT(*)
           FROM internship_applications ia
           WHERE ia.internship_id = internships.id
             AND ia.status = 'accepted'
         ),
         0
       ),
       updated_at = datetime('now')
       WHERE id = (SELECT internship_id FROM internship_applications WHERE id = ?)`,
    ).bind(applicationId).run();

    await sendAcceptanceEmail(env, {
      to: app.student_email,
      studentName: app.student_name,
      internshipTitle: app.internship_title,
      departmentName: app.department_name,
      isPaid: Number(app.is_paid) === 1,
      fee: app.fee ? Number(app.fee) : null,
      joiningInstructions: 'Please report to the department office with valid ID proof within 3 working days.',
      template: 'external-acceptance',
    });

    if (app.student_id) {
      await generateDocument(env, { type: 'allotment', internshipId: app.internship_id, studentId: app.student_id, actor });
      await generateDocument(env, { type: 'feedback', internshipId: app.internship_id, studentId: app.student_id, actor });
    }

    return ok('Application accepted and notification sent');
  }

  const rejectDepartmentAppMatch = pathname.match(/^\/api\/department\/applications\/([^/]+)\/reject$/);
  if (rejectDepartmentAppMatch && request.method === 'POST') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const result = await env.DB.prepare(
      `UPDATE internship_applications
       SET status = 'rejected', updated_at = datetime('now')
       WHERE id = ?
         AND internship_id IN (SELECT id FROM internships WHERE department_id = ?)`,
    )
      .bind(rejectDepartmentAppMatch[1], actor.id)
      .run();

    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Application not found for this department');
    return ok('Application rejected');
  }

  const completeDepartmentAppMatch = pathname.match(/^\/api\/department\/applications\/([^/]+)\/complete$/);
  if (completeDepartmentAppMatch && request.method === 'POST') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const result = await env.DB.prepare(
      `UPDATE internship_applications
       SET completed_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?
         AND status = 'accepted'
         AND internship_id IN (SELECT id FROM internships WHERE department_id = ?)`,
    )
      .bind(completeDepartmentAppMatch[1], actor.id)
      .run();

    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Accepted application not found for this department');
    return ok('Internship marked as completed');
  }

  const applicationEvaluationMatch = pathname.match(/^\/api\/department\/applications\/([^/]+)\/evaluation$/);
  if (applicationEvaluationMatch && request.method === 'POST') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const app = await env.DB.prepare(
      `SELECT ia.id, ia.student_id, ia.external_student_id, ia.completed_at, ia.internship_id
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       WHERE ia.id = ? AND i.department_id = ?`,
    ).bind(applicationEvaluationMatch[1], actor.id).first<any>();
    if (!app) return errorResponse(404, 'Application not found');
    if (!app.completed_at) return badRequest('Evaluation is allowed only after Mark Completed');

    const attendanceMarks = Number(required(body, ['attendance_marks', 'attendanceMarks']));
    const workRegisterMarks = Number(required(body, ['work_register_marks', 'workRegisterMarks']));
    const presentationMarks = Number(required(body, ['presentation_marks', 'presentationMarks']));
    const vivaMarks = Number(required(body, ['viva_marks', 'vivaMarks']));
    const reportMarks = Number(required(body, ['report_marks', 'reportMarks']));
    if ([attendanceMarks, workRegisterMarks, presentationMarks, vivaMarks, reportMarks].some((mark) => Number.isNaN(mark))) return badRequest('All marks are required');
    if (attendanceMarks < 0 || attendanceMarks > 9 || workRegisterMarks < 0 || workRegisterMarks > 6 || presentationMarks < 0 || presentationMarks > 14 || vivaMarks < 0 || vivaMarks > 14 || reportMarks < 0 || reportMarks > 7) {
      return badRequest('Marks out of allowed range');
    }
    const existing = await env.DB.prepare('SELECT id FROM internship_evaluations WHERE application_id = ?').bind(app.id).first<{ id: string }>();
    if (existing) return conflict('Evaluation already submitted for this application');

    const ccaTotal = attendanceMarks + workRegisterMarks;
    const eseTotal = presentationMarks + vivaMarks + reportMarks;
    const finalTotal = ccaTotal + eseTotal;

    await env.DB.prepare(
      `INSERT INTO internship_evaluations (
        id, application_id, student_id, external_student_id, internship_id, attendance_marks, work_register_marks,
        presentation_marks, viva_marks, report_marks, cca_total, ese_total, final_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      app.id,
      app.student_id ?? null,
      app.external_student_id ?? null,
      app.internship_id,
      attendanceMarks,
      workRegisterMarks,
      presentationMarks,
      vivaMarks,
      reportMarks,
      ccaTotal,
      eseTotal,
      finalTotal,
    ).run();

    return created('Evaluation recorded', { ccaTotal, eseTotal, finalTotal });
  }

  const outcomeEntryMatch = pathname.match(/^\/api\/department\/applications\/([^/]+)\/outcome-assessment$/);
  if (outcomeEntryMatch && request.method === 'POST') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const app = await env.DB.prepare(
      `SELECT ia.id, ia.student_id, ia.external_student_id, ia.completed_at, ia.internship_id
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       WHERE ia.id = ? AND i.department_id = ?`,
    ).bind(outcomeEntryMatch[1], actor.id).first<any>();
    if (!app) return errorResponse(404, 'Application not found');
    if (!app.completed_at) return badRequest('Outcome assessment is allowed only after Mark Completed');

    const outcomeId = required(body, ['outcome_id', 'outcomeId']);
    const outcomeType = required(body, ['outcome_type', 'outcomeType']).toUpperCase();
    const studentScore = Number(required(body, ['student_score', 'studentScore']));
    const supervisorScore = Number(required(body, ['supervisor_score', 'supervisorScore']));
    const coordinatorScore = Number(required(body, ['coordinator_score', 'coordinatorScore']));
    if (!outcomeId || !['CO', 'PO'].includes(outcomeType)) return badRequest('Valid outcome_id and outcome_type (CO/PO) are required');
    if ([studentScore, supervisorScore, coordinatorScore].some((score) => Number.isNaN(score) || score < 0 || score > 5)) return badRequest('Scores must be between 0 and 5');
    const weightedScore = Number((studentScore * 0.2 + supervisorScore * 0.5 + coordinatorScore * 0.3).toFixed(2));
    const percentage = Number(((weightedScore / 5) * 100).toFixed(2));
    const calculationSteps = `Final Score = (${studentScore} × 0.2) + (${supervisorScore} × 0.5) + (${coordinatorScore} × 0.3) = ${weightedScore}; Percentage = (${weightedScore} / 5) × 100 = ${percentage}%`;

    const existing = await env.DB.prepare(
      `SELECT id FROM outcome_results
       WHERE application_id = ? AND outcome_id = ? AND outcome_type = ?`,
    ).bind(app.id, outcomeId, outcomeType).first<{ id: string }>();
    if (existing) return conflict('Outcome assessment already submitted for this outcome');

    await env.DB.prepare(
      `INSERT INTO outcome_results (
        id, application_id, student_id, external_student_id, internship_id, outcome_id, outcome_type, student_score,
        supervisor_score, coordinator_score, weighted_score, percentage, calculation_steps
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      app.id,
      app.student_id ?? null,
      app.external_student_id ?? null,
      app.internship_id,
      outcomeId,
      outcomeType,
      studentScore,
      supervisorScore,
      coordinatorScore,
      weightedScore,
      percentage,
      calculationSteps,
    ).run();
    return created('Outcome assessment recorded', { weightedScore, percentage, calculationSteps });
  }

  const departmentMarksheetMatch = pathname.match(/^\/api\/department\/applications\/([^/]+)\/marksheet$/);
  if (departmentMarksheetMatch && request.method === 'GET') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const applicationId = departmentMarksheetMatch[1];

    const header = await env.DB.prepare(
      `SELECT ia.id, ia.status, COALESCE(es.name, s.name) AS student_name, COALESCE(es.email, s.email) AS student_email,
              i.title AS internship_title, d.name AS department_name, c.name AS college_name
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       INNER JOIN departments d ON d.id = i.department_id
       INNER JOIN colleges c ON c.id = d.college_id
       LEFT JOIN students s ON s.id = ia.student_id
       LEFT JOIN external_students es ON es.id = ia.external_student_id
       WHERE ia.id = ? AND d.id = ?`,
    ).bind(applicationId, actor.id).first<any>();
    if (!header) return errorResponse(404, 'Application not found');

    const evaluation = await env.DB.prepare(
      `SELECT attendance_marks, work_register_marks, presentation_marks, viva_marks, report_marks, cca_total, ese_total, final_total
       FROM internship_evaluations
       WHERE application_id = ?`,
    ).bind(applicationId).first<any>();

    const outcomes = await env.DB.prepare(
      `SELECT outcome_id, outcome_type, weighted_score, percentage
       FROM outcome_results
       WHERE application_id = ?
       ORDER BY outcome_type, outcome_id`,
    ).bind(applicationId).all<any>();

    return ok('Department marksheet fetched', {
      ...header,
      criteria: {
        cca: 'Attendance & Performance Feedback (9) + Work Register (6) = 15',
        ese: 'Presentation (14) + Viva (14) + Report (7) = 35',
        final: 'CCA (15) + ESE (35) = 50',
      },
      evaluation: evaluation ?? null,
      outcomes: outcomes.results ?? [],
    });
  }

  if (request.method === 'GET' && pathname === '/api/department/industries') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT i.id, i.name,
              CASE WHEN cil.id IS NULL THEN 0 ELSE 1 END AS is_linked
       FROM industries i
       LEFT JOIN departments d ON d.id = ?
       LEFT JOIN college_industry_links cil
         ON cil.industry_id = i.id
        AND cil.college_id = d.college_id
        AND cil.status IN ('approved', 'active')
       WHERE d.id = ?
         AND i.status = 'approved'
         AND i.is_active = 1
       ORDER BY i.name ASC`,
    ).bind(actor.id, actor.id).all();

    return ok('Department industries fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/department/po-pso') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT id, type, value, created_at
       FROM department_outcome_mappings
       WHERE department_id = ?
       ORDER BY type ASC, value ASC`,
    ).bind(actor.id).all();
    return ok('Department PO/PSO options fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/department/programs') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT id, name, program_outcomes, program_specific_outcomes, created_at
       FROM programs
       WHERE department_id = ?
       ORDER BY name ASC`,
    ).bind(actor.id).all();
    return ok('Department programs fetched', rows.results ?? []);
  }

  if (request.method === 'POST' && pathname === '/api/department/programs') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const body = await readBody(request);
    const name = required(body, ['name']);
    const programOutcomes = optional(body, ['program_outcomes', 'programOutcomes']);
    const programSpecificOutcomes = optional(body, ['program_specific_outcomes', 'programSpecificOutcomes']);

    if (!name) return badRequest('name is required');

    const existing = await env.DB.prepare(
      'SELECT id FROM programs WHERE department_id = ? AND lower(name) = lower(?)',
    ).bind(actor.id, name).first<{ id: string }>();
    if (existing) return conflict('Program already exists');

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO programs (id, department_id, name, program_outcomes, program_specific_outcomes)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(id, actor.id, name, programOutcomes, programSpecificOutcomes).run();

    return created('Department program created', { id, name });
  }

  if (request.method === 'GET' && pathname === '/api/department/internship-cos') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const rows = await env.DB.prepare(
      `SELECT id, code, description
       FROM internship_cos
       WHERE department_id = ?
       ORDER BY code ASC`,
    ).bind(actor.id).all();
    return ok('Internship COs fetched', rows.results ?? []);
  }

  if (request.method === 'POST' && pathname === '/api/department/internship-cos') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const code = required(body, ['code']).toUpperCase();
    const description = required(body, ['description']);
    if (!code || !description) return badRequest('code and description are required');
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO internship_cos (id, code, description, department_id) VALUES (?, ?, ?, ?)',
    ).bind(id, code, description, actor.id).run();
    return created('Internship CO created', { id, code, description });
  }

  if (request.method === 'GET' && pathname === '/api/department/internship-pos') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const rows = await env.DB.prepare(
      `SELECT id, code, description
       FROM internship_pos
       WHERE department_id = ?
       ORDER BY code ASC`,
    ).bind(actor.id).all();
    return ok('Internship POs fetched', rows.results ?? []);
  }

  if (request.method === 'POST' && pathname === '/api/department/internship-pos') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const code = required(body, ['code']).toUpperCase();
    const description = required(body, ['description']);
    if (!code || !description) return badRequest('code and description are required');
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO internship_pos (id, code, description, department_id) VALUES (?, ?, ?, ?)',
    ).bind(id, code, description, actor.id).run();
    return created('Internship PO created', { id, code, description });
  }

  const deleteDepartmentProgramMatch = pathname.match(/^\/api\/department\/programs\/([^/]+)$/);
  if (deleteDepartmentProgramMatch && request.method === 'PUT') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const name = required(body, ['name']);
    if (!name) return badRequest('name is required');
    const result = await env.DB.prepare(
      `UPDATE programs
       SET name = ?, updated_at = datetime('now')
       WHERE id = ? AND department_id = ?`,
    ).bind(name, deleteDepartmentProgramMatch[1], actor.id).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Program not found');
    return ok('Department program updated');
  }

  if (deleteDepartmentProgramMatch && request.method === 'DELETE') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const result = await env.DB.prepare(
      `DELETE FROM programs
       WHERE id = ? AND department_id = ?`,
    ).bind(deleteDepartmentProgramMatch[1], actor.id).run();

    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Program not found');
    return ok('Department program removed');
  }

  const programOutcomesMatch = pathname.match(/^\/api\/department\/programs\/([^/]+)\/outcomes$/);
  if (programOutcomesMatch && request.method === 'GET') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const program = await env.DB.prepare('SELECT id FROM programs WHERE id = ? AND department_id = ?').bind(programOutcomesMatch[1], actor.id).first();
    if (!program) return errorResponse(404, 'Program not found');
    const rows = await env.DB.prepare(
      `SELECT id, type, value, created_at
       FROM program_outcome_entries
       WHERE program_id = ?
       ORDER BY type ASC, created_at ASC`,
    ).bind(programOutcomesMatch[1]).all();
    return ok('Program outcomes fetched', rows.results ?? []);
  }

  if (programOutcomesMatch && request.method === 'POST') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const type = required(body, ['type']).toUpperCase();
    const value = required(body, ['value']);
    if (!['PO', 'PSO'].includes(type)) return badRequest('type must be PO or PSO');
    if (!value) return badRequest('value is required');
    const program = await env.DB.prepare('SELECT id FROM programs WHERE id = ? AND department_id = ?').bind(programOutcomesMatch[1], actor.id).first();
    if (!program) return errorResponse(404, 'Program not found');
    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO program_outcome_entries (id, program_id, type, value) VALUES (?, ?, ?, ?)')
      .bind(id, programOutcomesMatch[1], type, value)
      .run();
    return created('Program outcome added', { id });
  }

  const programOutcomeRowMatch = pathname.match(/^\/api\/department\/programs\/([^/]+)\/outcomes\/([^/]+)$/);
  if (programOutcomeRowMatch && request.method === 'PUT') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const type = required(body, ['type']).toUpperCase();
    const value = required(body, ['value']);
    if (!['PO', 'PSO'].includes(type)) return badRequest('type must be PO or PSO');
    if (!value) return badRequest('value is required');
    const result = await env.DB.prepare(
      `UPDATE program_outcome_entries
       SET type = ?, value = ?, updated_at = datetime('now')
       WHERE id = ?
         AND program_id IN (SELECT id FROM programs WHERE id = ? AND department_id = ?)`,
    ).bind(type, value, programOutcomeRowMatch[2], programOutcomeRowMatch[1], actor.id).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Program outcome not found');
    return ok('Program outcome updated');
  }

  if (programOutcomeRowMatch && request.method === 'DELETE') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const result = await env.DB.prepare(
      `DELETE FROM program_outcome_entries
       WHERE id = ?
         AND program_id IN (SELECT id FROM programs WHERE id = ? AND department_id = ?)`,
    ).bind(programOutcomeRowMatch[2], programOutcomeRowMatch[1], actor.id).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Program outcome not found');
    return ok('Program outcome deleted');
  }

  if (request.method === 'POST' && pathname === '/api/department/po-pso') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const type = required(body, ['type']).toUpperCase();
    const value = required(body, ['value']);

    if (!['PO', 'PSO'].includes(type)) return badRequest('type must be PO or PSO');
    if (!value) return badRequest('value is required');

    const existing = await env.DB.prepare(
      `SELECT id
       FROM department_outcome_mappings
       WHERE department_id = ? AND type = ? AND lower(value) = lower(?)`,
    ).bind(actor.id, type, value).first<{ id: string }>();
    if (existing) return conflict(`${type} already exists`);

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO department_outcome_mappings (id, department_id, type, value)
       VALUES (?, ?, ?, ?)`,
    ).bind(id, actor.id, type, value).run();

    return created('Department PO/PSO option created', { id, type, value });
  }

  const deleteDepartmentOutcomeMatch = pathname.match(/^\/api\/department\/po-pso\/([^/]+)$/);
  if (deleteDepartmentOutcomeMatch && request.method === 'DELETE') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const result = await env.DB.prepare(
      `DELETE FROM department_outcome_mappings
       WHERE id = ? AND department_id = ?`,
    ).bind(deleteDepartmentOutcomeMatch[1], actor.id).run();

    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'PO/PSO option not found');
    return ok('Department PO/PSO option removed');
  }

  if (request.method === 'POST' && pathname === '/api/industry-requests') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const industryId = required(body, ['industry_id', 'industryId']);
    const internshipTitle = required(body, ['internship_title', 'internshipTitle']);
    const description = required(body, ['description']);
    const programId = optional(body, ['program_id', 'programId']);
    const mappedCo = optional(body, ['mapped_co', 'mappedCo']);
    const mappedPo = optional(body, ['mapped_po', 'mappedPo']);
    const mappedPso = optional(body, ['mapped_pso', 'mappedPso']);
    if (!industryId || !internshipTitle || !description) return badRequest('industry_id, internship_title and description are required');

    if (programId) {
      const program = await env.DB.prepare('SELECT id FROM programs WHERE id = ? AND department_id = ?').bind(programId, actor.id).first<{ id: string }>();
      if (!program) return badRequest('program_id does not belong to this department');
    }

    const ipo = await env.DB.prepare(
      `SELECT i.id, d.college_id
       FROM industries i
       INNER JOIN departments d ON d.id = ?
       WHERE i.id = ?
         AND i.status = 'approved'
         AND i.is_active = 1`,
    ).bind(actor.id, industryId).first<{ id: string; college_id: string }>();
    if (!ipo) return badRequest('Selected Internship Provider Organization is invalid or inactive');

    const existingLink = await env.DB.prepare(
      `SELECT id
       FROM college_industry_links
       WHERE college_id = ? AND industry_id = ?`,
    ).bind(ipo.college_id, industryId).first<{ id: string }>();
    if (!existingLink) {
      await env.DB.prepare(
        `INSERT INTO college_industry_links (id, college_id, industry_id, status, requested_by)
         VALUES (?, ?, ?, 'approved', 'college')`,
      ).bind(crypto.randomUUID(), ipo.college_id, industryId).run();
    }

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO industry_requests (id, department_id, industry_id, internship_title, description, program_id, mapped_co, mapped_po, mapped_pso, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    ).bind(id, actor.id, industryId, internshipTitle, description, programId, mappedCo, mappedPo, mappedPso).run();

    return created('Industry request submitted', { id });
  }

  const departmentIndustryRequestByIdMatch = pathname.match(/^\/api\/department\/industry-requests\/([^/]+)$/);
  if (departmentIndustryRequestByIdMatch && request.method === 'PUT') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const internshipTitle = required(body, ['internship_title', 'internshipTitle']);
    const description = required(body, ['description']);
    const programId = optional(body, ['program_id', 'programId']);
    const mappedCo = optional(body, ['mapped_co', 'mappedCo']);
    const mappedPo = optional(body, ['mapped_po', 'mappedPo']);
    const mappedPso = optional(body, ['mapped_pso', 'mappedPso']);
    if (!internshipTitle || !description) return badRequest('internship_title and description are required');
    const result = await env.DB.prepare(
      `UPDATE industry_requests
       SET internship_title = ?, description = ?, program_id = ?, mapped_co = ?, mapped_po = ?, mapped_pso = ?, updated_at = datetime('now')
       WHERE id = ? AND department_id = ?`,
    ).bind(internshipTitle, description, programId, mappedCo, mappedPo, mappedPso, departmentIndustryRequestByIdMatch[1], actor.id).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry request not found');
    return ok('Industry request updated');
  }

  if (departmentIndustryRequestByIdMatch && request.method === 'DELETE') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const result = await env.DB.prepare('DELETE FROM industry_requests WHERE id = ? AND department_id = ?')
      .bind(departmentIndustryRequestByIdMatch[1], actor.id)
      .run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry request not found');
    return ok('Industry request deleted');
  }

  const industryDetailsMatch = pathname.match(/^\/api\/department\/industries\/([^/]+)$/);
  if (industryDetailsMatch && request.method === 'GET') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const industry = await env.DB.prepare(
      `SELECT i.id, i.name, i.business_activity, i.email, i.company_address, i.contact_number, i.registration_number, i.registration_year, it.name AS category,
              CASE WHEN cil.id IS NULL THEN 0 ELSE 1 END AS is_linked
       FROM industries i
       LEFT JOIN industry_types it ON it.id = i.industry_type_id
       INNER JOIN departments d ON d.id = ?
       LEFT JOIN college_industry_links cil
         ON cil.industry_id = i.id
        AND cil.college_id = d.college_id
        AND cil.status IN ('approved', 'active')
       WHERE i.id = ?
         AND i.status = 'approved'
         AND i.is_active = 1`,
    ).bind(actor.id, industryDetailsMatch[1]).first<{ id: string; name: string; business_activity: string; category: string }>();
    if (!industry) return errorResponse(404, 'Industry not found');
    const listings = await env.DB.prepare(
      `SELECT id, title, criteria, COALESCE(vacancy, 0) AS vacancy
       FROM industry_internships
       WHERE industry_id = ?
       ORDER BY created_at DESC`,
    ).bind(industry.id).all();
    return ok('Industry details fetched', { ...industry, listings: listings.results ?? [] });
  }

  if (request.method === 'GET' && pathname === '/api/department/industry-requests') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT ir.id, ir.internship_title, ir.description, ir.program_id, p.name AS program_name, ir.mapped_co, ir.mapped_po, ir.mapped_pso, ir.status, ir.created_at,
              ind.id AS industry_id, ind.name AS industry_name
       FROM industry_requests ir
       LEFT JOIN programs p ON p.id = ir.program_id
       INNER JOIN industries ind ON ind.id = ir.industry_id
       WHERE ir.department_id = ?
       ORDER BY ir.created_at DESC`,
    ).bind(actor.id).all();
    return ok('Industry requests fetched', rows.results ?? []);
  }

  const industryRespondMatch = pathname.match(/^\/api\/industry-requests\/([^/]+)\/respond$/);
  if (industryRespondMatch && request.method === 'POST') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const status = required(body, ['status']).toUpperCase();
    if (!['ACCEPTED', 'REJECTED'].includes(status)) return badRequest('status must be ACCEPTED or REJECTED');

    const result = await env.DB.prepare(
      `UPDATE industry_requests
       SET status = ?, updated_at = datetime('now')
       WHERE id = ? AND industry_id = ?`,
    )
      .bind(status, industryRespondMatch[1], actor.id)
      .run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry request not found');
    return ok(`Industry request ${status.toLowerCase()}`);
  }

  const industryRequestUpdateMatch = pathname.match(/^\/api\/industry-requests\/([^/]+)\/update$/);
  if (industryRequestUpdateMatch && request.method === 'PUT') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const internshipTitle = optional(body, ['internship_title', 'internshipTitle']);
    const description = optional(body, ['description']);
    const suggestedVacancy = optional(body, ['suggested_vacancy', 'suggestedVacancy']);
    const suggestedInternshipCategory = optional(body, ['suggested_internship_category', 'suggestedInternshipCategory']);
    const suggestedFee = optional(body, ['suggested_fee', 'suggestedFee']);
    const suggestedStipendAmount = optional(body, ['suggested_stipend_amount', 'suggestedStipendAmount']);
    const suggestedStipendDuration = optional(body, ['suggested_stipend_duration', 'suggestedStipendDuration']);
    const suggestedMinimumDays = optional(body, ['suggested_minimum_days', 'suggestedMinimumDays']);
    const suggestedMaximumDays = optional(body, ['suggested_maximum_days', 'suggestedMaximumDays']);
    const genderPreference = optional(body, ['gender_preference', 'genderPreference']);
    if (suggestedInternshipCategory && !['FREE', 'PAID', 'STIPEND'].includes(String(suggestedInternshipCategory).toUpperCase())) {
      return badRequest('suggested_internship_category must be FREE, PAID or STIPEND');
    }
    if (genderPreference && !['GIRLS', 'BOYS', 'BOTH'].includes(String(genderPreference).toUpperCase())) {
      return badRequest('gender_preference must be GIRLS, BOYS or BOTH');
    }
    const result = await env.DB.prepare(
      `UPDATE industry_requests
       SET internship_title = COALESCE(?, internship_title),
           description = COALESCE(?, description),
           suggested_vacancy = COALESCE(?, suggested_vacancy),
           suggested_internship_category = COALESCE(?, suggested_internship_category),
           suggested_fee = COALESCE(?, suggested_fee),
           suggested_stipend_amount = COALESCE(?, suggested_stipend_amount),
           suggested_stipend_duration = COALESCE(?, suggested_stipend_duration),
           suggested_minimum_days = COALESCE(?, suggested_minimum_days),
           suggested_maximum_days = COALESCE(?, suggested_maximum_days),
           gender_preference = COALESCE(?, gender_preference),
           updated_at = datetime('now')
       WHERE id = ? AND industry_id = ?`,
    )
      .bind(
        internshipTitle,
        description,
        suggestedVacancy !== undefined && suggestedVacancy !== null ? Number(suggestedVacancy) : null,
        suggestedInternshipCategory ? String(suggestedInternshipCategory).toUpperCase() : null,
        suggestedFee !== undefined && suggestedFee !== null ? Number(suggestedFee) : null,
        suggestedStipendAmount !== undefined && suggestedStipendAmount !== null ? Number(suggestedStipendAmount) : null,
        suggestedStipendDuration ? String(suggestedStipendDuration).toUpperCase() : null,
        suggestedMinimumDays !== undefined && suggestedMinimumDays !== null ? Number(suggestedMinimumDays) : null,
        suggestedMaximumDays !== undefined && suggestedMaximumDays !== null ? Number(suggestedMaximumDays) : null,
        genderPreference ? String(genderPreference).toUpperCase() : null,
        industryRequestUpdateMatch[1],
        actor.id,
      )
      .run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry request not found');
    return ok('Industry request updated');
  }

  if (request.method === 'GET' && pathname === '/api/industry/ideas') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const rows = await env.DB.prepare(
      `SELECT ir.id, ir.internship_title, ir.description, ir.status, ir.mapped_co, ir.mapped_po, ir.mapped_pso,
              ir.program_id, p.name AS program_name,
              ir.gender_preference, ir.suggested_vacancy, ir.suggested_internship_category,
              ir.suggested_fee, ir.suggested_stipend_amount, ir.suggested_stipend_duration,
              ir.suggested_minimum_days, ir.suggested_maximum_days,
              d.id AS department_id, d.name AS department_name, c.name AS college_name,
              i.id AS published_internship_id, i.vacancy AS published_vacancy, i.internship_category AS published_category
       FROM industry_requests ir
       INNER JOIN departments d ON d.id = ir.department_id
       INNER JOIN colleges c ON c.id = d.college_id
       LEFT JOIN programs p ON p.id = ir.program_id
       LEFT JOIN internships i ON i.industry_request_id = ir.id
       WHERE ir.industry_id = ?
       ORDER BY ir.created_at DESC`,
    ).bind(actor.id).all();
    return ok('Industry ideas fetched', rows.results ?? []);
  }

  const publishIdeaMatch = pathname.match(/^\/api\/industry\/ideas\/([^/]+)\/publish$/);
  if (publishIdeaMatch && request.method === 'POST') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const requestId = publishIdeaMatch[1];
    const vacancies = Number(required(body, ['vacancy', 'vacancies']));
    const internshipCategory = toText(required(body, ['internship_category', 'internshipCategory'])).toUpperCase();
    const fee = optional(body, ['fee']) ? Number(optional(body, ['fee'])) : null;
    const stipendAmount = optional(body, ['stipend_amount', 'stipendAmount']) ? Number(optional(body, ['stipend_amount', 'stipendAmount'])) : null;
    const stipendDuration = toText(optional(body, ['stipend_duration', 'stipendDuration'])) || null;
    const minimumDays = optional(body, ['minimum_days', 'minimumDays']) ? Number(optional(body, ['minimum_days', 'minimumDays'])) : null;
    const maximumDays = optional(body, ['maximum_days', 'maximumDays']) ? Number(optional(body, ['maximum_days', 'maximumDays'])) : null;
    const genderPreference = toText(optional(body, ['gender_preference', 'genderPreference'])) || 'BOTH';
    if (Number.isNaN(vacancies) || vacancies <= 0) return badRequest('Valid vacancies are required');
    if (!['FREE', 'PAID', 'STIPEND'].includes(internshipCategory)) return badRequest('internship_category must be FREE, PAID or STIPEND');
    if (!['GIRLS', 'BOYS', 'BOTH'].includes(genderPreference.toUpperCase())) return badRequest('gender_preference must be GIRLS, BOYS or BOTH');

    const requestRow = await env.DB.prepare(
      `SELECT ir.id,
              ir.department_id,
              d.college_id,
              ir.internship_title,
              ir.description
       FROM industry_requests ir
       INNER JOIN departments d ON d.id = ir.department_id
       WHERE ir.id = ? AND ir.industry_id = ? AND ir.status = 'ACCEPTED'`,
    ).bind(requestId, actor.id).first<{ id: string; department_id: string; college_id: string; internship_title: string; description: string }>();
    if (!requestRow) return badRequest('Accepted idea not found');

    const already = await env.DB.prepare('SELECT id FROM internships WHERE industry_request_id = ?').bind(requestId).first<{ id: string }>();
    if (already) return conflict('This idea is already published');

    const createdInternshipId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO internships (
        id,
        title,
        description,
        department_id,
        college_id,
        industry_id,
        is_paid,
        fee,
        internship_category,
        vacancy,
        total_vacancy,
        filled_vacancy,
        remaining_vacancy,
        is_external,
        status,
        published,
        student_visibility,
        industry_request_id,
        stipend_amount,
        stipend_duration,
        minimum_days,
        maximum_days,
        gender_preference
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, 'ACCEPTED', 1, 1, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        createdInternshipId,
        requestRow.internship_title,
        requestRow.description,
        requestRow.department_id,
        requestRow.college_id,
        actor.id,
        internshipCategory === 'PAID' ? 1 : 0,
        internshipCategory === 'PAID' ? fee : null,
        internshipCategory,
        vacancies,
        vacancies,
        vacancies,
        requestId,
        internshipCategory === 'STIPEND' ? stipendAmount : null,
        internshipCategory === 'STIPEND' ? stipendDuration : null,
        minimumDays,
        maximumDays,
        genderPreference.toUpperCase(),
      )
      .run();

    await generateDocument(env, {
      type: 'reply',
      internshipId: createdInternshipId,
      actor,
      supervisorName: 'To be assigned by industry',
      supervisorDesignation: 'Industry Supervisor',
    });

    return created('Idea published as internship');
  }

  if (request.method === 'POST' && pathname === '/api/department/map-students') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const industryRequestId = required(body, ['industry_request_id', 'industryRequestId']);
    const studentIds = body.student_ids;
    if (!industryRequestId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return badRequest('industry_request_id and student_ids[] are required');
    }

    const requestRow = await env.DB.prepare(
      `SELECT id, industry_id, internship_title, status
       FROM industry_requests
       WHERE id = ? AND department_id = ?`,
    ).bind(industryRequestId, actor.id).first<{ id: string; industry_id: string; internship_title: string; status: string }>();

    if (!requestRow) return badRequest('Invalid industry_request_id');
    if (requestRow.status !== 'ACCEPTED') return badRequest('Industry request must be ACCEPTED before mapping students');

    const internship = await env.DB.prepare(
      `SELECT id FROM internships
       WHERE department_id = ? AND title = ?
       ORDER BY created_at DESC LIMIT 1`,
    ).bind(actor.id, requestRow.internship_title).first<{ id: string }>();
    if (!internship) return badRequest('Create a matching internship before student mapping');

    const inserted: string[] = [];
    for (const studentIdRaw of studentIds) {
      const studentId = toText(studentIdRaw);
      if (!studentId) continue;
      const student = await env.DB.prepare(
        'SELECT id, name, email FROM students WHERE id = ? AND department_id = ?',
      ).bind(studentId, actor.id).first<{ id: string; name: string; email: string }>();
      if (!student) continue;

      await env.DB.prepare(
        `INSERT INTO internship_allocations (id, student_id, external_student_id, industry_id, internship_id, project_details, status)
         VALUES (?, ?, NULL, ?, ?, ?, 'allocated')`,
      ).bind(crypto.randomUUID(), student.id, requestRow.industry_id, internship.id, 'Mapped by department').run();

      await sendAcceptanceEmail(env, {
        to: student.email,
        studentName: student.name,
        internshipTitle: requestRow.internship_title,
        departmentName: 'Department Coordinator Office',
        isPaid: false,
        fee: null,
        joiningInstructions: 'You have been mapped to an industry internship. Please check your student dashboard for details.',
        template: 'internal-mapping',
      });
      inserted.push(student.id);
    }
    return ok('Students mapped successfully', { mappedStudentIds: inserted });
  }

  const outcomeReportMatch = pathname.match(/^\/api\/outcome\/report\/([^/]+)$/);
  if (outcomeReportMatch && request.method === 'GET') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR', 'STUDENT', 'EXTERNAL_STUDENT', 'ADMIN', 'SUPER_ADMIN']);
    if (actor instanceof Response) return actor;
    const studentId = outcomeReportMatch[1];

    const rawRows = await env.DB.prepare(
      `SELECT outcome_id, outcome_type, student_score, supervisor_score, coordinator_score, weighted_score, percentage, calculation_steps
       FROM outcome_results
       WHERE student_id = ? OR external_student_id = ?
       ORDER BY outcome_type, outcome_id`,
    ).bind(studentId, studentId).all<any>();
    const rows = rawRows.results ?? [];
    const coRows = rows.filter((row) => row.outcome_type === 'CO');
    const poRows = rows.filter((row) => row.outcome_type === 'PO');
    const coAvg = coRows.length ? Number((coRows.reduce((sum, row) => sum + Number(row.percentage), 0) / coRows.length).toFixed(2)) : 0;
    const poAvg = poRows.length ? Number((poRows.reduce((sum, row) => sum + Number(row.percentage), 0) / poRows.length).toFixed(2)) : 0;

    const percentages = rows.map((row) => Number(row.percentage));
    const avg = percentages.length ? Number((percentages.reduce((sum, value) => sum + value, 0) / percentages.length).toFixed(2)) : 0;
    const strengths = rows.filter((row) => Number(row.percentage) >= 75).map((row) => row.outcome_id);
    const gaps = rows.filter((row) => Number(row.percentage) < 60).map((row) => row.outcome_id);

    return ok('Outcome report fetched', {
      raw_scores: rows.map((row) => ({ outcome_id: row.outcome_id, outcome_type: row.outcome_type, student_score: row.student_score, supervisor_score: row.supervisor_score, coordinator_score: row.coordinator_score })),
      weighted_scores: rows.map((row) => ({ outcome_id: row.outcome_id, weighted_score: row.weighted_score })),
      calculation_steps: rows.map((row) => ({ outcome_id: row.outcome_id, calculation: row.calculation_steps })),
      percentages: {
        outcome_wise: rows.map((row) => ({ outcome_id: row.outcome_id, percentage: row.percentage })),
        co_achievement: coAvg,
        po_achievement: poAvg,
      },
      classification: classifyPerformance(avg),
      strengths,
      gaps,
    });
  }

  return errorResponse(404, 'Route not found');
}

async function getStudentApplicationEligibility(env: EnvBindings, studentId: string): Promise<{ openApplications: number; activeLock: boolean }> {
  const activeRows = await env.DB.prepare(
    `SELECT ia.status, ia.completed_at
     FROM internship_applications ia
     WHERE ia.student_id = ?
       AND ia.status IN ('pending', 'accepted')`,
  ).bind(studentId).all<{ status: string; completed_at: string | null }>();

  const rows = activeRows.results ?? [];
  const openApplications = rows.filter((row) => !row.completed_at).length;
  const activeLock = rows.some((row) => row.status === 'accepted' && !row.completed_at);
  return { openApplications, activeLock };
}

async function runAtomic(
  env: EnvBindings,
  workerState: { storage?: { transaction: <T>(fn: (txn: unknown) => Promise<T>) => Promise<T> } } | null,
  operation: () => Promise<void>,
): Promise<void> {
  if (workerState?.storage?.transaction) {
    await workerState.storage.transaction(async () => {
      await operation();
    });
    return;
  }
  await operation();
}

async function loadStudentDashboard(env: EnvBindings, studentId: string): Promise<Response> {
  const student = await env.DB.prepare(
    `SELECT s.college_id, s.sex, c.name AS college_name
     FROM students s
     LEFT JOIN colleges c ON c.id = s.college_id
     WHERE s.id = ?`,
  ).bind(studentId).first<{ college_id: string; sex: string | null; college_name: string | null }>();
  if (!student) return unauthorized('Student not found');

  const [legacyInternships, applications, collegeInternships, externalInternships, eligibility] = await Promise.all([
    env.DB.prepare(
      `SELECT i.id, i.title, i.description, ind.name AS industry_name,
              ia.id AS application_id, ia.status AS application_status
       FROM internships i
       LEFT JOIN internship_applications ia
         ON ia.internship_id = i.id AND ia.student_id = ?
       LEFT JOIN industry_internships ii ON ii.title = i.title
       LEFT JOIN industries ind ON ind.id = ii.industry_id
       WHERE i.status = 'ACCEPTED' AND COALESCE(i.student_visibility, 0) = 1
       ORDER BY i.created_at DESC`,
    ).bind(studentId).all(),
    env.DB.prepare(
      `SELECT ia.id, ia.status, i.title, COALESCE(ind.name, 'Industry') AS industry_name
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       LEFT JOIN industry_internships ii ON ii.title = i.title
       LEFT JOIN industries ind ON ind.id = ii.industry_id
       WHERE ia.student_id = ?
       ORDER BY ia.created_at DESC`,
    ).bind(studentId).all(),
    env.DB.prepare(
      `SELECT i.id, i.title, i.description, d.name AS department_name, c.name AS college_name, c.id AS college_id, COALESCE(i.is_external, 0) AS is_external
       FROM internships i
       INNER JOIN departments d ON d.id = i.department_id
       INNER JOIN colleges c ON c.id = d.college_id
       WHERE d.college_id = ?
         AND i.status = 'ACCEPTED'
         AND COALESCE(i.student_visibility, 0) = 1
         AND NOT (
           COALESCE(i.is_external, 0) = 1
           AND COALESCE(i.created_by, 'INDUSTRY') IN ('COLLEGE', 'DEPARTMENT')
         )
         AND (
           COALESCE(i.gender_preference, 'BOTH') = 'BOTH'
           OR (COALESCE(i.gender_preference, 'BOTH') = 'BOYS' AND ? = 'MALE')
           OR (COALESCE(i.gender_preference, 'BOTH') = 'GIRLS' AND ? = 'FEMALE')
         )
       ORDER BY i.created_at DESC`,
    ).bind(student.college_id, student.sex ?? '', student.sex ?? '').all(),
    env.DB.prepare(
      `SELECT i.id, i.title, i.description, COALESCE(ind.name, 'Industry') AS industry_name, COALESCE(i.industry_id, ii.industry_id) AS industry_id, d.name AS department_name, c.name AS college_name, c.id AS college_id,
              COALESCE(i.is_external, 0) AS is_external,
              COALESCE(i.available_vacancy, i.vacancy, i.remaining_vacancy, i.total_vacancy, 0) AS vacancy,
              ia.id AS application_id, ia.status AS application_status, ia.industry_feedback, ia.industry_score,
              (
                SELECT AVG(orx.weighted_score)
                FROM outcome_results orx
                WHERE orx.application_id = ia.id
              ) AS outcome_marks
       FROM internships i
       INNER JOIN departments d ON d.id = i.department_id
       INNER JOIN colleges c ON c.id = d.college_id
       LEFT JOIN industry_internships ii ON ii.title = i.title
       LEFT JOIN industries ind ON ind.id = ii.industry_id
       LEFT JOIN internship_applications ia ON ia.internship_id = i.id AND ia.student_id = ?
       WHERE i.status = 'ACCEPTED'
         AND COALESCE(i.student_visibility, 0) = 1
         AND (
           COALESCE(i.created_by, 'INDUSTRY') = 'INDUSTRY'
           OR (COALESCE(i.created_by, 'INDUSTRY') IN ('COLLEGE', 'DEPARTMENT') AND COALESCE(i.is_external, 0) = 1)
         )
         AND (
           COALESCE(i.gender_preference, 'BOTH') = 'BOTH'
           OR (COALESCE(i.gender_preference, 'BOTH') = 'BOYS' AND ? = 'MALE')
           OR (COALESCE(i.gender_preference, 'BOTH') = 'GIRLS' AND ? = 'FEMALE')
         )
       ORDER BY i.created_at DESC`,
    ).bind(studentId, student.sex ?? '', student.sex ?? '').all(),
    getStudentApplicationEligibility(env, studentId),
  ]);

  const internshipRows = legacyInternships.results ?? [];
  const applicationRows = applications.results ?? [];
  const collegeRows = collegeInternships.results ?? [];
  const externalRows = externalInternships.results ?? [];

  return ok('Student dashboard loaded', {
    studentCollegeName: student.college_name ?? 'Your College',
    internships: internshipRows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      industryName: row.industry_name,
      applied: Boolean(row.application_id),
      status: row.application_status ? String(row.application_status).toUpperCase() : undefined,
    })),
    applications: applicationRows.map((row: any) => ({
      id: row.id,
      internshipTitle: row.title,
      industryName: row.industry_name,
      status: String(row.status).toUpperCase(),
      acceptanceUrl: null,
    })),
    collegeInternships: collegeRows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      departmentName: row.department_name,
      collegeName: row.college_name,
      isExternal: Number(row.is_external ?? 0) === 1,
    })),
    externalInternships: externalRows.map((row: any) => {
      const sameCollege = String(row.college_id ?? '') === String(student.college_id ?? '');
      const externalOnlyBlocked = Number(row.is_external ?? 0) === 1 && sameCollege;
      const limitReached = eligibility.openApplications >= MAX_ACTIVE_APPLICATIONS || eligibility.activeLock;
      return {
      id: row.id,
      title: row.title,
      description: row.description,
      industryName: row.industry_name,
      industryId: row.industry_id,
      collegeName: row.college_name,
      departmentName: row.department_name,
      vacancy: row.vacancy,
      applied: Boolean(row.application_id),
      applicationId: row.application_id,
      status: row.application_status ? String(row.application_status).toUpperCase() : undefined,
      industryFeedback: row.industry_feedback ?? null,
      evaluationMarks: row.industry_score === null || row.industry_score === undefined ? null : Number(row.industry_score),
      outcomeMarks: row.outcome_marks === null || row.outcome_marks === undefined ? null : Number(row.outcome_marks),
      isExternal: Number(row.is_external ?? 0) === 1,
      sameCollege,
      eligible: !externalOnlyBlocked && !limitReached,
      eligibilityMessage: externalOnlyBlocked
        ? 'External-only internship'
        : (limitReached ? 'Application limit reached' : 'Available for your college'),
      };
    }),
    activeApplicationLock: eligibility.activeLock,
    maxSelectableApplications: MAX_ACTIVE_APPLICATIONS,
    canApplyForExternal: !eligibility.activeLock && eligibility.openApplications < MAX_ACTIVE_APPLICATIONS,
    policyNote: 'You can apply to all industry/internal internships. External internships from your own college are blocked.',
    journeyCompletion: applicationRows.length > 0 ? 60 : 20,
    journeySteps: [
      { label: 'Profile created', done: true },
      { label: 'Applied to internship', done: applicationRows.length > 0 },
      { label: 'Selection completed', done: applicationRows.some((item: any) => item.status === 'accepted') },
    ],
  });
}

async function approveAdminEntity(env: EnvBindings, entity: string, entityId: string, actorAdminId: string): Promise<Response> {
  if (entity === 'college') {
    const result = await env.DB.prepare(
      `UPDATE colleges
       SET status = 'approved', is_active = 1, approved_by_admin_id = ?, approved_at = datetime('now'), rejection_reason = NULL, updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(actorAdminId, entityId)
      .run();
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'College not found');
    return ok('College approved');
  }

  if (entity === 'industry') {
    const result = await env.DB.prepare(
      `UPDATE industries
       SET status = 'approved', is_active = 1, approved_by_admin_id = ?, approved_at = datetime('now'), rejection_reason = NULL, updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(actorAdminId, entityId)
      .run();
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry not found');
    return ok('Industry approved');
  }

  if (entity === 'department') {
    const result = await env.DB.prepare(
      `UPDATE departments
       SET is_active = 1, updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(entityId)
      .run();
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'Department not found');
    return ok('Department approved');
  }

  if (entity === 'student') {
    const result = await env.DB.prepare(
      `UPDATE students
       SET is_active = 1, updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(entityId)
      .run();
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'Student not found');
    return ok('Student approved');
  }

  return badRequest('Unsupported entity');
}

async function rejectAdminEntity(env: EnvBindings, entity: string, entityId: string, actorAdminId: string): Promise<Response> {
  if (entity === 'college') {
    const result = await env.DB.prepare(
      `UPDATE colleges
       SET status = 'rejected', is_active = 0, approved_by_admin_id = ?, approved_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(actorAdminId, entityId)
      .run();
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'College not found');
    return ok('College rejected');
  }

  if (entity === 'industry') {
    const result = await env.DB.prepare(
      `UPDATE industries
       SET status = 'rejected', is_active = 0, approved_by_admin_id = ?, approved_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(actorAdminId, entityId)
      .run();
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry not found');
    return ok('Industry rejected');
  }

  if (entity === 'department') {
    const result = await env.DB.prepare(
      `UPDATE departments
       SET is_active = 0, updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(entityId)
      .run();
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'Department not found');
    return ok('Department rejected');
  }

  if (entity === 'student') {
    const result = await env.DB.prepare(
      `UPDATE students
       SET is_active = 0, updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(entityId)
      .run();
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'Student not found');
    return ok('Student rejected');
  }

  return badRequest('Unsupported entity');
}

async function deleteAdminEntity(env: EnvBindings, entity: string, entityId: string): Promise<Response> {
  const table = entity === 'college'
    ? 'colleges'
    : entity === 'industry'
      ? 'industries'
      : entity === 'student'
        ? 'students'
        : entity === 'department'
          ? 'departments'
          : '';

  if (!table) return badRequest('Unsupported entity');

  const result = await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(entityId).run();
  if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, `${entity} not found`);
  return ok(`${entity} deleted`);
}

async function editAdminEntity(request: Request, env: EnvBindings, entity: string, entityId: string): Promise<Response> {
  const body = await readBody(request);

  if (entity === 'college') {
    const result = await env.DB.prepare(
      `UPDATE colleges
       SET name = COALESCE(?, name),
           coordinator_email = COALESCE(?, coordinator_email),
           coordinator_name = COALESCE(?, coordinator_name),
           mobile = COALESCE(?, mobile),
           address = COALESCE(?, address),
           university = COALESCE(?, university),
           updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(optional(body, ['name']), optional(body, ['email', 'coordinator_email']), optional(body, ['coordinator_name']), optional(body, ['mobile']), optional(body, ['address']), optional(body, ['university']), entityId)
      .run();
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'College not found');
    return ok('College updated');
  }

  if (entity === 'industry') {
    const result = await env.DB.prepare(
      `UPDATE industries
       SET name = COALESCE(?, name),
           email = COALESCE(?, email),
           business_activity = COALESCE(?, business_activity),
           updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(optional(body, ['name']), optional(body, ['email']), optional(body, ['business_activity']), entityId)
      .run();
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry not found');
    return ok('Industry updated');
  }

  if (entity === 'department') {
    const result = await env.DB.prepare(
      `UPDATE departments
       SET name = COALESCE(?, name),
           coordinator_name = COALESCE(?, coordinator_name),
           coordinator_email = COALESCE(?, coordinator_email),
           coordinator_mobile = COALESCE(?, coordinator_mobile),
           updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(optional(body, ['name']), optional(body, ['coordinator_name']), optional(body, ['coordinator_email']), optional(body, ['coordinator_mobile']), entityId)
      .run();
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'Department not found');
    return ok('Department updated');
  }

  if (entity === 'student') {
    const result = await env.DB.prepare(
      `UPDATE students
       SET name = COALESCE(?, name),
           email = COALESCE(?, email),
           phone = COALESCE(?, phone),
           updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(optional(body, ['name']), optional(body, ['email']), optional(body, ['phone']), entityId)
      .run();
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'Student not found');
    return ok('Student updated');
  }

  return badRequest('Unsupported entity');
}

async function passwordLogin(request: Request, env: EnvBindings, entity: 'college' | 'industry' | 'student') {
  const body = await readBody(request);
  console.log('BODY:', body);

  const email = normalizeEmail(required(body, ['email']));
  const password = required(body, ['password']);

  if (!email || !password) return badRequest('email and password are required');

  if (entity === 'college') {
    const row = await env.DB.prepare(
      `SELECT id, coordinator_email AS email, password, status, is_active
       FROM colleges WHERE coordinator_email = ?`,
    )
      .bind(email)
      .first<{ id: string; email: string; password: string; status: string; is_active: number }>();

    if (!row || row.password !== password) return unauthorized('Invalid credentials');
    if (row.status !== 'approved' || Number(row.is_active) !== 1) return forbidden('Waiting for approval');

    return ok('Login successful', createSession({ id: row.id, email: row.email, role: 'COLLEGE' }));
  }

  if (entity === 'industry') {
    const row = await env.DB.prepare('SELECT id, email, password, status, is_active FROM industries WHERE email = ?')
      .bind(email)
      .first<{ id: string; email: string; password: string; status: string; is_active: number }>();

    if (!row || row.password !== password) return unauthorized('Invalid credentials');
    if (row.status !== 'approved' || Number(row.is_active) !== 1) return forbidden('Waiting for approval');

    return ok('Login successful', createSession({ id: row.id, email: row.email, role: 'INDUSTRY' }));
  }

  const row = await env.DB.prepare('SELECT id, email, password, is_active FROM students WHERE email = ?')
    .bind(email)
    .first<{ id: string; email: string; password: string; is_active: number }>();

  if (!row || row.password !== password) return unauthorized('Invalid credentials');
  if (Number(row.is_active) !== 1) return forbidden('Account inactive');

  return ok('Login successful', createSession({ id: row.id, email: row.email, role: 'STUDENT' }));
}

async function unifiedLogin(request: Request, env: EnvBindings) {
  const body = await readBody(request);
  console.log('BODY:', body);

  const email = normalizeEmail(required(body, ['email']));
  const password = required(body, ['password']);

  if (!email || !password) return badRequest('email and password are required');

  const college = await env.DB.prepare('SELECT id FROM colleges WHERE coordinator_email = ? AND password = ?')
    .bind(email, password)
    .first<{ id: string }>();
  if (college) {
    const status = await env.DB.prepare('SELECT status, is_active FROM colleges WHERE id = ?').bind(college.id).first<{ status: string; is_active: number }>();
    if (status?.status !== 'approved' || Number(status?.is_active) !== 1) return forbidden('Waiting for approval');
    return ok('Login successful', createSession({ id: college.id, email, role: 'COLLEGE' }));
  }

  const industry = await env.DB.prepare('SELECT id, status, is_active FROM industries WHERE email = ? AND password = ?')
    .bind(email, password)
    .first<{ id: string; status: string; is_active: number }>();
  if (industry) {
    if (industry.status !== 'approved' || Number(industry.is_active) !== 1) return forbidden('Waiting for approval');
    return ok('Login successful', createSession({ id: industry.id, email, role: 'INDUSTRY' }));
  }

  const department = await env.DB.prepare('SELECT id, is_active, is_first_login FROM departments WHERE coordinator_email = ? AND password = ?')
    .bind(email, password)
    .first<{ id: string; is_active: number; is_first_login: number }>();
  if (department) {
    if (Number(department.is_active) !== 1) return forbidden('Department account inactive');
    return ok('Login successful', {
      ...createSession({ id: department.id, email, role: 'DEPARTMENT_COORDINATOR' }),
      mustChangePassword: Number(department.is_first_login) === 1,
    });
  }

  const student = await env.DB.prepare('SELECT id, is_active FROM students WHERE email = ? AND password = ?')
    .bind(email, password)
    .first<{ id: string; is_active: number }>();
  if (student) {
    if (Number(student.is_active) !== 1) return forbidden('Account inactive');
    return ok('Login successful', createSession({ id: student.id, email, role: 'STUDENT' }));
  }

  const externalStudent = await env.DB.prepare('SELECT id, is_active FROM external_students WHERE email = ? AND password = ?')
    .bind(email, password)
    .first<{ id: string; is_active: number }>();
  if (externalStudent) {
    if (Number(externalStudent.is_active) !== 1) return forbidden('Account inactive');
    return ok('Login successful', createSession({ id: externalStudent.id, email, role: 'EXTERNAL_STUDENT' }));
  }

  return unauthorized('Invalid credentials');
}

async function upsertIdentity(
  env: EnvBindings,
  params: { role: Role; entityId: string; email: string; isActive: 0 | 1 },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO auth_identities (id, role, entity_id, email, is_active)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       role = excluded.role,
       entity_id = excluded.entity_id,
       is_active = excluded.is_active,
       updated_at = datetime('now')`,
  )
    .bind(crypto.randomUUID(), params.role, params.entityId, params.email, params.isActive)
    .run();
}

async function ensureDefaultSuperadmin(env: EnvBindings, email: string): Promise<void> {
  if (email !== DEFAULT_SUPERADMIN_EMAIL) return;

  await env.DB.prepare(
    `INSERT OR IGNORE INTO admins (id, email, role, is_active)
     VALUES (?, ?, 'superadmin', 1)`,
  )
    .bind(DEFAULT_SUPERADMIN_ID, DEFAULT_SUPERADMIN_EMAIL)
    .run();

  await upsertIdentity(env, {
    role: 'superadmin',
    entityId: DEFAULT_SUPERADMIN_ID,
    email: DEFAULT_SUPERADMIN_EMAIL,
    isActive: 1,
  });
}

async function sendOtpEmail(env: EnvBindings, to: string, otp: string): Promise<void> {
  const payload = {
    from: env.RESEND_FROM_EMAIL || 'noreply@aureliv.in',
    to,
    subject: 'Your Superadmin OTP',
    html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend failed: ${res.status} ${text}`);
  }
}

type AcceptanceEmailPayload = {
  to: string;
  studentName: string;
  internshipTitle: string;
  departmentName: string;
  isPaid: boolean;
  fee: number | null;
  joiningInstructions: string;
  template: 'external-acceptance' | 'internal-mapping';
};

type StudentMarksheetEmailPayload = {
  to: string;
  studentName: string;
  internshipTitle: string;
  industryName: string;
  departmentName: string;
  collegeName: string;
  status: string;
  industryFeedback: string | null;
  evaluationMarks: number | null;
  outcomeMarks: number | null;
};

async function sendAcceptanceEmail(env: EnvBindings, payload: AcceptanceEmailPayload): Promise<void> {
  if (!payload.to) {
    await logEmailFailure(env, payload.template, null, 'Missing recipient email');
    return;
  }
  if (!env.RESEND_API_KEY) {
    await logEmailFailure(env, payload.template, payload.to, 'RESEND_API_KEY is missing');
    return;
  }

  const subject = payload.template === 'external-acceptance'
    ? `Internship Acceptance: ${payload.internshipTitle}`
    : `Internship Mapping Confirmed: ${payload.internshipTitle}`;

  const html = `<p>Dear ${payload.studentName},</p>
<p>Congratulations! You have been selected for <strong>${payload.internshipTitle}</strong>.</p>
<p>Department: <strong>${payload.departmentName}</strong></p>
<p>Type: <strong>${payload.isPaid ? `Paid (₹${payload.fee ?? 0})` : 'Free'}</strong></p>
<p>${payload.joiningInstructions}</p>
<p>Regards,<br/>Internship Management Team</p>`;

  let attempt = 0;
  let lastError = '';
  while (attempt < 2) {
    attempt += 1;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || 'noreply@aureliv.in',
        to: payload.to,
        subject,
        html,
      }),
    });
    if (res.ok) return;
    lastError = await res.text();
  }
  await logEmailFailure(env, payload.template, payload.to, lastError || 'Unknown email failure');
}

async function sendStudentMarksheetEmail(env: EnvBindings, payload: StudentMarksheetEmailPayload): Promise<void> {
  if (!payload.to) {
    await logEmailFailure(env, 'student-marksheet', null, 'Missing recipient email');
    return;
  }
  if (!env.RESEND_API_KEY) {
    await logEmailFailure(env, 'student-marksheet', payload.to, 'RESEND_API_KEY is missing');
    return;
  }

  const html = `<p>Dear ${payload.studentName},</p>
<p>Your internship marksheet summary is ready.</p>
<p><strong>Internship:</strong> ${payload.internshipTitle}</p>
<p><strong>Industry:</strong> ${payload.industryName}</p>
<p><strong>Department:</strong> ${payload.departmentName}</p>
<p><strong>Host College:</strong> ${payload.collegeName}</p>
<p><strong>Status:</strong> ${payload.status}</p>
<p><strong>Industry Feedback:</strong> ${payload.industryFeedback || 'Not provided yet'}</p>
<p><strong>Evaluation Marks:</strong> ${payload.evaluationMarks ?? 'Not available'}</p>
<p><strong>Outcome Marks:</strong> ${payload.outcomeMarks ?? 'Not available'}</p>
<p>Regards,<br/>Internship Management Team</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL || 'noreply@aureliv.in',
      to: payload.to,
      subject: `Internship Marksheet Summary: ${payload.internshipTitle}`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    await logEmailFailure(env, 'student-marksheet', payload.to, text || 'Unknown email failure');
  }
}

async function logEmailFailure(env: EnvBindings, type: string, recipient: string | null, errorMessage: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO email_logs (id, email_type, recipient, status, error_message)
     VALUES (?, ?, ?, 'FAILED', ?)`,
  ).bind(crypto.randomUUID(), type, recipient, errorMessage).run();
}



function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!';
  let out = '';
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function toBooleanInt(value: string | null): number | null {
  if (value === null) return null;
  if (['1', 'true', 'yes'].includes(value.toLowerCase())) return 1;
  if (['0', 'false', 'no'].includes(value.toLowerCase())) return 0;
  return null;
}

async function sendCredentialEmail(env: EnvBindings, to: string, departmentName: string, password: string): Promise<void> {
  if (!env.RESEND_API_KEY) return;
  const payload = {
    from: env.RESEND_FROM_EMAIL || 'noreply@aureliv.in',
    to,
    subject: `Department Account Created - ${departmentName}`,
    html: `<p>Your department account is ready.</p><p>Email: <strong>${to}</strong><br/>Password: <strong>${password}</strong></p><p>Please change password on first login.</p>`,
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('DB_ERROR:', text);
  }
}

async function ensureInternshipAllocationsTable(env: EnvBindings): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS internship_allocations (
      id TEXT PRIMARY KEY,
      student_id TEXT,
      external_student_id TEXT,
      industry_id TEXT NOT NULL,
      internship_id TEXT NOT NULL,
      project_details TEXT,
      status TEXT NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated','active','completed','cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (external_student_id) REFERENCES external_students(id) ON DELETE CASCADE,
      FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE,
      FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
      CHECK (
        (student_id IS NOT NULL AND external_student_id IS NULL) OR
        (student_id IS NULL AND external_student_id IS NOT NULL)
      )
    )`,
  ).run();

  await Promise.all([
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_internship_allocations_student ON internship_allocations(student_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_internship_allocations_external_student ON internship_allocations(external_student_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_internship_allocations_industry ON internship_allocations(industry_id)').run(),
  ]);
}

async function ensureDepartmentCompatibility(env: EnvBindings): Promise<void> {
  const columns = await getTableColumns(env, 'departments');
  const names = new Set(columns.map((column) => column.name));

  if (!names.has('is_first_login')) {
    await env.DB.prepare('ALTER TABLE departments ADD COLUMN is_first_login INTEGER NOT NULL DEFAULT 1').run();
  }

  if (!names.has('coordinator_mobile')) {
    await env.DB.prepare('ALTER TABLE departments ADD COLUMN coordinator_mobile TEXT').run();
  }
}

async function ensureDepartmentDashboardSchema(env: EnvBindings): Promise<void> {
  const internshipColumns = new Set((await getTableColumns(env, 'internships')).map((column) => column.name));
  if (!internshipColumns.has('is_external')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN is_external INTEGER NOT NULL DEFAULT 0').run();
  if (!internshipColumns.has('is_paid')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN is_paid INTEGER NOT NULL DEFAULT 0').run();
  if (!internshipColumns.has('fee')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN fee INTEGER').run();
  if (!internshipColumns.has('internship_category')) await env.DB.prepare("ALTER TABLE internships ADD COLUMN internship_category TEXT NOT NULL DEFAULT 'FREE'").run();
  if (!internshipColumns.has('vacancy')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN vacancy INTEGER NOT NULL DEFAULT 0').run();
  if (!internshipColumns.has('industry_id')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN industry_id TEXT').run();
  if (!internshipColumns.has('status')) await env.DB.prepare("ALTER TABLE internships ADD COLUMN status TEXT NOT NULL DEFAULT 'DRAFT'").run();
  if (!internshipColumns.has('student_visibility')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN student_visibility INTEGER NOT NULL DEFAULT 0').run();
  if (!internshipColumns.has('programme')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN programme TEXT').run();
  if (!internshipColumns.has('industry_request_id')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN industry_request_id TEXT').run();
  if (!internshipColumns.has('stipend_amount')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN stipend_amount INTEGER').run();
  if (!internshipColumns.has('stipend_duration')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN stipend_duration TEXT').run();
  if (!internshipColumns.has('minimum_days')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN minimum_days INTEGER').run();
  if (!internshipColumns.has('maximum_days')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN maximum_days INTEGER').run();
  if (!internshipColumns.has('duration')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN duration TEXT').run();
  if (!internshipColumns.has('total_vacancy')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN total_vacancy INTEGER NOT NULL DEFAULT 0').run();
  if (!internshipColumns.has('filled_vacancy')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN filled_vacancy INTEGER NOT NULL DEFAULT 0').run();
  if (!internshipColumns.has('remaining_vacancy')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN remaining_vacancy INTEGER NOT NULL DEFAULT 0').run();
  if (!internshipColumns.has('available_vacancy')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN available_vacancy INTEGER NOT NULL DEFAULT 0').run();
  if (!internshipColumns.has('created_by')) await env.DB.prepare("ALTER TABLE internships ADD COLUMN created_by TEXT NOT NULL DEFAULT 'INDUSTRY'").run();
  if (!internshipColumns.has('source_type')) await env.DB.prepare("ALTER TABLE internships ADD COLUMN source_type TEXT NOT NULL DEFAULT 'INDUSTRY'").run();
  if (!internshipColumns.has('visibility_type')) await env.DB.prepare("ALTER TABLE internships ADD COLUMN visibility_type TEXT NOT NULL DEFAULT 'ALL_TARGETS'").run();
  if (!internshipColumns.has('requirements')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN requirements TEXT').run();
  if (!internshipColumns.has('published')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN published INTEGER NOT NULL DEFAULT 0').run();
  if (!internshipColumns.has('college_id')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN college_id TEXT').run();
  if (!internshipColumns.has('mapped_co')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN mapped_co TEXT').run();
  if (!internshipColumns.has('mapped_po')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN mapped_po TEXT').run();
  if (!internshipColumns.has('mapped_pso')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN mapped_pso TEXT').run();
  if (!internshipColumns.has('internship_po')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN internship_po TEXT').run();
  if (!internshipColumns.has('internship_co')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN internship_co TEXT').run();
  await env.DB.prepare(
    `UPDATE internships
     SET available_vacancy = MAX(COALESCE(total_vacancy, vacancy, 0) - COALESCE(filled_vacancy, 0), 0)
     WHERE available_vacancy IS NULL OR available_vacancy < 0 OR available_vacancy > COALESCE(total_vacancy, vacancy, available_vacancy)`,
  ).run();

  const applicationColumns = new Set((await getTableColumns(env, 'internship_applications')).map((column) => column.name));
  if (!applicationColumns.has('is_external')) await env.DB.prepare('ALTER TABLE internship_applications ADD COLUMN is_external INTEGER NOT NULL DEFAULT 0').run();
  if (!applicationColumns.has('completed_at')) await env.DB.prepare('ALTER TABLE internship_applications ADD COLUMN completed_at TEXT').run();
  if (!applicationColumns.has('industry_feedback')) await env.DB.prepare('ALTER TABLE internship_applications ADD COLUMN industry_feedback TEXT').run();
  if (!applicationColumns.has('industry_score')) await env.DB.prepare('ALTER TABLE internship_applications ADD COLUMN industry_score REAL').run();

  const studentColumns = new Set((await getTableColumns(env, 'students')).map((column) => column.name));
  if (!studentColumns.has('is_external')) await env.DB.prepare('ALTER TABLE students ADD COLUMN is_external INTEGER NOT NULL DEFAULT 0').run();
  if (!studentColumns.has('sex')) await env.DB.prepare("ALTER TABLE students ADD COLUMN sex TEXT NOT NULL DEFAULT 'MALE'").run();
  await env.DB.prepare("UPDATE students SET sex = 'MALE' WHERE sex IS NULL OR trim(sex) = ''").run();

  if (!internshipColumns.has('gender_preference')) await env.DB.prepare("ALTER TABLE internships ADD COLUMN gender_preference TEXT NOT NULL DEFAULT 'BOTH'").run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS industry_requests (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      industry_id TEXT NOT NULL,
      internship_title TEXT NOT NULL,
      description TEXT NOT NULL,
      program_id TEXT,
      mapped_po TEXT,
      mapped_pso TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL
    )`,
  ).run();

  const industryRequestColumns = new Set((await getTableColumns(env, 'industry_requests')).map((column) => column.name));
  if (!industryRequestColumns.has('program_id')) await env.DB.prepare('ALTER TABLE industry_requests ADD COLUMN program_id TEXT').run();
  if (!industryRequestColumns.has('mapped_co')) await env.DB.prepare('ALTER TABLE industry_requests ADD COLUMN mapped_co TEXT').run();
  if (!industryRequestColumns.has('gender_preference')) await env.DB.prepare("ALTER TABLE industry_requests ADD COLUMN gender_preference TEXT NOT NULL DEFAULT 'BOTH'").run();
  if (!industryRequestColumns.has('suggested_vacancy')) await env.DB.prepare('ALTER TABLE industry_requests ADD COLUMN suggested_vacancy INTEGER').run();
  if (!industryRequestColumns.has('suggested_internship_category')) await env.DB.prepare('ALTER TABLE industry_requests ADD COLUMN suggested_internship_category TEXT').run();
  if (!industryRequestColumns.has('suggested_fee')) await env.DB.prepare('ALTER TABLE industry_requests ADD COLUMN suggested_fee INTEGER').run();
  if (!industryRequestColumns.has('suggested_stipend_amount')) await env.DB.prepare('ALTER TABLE industry_requests ADD COLUMN suggested_stipend_amount INTEGER').run();
  if (!industryRequestColumns.has('suggested_stipend_duration')) await env.DB.prepare('ALTER TABLE industry_requests ADD COLUMN suggested_stipend_duration TEXT').run();
  if (!industryRequestColumns.has('suggested_minimum_days')) await env.DB.prepare('ALTER TABLE industry_requests ADD COLUMN suggested_minimum_days INTEGER').run();
  if (!industryRequestColumns.has('suggested_maximum_days')) await env.DB.prepare('ALTER TABLE industry_requests ADD COLUMN suggested_maximum_days INTEGER').run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS department_outcome_mappings (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('PO', 'PSO')),
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS program_outcome_entries (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('PO', 'PSO')),
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS internship_cos (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      description TEXT NOT NULL,
      department_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      UNIQUE (department_id, code)
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS internship_pos (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      description TEXT NOT NULL,
      department_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      UNIQUE (department_id, code)
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS internship_outcome_map (
      id TEXT PRIMARY KEY,
      internship_id TEXT NOT NULL,
      outcome_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('CO', 'PO')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS internship_co_mapping (
      id TEXT PRIMARY KEY,
      internship_id TEXT NOT NULL,
      co_code TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
      UNIQUE (internship_id, co_code)
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS internship_po_mapping (
      id TEXT PRIMARY KEY,
      internship_id TEXT NOT NULL,
      po_code TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
      UNIQUE (internship_id, po_code)
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS internship_evaluations (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL UNIQUE,
      student_id TEXT,
      external_student_id TEXT,
      internship_id TEXT NOT NULL,
      attendance_marks REAL NOT NULL,
      work_register_marks REAL NOT NULL,
      presentation_marks REAL NOT NULL,
      viva_marks REAL NOT NULL,
      report_marks REAL NOT NULL,
      cca_total REAL NOT NULL,
      ese_total REAL NOT NULL,
      final_total REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (application_id) REFERENCES internship_applications(id) ON DELETE CASCADE,
      FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS outcome_results (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      student_id TEXT,
      external_student_id TEXT,
      internship_id TEXT NOT NULL,
      outcome_id TEXT NOT NULL,
      outcome_type TEXT NOT NULL CHECK (outcome_type IN ('CO', 'PO')),
      student_score REAL NOT NULL,
      supervisor_score REAL NOT NULL,
      coordinator_score REAL NOT NULL,
      weighted_score REAL NOT NULL,
      percentage REAL NOT NULL,
      calculation_steps TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (application_id) REFERENCES internship_applications(id) ON DELETE CASCADE,
      FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
      UNIQUE (application_id, outcome_id, outcome_type)
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE VIEW IF NOT EXISTS internship_provider_organizations AS
     SELECT id, name, email, business_activity, industry_type_id, status, is_active, created_at, updated_at
     FROM industries`,
  ).run();
  await env.DB.prepare(
    `CREATE VIEW IF NOT EXISTS college_ipo_links AS
     SELECT id, college_id, industry_id AS ipo_id, status, requested_by, created_at, updated_at
     FROM college_industry_links`,
  ).run();

  const industryInternshipColumns = new Set((await getTableColumns(env, 'industry_internships')).map((column) => column.name));
  if (!industryInternshipColumns.has('vacancy')) await env.DB.prepare('ALTER TABLE industry_internships ADD COLUMN vacancy INTEGER').run();

  const industryColumns = new Set((await getTableColumns(env, 'industries')).map((column) => column.name));
  if (!industryColumns.has('company_address')) await env.DB.prepare('ALTER TABLE industries ADD COLUMN company_address TEXT').run();
  if (!industryColumns.has('contact_number')) await env.DB.prepare('ALTER TABLE industries ADD COLUMN contact_number TEXT').run();
  if (!industryColumns.has('registration_number')) await env.DB.prepare('ALTER TABLE industries ADD COLUMN registration_number TEXT').run();
  if (!industryColumns.has('registration_year')) await env.DB.prepare('ALTER TABLE industries ADD COLUMN registration_year INTEGER').run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      email_type TEXT NOT NULL,
      recipient TEXT,
      status TEXT NOT NULL CHECK (status IN ('FAILED', 'SENT')),
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS compliance_violations (
      id TEXT PRIMARY KEY,
      rule_code TEXT NOT NULL,
      message TEXT NOT NULL,
      internship_id TEXT,
      student_id TEXT,
      college_id TEXT,
      level TEXT NOT NULL DEFAULT 'ERROR' CHECK (level IN ('INFO', 'WARNING', 'ERROR')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE SET NULL,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
      FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL
    )`,
  ).run();

  await Promise.all([
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_internships_external_status ON internships(is_external, status)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_applications_external_status ON internship_applications(is_external, status)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_industry_requests_department ON industry_requests(department_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_industry_requests_industry ON industry_requests(industry_id, status)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_industry_requests_program ON industry_requests(program_id)').run(),
    env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_department_outcome_unique ON department_outcome_mappings(department_id, type, value)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_department_outcome_type ON department_outcome_mappings(department_id, type)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_program_outcome_entries_program ON program_outcome_entries(program_id, type)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_internship_cos_department ON internship_cos(department_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_internship_pos_department ON internship_pos(department_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_internship_outcome_map_internship ON internship_outcome_map(internship_id, type)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_internship_co_mapping_internship ON internship_co_mapping(internship_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_internship_po_mapping_internship ON internship_po_mapping(internship_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_internship_evaluations_application ON internship_evaluations(application_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_outcome_results_student ON outcome_results(student_id, external_student_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status, created_at)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_compliance_violations_college ON compliance_violations(college_id, created_at)').run(),
  ]);
}

async function ensureInternshipWorkflowSchema(env: EnvBindings): Promise<void> {
  const internshipColumns = new Set((await getTableColumns(env, 'internships')).map((column) => column.name));
  if (!internshipColumns.has('ipo_id')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN ipo_id TEXT').run();
  if (!internshipColumns.has('college_id')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN college_id TEXT').run();
  if (!internshipColumns.has('duration')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN duration TEXT').run();
  if (!internshipColumns.has('total_vacancy')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN total_vacancy INTEGER NOT NULL DEFAULT 0').run();
  if (!internshipColumns.has('filled_vacancy')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN filled_vacancy INTEGER NOT NULL DEFAULT 0').run();
  if (!internshipColumns.has('remaining_vacancy')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN remaining_vacancy INTEGER NOT NULL DEFAULT 0').run();
  if (!internshipColumns.has('available_vacancy')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN available_vacancy INTEGER NOT NULL DEFAULT 0').run();
  if (!internshipColumns.has('created_by')) await env.DB.prepare("ALTER TABLE internships ADD COLUMN created_by TEXT NOT NULL DEFAULT 'INDUSTRY'").run();
  if (!internshipColumns.has('source_type')) await env.DB.prepare("ALTER TABLE internships ADD COLUMN source_type TEXT NOT NULL DEFAULT 'INDUSTRY'").run();
  if (!internshipColumns.has('visibility_type')) await env.DB.prepare("ALTER TABLE internships ADD COLUMN visibility_type TEXT NOT NULL DEFAULT 'ALL_TARGETS'").run();
  if (!internshipColumns.has('requirements')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN requirements TEXT').run();
  if (!internshipColumns.has('published')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN published INTEGER NOT NULL DEFAULT 0').run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS internship_mappings (
      id TEXT PRIMARY KEY,
      internship_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      po_ids TEXT NOT NULL,
      pso_ids TEXT NOT NULL,
      co_ids TEXT NOT NULL,
      internship_po TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      UNIQUE (internship_id, department_id)
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      internship_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'ACCEPTED', 'REJECTED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
      UNIQUE(student_id, internship_id)
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL UNIQUE,
      marks REAL NOT NULL,
      feedback TEXT,
      co_po_score TEXT NOT NULL,
      evaluated_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS internship_feedback (
      id TEXT PRIMARY KEY,
      internship_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      ipo_feedback TEXT NOT NULL,
      rating REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE(internship_id, student_id)
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('ADMIN', 'DEPARTMENT', 'IPO', 'STUDENT')),
      linked_entity_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ).run();

  await Promise.all([
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_workflow_internships_ipo ON internships(ipo_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_workflow_internships_college_dept_status ON internships(college_id, department_id, status)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_workflow_applications_internship ON applications(internship_id, status)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_workflow_feedback_internship ON internship_feedback(internship_id)').run(),
  ]);
}

async function ensureDocumentSchema(env: EnvBindings): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      internship_id TEXT NOT NULL,
      student_id TEXT,
      type TEXT NOT NULL CHECK (type IN ('approval', 'reply', 'allotment', 'feedback')),
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      file_url TEXT NOT NULL,
      generated_by TEXT NOT NULL DEFAULT 'system',
      content_hash TEXT NOT NULL,
      metadata_json TEXT,
      FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
      UNIQUE (internship_id, student_id, type)
    )`,
  ).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_documents_student_type ON documents(student_id, type)').run();
}

async function generateDocument(
  env: EnvBindings,
  params: { type: DocumentType; internshipId: string; studentId?: string; actor: { id: string; role: AuthSession['user']['role'] }; supervisorName?: string; supervisorDesignation?: string },
): Promise<{ id: string; internshipId: string; studentId: string | null; type: DocumentType; generatedAt: string; fileUrl: string; generatedBy: string; regenerated: boolean }> {
  const data = await buildDocumentData(env, params);
  const contentHash = await sha256Hex(`${params.type}::${JSON.stringify(data)}`);
  const existing = await env.DB.prepare(
    `SELECT id, content_hash, generated_at, file_url, generated_by
     FROM documents WHERE internship_id = ? AND ifnull(student_id, '') = ifnull(?, '') AND type = ?`,
  ).bind(params.internshipId, params.studentId ?? null, params.type).first<any>();

  if (existing?.id && existing.content_hash === contentHash) {
    return {
      id: String(existing.id),
      internshipId: params.internshipId,
      studentId: params.studentId ?? null,
      type: params.type,
      generatedAt: String(existing.generated_at),
      fileUrl: String(existing.file_url),
      generatedBy: String(existing.generated_by ?? 'system'),
      regenerated: false,
    };
  }

  const id = existing?.id ? String(existing.id) : crypto.randomUUID();
  const generatedAt = new Date().toISOString();
  const fileUrl = `/api/documents/${id}/download`;
  const metadataJson = JSON.stringify({
    supervisorName: params.supervisorName ?? null,
    supervisorDesignation: params.supervisorDesignation ?? null,
  });
  if (existing?.id) {
    await env.DB.prepare(
      `UPDATE documents
       SET generated_at = ?, file_url = ?, generated_by = 'system', content_hash = ?, metadata_json = ?
       WHERE id = ?`,
    ).bind(generatedAt, fileUrl, contentHash, metadataJson, id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO documents (id, internship_id, student_id, type, generated_at, file_url, generated_by, content_hash, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, 'system', ?, ?)`,
    ).bind(id, params.internshipId, params.studentId ?? null, params.type, generatedAt, fileUrl, contentHash, metadataJson).run();
  }
  return { id, internshipId: params.internshipId, studentId: params.studentId ?? null, type: params.type, generatedAt, fileUrl, generatedBy: 'system', regenerated: true };
}

async function buildDocumentData(
  env: EnvBindings,
  params: { type: DocumentType; internshipId: string; studentId?: string; actor: { id: string; role: AuthSession['user']['role'] }; supervisorName?: string; supervisorDesignation?: string },
) {
  const internship = await env.DB.prepare(
    `SELECT i.id, i.title, i.duration, i.internship_category, i.created_at, i.updated_at, i.department_id, i.industry_id,
            d.name AS department_name, c.name AS college_name, ind.name AS industry_name
     FROM internships i
     LEFT JOIN departments d ON d.id = i.department_id
     LEFT JOIN colleges c ON c.id = d.college_id
     LEFT JOIN industries ind ON ind.id = i.industry_id
     WHERE i.id = ?`,
  ).bind(params.internshipId).first<any>();
  if (!internship) throw new Error('Internship not found');
  if (!internship.department_name || !internship.college_name || !internship.industry_name || !internship.title || !internship.duration) {
    throw new Error('Missing required internship master data for document generation');
  }

  let student: any = null;
  if (params.studentId) {
    student = await env.DB.prepare(
      `SELECT s.id, s.name, s.university_reg_number, s.email
       FROM students s
       WHERE s.id = ?`,
    ).bind(params.studentId).first<any>();
    if (!student?.id || !student?.name || !student?.university_reg_number) throw new Error('Student details are incomplete for document generation');
  }

  const app = params.studentId
    ? await env.DB.prepare(
      `SELECT ia.created_at, ia.updated_at, ia.completed_at
       FROM internship_applications ia
       WHERE ia.internship_id = ? AND ia.student_id = ?
       ORDER BY ia.created_at DESC LIMIT 1`,
    ).bind(params.internshipId, params.studentId).first<any>()
    : null;

  const now = new Date().toISOString();
  return {
    internship,
    student,
    app,
    systemLog: {
      internshipId: params.internshipId,
      studentId: params.studentId ?? 'N/A',
      generatedOn: now,
      generatedBy: 'System',
      approvalTimestamp: internship.updated_at ?? internship.created_at ?? now,
      industryConfirmationTimestamp: app?.updated_at ?? internship.updated_at ?? now,
      publicationTimestamp: app?.created_at ?? internship.created_at ?? now,
    },
    supervisorName: params.supervisorName ?? null,
    supervisorDesignation: params.supervisorDesignation ?? null,
  };
}

async function fetchDocumentPayload(env: EnvBindings, documentId: string, actor: { id: string; role: AuthSession['user']['role'] }) {
  const row = await env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(documentId).first<any>();
  if (!row) return null;
  const access = await canAccessDocument(env, actor, row);
  if (!access) return null;
  const metadata = row.metadata_json ? JSON.parse(String(row.metadata_json)) : {};
  const data = await buildDocumentData(env, {
    type: row.type,
    internshipId: row.internship_id,
    studentId: row.student_id ?? undefined,
    actor,
    supervisorName: metadata.supervisorName ?? undefined,
    supervisorDesignation: metadata.supervisorDesignation ?? undefined,
  });
  const html = renderDocumentHtml(row.type, data);
  return {
    id: row.id,
    type: row.type,
    internshipId: row.internship_id,
    studentId: row.student_id,
    generatedAt: row.generated_at,
    generatedBy: row.generated_by,
    fileUrl: row.file_url,
    html,
  };
}

async function downloadDocument(env: EnvBindings, documentId: string, actor: { id: string; role: AuthSession['user']['role'] }): Promise<Response> {
  const payload = await fetchDocumentPayload(env, documentId, actor);
  if (!payload) return forbidden('Document unavailable for this user');
  return new Response(payload.html, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${payload.type}-${payload.internshipId}-${payload.studentId ?? 'na'}.html"`,
    },
  });
}

async function downloadStudentBundle(env: EnvBindings, studentId: string, actor: { id: string; role: AuthSession['user']['role'] }): Promise<Response> {
  const rows = await env.DB.prepare('SELECT id, type FROM documents WHERE student_id = ? ORDER BY generated_at DESC').bind(studentId).all<any>();
  const docs = rows.results ?? [];
  if (!docs.length) return errorResponse(404, 'No documents found for student');
  const files: Array<{ name: string; content: Uint8Array }> = [];
  for (const doc of docs) {
    const payload = await fetchDocumentPayload(env, String(doc.id), actor);
    if (!payload) continue;
    files.push({
      name: `${payload.type}-${payload.internshipId}-${payload.studentId ?? 'na'}.html`,
      content: new TextEncoder().encode(payload.html),
    });
  }
  const zipBytes = createZip(files);
  return new Response(zipBytes.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="student-${studentId}-documents.zip"`,
    },
  });
}

async function canAccessDocument(env: EnvBindings, actor: { id: string; role: AuthSession['user']['role'] }, row: any): Promise<boolean> {
  if (actor.role === 'DEPARTMENT_COORDINATOR' || actor.role === 'COORDINATOR') {
    const match = await env.DB.prepare('SELECT id FROM internships WHERE id = ? AND department_id = ?').bind(row.internship_id, actor.id).first();
    return Boolean(match);
  }
  if (actor.role === 'INDUSTRY') {
    const match = await env.DB.prepare('SELECT id FROM internships WHERE id = ? AND industry_id = ?').bind(row.internship_id, actor.id).first();
    return Boolean(match) && ['approval', 'reply', 'feedback'].includes(String(row.type));
  }
  if (actor.role === 'STUDENT') {
    return row.student_id === actor.id && ['allotment', 'feedback'].includes(String(row.type));
  }
  return false;
}

async function listDocumentsForActor(env: EnvBindings, actor: { id: string; role: AuthSession['user']['role'] }) {
  if (actor.role === 'STUDENT') {
    const rows = await env.DB.prepare(
      `SELECT id, internship_id, student_id, type, generated_at, file_url, generated_by
       FROM documents WHERE student_id = ? AND type IN ('allotment', 'feedback')
       ORDER BY generated_at DESC`,
    ).bind(actor.id).all<any>();
    return rows.results ?? [];
  }
  if (actor.role === 'INDUSTRY') {
    const rows = await env.DB.prepare(
      `SELECT d.id, d.internship_id, d.student_id, d.type, d.generated_at, d.file_url, d.generated_by
       FROM documents d INNER JOIN internships i ON i.id = d.internship_id
       WHERE i.industry_id = ? AND d.type IN ('approval', 'reply')
       ORDER BY d.generated_at DESC`,
    ).bind(actor.id).all<any>();
    return rows.results ?? [];
  }
  if (actor.role === 'DEPARTMENT_COORDINATOR' || actor.role === 'COORDINATOR') {
    const rows = await env.DB.prepare(
      `SELECT d.id, d.internship_id, d.student_id, d.type, d.generated_at, d.file_url, d.generated_by
       FROM documents d INNER JOIN internships i ON i.id = d.internship_id
       WHERE i.department_id = ?
       ORDER BY d.generated_at DESC`,
    ).bind(actor.id).all<any>();
    return rows.results ?? [];
  }
  return [];
}

function renderDocumentHtml(type: DocumentType, data: any): string {
  const commonDeclaration = `
    <h3>System Generated Declaration</h3>
    <p>This document is automatically generated by the Internship Management System.</p>
    <ul>
      <li>No manual signature is required</li>
      <li>All details are auto-filled from verified system records</li>
      <li>This document is valid for academic and audit purposes</li>
    </ul>
    <h3>System Log Reference</h3>
    <ul>
      <li>Internship ID: ${escapeHtml(data.systemLog.internshipId)}</li>
      <li>Student ID: ${escapeHtml(data.systemLog.studentId)}</li>
      <li>Generated On: ${escapeHtml(data.systemLog.generatedOn)}</li>
      <li>Generated By: System</li>
      <li>Approval Timestamp: ${escapeHtml(data.systemLog.approvalTimestamp)}</li>
      <li>Industry Confirmation Timestamp: ${escapeHtml(data.systemLog.industryConfirmationTimestamp)}</li>
      <li>Publication Timestamp: ${escapeHtml(data.systemLog.publicationTimestamp)}</li>
    </ul>`;

  const base = `
    <html><head><meta charset="utf-8" /><title>${type}</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.5; padding: 24px;">
      <h2 style="margin:0;">${escapeHtml(data.internship.college_name)}</h2>
      <p style="margin-top:4px;">System Generated • Audit Compliant</p>
      {{BODY}}
      <p><strong>This is a system-generated document. No signature is required.</strong></p>
      ${commonDeclaration}
    </body></html>`;

  const period = `${escapeHtml(data.internship.duration)}`;
  if (type === 'approval') {
    return base.replace('{{BODY}}', `<h1>Internship Approval Letter</h1>
      <p>To: ${escapeHtml(data.internship.industry_name)}</p>
      <p>Department: ${escapeHtml(data.internship.department_name)}</p>
      <p>College: ${escapeHtml(data.internship.college_name)}</p>
      <p>Internship Title: ${escapeHtml(data.internship.title)}</p>
      <p>Duration: ${period}</p>
      <p>Type: ${escapeHtml(data.internship.internship_category ?? 'FREE')}</p>`);
  }
  if (type === 'reply') {
    return base.replace('{{BODY}}', `<h1>Industry Reply Letter</h1>
      <p>Internship Title: ${escapeHtml(data.internship.title)}</p>
      <p>Department Name: ${escapeHtml(data.internship.department_name)}</p>
      <p>College Name: ${escapeHtml(data.internship.college_name)}</p>
      <p>Assigned Supervisor: ${escapeHtml(data.supervisorName ?? 'Not specified')}</p>
      <p>Designation: ${escapeHtml(data.supervisorDesignation ?? 'Not specified')}</p>
      <p>Confirmation: We confirm support for monitoring and evaluation.</p>
      <p><strong>Supervisor assigned for monitoring and evaluation.</strong></p>`);
  }
  if (type === 'allotment') {
    return base.replace('{{BODY}}', `<h1>Student Internship Allotment Letter</h1>
      <p>Student Name: ${escapeHtml(data.student?.name ?? '-')}</p>
      <p>Register Number: ${escapeHtml(data.student?.university_reg_number ?? '-')}</p>
      <p>Organization: ${escapeHtml(data.internship.industry_name)}</p>
      <p>Duration: ${period}</p>
      <p>Period: ${period}</p>
      <p><strong>Instructions:</strong></p>
      <ul><li>No direct communication with industry</li><li>Follow department instructions</li></ul>`);
  }
  return base.replace('{{BODY}}', `<h1>Performance Feedback Form (Industry)</h1>
    <p>Student Name: ${escapeHtml(data.student?.name ?? '-')}</p>
    <p>Register Number: ${escapeHtml(data.student?.university_reg_number ?? '-')}</p>
    <p>Internship Title: ${escapeHtml(data.internship.title)}</p>
    <p>Department: ${escapeHtml(data.internship.department_name)}</p>
    <p>Organization: ${escapeHtml(data.internship.industry_name)}</p>
    <p>Status: Digitally filled by industry and stored in DB.</p>`);
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createZip(files: Array<{ name: string; content: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder();
  const crcTable = new Uint32Array(256).map((_, i) => {
    let c = i;
    for (let j = 0; j < 8; j += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    return c >>> 0;
  });
  const crc32 = (bytes: Uint8Array) => {
    let c = 0 ^ (-1);
    for (const byte of bytes) c = (c >>> 8) ^ crcTable[(c ^ byte) & 0xff];
    return (c ^ (-1)) >>> 0;
  };
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.content);
    const local = new Uint8Array(30 + nameBytes.length + file.content.length);
    const v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(8, 0, true); v.setUint16(10, 0, true);
    v.setUint32(14, crc, true); v.setUint32(18, file.content.length, true); v.setUint32(22, file.content.length, true);
    v.setUint16(26, nameBytes.length, true); v.setUint16(28, 0, true);
    local.set(nameBytes, 30); local.set(file.content, 30 + nameBytes.length);
    chunks.push(local);
    const c = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(10, 0, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, file.content.length, true); cv.setUint32(24, file.content.length, true);
    cv.setUint16(28, nameBytes.length, true); cv.setUint32(42, offset, true);
    c.set(nameBytes, 46);
    central.push(c);
    offset += local.length;
  }
  const centralSize = central.reduce((sum, c) => sum + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
  const total = offset + centralSize + end.length;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const c of chunks) { out.set(c, cursor); cursor += c.length; }
  for (const c of central) { out.set(c, cursor); cursor += c.length; }
  out.set(end, cursor);
  return out;
}

async function ensureStudentRegistrationSchema(env: EnvBindings): Promise<void> {
  const studentColumns = new Set((await getTableColumns(env, 'students')).map((column) => column.name));
  if (!studentColumns.has('university_reg_number')) {
    await env.DB.prepare('ALTER TABLE students ADD COLUMN university_reg_number TEXT').run();
  }
  if (!studentColumns.has('custom_college_name')) {
    await env.DB.prepare('ALTER TABLE students ADD COLUMN custom_college_name TEXT').run();
  }
  if (!studentColumns.has('custom_department_name')) {
    await env.DB.prepare('ALTER TABLE students ADD COLUMN custom_department_name TEXT').run();
  }
  if (!studentColumns.has('custom_program_name')) {
    await env.DB.prepare('ALTER TABLE students ADD COLUMN custom_program_name TEXT').run();
  }
  if (!studentColumns.has('sex')) {
    await env.DB.prepare("ALTER TABLE students ADD COLUMN sex TEXT NOT NULL DEFAULT 'MALE'").run();
  }
}

async function ensureAcademicPathForUnlistedStudent(
  env: EnvBindings,
  values: { collegeName: string; departmentName: string; programName: string },
): Promise<{ collegeId: string; departmentId: string; programId: string }> {
  const collegeName = values.collegeName.trim();
  const departmentName = values.departmentName.trim();
  const programName = values.programName.trim();
  if (!collegeName || !departmentName || !programName) throw new Error('Custom college, department and programme are required');

  let collegeId = '';
  const existingCollege = await env.DB.prepare(
    `SELECT id FROM colleges
     WHERE lower(name) = lower(?)
     ORDER BY created_at DESC
     LIMIT 1`,
  ).bind(collegeName).first<{ id: string }>();
  if (existingCollege?.id) {
    collegeId = existingCollege.id;
  } else {
    collegeId = crypto.randomUUID();
    const coordinatorEmail = `student-import+${collegeId.slice(0, 8)}@ipo.local`;
    await env.DB.prepare(
      `INSERT INTO colleges (id, name, coordinator_name, coordinator_email, password, status, is_active)
       VALUES (?, ?, ?, ?, ?, 'approved', 1)`,
    ).bind(collegeId, collegeName, 'Student Self Registration', coordinatorEmail, generatePassword(12)).run();
  }

  let departmentId = '';
  const existingDepartment = await env.DB.prepare(
    `SELECT id FROM departments
     WHERE college_id = ? AND lower(name) = lower(?)
     LIMIT 1`,
  ).bind(collegeId, departmentName).first<{ id: string }>();
  if (existingDepartment?.id) {
    departmentId = existingDepartment.id;
  } else {
    departmentId = crypto.randomUUID();
    const coordinatorEmail = `student-import+${departmentId.slice(0, 8)}@ipo.local`;
    await env.DB.prepare(
      `INSERT INTO departments (id, college_id, name, coordinator_name, coordinator_email, password, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    ).bind(departmentId, collegeId, departmentName, 'Student Self Registration', coordinatorEmail, generatePassword(12)).run();
  }

  let programId = '';
  const existingProgram = await env.DB.prepare(
    `SELECT id FROM programs
     WHERE department_id = ? AND lower(name) = lower(?)
     LIMIT 1`,
  ).bind(departmentId, programName).first<{ id: string }>();
  if (existingProgram?.id) {
    programId = existingProgram.id;
  } else {
    programId = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO programs (id, department_id, name) VALUES (?, ?, ?)')
      .bind(programId, departmentId, programName)
      .run();
  }

  return { collegeId, departmentId, programId };
}

async function getTableColumns(env: EnvBindings, tableName: string): Promise<Array<{ name: string }>> {
  const rows = await env.DB.prepare(`PRAGMA table_info(${tableName})`).all<{ name: string }>();
  return rows.results ?? [];
}

function requireRole(request: Request, allowedRoles: AuthSession['user']['role'][]) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return unauthorized('Missing authorization token');

  const parsed = parseSessionToken(token);
  if (!parsed) return unauthorized('Invalid token');

  if (!allowedRoles.includes(parsed.role)) return forbidden('Insufficient role permissions');

  return parsed;
}

function createSession(user: AuthSession['user']): AuthSession {
  const tokenPayload = JSON.stringify({ id: user.id, email: user.email, role: user.role, t: Date.now() });
  const token = `session.${btoa(tokenPayload)}`;

  return {
    token,
    user,
  };
}

function parseSessionToken(token: string): { id: string; email: string; role: AuthSession['user']['role'] } | null {
  if (!token.startsWith('session.')) return null;

  try {
    const payload = JSON.parse(atob(token.replace('session.', '')));
    if (!payload?.id || !payload?.email || !payload?.role) return null;

    return {
      id: String(payload.id),
      email: String(payload.email),
      role: payload.role,
    };
  } catch {
    return null;
  }
}

async function readBody(request: Request): Promise<JsonMap> {
  const body = (await request.json().catch(() => ({}))) as JsonMap;
  return body ?? {};
}

function required(body: JsonMap, keys: string[]): string {
  for (const key of keys) {
    const value = toText(body[key]);
    if (value !== '') return value;
  }
  return '';
}

function optional(body: JsonMap, keys: string[]): string | null {
  for (const key of keys) {
    const value = toText(body[key]);
    if (value !== '') return value;
  }
  return null;
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return '';
}

function toBoolean(value: string): boolean | null {
  const normalized = value.toLowerCase();
  if (!normalized) return null;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
}

function hasNonEmptyJsonArray(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function classifyPerformance(percentage: number): string {
  if (percentage < 50) return 'Beginner';
  if (percentage <= 60) return 'Basic';
  if (percentage <= 75) return 'Intermediate';
  if (percentage <= 90) return 'Proficient';
  return 'Advanced';
}

function jsonResponse<T>(status: number, body: ApiEnvelope<T>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

function ok<T>(message: string, data?: T): Response {
  return jsonResponse(200, { success: true, message, data });
}

function created<T>(message: string, data?: T): Response {
  return jsonResponse(201, { success: true, message, data });
}

function badRequest(message: string): Response {
  return jsonResponse(400, { success: false, message });
}

function unauthorized(message: string): Response {
  return jsonResponse(401, { success: false, message });
}

function forbidden(message: string): Response {
  return jsonResponse(403, { success: false, message });
}

function conflict(message: string): Response {
  return jsonResponse(409, { success: false, message });
}

function errorResponse(status: number, message: string): Response {
  return jsonResponse(status, { success: false, message });
}
