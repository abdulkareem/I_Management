interface EnvBindings {
  DB: D1Database;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
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

  if (request.method === 'GET' && pathname === '/api/industry-types') {
    const rows = await env.DB.prepare('SELECT id, name FROM industry_types WHERE is_active = 1 ORDER BY name ASC').all();
    return ok('Industry types fetched', rows.results ?? []);
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
    const collegeId = required(body, ['college_id', 'collegeId']);
    const departmentId = required(body, ['department_id', 'departmentId']);
    const programId = required(body, ['program_id', 'courseId', 'programId']);
    const phone = optional(body, ['phone']);

    if (!name || !email || !password || !collegeId || !departmentId || !programId) {
      return badRequest('name, email, password, college_id, department_id, program_id are required');
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
      `INSERT INTO students (id, name, email, phone, college_id, department_id, program_id, password, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    )
      .bind(studentId, name, email, phone, collegeId, departmentId, programId, password)
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
      env.DB.prepare('SELECT id, title, criteria FROM industry_internships WHERE industry_id = ? ORDER BY created_at DESC').bind(actor.id).all(),
      env.DB.prepare(
        `SELECT ia.id,
                ia.status,
                COALESCE(s.name, es.name) AS student_name,
                COALESCE(c.name, es.college, 'External') AS college_name,
                i.title AS opportunity_title
         FROM internship_applications ia
         INNER JOIN internships i ON i.id = ia.internship_id
         LEFT JOIN students s ON s.id = ia.student_id
         LEFT JOIN external_students es ON es.id = ia.external_student_id
         LEFT JOIN colleges c ON c.id = s.college_id
         WHERE ia.reviewed_by_industry_id = ? OR ia.reviewed_by_industry_id IS NULL
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
      applications: appRows.map((row: any) => ({
        id: row.id,
        studentName: row.student_name,
        collegeName: row.college_name,
        opportunityTitle: row.opportunity_title,
        status: row.status.toUpperCase(),
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
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR']);
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
       ORDER BY ia.created_at DESC`,
    ).bind(actor.id).all();

    return ok('Internal applications fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/applications/external') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT ia.id, ia.status, ia.created_at,
              es.id AS external_student_id, es.name AS student_name, es.email AS student_email,
              i.title AS internship_title,
              c.name AS college_name
       FROM internship_applications ia
       INNER JOIN external_students es ON es.id = ia.external_student_id
       INNER JOIN internships i ON i.id = ia.internship_id
       INNER JOIN departments d ON d.id = i.department_id
       INNER JOIN colleges c ON c.id = d.college_id
       WHERE c.id = ?
       ORDER BY ia.created_at DESC`,
    ).bind(actor.id).all();

    return ok('External applications fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/internships/allocated') {
    const actor = requireRole(request, ['COLLEGE', 'INDUSTRY', 'DEPARTMENT_COORDINATOR']);
    if (actor instanceof Response) return actor;

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

    const internship = await env.DB.prepare('SELECT id FROM internships WHERE id = ?').bind(internshipId).first();
    if (!internship) return badRequest('Invalid internship id');

    const duplicate = await env.DB.prepare('SELECT id FROM internship_applications WHERE student_id = ? AND internship_id = ?')
      .bind(actor.id, internshipId)
      .first();
    if (duplicate) return conflict('Application already submitted for this internship');

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
       WHERE id = ?`,
    )
      .bind(actor.id, applicationId)
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
       WHERE id = ?`,
    )
      .bind(actor.id, applicationId)
      .run();

    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'Application not found');

    const application = await env.DB.prepare('SELECT student_id, external_student_id, internship_id FROM internship_applications WHERE id = ?').bind(applicationId).first<{ student_id: string | null; external_student_id: string | null; internship_id: string }>();
    if (application) {
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

  return errorResponse(404, 'Route not found');
}

async function loadStudentDashboard(env: EnvBindings, studentId: string): Promise<Response> {
  const [internships, applications] = await Promise.all([
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
  ]);

  const internshipRows = internships.results ?? [];
  const applicationRows = applications.results ?? [];

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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
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
