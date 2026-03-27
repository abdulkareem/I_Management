interface EnvBindings {
  DB: D1Database;
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
  ) {
    await ensureDepartmentDashboardSchema(env);
  }
  if (pathname === '/api/student/register') {
    await ensureStudentRegistrationSchema(env);
  }

  if (request.method === 'GET' && pathname === '/api/health') {
    return ok('API healthy', { now: new Date().toISOString() });
  }

  if (request.method === 'GET' && pathname === '/api/colleges') {
    const rows = await env.DB.prepare('SELECT id, name FROM colleges ORDER BY name ASC').all<{ id: string; name: string }>();
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

    if (!name || !email || !password || !collegeId || !departmentId || !programId) {
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
        password, is_active
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
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
       WHERE c.status = 'approved' AND c.is_active = 1
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
        pendingApplications: appRows.filter((a: any) => a.status === 'pending').length,
        acceptedApplications: appRows.filter((a: any) => a.status === 'accepted').length,
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
       WHERE industry_id = ? AND college_id = ? AND status = 'active'`,
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
        ) VALUES (?, ?, ?, 'active', 'industry', datetime('now'), datetime('now'))`,
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
        `INSERT INTO industry_requests (id, department_id, industry_id, internship_title, description, status)
         VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      ).bind(id, department.id, actor.id, internshipTitle, details.join(' | ')).run();
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
    const categoryRaw = toText(optional(body, ['internship_category', 'internshipCategory'])).toUpperCase();
    const requestedCategory = ['FREE', 'PAID', 'STIPEND'].includes(categoryRaw) ? categoryRaw : null;
    const vacancyRaw = optional(body, ['vacancy']);
    const vacancy = vacancyRaw ? Number(vacancyRaw) : null;
    const isPaid = explicitIsPaid ?? Boolean(fee && fee > 0);
    const internshipCategory = isPaid ? 'PAID' : (requestedCategory ?? 'FREE');

    if (!title || !description) return badRequest('title and description are required');
    if (isPaid && (!fee || Number.isNaN(fee) || fee <= 0)) return badRequest('Valid fee is required for paid internships');
    if (vacancy !== null && (Number.isNaN(vacancy) || vacancy < 0)) return badRequest('vacancy must be a non-negative number');

    const internshipId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO internships (id, title, description, department_id, is_paid, fee, internship_category, vacancy, is_external, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
    )
      .bind(
        internshipId,
        title,
        description,
        actor.id,
        isPaid ? 1 : 0,
        isPaid ? Math.round(fee ?? 0) : null,
        internshipCategory,
        vacancy === null ? 0 : Math.floor(vacancy),
        isExternal ? 1 : 0,
      )
      .run();

    return created('Department internship created', { id: internshipId });
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
    const categoryRaw = toText(optional(body, ['internship_category', 'internshipCategory'])).toUpperCase();
    const requestedCategory = ['FREE', 'PAID', 'STIPEND'].includes(categoryRaw) ? categoryRaw : null;
    const vacancyRaw = optional(body, ['vacancy']);
    const vacancy = vacancyRaw ? Number(vacancyRaw) : null;
    const isPaid = explicitIsPaid ?? Boolean(fee && fee > 0);
    const internshipCategory = isPaid ? 'PAID' : (requestedCategory ?? 'FREE');
    if (!title || !description) return badRequest('title and description are required');
    if (isPaid && (!fee || Number.isNaN(fee) || fee <= 0)) return badRequest('Valid fee is required for paid internships');
    if (vacancy !== null && (Number.isNaN(vacancy) || vacancy < 0)) return badRequest('vacancy must be a non-negative number');

    const result = await env.DB.prepare(
      `UPDATE internships
       SET title = ?, description = ?, is_paid = ?, fee = ?, internship_category = ?, vacancy = COALESCE(?, vacancy), updated_at = datetime('now')
       WHERE id = ? AND department_id = ?`,
    ).bind(
      title,
      description,
      isPaid ? 1 : 0,
      isPaid ? Math.round(fee ?? 0) : null,
      internshipCategory,
      vacancy === null ? null : Math.floor(vacancy),
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

  if (request.method === 'GET' && pathname === '/api/department/internships') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT id, title, description, is_paid, fee, internship_category, vacancy, is_external, status, created_at
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
      `SELECT i.id, i.vacancy, d.college_id
       FROM internships i
       INNER JOIN departments d ON d.id = i.department_id
       WHERE i.id = ?`,
    ).bind(internshipId).first<{ id: string; vacancy: number | null; college_id: string }>();
    if (!internship) return badRequest('Invalid internship_id');
    if (actor.role === 'STUDENT') {
      const student = await env.DB.prepare('SELECT college_id FROM students WHERE id = ?').bind(actor.id).first<{ college_id: string }>();
      if (!student) return unauthorized('Student not found');
      if (student.college_id === internship.college_id) return forbidden('You can apply only for internships from other colleges.');
      if (internship.vacancy !== null && Number(internship.vacancy) <= 0) return forbidden('No vacancy available for this internship');
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

    await env.DB.prepare(
      `INSERT INTO internship_applications (id, student_id, external_student_id, internship_id, status, is_external)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
    )
      .bind(
        crypto.randomUUID(),
        actor.role === 'STUDENT' ? actor.id : null,
        actor.role === 'EXTERNAL_STUDENT' ? actor.id : null,
        internshipId,
        isExternal,
      )
      .run();

    return created('Application submitted', { internshipId, status: 'pending' });
  }

  if (request.method === 'GET' && pathname === '/api/department/applications') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const statusFilter = toText(url.searchParams.get('status')).toLowerCase();
    const statusClause = ['pending', 'accepted', 'rejected'].includes(statusFilter) ? ' AND ia.status = ? ' : '';
    const stmt = env.DB.prepare(
      `SELECT ia.id, ia.status, ia.created_at, ia.is_external, ia.completed_at, ia.industry_feedback, ia.industry_score,
              i.id AS internship_id, i.title AS internship_title, i.is_paid, i.fee,
              d.name AS department_name,
              COALESCE(es.name, s.name) AS student_name,
              COALESCE(es.email, s.email) AS student_email
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       INNER JOIN departments d ON d.id = i.department_id
       LEFT JOIN external_students es ON es.id = ia.external_student_id
       LEFT JOIN students s ON s.id = ia.student_id
       WHERE i.department_id = ? ${statusClause}
       ORDER BY ia.created_at DESC`,
    );
    const rows = statusClause
      ? await stmt.bind(actor.id, statusFilter).all()
      : await stmt.bind(actor.id).all();

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
       SET vacancy = CASE
          WHEN vacancy IS NULL THEN NULL
          WHEN vacancy > 0 THEN vacancy - 1
          ELSE 0
       END,
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

  if (request.method === 'GET' && pathname === '/api/department/industries') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT DISTINCT i.id, i.name
       FROM departments d
       INNER JOIN college_industry_links cil ON cil.college_id = d.college_id
       INNER JOIN industries i ON i.id = cil.industry_id
       WHERE d.id = ?
         AND cil.status = 'accepted'
         AND i.status = 'approved'
         AND i.is_active = 1
       ORDER BY i.name ASC`,
    ).bind(actor.id).all();

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
      `SELECT i.id, i.name, i.business_activity, i.email, i.company_address, i.contact_number, i.registration_number, i.registration_year, it.name AS category
       FROM industries i
       LEFT JOIN industry_types it ON it.id = i.industry_type_id
       INNER JOIN college_industry_links cil ON cil.industry_id = i.id
       INNER JOIN departments d ON d.college_id = cil.college_id
       WHERE d.id = ? AND i.id = ?`,
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
    const result = await env.DB.prepare(
      `UPDATE industry_requests
       SET internship_title = COALESCE(?, internship_title),
           description = COALESCE(?, description),
           updated_at = datetime('now')
       WHERE id = ? AND industry_id = ?`,
    )
      .bind(internshipTitle, description, industryRequestUpdateMatch[1], actor.id)
      .run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry request not found');
    return ok('Industry request updated');
  }

  if (request.method === 'GET' && pathname === '/api/industry/ideas') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const rows = await env.DB.prepare(
      `SELECT ir.id, ir.internship_title, ir.description, ir.status,
              d.id AS department_id, d.name AS department_name, c.name AS college_name
       FROM industry_requests ir
       INNER JOIN departments d ON d.id = ir.department_id
       INNER JOIN colleges c ON c.id = d.college_id
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
    if (Number.isNaN(vacancies) || vacancies <= 0) return badRequest('Valid vacancies are required');
    if (!['FREE', 'PAID', 'STIPEND'].includes(internshipCategory)) return badRequest('internship_category must be FREE, PAID or STIPEND');

    const requestRow = await env.DB.prepare(
      `SELECT id, department_id, internship_title, description
       FROM industry_requests
       WHERE id = ? AND industry_id = ? AND status = 'ACCEPTED'`,
    ).bind(requestId, actor.id).first<{ id: string; department_id: string; internship_title: string; description: string }>();
    if (!requestRow) return badRequest('Accepted idea not found');

    const already = await env.DB.prepare('SELECT id FROM internships WHERE industry_request_id = ?').bind(requestId).first<{ id: string }>();
    if (already) return conflict('This idea is already published');

    await env.DB.prepare(
      `INSERT INTO internships (id, title, description, department_id, industry_id, is_paid, fee, internship_category, vacancy, is_external, status, industry_request_id, stipend_amount, stipend_duration, minimum_days, maximum_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'OPEN', ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        requestRow.internship_title,
        requestRow.description,
        requestRow.department_id,
        actor.id,
        internshipCategory === 'PAID' ? 1 : 0,
        internshipCategory === 'PAID' ? fee : null,
        internshipCategory,
        vacancies,
        requestId,
        internshipCategory === 'STIPEND' ? stipendAmount : null,
        internshipCategory === 'STIPEND' ? stipendDuration : null,
        minimumDays,
        maximumDays,
      )
      .run();

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

async function loadStudentDashboard(env: EnvBindings, studentId: string): Promise<Response> {
  const student = await env.DB.prepare('SELECT college_id FROM students WHERE id = ?').bind(studentId).first<{ college_id: string }>();
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
      `SELECT i.id, i.title, i.description, d.name AS department_name, c.name AS college_name
       FROM internships i
       INNER JOIN departments d ON d.id = i.department_id
       INNER JOIN colleges c ON c.id = d.college_id
       WHERE d.college_id = ?
       ORDER BY i.created_at DESC`,
    ).bind(student.college_id).all(),
    env.DB.prepare(
      `SELECT i.id, i.title, i.description, COALESCE(ind.name, 'Industry') AS industry_name, COALESCE(i.industry_id, ii.industry_id) AS industry_id, d.name AS department_name, c.name AS college_name, i.vacancy,
              ia.id AS application_id, ia.status AS application_status
       FROM internships i
       INNER JOIN departments d ON d.id = i.department_id
       INNER JOIN colleges c ON c.id = d.college_id
       LEFT JOIN industry_internships ii ON ii.title = i.title
       LEFT JOIN industries ind ON ind.id = ii.industry_id
       LEFT JOIN internship_applications ia ON ia.internship_id = i.id AND ia.student_id = ?
       WHERE d.college_id <> ?
       ORDER BY i.created_at DESC`,
    ).bind(studentId, student.college_id).all(),
    getStudentApplicationEligibility(env, studentId),
  ]);

  const internshipRows = legacyInternships.results ?? [];
  const applicationRows = applications.results ?? [];
  const collegeRows = collegeInternships.results ?? [];
  const externalRows = externalInternships.results ?? [];

  return ok('Student dashboard loaded', {
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
    })),
    externalInternships: externalRows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      industryName: row.industry_name,
      industryId: row.industry_id,
      collegeName: row.college_name,
      departmentName: row.department_name,
      vacancy: row.vacancy,
      applied: Boolean(row.application_id),
      status: row.application_status ? String(row.application_status).toUpperCase() : undefined,
    })),
    activeApplicationLock: eligibility.activeLock,
    maxSelectableApplications: 3,
    canApplyForExternal: !eligibility.activeLock && eligibility.openApplications < 3,
    policyNote: 'Your selected college+department is your internal institute. You can apply to internships from other colleges only.',
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
  if (!internshipColumns.has('status')) await env.DB.prepare("ALTER TABLE internships ADD COLUMN status TEXT NOT NULL DEFAULT 'OPEN'").run();
  if (!internshipColumns.has('industry_request_id')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN industry_request_id TEXT').run();
  if (!internshipColumns.has('stipend_amount')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN stipend_amount INTEGER').run();
  if (!internshipColumns.has('stipend_duration')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN stipend_duration TEXT').run();
  if (!internshipColumns.has('minimum_days')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN minimum_days INTEGER').run();
  if (!internshipColumns.has('maximum_days')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN maximum_days INTEGER').run();

  const applicationColumns = new Set((await getTableColumns(env, 'internship_applications')).map((column) => column.name));
  if (!applicationColumns.has('is_external')) await env.DB.prepare('ALTER TABLE internship_applications ADD COLUMN is_external INTEGER NOT NULL DEFAULT 0').run();
  if (!applicationColumns.has('completed_at')) await env.DB.prepare('ALTER TABLE internship_applications ADD COLUMN completed_at TEXT').run();
  if (!applicationColumns.has('industry_feedback')) await env.DB.prepare('ALTER TABLE internship_applications ADD COLUMN industry_feedback TEXT').run();
  if (!applicationColumns.has('industry_score')) await env.DB.prepare('ALTER TABLE internship_applications ADD COLUMN industry_score REAL').run();

  const studentColumns = new Set((await getTableColumns(env, 'students')).map((column) => column.name));
  if (!studentColumns.has('is_external')) await env.DB.prepare('ALTER TABLE students ADD COLUMN is_external INTEGER NOT NULL DEFAULT 0').run();

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
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_internship_evaluations_application ON internship_evaluations(application_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_outcome_results_student ON outcome_results(student_id, external_student_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status, created_at)').run(),
  ]);
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
    if (value) return value;
  }
  return '';
}

function optional(body: JsonMap, keys: string[]): string | null {
  for (const key of keys) {
    const value = toText(body[key]);
    if (value) return value;
  }
  return null;
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toBoolean(value: string): boolean | null {
  const normalized = value.toLowerCase();
  if (!normalized) return null;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
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
