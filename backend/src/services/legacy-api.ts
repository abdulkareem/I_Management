// @ts-nocheck
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
type CollegeRegistrationPayload = {
  collegeName: string;
  address: string | null;
  university: string | null;
  mobile: string | null;
  coordinatorName: string;
  email: string;
  password: string;
};

function generateReferenceNumber(date = new Date()): string {
  const year = date.getUTCFullYear();
  const serial = Math.floor(100000 + Math.random() * 900000);
  return `IPO/${serial}/${year}`;
}
type DepartmentDocumentType = DocumentType;

type AuthSession = {
  token: string;
  user: {
    id: string;
    email: string;
    role:
      | 'SUPER_ADMIN'
      | 'ADMIN'
      | 'COLLEGE_COORDINATOR'
      | 'DEPARTMENT_COORDINATOR'
      | 'IPO'
      | 'STUDENT';
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
  'Access-Control-Allow-Credentials': 'true',
};

const NO_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
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

const industryPerformanceFeedbackSchema = z.object({
  studentName: z.string().trim().min(1),
  registerNumber: z.string().trim().min(1),
  organization: z.string().trim().min(1),
  duration: z.string().trim().min(1),
  supervisorName: z.string().trim().min(1),
  attendancePunctuality: z.coerce.number().int().min(1).max(5),
  technicalSkills: z.coerce.number().int().min(1).max(5),
  problemSolvingAbility: z.coerce.number().int().min(1).max(5),
  communicationSkills: z.coerce.number().int().min(1).max(5),
  teamwork: z.coerce.number().int().min(1).max(5),
  professionalEthics: z.coerce.number().int().min(1).max(5),
  overallPerformance: z.enum(['Excellent', 'Good', 'Average', 'Poor']),
  remarks: z.string().trim().optional().default(''),
  recommendation: z.string().trim().optional().default(''),
  supervisorSignature: z.string().trim().optional().default(''),
  feedbackDate: z.string().trim().min(1),
});

const evaluateSchema = z.object({
  application_id: z.string().trim().min(1),
  marks: z.coerce.number().min(0).max(100),
  feedback: z.string().trim().optional(),
  co_po_score: z.record(z.string(), z.coerce.number().min(0).max(100)),
});

const industryTypeSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

const industrySubtypeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  industry_type_id: z.string().trim().min(1).optional(),
  ipo_type_id: z.string().trim().min(1).optional(),
});

function calculateDepartmentGrade(total: number): string {
  if (total >= 90) return 'A+';
  if (total >= 80) return 'A';
  if (total >= 70) return 'B';
  if (total >= 60) return 'C';
  if (total >= 50) return 'D';
  return 'F';
}

function calculateAttainmentLevel(avgPo: number): 'Low' | 'Medium' | 'High' {
  if (avgPo >= 80) return 'High';
  if (avgPo >= 60) return 'Medium';
  return 'Low';
}

export async function handleLegacyApi(request: Request, env: EnvBindings): Promise<Response> {
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
}

async function routeRequest(request: Request, env: EnvBindings, url: URL): Promise<Response> {
  const rawPathname = url.pathname;
  const pathname = (() => {
    if (rawPathname.startsWith('/api/ipo-types')) return rawPathname.replace('/api/ipo-types', '/api/industry-types');
    if (rawPathname.startsWith('/api/ipo-subtypes')) return rawPathname.replace('/api/ipo-subtypes', '/api/industry-subtypes');
    if (rawPathname.startsWith('/api/ipos')) return rawPathname.replace('/api/ipos', '/api/industries');
    if (rawPathname.startsWith('/api/ipo-requests')) return rawPathname.replace('/api/ipo-requests', '/api/industry-requests');
    if (rawPathname.startsWith('/api/department/ipo-requests')) return rawPathname.replace('/api/department/ipo-requests', '/api/department/industry-requests');
    if (rawPathname.startsWith('/api/department/ipos')) return rawPathname.replace('/api/department/ipos', '/api/department/industries');
    if (rawPathname === '/api/ipo/register') return '/api/industry/register';
    if (rawPathname === '/api/ipo/login') return '/api/industry/login';
    if (rawPathname.startsWith('/api/ipo/')) {
      const keep = new Set([
        '/api/ipo/internship',
        '/api/ipo/application/accept',
        '/api/ipo/complete',
        '/api/ipo/profile',
        '/api/ipo/connect',
        '/api/ipo/internship/suggest',
        '/api/ipo/suggestions',
        '/api/ipo/internships',
        '/api/ipo/applications',
        '/api/ipo/documents/generate',
        '/api/ipo/analytics',
        '/api/ipo/report/pdf',
      ]);
      if (!keep.has(rawPathname)) return rawPathname.replace('/api/ipo/', '/api/industry/');
    }
    return rawPathname;
  })();

  if (pathname.startsWith('/api/department') || pathname === '/api/college/login' || pathname === '/api/auth/login') {
    await ensureDepartmentCompatibility(env);
  }
  if (
    pathname.startsWith('/api/department')
    || pathname.startsWith('/api/industry')
    || pathname.startsWith('/api/documents')
    || pathname.startsWith('/api/dashboard/industry')
    || pathname.startsWith('/api/dashboard/ipo')
    || pathname === '/industry/dashboard'
    || pathname === '/ipo/dashboard'
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
    || pathname.startsWith('/api/ipo/documents')
    || pathname === '/api/ipo/report/pdf'
  ) {
    await ensureInternshipWorkflowSchema(env);
    await ensureDocumentSchema(env);
    await ensureIPOExtensionSchema(env);
  }
  if (pathname === '/api/student/register') {
    await ensureStudentRegistrationSchema(env);
  }
  if (pathname === '/api/college/register' || pathname === '/api/auth/register') {
    await ensureCollegeRegistrationSchema(env);
  }
  if (
    pathname === '/api/dashboard/metrics'
    || pathname === '/api/logs'
    || pathname.startsWith('/api/industry-subtypes')
    || pathname.startsWith('/api/industry-types')
    || pathname === '/api/colleges'
    || pathname === '/api/industries'
    || pathname === '/api/departments'
    || /^\/api\/colleges\/[^/]+\/(approve|reject)$/.test(pathname)
    || /^\/api\/colleges\/[^/]+$/.test(pathname)
    || /^\/api\/industries\/[^/]+\/(approve|reject)$/.test(pathname)
    || /^\/api\/industries\/[^/]+$/.test(pathname)
  ) {
    await ensureSuperAdminControlSchema(env);
  }

  if (request.method === 'GET' && pathname === '/api/health') {
    return jsonResponse(200, { success: true, message: 'API healthy', data: { status: 'ok' } });
  }

  if (request.method === 'GET' && (pathname === '/api/colleges' || pathname === '/api/colleges/')) {
    const actor = parseSessionToken((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim());
    if (actor && (actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN')) {
      const rows = await env.DB.prepare(
        `SELECT id, name, coordinator_name AS coordinator, coordinator_email AS email, status
         FROM colleges
         ORDER BY created_at DESC`,
      ).all();
      return ok('Colleges fetched', rows.results ?? []);
    }

    const rows = await env.DB.prepare(
      `SELECT id, name
       FROM colleges
       WHERE status = 'approved' AND is_active = 1
       ORDER BY name ASC`,
    ).all<{ id: string; name: string }>();
    return ok('Colleges fetched', (rows.results ?? []).map((row) => ({ id: row.id, collegeName: row.name })));
  }

  if (request.method === 'GET' && pathname === '/api/departments') {
    const actor = parseSessionToken((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim());
    const collegeIdFromQuery = toText(url.searchParams.get('college_id') ?? url.searchParams.get('collegeId'));

    if (actor && (actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN')) {
      const rows = collegeIdFromQuery
        ? await env.DB.prepare(
          `SELECT d.id, d.name, d.coordinator_name AS coordinator_name, d.coordinator_email AS coordinator_email, d.college_id, c.name AS college_name
           FROM departments d
           INNER JOIN colleges c ON c.id = d.college_id
           WHERE d.college_id = ?
           ORDER BY d.name ASC`,
        ).bind(collegeIdFromQuery).all()
        : await env.DB.prepare(
          `SELECT d.id, d.name, d.coordinator_name AS coordinator_name, d.coordinator_email AS coordinator_email, d.college_id, c.name AS college_name
           FROM departments d
           INNER JOIN colleges c ON c.id = d.college_id
           ORDER BY d.name ASC`,
        ).all();
      return ok('Departments fetched', rows.results ?? []);
    }

    const scopedCollegeId = actor?.role === 'COLLEGE_COORDINATOR' ? actor.id : collegeIdFromQuery;
    if (!scopedCollegeId) return badRequest('college_id is required');

    const rows = await env.DB.prepare(
      `SELECT id, name, coordinator_name, coordinator_email, college_id
       FROM departments
       WHERE college_id = ? AND is_active = 1
       ORDER BY name ASC`,
    )
      .bind(scopedCollegeId)
      .all<{ id: string; name: string; coordinator_name: string | null; coordinator_email: string | null; college_id: string }>();

    return ok('Departments fetched', rows.results ?? []);
  }


  if (request.method === 'POST' && pathname === '/api/departments') {
    const actor = requireRole(request, ['COLLEGE', 'SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);

    const collegeId = toText(body?.college_id ?? body?.collegeId ?? (actor.role === 'COLLEGE_COORDINATOR' ? actor.id : ''));
    const name = toText(body?.name);
    const coordinatorName = toText(body?.coordinator_name ?? body?.coordinatorName);
    const coordinatorEmail = normalizeEmail(toText(body?.coordinator_email ?? body?.coordinatorEmail));

    if (!collegeId || !name || !coordinatorName || !coordinatorEmail) {
      return badRequest('college_id, name, coordinator_name, coordinator_email are required');
    }

    const duplicate = await env.DB.prepare(
      'SELECT id FROM departments WHERE college_id = ? AND lower(name) = lower(?) AND is_active = 1',
    ).bind(collegeId, name).first<{ id: string }>();
    if (duplicate) return conflict('Department with this name already exists');

    const duplicateEmail = await env.DB.prepare(
      'SELECT id FROM departments WHERE lower(coordinator_email) = lower(?) AND is_active = 1',
    ).bind(coordinatorEmail).first<{ id: string }>();
    if (duplicateEmail) return conflict('Coordinator email already in use');
    const existingAccount = await findAccountByEmail(env, coordinatorEmail);
    if (existingAccount && existingAccount.type !== 'DEPARTMENT_COORDINATOR') {
      return conflict('Coordinator email is already used by another account');
    }

    const generatedPassword = generatePassword(10);
    const departmentId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO departments (id, name, coordinator_name, coordinator_email, college_id, password, is_first_login, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
    ).bind(departmentId, name, coordinatorName, coordinatorEmail, collegeId, generatedPassword).run();

    await upsertIdentity(env, { role: 'department', entityId: departmentId, email: coordinatorEmail, isActive: 1 });
    await sendCredentialEmail(env, coordinatorEmail, name, generatedPassword);

    return created('Department created and credentials sent', { id: departmentId, passwordSent: true });
  }

  const departmentPatchMatch = pathname.match(/^\/api\/departments\/([^/]+)$/);
  if (request.method === 'PATCH' && departmentPatchMatch) {
    const actor = requireRole(request, ['COLLEGE', 'SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const [, departmentId] = departmentPatchMatch;
    const body = await readBody(request);

    const existing = await env.DB.prepare('SELECT id, college_id FROM departments WHERE id = ?').bind(departmentId).first<{ id: string; college_id: string }>();
    if (!existing) return errorResponse(404, 'Department not found');
    if (actor.role === 'COLLEGE_COORDINATOR' && existing.college_id !== actor.id) return forbidden('Not allowed');

    await env.DB.prepare(
      `UPDATE departments
       SET name = COALESCE(?, name),
           coordinator_name = COALESCE(?, coordinator_name),
           coordinator_email = COALESCE(?, coordinator_email),
           updated_at = datetime('now')
       WHERE id = ?`,
    ).bind(
      toText(body?.name) || null,
      toText(body?.coordinator_name ?? body?.coordinatorName) || null,
      normalizeEmail(toText(body?.coordinator_email ?? body?.coordinatorEmail)) || null,
      departmentId,
    ).run();

    return ok('Department updated');
  }

  const departmentDeleteMatch = pathname.match(/^\/api\/departments\/([^/]+)$/);
  if (request.method === 'DELETE' && departmentDeleteMatch) {
    const actor = requireRole(request, ['COLLEGE', 'SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const [, departmentId] = departmentDeleteMatch;

    const existing = await env.DB.prepare('SELECT id, college_id FROM departments WHERE id = ?').bind(departmentId).first<{ id: string; college_id: string }>();
    if (!existing) return errorResponse(404, 'Department not found');
    if (actor.role === 'COLLEGE_COORDINATOR' && existing.college_id !== actor.id) return forbidden('Not allowed');

    await env.DB.prepare("UPDATE departments SET is_active = 0, updated_at = datetime('now') WHERE id = ?").bind(departmentId).run();
    return ok('Department deleted');
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

  if (request.method === 'POST' && pathname === '/api/industry-subtypes') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const body = industrySubtypeSchema.safeParse(await readBody(request));
    if (!body.success) return badRequest(body.error.issues[0]?.message ?? 'Invalid payload');

    const type = await env.DB.prepare('SELECT id FROM industry_types WHERE id = ? AND is_active = 1')
      .bind(body.data.industry_type_id ?? body.data.ipo_type_id)
      .first<{ id: string }>();
    if (!type) return badRequest('Invalid ipo_type_id');

    const duplicate = await env.DB.prepare(
      'SELECT id FROM industry_subtypes WHERE industry_type_id = ? AND lower(name) = lower(?)',
    ).bind(body.data.industry_type_id ?? body.data.ipo_type_id, body.data.name).first<{ id: string }>();
    if (duplicate) return conflict('Industry subtype already exists under this type');

    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO industry_subtypes (id, name, industry_type_id) VALUES (?, ?, ?)',
    ).bind(id, body.data.name, body.data.industry_type_id ?? body.data.ipo_type_id).run();
    return created('Industry subtype added', { id, ...body.data });
  }

  if (request.method === 'GET' && pathname === '/api/industry-subtypes') {
    const typeId = toText(url.searchParams.get('type_id'));
    const rows = typeId
      ? await env.DB.prepare(
        'SELECT id, name, industry_type_id FROM industry_subtypes WHERE industry_type_id = ? ORDER BY name ASC',
      ).bind(typeId).all()
      : await env.DB.prepare(
        'SELECT id, name, industry_type_id FROM industry_subtypes ORDER BY name ASC',
      ).all();
    return ok('Industry subtypes fetched', rows.results ?? []);
  }

  const industrySubtypeByIdMatch = pathname.match(/^\/api\/industry-subtypes\/([^/]+)$/);
  if (industrySubtypeByIdMatch && request.method === 'DELETE') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const result = await env.DB.prepare('DELETE FROM industry_subtypes WHERE id = ?').bind(industrySubtypeByIdMatch[1]).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry subtype not found');
    await insertAuditLog(env, {
      action: 'DELETE',
      entity: 'industry_subtypes',
      entityId: industrySubtypeByIdMatch[1],
      performedBy: actor.id,
    });
    return ok('Industry subtype deleted');
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
    const subtypeCount = await env.DB.prepare('SELECT COUNT(*) AS count FROM industry_subtypes WHERE industry_type_id = ?')
      .bind(industryTypeByIdMatch[1])
      .first<{ count: number }>();
    if (Number(subtypeCount?.count ?? 0) > 0) return badRequest('Delete subtypes first to prevent orphan records');
    const result = await env.DB.prepare('UPDATE industry_types SET is_active = 0 WHERE id = ?').bind(industryTypeByIdMatch[1]).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry type not found');
    await insertAuditLog(env, { action: 'DELETE', entity: 'industry_types', entityId: industryTypeByIdMatch[1], performedBy: actor.id });
    return ok('Industry type deleted');
  }

  if (request.method === 'POST' && pathname === '/api/industry-types') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const body = industryTypeSchema.safeParse(await readBody(request));
    if (!body.success) return badRequest(body.error.issues[0]?.message ?? 'Invalid payload');
    const name = body.data.name;

    const existing = await env.DB.prepare('SELECT id FROM industry_types WHERE lower(name) = lower(?)').bind(name).first<{ id: string }>();
    if (existing) return conflict('Industry type already exists');

    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO industry_types (id, name, is_active) VALUES (?, ?, 1)').bind(id, name.trim()).run();
    return created('Industry type added', { id, name: name.trim() });
  }

  if (request.method === 'GET' && pathname === '/api/industries') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const rows = await env.DB.prepare(
      `SELECT i.id, i.name, i.email, i.status, i.industry_type_id, i.industry_subtype_id,
              it.name AS industry_type_name, ist.name AS industry_subtype_name
       FROM industries i
       LEFT JOIN industry_types it ON it.id = i.industry_type_id
       LEFT JOIN industry_subtypes ist ON ist.id = i.industry_subtype_id
       ORDER BY i.created_at DESC`,
    ).all();
    return ok('Industries fetched', rows.results ?? []);
  }

  if (request.method === 'POST' && pathname === '/api/college/register') {
    const body = await readBody(request);
    console.log('[COLLEGE_REGISTER] req.body:', body);
    const payload = parseCollegeRegistrationPayload(body);
    if (payload instanceof Response) return payload;
    await ensureCollegeRegistrationSchema(env);

    const existing = await env.DB.prepare('SELECT id FROM colleges WHERE coordinator_email = ?').bind(payload.email).first();
    if (existing) return conflict('College coordinator email already exists');

    const collegeId = crypto.randomUUID();
    try {
      await env.DB.prepare(
        `INSERT INTO colleges (id, name, address, university, mobile, coordinator_name, coordinator_email, password, status, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      )
        .bind(collegeId, payload.collegeName, payload.address, payload.university, payload.mobile, payload.coordinatorName, payload.email, payload.password)
        .run();
    } catch (error) {
      console.error('[COLLEGE_REGISTER] Prisma/DB error:', error);
      throw error;
    }

    await upsertIdentity(env, { role: 'college', entityId: collegeId, email: payload.email, isActive: 1 });

    return created('College registration submitted', { id: collegeId, status: 'pending' });
  }

  if (request.method === 'POST' && pathname === '/api/industry/register') {
    const body = await readBody(request);
    console.log('BODY:', body);

    const name = required(body, ['name', 'companyName']);
    const email = normalizeEmail(required(body, ['email']));
    const password = required(body, ['password']);
    const businessActivity = required(body, ['business_activity', 'businessActivity']);
    const industryTypeId = required(body, ['ipo_type_id', 'industry_type_id', 'ipoTypeId', 'industryTypeId']);

    if (!name || !email || !password || !businessActivity || !industryTypeId) {
      return badRequest('name, email, password, business_activity, ipo_type_id are required');
    }

    const [existingIndustry, type] = await Promise.all([
      env.DB.prepare('SELECT id FROM industries WHERE email = ?').bind(email).first(),
      env.DB.prepare('SELECT id FROM industry_types WHERE id = ? AND is_active = 1').bind(industryTypeId).first(),
    ]);

    if (existingIndustry) return conflict('Industry email already exists');
    if (!type) return badRequest('Invalid ipo_type_id');

    const industryId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO industries (id, name, email, business_activity, industry_type_id, password, status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)`,
    )
      .bind(industryId, name, email, businessActivity, industryTypeId, password)
      .run();

    await upsertIdentity(env, { role: 'industry', entityId: industryId, email, isActive: 1 });

    return created('IPO registration submitted', { id: industryId, status: 'pending' });
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

    if (!name || !email || !password) {
      return badRequest('Missing required fields');
    }

    const existing = await env.DB.prepare('SELECT id FROM students WHERE email = ?').bind(email).first();
    if (existing) return conflict('Student email already exists');

    if (collegeId) {
      const college = await env.DB.prepare("SELECT id, status, is_active FROM colleges WHERE id = ?").bind(collegeId).first<{ id: string; status: string; is_active: number }>();
      if (!college) return badRequest('Invalid college_id');
      if (college.status !== 'approved' || Number(college.is_active) !== 1) return forbidden('Waiting for approval');
    }

    if (departmentId) {
      const department = await env.DB.prepare('SELECT id, college_id FROM departments WHERE id = ?').bind(departmentId).first<{ id: string; college_id: string }>();
      if (!department) return badRequest('Invalid department_id');
      if (collegeId && department.college_id !== collegeId) return badRequest('department_id does not belong to selected college');
    }

    if (programId) {
      const program = await env.DB.prepare('SELECT id, department_id FROM programs WHERE id = ?').bind(programId).first<{ id: string; department_id: string }>();
      if (!program) return badRequest('Invalid program_id');
      if (departmentId && program.department_id !== departmentId) return badRequest('program_id does not belong to selected department');
    }

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
      env.DB.prepare(
        `SELECT id,
                COALESCE(total_vacancy, COALESCE(vacancy, 0)) AS total_vacancy,
                COALESCE(filled_vacancy, 0) AS filled_vacancy
         FROM internships
         WHERE id = ?`,
      ).bind(internshipId).first<{ id: string; total_vacancy: number; filled_vacancy: number }>(),
    ]);

    if (!internship) return badRequest('Invalid internship_id');
    if (Number(internship.total_vacancy ?? 0) - Number(internship.filled_vacancy ?? 0) <= 0) {
      return forbidden('No vacancy available for this internship');
    }

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

    await runAtomic(env, null, async () => {
      const vacancyUpdated = await env.DB.prepare(
        `UPDATE internships
         SET filled_vacancy = COALESCE(filled_vacancy, 0) + 1,
             available_vacancy = MAX(COALESCE(total_vacancy, COALESCE(vacancy, 0)) - (COALESCE(filled_vacancy, 0) + 1), 0),
             remaining_vacancy = MAX(COALESCE(total_vacancy, COALESCE(vacancy, 0)) - (COALESCE(filled_vacancy, 0) + 1), 0),
             updated_at = datetime('now')
         WHERE id = ?
           AND COALESCE(filled_vacancy, 0) < COALESCE(total_vacancy, COALESCE(vacancy, 0))`,
      ).bind(internshipId).run();
      if ((vacancyUpdated.meta?.changes ?? 0) === 0) throw new Error('No vacancy available for this internship');

      await env.DB.prepare(
        `INSERT INTO internship_applications (id, external_student_id, internship_id, status)
         VALUES (?, ?, ?, 'pending')`,
      )
        .bind(crypto.randomUUID(), externalStudentId, internshipId)
        .run();
    });

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

  if (request.method === 'POST' && pathname === '/api/auth/register') {
    const body = await readBody(request);
    const roleInput = String(body?.role ?? 'STUDENT').trim().toUpperCase();

    if (roleInput === 'STUDENT') {
      return handleStudentRegistration(body, env);
    }

    if (roleInput === 'IPO' || roleInput === 'INDUSTRY') {
      return handleIndustryRegistration(body, env);
    }

    if (roleInput === 'COLLEGE' || roleInput === 'COLLEGE_COORDINATOR') {
      return handleCollegeRegistration(body, env);
    }

    return badRequest('Unsupported role for unified register');
  }

  if (request.method === 'POST' && pathname === '/api/auth/forgot-password') {
    const body = await readBody(request);
    const email = normalizeEmail(required(body, ['email']));
    if (!email) return badRequest('email is required');

    const account = await findAccountByEmail(env, email);
    if (!account) return notFound('No account found for this email');

    return ok('Password reset OTP sent', {
      otpSent: true,
      email,
      channel: 'email',
      accountType: account.type,
      note: 'OTP dispatch is mocked in this environment.',
    });
  }

  if (request.method === 'POST' && pathname === '/api/auth/reset-password') {
    const body = await readBody(request);
    const email = normalizeEmail(required(body, ['email']));
    const newPassword = required(body, ['newPassword', 'new_password', 'password']);
    if (!email || !newPassword) return badRequest('email and newPassword are required');

    const account = await findAccountByEmail(env, email);
    if (!account) return notFound('No account found for this email');

    await env.DB.prepare(`UPDATE ${account.table} SET password = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(newPassword, account.id)
      .run();

    return ok('Password updated successfully', { passwordUpdated: true });
  }

  if (request.method === 'POST' && pathname === '/api/auth/forgot-userid') {
    const body = await readBody(request);
    const email = normalizeEmail(required(body, ['email']));
    if (!email) return badRequest('email is required');

    const account = await findAccountByEmail(env, email);
    if (!account) return notFound('No account found for this email');

    return ok('User ID located', {
      email,
      maskedEmail: maskEmail(email),
      role: account.type,
    });
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
         AND i.status IN ('ACCEPTED', 'PUBLISHED')
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

  if (request.method === 'GET' && (pathname === '/api/public/stats' || pathname === '/api/public/stats/')) {
    try {
      const [students, industries, vacancies, applications] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) AS count FROM students').first<{ count: number }>(),
        env.DB.prepare('SELECT COUNT(*) AS count FROM industries WHERE is_active = 1').first<{ count: number }>(),
        env.DB.prepare(
          `SELECT COALESCE(SUM(COALESCE(total_vacancy, vacancy)), 0) AS count
           FROM internships
           WHERE status IN ('OPEN', 'ACCEPTED', 'PUBLISHED')`,
        ).first<{ count: number }>(),
        env.DB.prepare('SELECT COUNT(*) AS count FROM internship_applications').first<{ count: number }>(),
      ]);

      return ok('Public stats fetched', {
        vacancies: Number(vacancies?.count ?? 0),
        applications: Number(applications?.count ?? 0),
        students: Number(students?.count ?? 0),
        ipos: Number(industries?.count ?? 0),
      });
    } catch (error) {
      console.error('[STATS] Falling back to mock data due to query error:', error);
      return ok('Public stats fallback', {
        vacancies: 0,
        applications: 0,
        students: 0,
        ipos: 0,
      });
    }
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
          SUM(CASE WHEN COALESCE(a.is_external, CASE WHEN a.external_student_id IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 1 ELSE 0 END) AS external_applications_count
         FROM internships i
         LEFT JOIN internship_applications a ON a.internship_id = i.id
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
         LEFT JOIN internship_applications a ON a.student_id = s.id
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
         LEFT JOIN internship_applications a ON a.internship_id = i.id
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
          CASE WHEN COALESCE(a.is_external, CASE WHEN a.external_student_id IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'EXTERNAL' ELSE 'INTERNAL' END AS application_type,
          COALESCE(s.name, 'Student') AS student_name,
          COALESCE(s.email, '') AS student_email
         FROM internship_applications a
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
         LEFT JOIN internship_applications a ON a.student_id = s.id
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


  if (request.method === 'GET' && pathname === '/api/college/internships') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;
    const departmentId = toText(url.searchParams.get('department_id'));
    const status = toText(url.searchParams.get('status')).toUpperCase();
    let query = `SELECT i.id, i.title, COALESCE(i.status, 'DRAFT') AS status, i.department_id, COALESCE(d.name, 'All Departments') AS department_name,
                        COALESCE(i.filled_vacancy, 0) AS filled_vacancy, COALESCE(i.total_vacancy, COALESCE(i.vacancy,0)) AS total_vacancy,
                        COUNT(ia.id) AS applications_count
                 FROM internships i
                 LEFT JOIN departments d ON d.id = i.department_id
                 LEFT JOIN internship_applications ia ON ia.internship_id = i.id
                 WHERE i.college_id = ?`;
    const params: Array<string> = [actor.id];
    if (departmentId) { query += ' AND i.department_id = ?'; params.push(departmentId); }
    if (status) { query += " AND UPPER(COALESCE(i.status,'')) = ?"; params.push(status); }
    query += ' GROUP BY i.id, i.title, i.status, i.department_id, d.name, i.filled_vacancy, i.total_vacancy, i.vacancy ORDER BY i.created_at DESC';
    const rows = await env.DB.prepare(query).bind(...params).all();
    return ok('College internships loaded', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/college/applications') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;
    const type = toText(url.searchParams.get('type')).toUpperCase();
    let query = `SELECT ia.id, ia.status, ia.created_at, i.title AS internship_title,
                        CASE WHEN COALESCE(ia.is_external, CASE WHEN ia.external_student_id IS NOT NULL THEN 1 ELSE 0 END) = 1 THEN 'EXTERNAL' ELSE 'INTERNAL' END AS application_type,
                        COALESCE(s.name, es.name, 'Student') AS student_name,
                        COALESCE(s.email, es.email, '') AS student_email
                 FROM internship_applications ia
                 INNER JOIN internships i ON i.id = ia.internship_id
                 LEFT JOIN students s ON s.id = ia.student_id
                 LEFT JOIN external_students es ON es.id = ia.external_student_id
                 WHERE i.college_id = ?`;
    const params = [actor.id];
    if (type === 'INTERNAL') query += ' AND COALESCE(ia.is_external, 0) = 0 AND ia.external_student_id IS NULL';
    if (type === 'EXTERNAL') query += ' AND (COALESCE(ia.is_external, 0) = 1 OR ia.external_student_id IS NOT NULL)';
    query += ' ORDER BY ia.created_at DESC';
    const rows = await env.DB.prepare(query).bind(...params).all();
    return ok('College applications loaded', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/college/ipos') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;
    const rows = await env.DB.prepare(
      `SELECT ind.id AS ipo_id, ind.name AS ipo_name,
              COUNT(DISTINCT i.id) AS active_internships,
              COUNT(DISTINCT ia.id) AS engagement_count
       FROM industries ind
       INNER JOIN college_industry_links cil ON cil.industry_id = ind.id AND cil.college_id = ?
       LEFT JOIN internships i ON i.industry_id = ind.id AND i.college_id = ?
       LEFT JOIN internship_applications ia ON ia.internship_id = i.id
       GROUP BY ind.id, ind.name
       ORDER BY ind.name ASC`,
    ).bind(actor.id, actor.id).all();
    return ok('IPO partnerships loaded', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/college/compliance') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;
    const pendingApprovals = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM internships
       WHERE college_id = ? AND UPPER(COALESCE(status,'')) IN ('DRAFT','SENT_TO_DEPARTMENT','SENT_TO_DEPT')`,
    ).bind(actor.id).first<{ count: number }>();
    const missingEvaluations = await env.DB.prepare(
      `SELECT COUNT(*) AS count
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       LEFT JOIN internship_evaluations ie ON ie.application_id = ia.id
       WHERE i.college_id = ? AND ie.id IS NULL AND UPPER(COALESCE(ia.status,'')) IN ('ACCEPTED','COMPLETED','ALLOTTED')`,
    ).bind(actor.id).first<{ count: number }>();
    const violations = await env.DB.prepare(
      `SELECT COUNT(*) AS count
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       INNER JOIN students s ON s.id = ia.student_id
       WHERE i.college_id = ? AND s.college_id = i.college_id`,
    ).bind(actor.id).first<{ count: number }>();
    const alerts = await env.DB.prepare('SELECT message, level, created_at FROM compliance_violations WHERE college_id = ? ORDER BY created_at DESC LIMIT 25').bind(actor.id).all();
    return ok('Compliance loaded', { pending_approvals: Number(pendingApprovals?.count ?? 0), missing_evaluations: Number(missingEvaluations?.count ?? 0), violations: Number(violations?.count ?? 0), alerts: alerts.results ?? [] });
  }

  if (request.method === 'GET' && pathname === '/api/college/capacity') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;
    const rows = await env.DB.prepare(
      `SELECT i.id, i.title, COALESCE(d.name,'All Departments') AS department_name,
              COALESCE(i.total_vacancy, COALESCE(i.vacancy, 0)) AS total_vacancy,
              COALESCE(i.filled_vacancy, 0) AS filled_vacancy,
              ROUND(CASE WHEN COALESCE(i.total_vacancy, COALESCE(i.vacancy, 0)) = 0 THEN 0 ELSE (COALESCE(i.filled_vacancy,0) * 100.0) / COALESCE(i.total_vacancy, COALESCE(i.vacancy, 0)) END, 2) AS filled_ratio
       FROM internships i
       LEFT JOIN departments d ON d.id = i.department_id
       WHERE i.college_id = ?
       ORDER BY filled_ratio ASC, i.created_at DESC`,
    ).bind(actor.id).all();
    return ok('Capacity planning loaded', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/college/analytics') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;

    const totalDepartments = await env.DB.prepare('SELECT COUNT(*) AS count FROM departments WHERE college_id = ? AND is_active = 1').bind(actor.id).first<{ count: number }>();
    const totalStudents = await env.DB.prepare('SELECT COUNT(*) AS count FROM students WHERE college_id = ? AND is_active = 1').bind(actor.id).first<{ count: number }>();
    const totals = await env.DB.prepare(
      `SELECT
        COUNT(*) AS total_internships,
        SUM(CASE WHEN UPPER(COALESCE(status, '')) IN ('COMPLETED','CLOSED','ACCEPTED') THEN 1 ELSE 0 END) AS completed_internships
       FROM internships
       WHERE college_id = ?`,
    ).bind(actor.id).first<{ total_internships: number; completed_internships: number }>();
    const pendingEvaluations = await env.DB.prepare(
      `SELECT COUNT(*) AS count
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       LEFT JOIN internship_evaluations ie ON ie.application_id = ia.id
       WHERE i.college_id = ?
         AND ie.id IS NULL
         AND UPPER(COALESCE(ia.status, '')) IN ('ACCEPTED','COMPLETED','ALLOTTED')`,
    ).bind(actor.id).first<{ count: number }>();
    const deptStats = await env.DB.prepare(
      `SELECT d.id, d.name AS department_name,
          COUNT(DISTINCT s.id) AS total_students,
          COUNT(DISTINCT ia.id) AS total_applications,
          SUM(CASE WHEN UPPER(COALESCE(ia.status, '')) IN ('COMPLETED','ACCEPTED','ALLOTTED') THEN 1 ELSE 0 END) AS selected_or_completed,
          ROUND(CASE WHEN COUNT(DISTINCT ia.id) = 0 THEN 0 ELSE (SUM(CASE WHEN UPPER(COALESCE(ia.status, '')) IN ('COMPLETED','ACCEPTED') THEN 1 ELSE 0 END) * 100.0) / COUNT(DISTINCT ia.id) END,2) AS completion_rate
       FROM departments d
       LEFT JOIN students s ON s.department_id = d.id
       LEFT JOIN internship_applications ia ON ia.student_id = s.id
       WHERE d.college_id = ?
       GROUP BY d.id, d.name
       ORDER BY d.name ASC`,
    ).bind(actor.id).all();

    return ok('College analytics loaded', {
      total_departments: Number(totalDepartments?.count ?? 0),
      total_students: Number(totalStudents?.count ?? 0),
      total_internships: Number(totals?.total_internships ?? 0),
      completed_internships: Number(totals?.completed_internships ?? 0),
      pending_evaluations: Number(pendingEvaluations?.count ?? 0),
      department_wise_stats: deptStats.results ?? [],
    });
  }

  if (request.method === 'GET' && pathname === '/api/college/report/pdf') {
    const actor = requireRole(request, ['COLLEGE']);
    if (actor instanceof Response) return actor;
    const analyticsResponse = await routeRequest(new Request(`${url.origin}/api/college/analytics`, { method: 'GET', headers: request.headers }), env, new URL(`${url.origin}/api/college/analytics`));
    const analyticsData = await analyticsResponse.json() as ApiEnvelope<any>;
    const controlResponse = await routeRequest(new Request(`${url.origin}/api/dashboard/college/control-center`, { method: 'GET', headers: request.headers }), env, new URL(`${url.origin}/api/dashboard/college/control-center`));
    const controlData = await controlResponse.json() as ApiEnvelope<any>;

    const lines = [
      'College Dashboard Consolidated Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '1. College Overview',
      `Total Departments: ${analyticsData.data?.total_departments ?? 0}`,
      `Total Students: ${analyticsData.data?.total_students ?? 0}`,
      '',
      '2. Internship Governance Summary',
      `Total Internships: ${controlData.data?.summary?.totalInternships ?? 0}`,
      `Active Internships: ${controlData.data?.summary?.activeInternships ?? 0}`,
      '',
      '3. Application Statistics',
      `Total Applied: ${controlData.data?.summary?.totalStudentsApplied ?? 0}`,
      `Placed: ${controlData.data?.summary?.studentsPlaced ?? 0}`,
      '',
      '4. Department Analytics',
      `Pending Evaluations: ${analyticsData.data?.pending_evaluations ?? 0}`,
      '',
      '5. IPO Engagement',
      `Linked IPOs: ${(controlData.data?.ipoSummary ?? []).length}`,
      '',
      '6. Compliance Alerts',
      `Alerts: ${(controlData.data?.notifications ?? []).length}`,
      '',
      '7. Capacity Planning',
      `Pending Allocations: ${controlData.data?.summary?.pendingAllocations ?? 0}`,
    ];

    const pdfBytes = buildSimplePdf(lines);
    return new Response(pdfBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        ...NO_CACHE_HEADERS,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="college-report-${actor.id}.pdf"`,
      },
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

  if (request.method === 'GET' && (pathname === '/api/dashboard/industry' || pathname === '/api/dashboard/ipo' || pathname === '/industry/dashboard' || pathname === '/ipo/dashboard')) {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;

    const [industry, internships, applications] = await Promise.all([
      env.DB.prepare('SELECT id, name, business_activity FROM industries WHERE id = ?').bind(actor.id).first(),
      env.DB.prepare(
        `SELECT id, title, description
         FROM internships
         WHERE COALESCE(industry_id, ipo_id) = ?
         ORDER BY created_at DESC`,
      ).bind(actor.id).all(),
      env.DB.prepare(
        `SELECT ia.id,
                ia.status,
                ia.created_at,
                ia.completed_at,
                ia.industry_feedback,
                ia.industry_score,
                ia.student_id,
                ia.internship_id,
                ipf.id AS performance_feedback_id,
                s.university_reg_number AS student_register_number,
                COALESCE(s.name, es.name) AS student_name,
                COALESCE(s.email, es.email) AS student_email,
                COALESCE(c.name, es.college, 'External') AS college_name,
                i.title AS opportunity_title,
                i.duration AS internship_duration,
                ind.name AS organization_name,
                ind.supervisor_name AS supervisor_name
         FROM internship_applications ia
         INNER JOIN internships i ON i.id = ia.internship_id
         LEFT JOIN industries ind ON ind.id = COALESCE(i.industry_id, i.ipo_id)
         LEFT JOIN internship_performance_feedback ipf ON ipf.application_id = ia.id
         LEFT JOIN students s ON s.id = ia.student_id
         LEFT JOIN external_students es ON es.id = ia.external_student_id
         LEFT JOIN colleges c ON c.id = s.college_id
         WHERE COALESCE(i.industry_id, i.ipo_id) = ?
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
        studentId: row.student_id ?? null,
        internshipId: row.internship_id ?? null,
        studentName: row.student_name,
        studentEmail: row.student_email,
        collegeName: row.college_name,
        opportunityTitle: row.opportunity_title,
        registerNumber: row.student_register_number ?? '',
        internshipDuration: row.internship_duration ?? '',
        organizationName: row.organization_name ?? '',
        supervisorName: row.supervisor_name ?? '',
        status: row.status.toUpperCase(),
        createdAt: row.created_at,
        completedAt: row.completed_at,
        industryFeedback: row.industry_feedback,
        industryScore: row.industry_score,
        performanceFeedbackId: row.performance_feedback_id ?? null,
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

  const departmentApplicationDocsPdfMatch = pathname.match(/^\/api\/department\/applications\/([^/]+)\/documents\/pdf$/);
  if (request.method === 'GET' && departmentApplicationDocsPdfMatch) {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const applicationId = departmentApplicationDocsPdfMatch[1];
    const row = await env.DB.prepare(
      `SELECT ia.id, ia.student_id, ia.external_student_id, ia.internship_id, ia.status, ia.completed_at,
              COALESCE(s.name, es.name) AS student_name, COALESCE(s.university_reg_number, 'N/A') AS register_number,
              i.title AS internship_title, i.department_id,
              COALESCE(ind.name, 'Industry') AS industry_name
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       LEFT JOIN students s ON s.id = ia.student_id
       LEFT JOIN external_students es ON es.id = ia.external_student_id
       LEFT JOIN industries ind ON ind.id = i.industry_id
       WHERE ia.id = ? AND i.department_id = ?`,
    ).bind(applicationId, actor.id).first<any>();
    if (!row) return errorResponse(404, 'Application not found');

    const feedback = await env.DB.prepare(`SELECT * FROM internship_performance_feedback WHERE application_id = ?`).bind(applicationId).first<any>();
    const evaluation = await env.DB.prepare(
      `SELECT attendance_marks, work_register_marks, presentation_marks, viva_marks, report_marks, final_total
       FROM internship_evaluations WHERE application_id = ?`,
    ).bind(applicationId).first<any>();
    const outcomes = await env.DB.prepare(
      `SELECT outcome_id, outcome_type, weighted_score, percentage
       FROM outcome_results WHERE application_id = ? ORDER BY outcome_type, outcome_id`,
    ).bind(applicationId).all<any>();
    const docs = await env.DB.prepare(
      `SELECT id, type FROM documents
       WHERE (internship_id = ? AND ifnull(student_id, '') = ifnull(?, ''))
          OR (internship_id = ? AND student_id IS NULL)
       ORDER BY generated_at ASC`,
    ).bind(row.internship_id, row.student_id ?? null, row.internship_id).all<any>();
    const docTypes = new Set((docs.results ?? []).map((doc) => String(doc.type).toLowerCase()));
    const hasFeedback = Boolean(feedback);
    const hasEvaluation = Boolean(evaluation);
    const hasOutcomes = Boolean((outcomes.results ?? []).length);
    const lines = [
      'INTERNSHIP CONSOLIDATED DOCUMENT PACK',
      '',
      `Application Status: ${String(row.status ?? 'pending').toUpperCase()}`,
      `Completion State: ${row.completed_at ? 'COMPLETED' : 'IN PROGRESS'}`,
      '',
      'Document Status Snapshot',
      `- Approval Letter: ${docTypes.has('approval') ? 'GENERATED' : 'NOT GENERATED'}`,
      `- Reply / Invitation Letter: ${docTypes.has('reply') ? 'GENERATED' : 'NOT GENERATED'}`,
      `- Allotment Letter: ${docTypes.has('allotment') ? 'GENERATED' : 'NOT GENERATED'}`,
      `- Performance Feedback Form: ${hasFeedback ? 'SUBMITTED' : 'PENDING'}`,
      `- Evaluation Marksheet: ${hasEvaluation ? 'AVAILABLE' : 'PENDING'}`,
      `- Outcome Assessment Sheet: ${hasOutcomes ? 'AVAILABLE' : 'PENDING'}`,
      '',
      '1) Internship Approval Letter',
      `Student: ${row.student_name ?? '-'}`,
      `Register Number: ${row.register_number ?? '-'}`,
      `Internship: ${row.internship_title ?? '-'}`,
      `Organization: ${row.industry_name ?? '-'}`,
      '',
    ];
    for (const doc of (docs.results ?? [])) {
      const payload = await fetchDocumentPayload(env, String(doc.id), actor);
      if (!payload) continue;
      lines.push(`--- ${String(doc.type).toUpperCase()} LETTER ---`);
      lines.push(...payload.html.replace(/<[^>]+>/g, '\n').split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 80));
      lines.push('');
    }
    lines.push(
      '2) Internship Performance Feedback Form',
      `Supervisor: ${feedback?.supervisor_name ?? '-'}`,
      `Duration: ${feedback?.duration ?? '-'}`,
      `Attendance & Punctuality: ${feedback?.attendance_punctuality ?? '-'}/5`,
      `Technical Skills: ${feedback?.technical_skills ?? '-'}/5`,
      `Problem Solving Ability: ${feedback?.problem_solving_ability ?? '-'}/5`,
      `Communication Skills: ${feedback?.communication_skills ?? '-'}/5`,
      `Teamwork: ${feedback?.teamwork ?? '-'}/5`,
      `Professional Ethics: ${feedback?.professional_ethics ?? '-'}/5`,
      `Overall Performance: ${feedback?.overall_performance ?? '-'}`,
      `Remarks: ${feedback?.remarks ?? '-'}`,
      `Recommendation: ${feedback?.recommendation ?? '-'}`,
      '',
      '3) Evaluation and Marksheet',
      `Attendance Marks: ${evaluation?.attendance_marks ?? '-'}`,
      `Work Register Marks: ${evaluation?.work_register_marks ?? '-'}`,
      `Presentation Marks: ${evaluation?.presentation_marks ?? '-'}`,
      `Viva Marks: ${evaluation?.viva_marks ?? '-'}`,
      `Report Marks: ${evaluation?.report_marks ?? '-'}`,
      `Final Total: ${evaluation?.final_total ?? '-'}`,
      '',
      '4) Outcome Evaluation Sheet',
    );
    for (const item of (outcomes.results ?? [])) {
      lines.push(`${item.outcome_type}-${item.outcome_id}: ${item.weighted_score}/5 (${item.percentage}%)`);
    }
    const pdfBytes = buildSimplePdf(lines);
    return new Response(pdfBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="application-${applicationId}-documents.pdf"`,
      },
    });
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
    const existingAccount = await findAccountByEmail(env, coordinatorEmail);
    if (existingAccount && existingAccount.type !== 'DEPARTMENT_COORDINATOR') {
      return conflict('Coordinator email is already used by another account');
    }

    const departmentId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO departments (
        id,
        college_id,
        name,
        coordinator_name,
        coordinator_email,
        coordinator_mobile,
        password,
        temporary_password,
        is_first_login,
        is_active
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
    )
      .bind(departmentId, collegeId, name, coordinatorName, coordinatorEmail, coordinatorMobile, password, password)
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
      `SELECT id, coordinator_email, password, temporary_password, is_first_login, is_active
       FROM departments WHERE lower(coordinator_email) = lower(?)`,
    ).bind(email).first<{ id: string; coordinator_email: string; password: string; temporary_password: string | null; is_first_login: number; is_active: number }>();

    const effectivePassword = Number(dept?.is_first_login ?? 0) === 1
      ? String(dept?.temporary_password ?? dept?.password ?? '')
      : String(dept?.password ?? '');

    if (!dept || effectivePassword !== password) return unauthorized('Invalid credentials');
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

    const row = await env.DB.prepare(
      'SELECT id, password, temporary_password, is_first_login FROM departments WHERE id = ?',
    ).bind(actor.id).first<{ id: string; password: string; temporary_password: string | null; is_first_login: number }>();

    const effectiveCurrentPassword = Number(row?.is_first_login ?? 0) === 1
      ? String(row?.temporary_password ?? row?.password ?? '')
      : String(row?.password ?? '');

    if (!row || effectiveCurrentPassword !== currentPassword) return unauthorized('Current password is incorrect');

    await env.DB.prepare(
      "UPDATE departments SET password = ?, temporary_password = NULL, is_first_login = 0, updated_at = datetime('now') WHERE id = ?",
    )
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
      `SELECT id, name, email, business_activity, company_address, contact_number, registration_number, registration_year, supervisor_name
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
           supervisor_name = COALESCE(?, supervisor_name),
           updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(
        optional(body, ['company_address', 'companyAddress']),
        optional(body, ['contact_number', 'contactNumber']),
        optional(body, ['email']) ? normalizeEmail(toText(optional(body, ['email']))) : null,
        optional(body, ['registration_number', 'registrationNumber']),
        optional(body, ['registration_year', 'registrationYear']) ? Number(optional(body, ['registration_year', 'registrationYear'])) : null,
        optional(body, ['supervisor_name', 'supervisorName']),
        actor.id,
      )
      .run();

    return ok('IPO profile updated');
  }

  if (request.method === 'PUT' && pathname === '/api/ipo/profile') {
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
           supervisor_name = COALESCE(?, supervisor_name),
           updated_at = datetime('now')
       WHERE id = ?`,
    )
      .bind(
        optional(body, ['company_address', 'companyAddress', 'address']),
        optional(body, ['contact_number', 'contactNumber']),
        optional(body, ['email']) ? normalizeEmail(toText(optional(body, ['email']))) : null,
        optional(body, ['registration_number', 'registrationNumber']),
        optional(body, ['registration_year', 'registrationYear']) ? Number(optional(body, ['registration_year', 'registrationYear'])) : null,
        optional(body, ['supervisor_name', 'supervisorName']),
        actor.id,
      )
      .run();

    return ok('IPO profile updated');
  }

  if (request.method === 'GET' && pathname === '/api/ipo/profile') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;

    const [profile, linkedColleges, publishedInternships, pendingApplications, acceptedApplications] = await Promise.all([
      env.DB.prepare(
        `SELECT name, company_address, email, contact_number, registration_number, registration_year, supervisor_name
         FROM industries WHERE id = ?`,
      ).bind(actor.id).first<{
        name: string;
        company_address: string | null;
        email: string;
        contact_number: string | null;
        registration_number: string | null;
        registration_year: number | null;
        supervisor_name: string | null;
      }>(),
      env.DB.prepare("SELECT COUNT(DISTINCT college_id) AS count FROM college_industry_links WHERE industry_id = ? AND status IN ('approved', 'active')").bind(actor.id).first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM internships WHERE industry_id = ? AND status = 'PUBLISHED'").bind(actor.id).first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM internship_applications ia INNER JOIN internships i ON i.id = ia.internship_id WHERE i.industry_id = ? AND lower(ia.status) = 'pending'").bind(actor.id).first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM internship_applications ia INNER JOIN internships i ON i.id = ia.internship_id WHERE i.industry_id = ? AND lower(ia.status) = 'accepted'").bind(actor.id).first<{ count: number }>(),
    ]);

    return ok('IPO profile fetched', {
      name: profile?.name ?? '',
      address: profile?.company_address ?? null,
      company_address: profile?.company_address ?? null,
      email: profile?.email ?? '',
      contact_number: profile?.contact_number ?? null,
      registration_number: profile?.registration_number ?? null,
      registration_year: profile?.registration_year ?? null,
      supervisor_name: profile?.supervisor_name ?? null,
      linked_colleges_count: Number(linkedColleges?.count ?? 0),
      published_internships: Number(publishedInternships?.count ?? 0),
      pending_applications: Number(pendingApplications?.count ?? 0),
      accepted_applications: Number(acceptedApplications?.count ?? 0),
    });
  }

  if (request.method === 'POST' && pathname === '/api/ipo/connect') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    await ensureIPOExtensionSchema(env);

    const body = await readBody(request);
    const collegeId = required(body, ['college_id', 'collegeId', 'college']);
    const departmentId = optional(body, ['department_id', 'departmentId', 'department']);

    if (!collegeId) return badRequest('college_id is required');

    const college = await env.DB.prepare("SELECT id FROM colleges WHERE id = ? AND status = 'approved' AND is_active = 1").bind(collegeId).first<{ id: string }>();
    if (!college) return badRequest('Invalid college_id');

    if (departmentId) {
      const department = await env.DB.prepare('SELECT id FROM departments WHERE id = ? AND college_id = ? AND is_active = 1').bind(departmentId, collegeId).first<{ id: string }>();
      if (!department) return badRequest('Invalid department_id for this college');
    }

    const duplicate = await env.DB.prepare(
      `SELECT id FROM ipo_connections
       WHERE ipo_id = ? AND college_id = ? AND COALESCE(department_id, '') = COALESCE(?, '')`,
    ).bind(actor.id, collegeId, departmentId).first<{ id: string }>();
    if (duplicate) return conflict('Connection already exists');

    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO ipo_connections (id, ipo_id, college_id, department_id) VALUES (?, ?, ?, ?)').bind(id, actor.id, collegeId, departmentId).run();

    await env.DB.prepare(
      `INSERT OR IGNORE INTO college_industry_links (id, college_id, industry_id, status, requested_by, requested_at, created_at)
       VALUES (?, ?, ?, 'approved', 'industry', datetime('now'), datetime('now'))`,
    ).bind(crypto.randomUUID(), collegeId, actor.id).run();

    return created('IPO connected successfully', { id, ipo_id: actor.id, college_id: collegeId, department_id: departmentId ?? null });
  }

  if (request.method === 'POST' && pathname === '/api/ipo/internship/suggest') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    await ensureIPOExtensionSchema(env);

    const body = await readBody(request);
    const collegeId = required(body, ['college_id', 'collegeId', 'college']);
    const departmentId = optional(body, ['department_id', 'departmentId', 'department']);
    const internshipTitle = required(body, ['internship_title', 'internshipTitle', 'title']);
    const natureOfWork = required(body, ['nature_of_work', 'natureOfWork', 'description']);
    const genderPreference = (optional(body, ['gender_preference', 'genderPreference']) ?? 'BOTH').toUpperCase();
    const internshipCategory = (optional(body, ['internship_category', 'internshipCategory', 'paidOrFree']) ?? 'FREE').toUpperCase();
    const duration = required(body, ['duration']);
    const vacancy = Number(required(body, ['vacancy']));

    if (!collegeId || !internshipTitle || !natureOfWork || !duration || !Number.isFinite(vacancy) || vacancy <= 0) {
      return badRequest('college_id, internship_title, nature_of_work, duration and positive vacancy are required');
    }
    if (!['BOTH', 'BOYS', 'GIRLS'].includes(genderPreference)) return badRequest('gender_preference must be BOTH, BOYS, or GIRLS');
    if (!['FREE', 'PAID', 'STIPEND'].includes(internshipCategory)) return badRequest('internship_category must be FREE, PAID, or STIPEND');

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO ipo_suggestions (
        id, ipo_id, college_id, department_id, internship_title, nature_of_work, gender_preference, internship_category, duration, vacancy, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    ).bind(id, actor.id, collegeId, departmentId, internshipTitle, natureOfWork, genderPreference, internshipCategory, duration, Math.floor(vacancy)).run();

    return created('Internship suggestion sent to department', { id, status: 'PENDING' });
  }

  if (request.method === 'GET' && pathname === '/api/ipo/suggestions') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    await ensureIPOExtensionSchema(env);

    const rows = await env.DB.prepare(
      `SELECT s.id, s.internship_title, s.nature_of_work, s.gender_preference, s.internship_category, s.duration, s.vacancy, s.status,
              c.name AS college_name, d.name AS department_name, s.created_at, s.updated_at
       FROM ipo_suggestions s
       INNER JOIN colleges c ON c.id = s.college_id
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE s.ipo_id = ?
       ORDER BY s.created_at DESC`,
    ).bind(actor.id).all();

    return ok('IPO suggestions fetched', rows.results ?? []);
  }


  if (request.method === 'GET' && pathname === '/api/ipo/internships') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT i.id,
              i.title AS internship_title,
              i.description,
              c.name AS college_name,
              d.name AS department_name,
              i.status,
              i.programme,
              COALESCE(i.total_vacancy, i.vacancy, i.remaining_vacancy, 0) AS vacancy,
              i.internship_category AS category,
              i.student_visibility,
              i.created_at
       FROM internships i
       LEFT JOIN colleges c ON c.id = i.college_id
       LEFT JOIN departments d ON d.id = i.department_id
       WHERE i.industry_id = ?
       ORDER BY i.created_at DESC`,
    ).bind(actor.id).all();

    return ok('IPO internships fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/ipo/applications') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const statusFilter = toText(url.searchParams.get('status')).toLowerCase();

    let query = `SELECT ia.id, ia.status, ia.created_at, ia.updated_at,
                        COALESCE(s.name, es.name) AS student_name,
                        COALESCE(s.email, es.email) AS student_email,
                        i.id AS internship_id,
                        i.title AS internship_title,
                        c.name AS college_name,
                        d.name AS department_name
                 FROM internship_applications ia
                 INNER JOIN internships i ON i.id = ia.internship_id
                 LEFT JOIN students s ON s.id = ia.student_id
                 LEFT JOIN external_students es ON es.id = ia.external_student_id
                 LEFT JOIN colleges c ON c.id = i.college_id
                 LEFT JOIN departments d ON d.id = i.department_id
                 WHERE i.industry_id = ?`;
    const binds: Array<string> = [actor.id];
    if (statusFilter) {
      query += ' AND lower(ia.status) = ?';
      binds.push(statusFilter);
    }
    query += ' ORDER BY ia.created_at DESC';

    const rows = await env.DB.prepare(query).bind(...binds).all();
    return ok('IPO applications fetched', rows.results ?? []);
  }

  const ipoApplicationActionMatch = pathname.match(/^\/api\/ipo\/applications\/([^/]+)\/(accept|reject)$/);
  if (ipoApplicationActionMatch && request.method === 'POST') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const [, applicationId, action] = ipoApplicationActionMatch;
    const nextStatus = action === 'accept' ? 'accepted' : 'rejected';
    const app = await env.DB.prepare(
      `SELECT ia.id, ia.student_id, ia.internship_id, i.title AS internship_title, ind.supervisor_name,
              COALESCE(s.email, es.email) AS student_email, COALESCE(s.name, es.name) AS student_name
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       INNER JOIN industries ind ON ind.id = i.industry_id
       LEFT JOIN students s ON s.id = ia.student_id
       LEFT JOIN external_students es ON es.id = ia.external_student_id
       WHERE ia.id = ? AND i.industry_id = ?`,
    ).bind(applicationId, actor.id).first<any>();
    if (!app) return errorResponse(404, 'Application not found');

    const result = await env.DB.prepare(
      `UPDATE internship_applications
       SET status = ?, reviewed_by_industry_id = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND internship_id IN (SELECT id FROM internships WHERE industry_id = ?)`,
    ).bind(nextStatus, actor.id, applicationId, actor.id).run();

    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Application not found');
    await env.DB.prepare(
      `UPDATE internships
       SET filled_vacancy = (
         SELECT COUNT(*)
         FROM internship_applications ia
         WHERE ia.internship_id = internships.id
           AND lower(ia.status) = 'accepted'
       ),
       available_vacancy = MAX(
         COALESCE(total_vacancy, vacancy, 0) - (
           SELECT COUNT(*)
           FROM internship_applications ia
           WHERE ia.internship_id = internships.id
             AND lower(ia.status) IN ('pending', 'accepted')
         ),
         0
       ),
       remaining_vacancy = MAX(
         COALESCE(total_vacancy, vacancy, 0) - (
           SELECT COUNT(*)
           FROM internship_applications ia
           WHERE ia.internship_id = internships.id
             AND lower(ia.status) IN ('pending', 'accepted')
         ),
         0
       ),
       status = CASE
         WHEN MAX(
           COALESCE(total_vacancy, vacancy, 0) - (
             SELECT COUNT(*)
             FROM internship_applications ia
             WHERE ia.internship_id = internships.id
               AND lower(ia.status) IN ('pending', 'accepted')
           ),
           0
         ) <= 0 THEN 'CLOSED'
         ELSE status
       END,
       updated_at = datetime('now')
       WHERE id = ?`,
    ).bind(app.internship_id).run();
    if (action === 'accept' && app.student_id) {
      await generateDocument(env, {
        type: 'approval',
        internshipId: app.internship_id,
        studentId: app.student_id,
        actor,
        supervisorName: app.supervisor_name ?? undefined,
        supervisorDesignation: 'Industry Supervisor',
      });
    }
    return ok(`Application ${action}ed`);
  }

  if (request.method === 'POST' && pathname === '/api/ipo/documents/generate') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    await ensureIPOExtensionSchema(env);

    const body = await readBody(request);
    const internshipId = required(body, ['internship_id', 'internshipId']);
    const applicationId = optional(body, ['application_id', 'applicationId']);
    const mode = (optional(body, ['mode', 'type']) ?? 'both').toLowerCase();
    const includeApproval = mode === 'both' || mode === 'approval';
    const includeReply = mode === 'both' || mode === 'reply';
    if (!internshipId) return badRequest('internship_id is required');

    const internship = await env.DB.prepare('SELECT id, title FROM internships WHERE id = ? AND industry_id = ?').bind(internshipId, actor.id).first<{ id: string; title: string }>();
    if (!internship) return badRequest('Invalid internship_id');

    const generated: Array<{ id: string; type: string; file_url: string }> = [];
    for (const type of ['approval', 'reply'] as const) {
      if ((type === 'approval' && !includeApproval) || (type === 'reply' && !includeReply)) continue;
      const id = crypto.randomUUID();
      const fileUrl = `/api/ipo/documents/${id}/download`;
      const html = `<!doctype html><html><body><h1>${type === 'approval' ? 'Internship Approval Letter' : 'IPO Reply Letter'}</h1><p>Internship: ${internship.title}</p><p>Generated at: ${new Date().toISOString()}</p></body></html>`;
      await env.DB.prepare(
        `INSERT INTO ipo_documents (id, ipo_id, internship_id, application_id, document_type, file_url, payload_html)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, actor.id, internshipId, applicationId, type, fileUrl, html).run();
      generated.push({ id, type, file_url: fileUrl });
    }

    return created('IPO documents generated', generated);
  }

  if (request.method === 'GET' && pathname === '/api/ipo/analytics') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;

    const [internships, active, applications, accepted, rejected, engagement] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) AS count FROM internships WHERE industry_id = ?').bind(actor.id).first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM internships WHERE industry_id = ? AND status IN ('PUBLISHED','ACCEPTED','SENT_TO_INDUSTRY')").bind(actor.id).first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM internship_applications ia INNER JOIN internships i ON i.id = ia.internship_id WHERE i.industry_id = ?').bind(actor.id).first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM internship_applications ia INNER JOIN internships i ON i.id = ia.internship_id WHERE i.industry_id = ? AND lower(ia.status) = 'accepted'").bind(actor.id).first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM internship_applications ia INNER JOIN internships i ON i.id = ia.internship_id WHERE i.industry_id = ? AND lower(ia.status) = 'rejected'").bind(actor.id).first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(DISTINCT college_id) AS count FROM college_industry_links WHERE industry_id = ?').bind(actor.id).first<{ count: number }>(),
    ]);

    return ok('IPO analytics fetched', {
      total_internships: Number(internships?.count ?? 0),
      active_internships: Number(active?.count ?? 0),
      total_applications: Number(applications?.count ?? 0),
      accepted_applications: Number(accepted?.count ?? 0),
      rejected_applications: Number(rejected?.count ?? 0),
      college_engagement_count: Number(engagement?.count ?? 0),
    });
  }

  if (request.method === 'GET' && pathname === '/api/ipo/report/pdf') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;

    const [profileRes, analyticsRes, connections, documents] = await Promise.all([
      routeRequest(new Request(`${url.origin}/api/ipo/profile`, { method: 'GET', headers: request.headers }), env, new URL(`${url.origin}/api/ipo/profile`)),
      routeRequest(new Request(`${url.origin}/api/ipo/analytics`, { method: 'GET', headers: request.headers }), env, new URL(`${url.origin}/api/ipo/analytics`)),
      env.DB.prepare('SELECT COUNT(*) AS count FROM ipo_connections WHERE ipo_id = ?').bind(actor.id).first<{ count: number }>(),
      env.DB.prepare('SELECT document_type, COUNT(*) AS count FROM ipo_documents WHERE ipo_id = ? GROUP BY document_type').bind(actor.id).all<{ document_type: string; count: number }>(),
    ]);

    const profileData = await profileRes.json() as ApiEnvelope<any>;
    const analyticsData = await analyticsRes.json() as ApiEnvelope<any>;
    const lines = [
      'IPO Report',
      `Generated At: ${new Date().toISOString()}`,
      '--- IPO Profile ---',
      `Name: ${profileData.data?.name ?? '-'}`,
      `Email: ${profileData.data?.email ?? '-'}`,
      `Address: ${profileData.data?.address ?? '-'}`,
      '--- Internship Summary ---',
      `Total Internships: ${analyticsData.data?.total_internships ?? 0}`,
      `Active Internships: ${analyticsData.data?.active_internships ?? 0}`,
      '--- Applications Summary ---',
      `Total Applications: ${analyticsData.data?.total_applications ?? 0}`,
      `Accepted Applications: ${analyticsData.data?.accepted_applications ?? 0}`,
      `Rejected Applications: ${analyticsData.data?.rejected_applications ?? 0}`,
      '--- College Connections ---',
      `Connection Count: ${Number(connections?.count ?? 0)}`,
      '--- Department Engagement ---',
      `College Engagement Count: ${analyticsData.data?.college_engagement_count ?? 0}`,
      '--- Documents ---',
      ...((documents.results ?? []).map((doc) => `${doc.document_type}: ${doc.count}`)),
    ];

    const pdf = buildSimplePdf(lines);
    return new Response(pdf.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        ...NO_CACHE_HEADERS,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ipo-report-${actor.id}.pdf"`,
      },
    });
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
        id, title, description, college_id, department_id, industry_id, is_external, internship_category, total_vacancy, filled_vacancy, remaining_vacancy, available_vacancy, status, student_visibility, programme, duration, requirements, stipend_amount, stipend_duration, fee, gender_preference
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      internshipId,
      internshipTitle.trim(),
      description,
      college,
      departmentRow?.id ?? null,
      actor.id,
      category.toUpperCase(),
      Math.floor(vacancy),
      0,
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
    const maximumDays = optional(body, ['maximum_days', 'maximumDays']) ? Number(optional(body, ['maximum_days', 'maximumDays'])) : null;
    if (!internshipId) return badRequest('id is required');

    const internship = await env.DB.prepare(
      'SELECT id, status FROM internships WHERE id = ? AND industry_id = ?',
    ).bind(internshipId, actor.id).first<{ id: string; status: string }>();
    if (!internship) return errorResponse(404, 'Internship not found');
    if (!['SENT_TO_INDUSTRY', INTERNSHIP_STATUS.ACCEPTED].includes(internship.status)) return badRequest('Only sent internships can be published');
    if (!Number.isFinite(vacancy) || vacancy <= 0) return badRequest('vacancy must be greater than 0');
    if (!['GIRLS', 'BOYS', 'BOTH'].includes(genderPreference)) return badRequest('gender_preference must be GIRLS, BOYS or BOTH');
    if (hourDuration !== null && hourDuration < 60) return badRequest('duration must be at least 60 hours');
    if (maximumDays !== null && maximumDays <= 0) return badRequest('maximumDays must be greater than 0');
    if (internshipCategory && !['FREE', 'PAID', 'STIPEND'].includes(internshipCategory)) return badRequest('internshipCategory must be FREE, PAID or STIPEND');
    if ((internshipCategory === 'PAID' || (internshipCategory === null && fee !== null)) && (!fee || fee <= 0)) return badRequest('fee is required for paid internship');
    if (internshipCategory === 'STIPEND' && (!stipendAmount || stipendAmount < 0)) return badRequest('stipendAmount is required for stipend internship');

    const result = await env.DB.prepare(
      `UPDATE internships
       SET student_visibility = 1,
           status = 'PUBLISHED',
           vacancy = ?,
           total_vacancy = ?,
           remaining_vacancy = MAX(? - COALESCE(filled_vacancy, 0), 0),
           available_vacancy = MAX(? - COALESCE(filled_vacancy, 0), 0),
           gender_preference = ?,
           internship_category = COALESCE(?, internship_category),
           fee = CASE WHEN COALESCE(?, internship_category) = 'PAID' THEN ? ELSE NULL END,
           stipend_amount = CASE WHEN COALESCE(?, internship_category) = 'STIPEND' THEN ? ELSE NULL END,
           stipend_duration = CASE WHEN COALESCE(?, internship_category) = 'STIPEND' THEN ? ELSE NULL END,
           minimum_days = COALESCE(?, minimum_days),
           maximum_days = COALESCE(?, maximum_days),
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
      maximumDays ? Math.floor(maximumDays) : null,
      internshipId,
      actor.id,
    ).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(500, 'Unable to publish internship');

    // Generate core letters when internship enters published state.
    await generateApprovalLetter(env, internshipId, actor);
    await generateAcceptanceLetter(env, internshipId, actor);

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
              i.description,
              i.internship_category AS category,
              COALESCE(i.total_vacancy, 0) AS total_vacancy,
              COALESCE(i.filled_vacancy, 0) AS filled_vacancy,
              MAX(COALESCE(i.total_vacancy, 0) - COALESCE(i.filled_vacancy, 0), 0) AS available_vacancy,
              COALESCE(i.minimum_days, 0) AS minimum_days,
              COALESCE(i.maximum_days, 0) AS maximum_days,
              COALESCE(i.gender_preference, 'BOTH') AS gender_preference,
              COALESCE(i.fee, 0) AS fee,
              COALESCE(i.stipend_amount, 0) AS stipend_amount,
              i.stipend_duration,
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

  const updateIndustryInternshipMatch = pathname.match(/^\/api\/industry\/internships\/([^/]+)$/);
  if (updateIndustryInternshipMatch && request.method === 'PUT') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const title = required(body, ['title', 'internship_title', 'internshipTitle']);
    const description = required(body, ['description']);
    const vacancy = Number(required(body, ['vacancy']));
    const categoryRaw = toText(optional(body, ['internship_category', 'internshipCategory'])).toUpperCase() || 'FREE';
    const internshipCategory = ['FREE', 'PAID', 'STIPEND'].includes(categoryRaw) ? categoryRaw : null;
    const feeRaw = optional(body, ['fee']);
    const fee = feeRaw !== null && feeRaw !== undefined && feeRaw !== '' ? Number(feeRaw) : null;
    const stipendAmountRaw = optional(body, ['stipend_amount', 'stipendAmount']);
    const stipendAmount = stipendAmountRaw !== null && stipendAmountRaw !== undefined && stipendAmountRaw !== '' ? Number(stipendAmountRaw) : null;
    const stipendDuration = toText(optional(body, ['stipend_duration', 'stipendDuration'])) || null;
    const minimumDaysRaw = optional(body, ['minimum_days', 'minimumDays']);
    const maximumDaysRaw = optional(body, ['maximum_days', 'maximumDays']);
    const minimumDays = minimumDaysRaw !== null && minimumDaysRaw !== undefined && minimumDaysRaw !== '' ? Number(minimumDaysRaw) : null;
    const maximumDays = maximumDaysRaw !== null && maximumDaysRaw !== undefined && maximumDaysRaw !== '' ? Number(maximumDaysRaw) : null;
    const genderPreference = toText(optional(body, ['gender_preference', 'genderPreference'])).toUpperCase() || 'BOTH';
    if (!title || !description) return badRequest('title and description are required');
    if (!internshipCategory) return badRequest('internship_category must be FREE, PAID or STIPEND');
    if (!Number.isFinite(vacancy) || vacancy <= 0) return badRequest('vacancy must be greater than 0');
    if (!['GIRLS', 'BOYS', 'BOTH'].includes(genderPreference)) return badRequest('gender_preference must be GIRLS, BOYS or BOTH');
    if (internshipCategory === 'PAID' && (!fee || Number.isNaN(fee) || fee <= 0)) return badRequest('Valid fee is required for paid internships');
    if (internshipCategory === 'STIPEND' && (stipendAmount === null || Number.isNaN(stipendAmount) || stipendAmount < 0)) return badRequest('Valid stipendAmount is required for stipend internships');
    if (minimumDays !== null && (Number.isNaN(minimumDays) || minimumDays <= 0)) return badRequest('minimumDays must be a positive number');
    if (maximumDays !== null && (Number.isNaN(maximumDays) || maximumDays <= 0)) return badRequest('maximumDays must be a positive number');

    const existingInternship = await env.DB.prepare(
      `SELECT id, status, COALESCE(filled_vacancy, 0) AS filled_vacancy
       FROM internships
       WHERE id = ? AND industry_id = ?`,
    ).bind(updateIndustryInternshipMatch[1], actor.id).first<{ id: string; status: string; filled_vacancy: number }>();
    if (!existingInternship) return errorResponse(404, 'Industry internship not found');
    if (!['SENT_TO_INDUSTRY', 'ACCEPTED', 'PUBLISHED', 'CLOSED', 'FULL'].includes(existingInternship.status)) {
      return badRequest('Internship status does not allow editing');
    }
    if (Math.floor(vacancy) < Number(existingInternship.filled_vacancy ?? 0)) {
      return badRequest('Cannot reduce vacancy below already filled seats');
    }

    const result = await env.DB.prepare(
      `UPDATE internships
       SET title = ?,
           description = ?,
           internship_category = ?,
           vacancy = ?,
           total_vacancy = ?,
           remaining_vacancy = MAX(? - COALESCE(filled_vacancy, 0), 0),
           available_vacancy = MAX(? - COALESCE(filled_vacancy, 0), 0),
           fee = CASE WHEN ? = 'PAID' THEN ? ELSE NULL END,
           stipend_amount = CASE WHEN ? = 'STIPEND' THEN ? ELSE NULL END,
           stipend_duration = CASE WHEN ? = 'STIPEND' THEN ? ELSE NULL END,
           minimum_days = ?,
           maximum_days = ?,
           gender_preference = ?,
           updated_at = datetime('now')
       WHERE id = ?
         AND industry_id = ?`,
    ).bind(
      title,
      description,
      internshipCategory,
      Math.floor(vacancy),
      Math.floor(vacancy),
      Math.floor(vacancy),
      Math.floor(vacancy),
      internshipCategory,
      fee,
      internshipCategory,
      stipendAmount,
      internshipCategory,
      stipendDuration,
      minimumDays === null ? null : Math.floor(minimumDays),
      maximumDays === null ? null : Math.floor(maximumDays),
      genderPreference,
      updateIndustryInternshipMatch[1],
      actor.id,
    ).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(500, 'Unable to update internship');
    return ok('Industry internship updated');
  }

  const industryInternshipCloseMatch = pathname.match(/^\/api\/industry\/internships\/([^/]+)\/close$/);
  if (industryInternshipCloseMatch && request.method === 'POST') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const result = await env.DB.prepare(
      `UPDATE internships
       SET status = 'CLOSED',
           available_vacancy = 0,
           remaining_vacancy = 0,
           updated_at = datetime('now')
       WHERE id = ? AND industry_id = ?`,
    ).bind(industryInternshipCloseMatch[1], actor.id).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry internship not found');
    return ok('Industry internship closed');
  }

  const industryInternshipRepublishMatch = pathname.match(/^\/api\/industry\/internships\/([^/]+)\/republish$/);
  if (industryInternshipRepublishMatch && request.method === 'POST') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const internship = await env.DB.prepare(
      `SELECT id, COALESCE(vacancy, total_vacancy, 0) AS vacancy
       FROM internships
       WHERE id = ? AND industry_id = ?`,
    ).bind(industryInternshipRepublishMatch[1], actor.id).first<{ id: string; vacancy: number }>();
    if (!internship) return errorResponse(404, 'Industry internship not found');
    const vacancy = Math.max(Number(internship.vacancy ?? 0), 1);
    const result = await env.DB.prepare(
      `UPDATE internships
       SET status = 'PUBLISHED',
           student_visibility = 1,
           total_vacancy = CASE WHEN COALESCE(total_vacancy, 0) > 0 THEN total_vacancy ELSE ? END,
           vacancy = CASE WHEN COALESCE(vacancy, 0) > 0 THEN vacancy ELSE ? END,
           available_vacancy = CASE WHEN COALESCE(available_vacancy, 0) > 0 THEN available_vacancy ELSE ? END,
           remaining_vacancy = CASE WHEN COALESCE(remaining_vacancy, 0) > 0 THEN remaining_vacancy ELSE ? END,
           updated_at = datetime('now')
       WHERE id = ? AND industry_id = ?`,
    ).bind(vacancy, vacancy, vacancy, vacancy, industryInternshipRepublishMatch[1], actor.id).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(500, 'Unable to republish internship');
    return ok('Industry internship published again');
  }

  if (updateIndustryInternshipMatch && request.method === 'DELETE') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const result = await env.DB.prepare(
      'DELETE FROM internships WHERE id = ? AND industry_id = ?',
    ).bind(updateIndustryInternshipMatch[1], actor.id).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry internship not found');
    return ok('Industry internship removed');
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
    const actor = requireRole(request, ['COLLEGE', 'DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    let rows;
    if (actor.role === 'COLLEGE') {
      rows = await env.DB.prepare(
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
    } else {
      rows = await env.DB.prepare(
        `SELECT ia.id, ia.status, ia.created_at, ia.completed_at, ia.is_external,
                ipf.id AS performance_feedback_id,
                COALESCE(s.id, es.id) AS student_id,
                COALESCE(s.name, es.name) AS student_name,
                COALESCE(s.email, es.email) AS student_email,
                i.title AS internship_title
         FROM internship_applications ia
         INNER JOIN internships i ON i.id = ia.internship_id
         LEFT JOIN internship_performance_feedback ipf ON ipf.application_id = ia.id
         LEFT JOIN students s ON s.id = ia.student_id
         LEFT JOIN external_students es ON es.id = ia.external_student_id
         WHERE i.department_id = ?
           AND ia.student_id IS NOT NULL
           AND COALESCE(s.department_id, '') = COALESCE(i.department_id, '')
         ORDER BY ia.created_at DESC`,
      ).bind(actor.id).all();
    }

    return ok('Internal applications fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/applications/external') {
    const actor = requireRole(request, ['COLLEGE', 'DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    let rows;
    if (actor.role === 'COLLEGE') {
      rows = await env.DB.prepare(
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
    } else {
      rows = await env.DB.prepare(
        `SELECT ia.id, ia.status, ia.created_at, ia.completed_at, ia.is_external,
                ipf.id AS performance_feedback_id,
                COALESCE(es.name, s.name) AS student_name,
                COALESCE(es.email, s.email) AS student_email,
                i.title AS internship_title
         FROM internship_applications ia
         INNER JOIN internships i ON i.id = ia.internship_id
         LEFT JOIN internship_performance_feedback ipf ON ipf.application_id = ia.id
         LEFT JOIN students s ON s.id = ia.student_id
         LEFT JOIN external_students es ON es.id = ia.external_student_id
         WHERE i.department_id = ?
           AND (
             ia.external_student_id IS NOT NULL
             OR (ia.student_id IS NOT NULL AND COALESCE(s.department_id, '') <> COALESCE(i.department_id, ''))
             OR ia.is_external = 1
           )
         ORDER BY ia.created_at DESC`,
      ).bind(actor.id).all();
    }

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
      `SELECT ia.id, ia.student_id, ia.external_student_id, ia.internship_id, lower(ia.status) AS current_status,
              COALESCE(i.total_vacancy, 0) AS total_vacancy, COALESCE(i.filled_vacancy, 0) AS filled_vacancy
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       INNER JOIN departments d ON d.id = i.department_id
       WHERE ia.id = ? AND d.college_id = ?`,
    ).bind(applicationId, actor.id).first<{ id: string; student_id: string | null; external_student_id: string | null; internship_id: string; current_status: string; total_vacancy: number; filled_vacancy: number }>();
    if (!app) return errorResponse(404, 'Application not found');

    if (action === 'reject') {
      await env.DB.prepare("UPDATE internship_applications SET status = 'rejected', updated_at = datetime('now') WHERE id = ?")
        .bind(applicationId)
        .run();
      if (app.current_status === 'accepted') {
        await syncInternshipVacancy(env, app.internship_id);
      }
      return ok('Application rejected');
    }

    if ((app.filled_vacancy ?? 0) >= (app.total_vacancy ?? 0) && app.current_status !== 'accepted') {
      return conflict('No vacancies available');
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

    await syncInternshipVacancy(env, app.internship_id);

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
      `SELECT i.id,
              COALESCE(i.total_vacancy, COALESCE(i.vacancy, 0)) AS total_vacancy,
              COALESCE(i.filled_vacancy, 0) AS filled_vacancy,
              d.college_id
       FROM internships i
       INNER JOIN departments d ON d.id = i.department_id
       WHERE i.id = ?`,
    ).bind(internshipId).first<{ id: string; total_vacancy: number; filled_vacancy: number; college_id: string }>();
    if (!internship) return badRequest('Invalid internship id');

    const student = await env.DB.prepare('SELECT college_id FROM students WHERE id = ?').bind(actor.id).first<{ college_id: string }>();
    if (!student) return unauthorized('Student not found');
    if (student.college_id === internship.college_id) return forbidden('You can apply only for internships from other colleges.');
    const availableVacancy = Number(internship.total_vacancy ?? 0) - Number(internship.filled_vacancy ?? 0);
    if (availableVacancy <= 0) return forbidden('No vacancy available for this internship');

    const duplicate = await env.DB.prepare('SELECT id FROM internship_applications WHERE student_id = ? AND internship_id = ?')
      .bind(actor.id, internshipId)
      .first();
    if (duplicate) return conflict('Application already submitted for this internship');

    const eligibility = await getStudentApplicationEligibility(env, actor.id);
    if (eligibility.activeLock) return forbidden('Your accepted internship is in progress. Department must mark completion before new applications.');
    if (eligibility.openApplications >= 3) return forbidden('You can only keep three active applications at a time.');

    const applicationId = crypto.randomUUID();
    await runAtomic(env, null, async () => {
      const vacancyUpdated = await env.DB.prepare(
        `UPDATE internships
         SET filled_vacancy = COALESCE(filled_vacancy, 0) + 1,
             available_vacancy = MAX(COALESCE(total_vacancy, COALESCE(vacancy, 0)) - (COALESCE(filled_vacancy, 0) + 1), 0),
             remaining_vacancy = MAX(COALESCE(total_vacancy, COALESCE(vacancy, 0)) - (COALESCE(filled_vacancy, 0) + 1), 0),
             updated_at = datetime('now')
         WHERE id = ?
           AND COALESCE(filled_vacancy, 0) < COALESCE(total_vacancy, COALESCE(vacancy, 0))`,
      ).bind(internshipId).run();
      if ((vacancyUpdated.meta?.changes ?? 0) === 0) throw new Error('No vacancy available for this internship');

      await env.DB.prepare(
        `INSERT INTO internship_applications (id, student_id, internship_id, status)
         VALUES (?, ?, ?, 'pending')`,
      )
        .bind(applicationId, actor.id, internshipId)
        .run();
    });

    return created('Student application submitted', { internshipId, status: 'pending' });
  }

  const industryRejectMatch = pathname.match(/^\/api\/industry\/applications\/([^/]+)\/reject$/);
  if (industryRejectMatch && request.method === 'POST') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const applicationId = industryRejectMatch[1];

    const prior = await env.DB.prepare(
      `SELECT ia.internship_id, lower(ia.status) AS previous_status
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       WHERE ia.id = ?
         AND i.industry_id = ?`,
    ).bind(applicationId, actor.id).first<{ internship_id: string; previous_status: string }>();
    if (!prior) return errorResponse(404, 'Application not found');

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
    if (prior.previous_status === 'pending' || prior.previous_status === 'accepted') {
      await syncInternshipVacancy(env, prior.internship_id);
    }
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

    const application = await env.DB.prepare(
      `SELECT ia.student_id, ia.external_student_id, ia.internship_id, ind.supervisor_name
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       LEFT JOIN industries ind ON ind.id = i.industry_id
       WHERE ia.id = ?`,
    ).bind(applicationId).first<{ student_id: string | null; external_student_id: string | null; internship_id: string; supervisor_name: string | null }>();
    if (application) {
      await ensureInternshipAllocationsTable(env);
      const internship = await env.DB.prepare(`SELECT ii.industry_id FROM internships i LEFT JOIN industry_internships ii ON ii.title = i.title WHERE i.id = ? LIMIT 1`).bind(application.internship_id).first<{ industry_id: string | null }>();
      await env.DB.prepare(
        `INSERT INTO internship_allocations (id, student_id, external_student_id, industry_id, internship_id, project_details, status)
         VALUES (?, ?, ?, ?, ?, ?, 'allocated')`,
      )
        .bind(crypto.randomUUID(), application.student_id, application.external_student_id, internship?.industry_id ?? actor.id, application.internship_id, 'Allocated from accepted application')
        .run();
      await generateApprovalLetter(env, application.internship_id, actor, application.student_id);
      await generateAcceptanceLetter(env, application.internship_id, actor, application.student_id);
    }

    return ok('Application accepted and letters generated');
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

  const industryGenerateLettersMatch = pathname.match(/^\/api\/industry\/applications\/([^/]+)\/generate-letters$/);
  if (industryGenerateLettersMatch && request.method === 'POST') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const application = await env.DB.prepare(
      `SELECT ia.id, ia.student_id, ia.internship_id, i.industry_id, ind.supervisor_name
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       INNER JOIN industries ind ON ind.id = i.industry_id
       WHERE ia.id = ? AND i.industry_id = ? AND lower(ia.status) = 'accepted'`,
    ).bind(industryGenerateLettersMatch[1], actor.id).first<{ id: string; student_id: string | null; internship_id: string; industry_id: string; supervisor_name: string | null }>();
    if (!application) return errorResponse(404, 'Accepted application not found');
    if (application.student_id) {
      await generateDocument(env, {
        type: 'approval',
        internshipId: application.internship_id,
        studentId: application.student_id,
        actor,
        supervisorName: application.supervisor_name ?? undefined,
        supervisorDesignation: 'Industry Supervisor',
      });
    }
    await generateDocument(env, {
      type: 'reply',
      internshipId: application.internship_id,
      studentId: application.student_id ?? undefined,
      actor,
      supervisorName: application.supervisor_name ?? 'Industry Supervisor',
      supervisorDesignation: 'Industry Supervisor',
    });
    return ok('Acceptance and invitation letters generated');
  }

  const industryFeedbackMatch = pathname.match(/^\/api\/industry\/applications\/([^/]+)\/feedback$/);
  if (industryFeedbackMatch && request.method === 'POST') {
    const actor = requireRole(request, ['INDUSTRY']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const parsed = industryPerformanceFeedbackSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid feedback payload');
    const payload = parsed.data;
    const averageScore = Number((
      (payload.attendancePunctuality
      + payload.technicalSkills
      + payload.problemSolvingAbility
      + payload.communicationSkills
      + payload.teamwork
      + payload.professionalEthics) / 6
    ).toFixed(2));
    const summaryFeedback = `Overall: ${payload.overallPerformance}. Remarks: ${payload.remarks || 'N/A'}. Recommendation: ${payload.recommendation || 'N/A'}.`;
    const result = await env.DB.prepare(
      `UPDATE internship_applications
       SET industry_feedback = ?,
           industry_score = ?,
           status = 'completed',
           completed_at = COALESCE(completed_at, datetime('now')),
           updated_at = datetime('now')
       WHERE id = ?
         AND internship_id IN (SELECT id FROM internships WHERE industry_id = ?)`,
    ).bind(summaryFeedback, averageScore, industryFeedbackMatch[1], actor.id).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Application not found');
    await env.DB.prepare(
      `INSERT INTO internship_performance_feedback (
         id, application_id, internship_id, student_id, external_student_id, industry_id,
         student_name, register_number, organization, duration, supervisor_name,
         attendance_punctuality, technical_skills, problem_solving_ability, communication_skills,
         teamwork, professional_ethics, overall_performance, remarks, recommendation,
         supervisor_signature, feedback_date, created_at, updated_at
       )
       SELECT
         ?, ia.id, ia.internship_id, ia.student_id, ia.external_student_id, ?,
         ?, ?, ?, ?, ?,
         ?, ?, ?, ?,
         ?, ?, ?, ?, ?,
         ?, ?, datetime('now'), datetime('now')
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       WHERE ia.id = ? AND i.industry_id = ?
       ON CONFLICT(application_id) DO UPDATE SET
         student_name = excluded.student_name,
         register_number = excluded.register_number,
         organization = excluded.organization,
         duration = excluded.duration,
         supervisor_name = excluded.supervisor_name,
         attendance_punctuality = excluded.attendance_punctuality,
         technical_skills = excluded.technical_skills,
         problem_solving_ability = excluded.problem_solving_ability,
         communication_skills = excluded.communication_skills,
         teamwork = excluded.teamwork,
         professional_ethics = excluded.professional_ethics,
         overall_performance = excluded.overall_performance,
         remarks = excluded.remarks,
         recommendation = excluded.recommendation,
         supervisor_signature = excluded.supervisor_signature,
         feedback_date = excluded.feedback_date,
         updated_at = datetime('now')`,
    ).bind(
      crypto.randomUUID(), actor.id,
      payload.studentName, payload.registerNumber, payload.organization, payload.duration, payload.supervisorName,
      payload.attendancePunctuality, payload.technicalSkills, payload.problemSolvingAbility, payload.communicationSkills,
      payload.teamwork, payload.professionalEthics, payload.overallPerformance, payload.remarks, payload.recommendation,
      payload.supervisorSignature, payload.feedbackDate, industryFeedbackMatch[1], actor.id,
    ).run();
    await env.DB.prepare(
      `INSERT INTO feedbacks (
        id, student_id, internship_id, ipo_id, rating, comments, skills_assessed, submitted_at, created_at, updated_at
      )
      SELECT ?, COALESCE(ia.student_id, ia.external_student_id), ia.internship_id, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now')
      FROM internship_applications ia
      INNER JOIN internships i ON i.id = ia.internship_id
      WHERE ia.id = ? AND i.industry_id = ?
      ON CONFLICT(student_id, internship_id) DO UPDATE SET
        ipo_id = excluded.ipo_id,
        rating = excluded.rating,
        comments = excluded.comments,
        skills_assessed = excluded.skills_assessed,
        submitted_at = datetime('now'),
        updated_at = datetime('now')`,
    ).bind(
      crypto.randomUUID(),
      actor.id,
      averageScore,
      summaryFeedback,
      JSON.stringify({
        attendancePunctuality: payload.attendancePunctuality,
        technicalSkills: payload.technicalSkills,
        problemSolvingAbility: payload.problemSolvingAbility,
        communicationSkills: payload.communicationSkills,
        teamwork: payload.teamwork,
        professionalEthics: payload.professionalEthics,
      }),
      industryFeedbackMatch[1],
      actor.id,
    ).run();
    return ok('Feedback form saved');
  }

  const industryFeedbackFormMatch = pathname.match(/^\/api\/industry\/applications\/([^/]+)\/feedback-form$/);
  if (industryFeedbackFormMatch && request.method === 'GET') {
    const actor = requireRole(request, ['INDUSTRY', 'DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const row = await env.DB.prepare(
      `SELECT ipf.*
       FROM internship_performance_feedback ipf
       INNER JOIN internship_applications ia ON ia.id = ipf.application_id
       INNER JOIN internships i ON i.id = ia.internship_id
       WHERE ipf.application_id = ?
         AND (
           ( ? = 'INDUSTRY' AND i.industry_id = ? )
           OR ( ? IN ('DEPARTMENT_COORDINATOR', 'COORDINATOR') AND i.department_id = ? )
         )`,
    ).bind(industryFeedbackFormMatch[1], actor.role, actor.id, actor.role, actor.id).first<any>();
    if (!row) return errorResponse(404, 'Feedback form not found');
    return ok('Feedback form fetched', row);
  }

  const departmentFeedbackFormMatch = pathname.match(/^\/api\/department\/applications\/([^/]+)\/feedback-form$/);
  if (departmentFeedbackFormMatch && request.method === 'GET') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const row = await env.DB.prepare(
      `SELECT ipf.*
       FROM internship_performance_feedback ipf
       INNER JOIN internship_applications ia ON ia.id = ipf.application_id
       INNER JOIN internships i ON i.id = ia.internship_id
       WHERE ipf.application_id = ?
         AND i.department_id = ?`,
    ).bind(departmentFeedbackFormMatch[1], actor.id).first<any>();
    if (!row) return errorResponse(404, 'Feedback form not found');
    return ok('Feedback form fetched', row);
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
              COALESCE(i.is_paid, 0) AS is_paid, i.fee, i.internship_category, i.is_external,
              CASE WHEN COALESCE(i.is_external, 0) = 1 THEN 'EXTERNAL' ELSE 'INTERNAL' END AS applicable_to,
              COALESCE(i.vacancy, 0) AS vacancy,
              i.programme, i.mapped_po, i.mapped_pso, i.mapped_co, COALESCE(i.student_visibility, 0) AS student_visibility,
              (SELECT COUNT(*) FROM internship_applications ia WHERE ia.internship_id = i.id) AS registered_students_count
       FROM internships i
       INNER JOIN departments d ON d.id = ?
       WHERE i.college_id = d.college_id
         AND (i.department_id IS NULL OR i.department_id = ?)
       ORDER BY i.created_at DESC`,
    ).bind(actor.id, actor.id).all();

    return ok('Department internships fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/department/profile') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const profile = await env.DB.prepare(
      `SELECT id, name, coordinator_name
       FROM departments
       WHERE id = ?`,
    ).bind(actor.id).first<{ id: string; name: string; coordinator_name: string }>();

    if (!profile) return errorResponse(404, 'Department profile not found');
    return ok('Department profile fetched', profile);
  }

  if (request.method === 'GET' && pathname === '/api/department/dashboard-summary') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const departmentId = toText(url.searchParams.get('department_id')) || actor.id;
    if (departmentId !== actor.id) return forbidden('department_id does not match your session');

    const summary = await env.DB.prepare(
      `SELECT d.name,
              d.coordinator_name,
              d.coordinator_email,
              COUNT(DISTINCT i.id) AS internships_count,
              SUM(CASE WHEN UPPER(COALESCE(i.status, '')) IN ('DRAFT','SENT_TO_INDUSTRY','SENT_TO_DEPT','SENT_TO_DEPARTMENT','PENDING') THEN 1 ELSE 0 END) AS pending_count,
              (SELECT COUNT(*) FROM industry_requests ir WHERE ir.department_id = d.id) AS ideas_count,
              (SELECT COUNT(*) FROM programs p WHERE p.department_id = d.id) AS programmes_count
       FROM departments d
       LEFT JOIN internships i ON i.department_id = d.id
       WHERE d.id = ?
       GROUP BY d.id, d.name, d.coordinator_name, d.coordinator_email`,
    ).bind(departmentId).first<any>();
    if (!summary) return errorResponse(404, 'Department not found');

    return ok('Department dashboard summary fetched', {
      name: summary.name,
      coordinator_name: summary.coordinator_name,
      coordinator_email: summary.coordinator_email,
      internships_count: Number(summary.internships_count ?? 0),
      pending_count: Number(summary.pending_count ?? 0),
      ideas_count: Number(summary.ideas_count ?? 0),
      programmes_count: Number(summary.programmes_count ?? 0),
    });
  }

  if (request.method === 'GET' && pathname === '/api/department/linked-ipos') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const departmentId = toText(url.searchParams.get('department_id')) || actor.id;
    if (departmentId !== actor.id) return forbidden('department_id does not match your session');
    const rows = await env.DB.prepare(
      `SELECT i.id, i.name, i.business_activity, i.email, COALESCE(cil.status, 'inactive') AS link_status
       FROM departments d
       INNER JOIN college_industry_links cil ON cil.college_id = d.college_id AND cil.status IN ('approved', 'active')
       INNER JOIN industries i ON i.id = cil.industry_id
       WHERE d.id = ?
       ORDER BY i.name ASC`,
    ).bind(departmentId).all();
    return ok('Linked IPOs fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/department/analytics') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const departmentId = toText(url.searchParams.get('department_id')) || actor.id;
    if (departmentId !== actor.id) return forbidden('department_id does not match your session');

    const [students, internships, completed, ongoing, pendingEvaluations, ipoEngagement] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) AS count FROM students WHERE department_id = ?').bind(departmentId).first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM internships WHERE department_id = ?').bind(departmentId).first<{ count: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS count
         FROM internship_applications ia
         INNER JOIN internships i ON i.id = ia.internship_id
         WHERE i.department_id = ? AND ia.completed_at IS NOT NULL`,
      ).bind(departmentId).first<{ count: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS count
         FROM internship_applications ia
         INNER JOIN internships i ON i.id = ia.internship_id
         WHERE i.department_id = ? AND ia.status = 'accepted' AND ia.completed_at IS NULL`,
      ).bind(departmentId).first<{ count: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS count
         FROM internship_applications ia
         INNER JOIN internships i ON i.id = ia.internship_id
         LEFT JOIN internship_evaluations ie ON ie.application_id = ia.id
         WHERE i.department_id = ? AND ia.completed_at IS NOT NULL AND ie.id IS NULL`,
      ).bind(departmentId).first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(DISTINCT industry_id) AS count FROM internships WHERE department_id = ? AND industry_id IS NOT NULL').bind(departmentId).first<{ count: number }>(),
    ]);

    const totalStudents = Number(students?.count ?? 0);
    const totalInternships = Number(internships?.count ?? 0);
    const completedInternships = Number(completed?.count ?? 0);
    const ongoingInternships = Number(ongoing?.count ?? 0);
    const pendingEval = Number(pendingEvaluations?.count ?? 0);
    const ipoEngagementCount = Number(ipoEngagement?.count ?? 0);
    const performanceScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (completedInternships * 50) / Math.max(totalInternships, 1)
          + (ipoEngagementCount * 25) / Math.max(totalInternships, 1)
          + (Math.max(totalInternships - pendingEval, 0) * 25) / Math.max(totalInternships, 1),
        ),
      ),
    );

    return ok('Department analytics fetched', {
      total_students: totalStudents,
      total_internships: totalInternships,
      completed_internships: completedInternships,
      ongoing_internships: ongoingInternships,
      pending_evaluations: pendingEval,
      ipo_engagement_count: ipoEngagementCount,
      department_performance_score: performanceScore,
    });
  }

  if (request.method === 'GET' && pathname === '/api/department/report/pdf') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const departmentId = toText(url.searchParams.get('department_id')) || actor.id;
    if (departmentId !== actor.id) return forbidden('department_id does not match your session');
    const summaryRes = await routeRequest(new Request(`${url.origin}/api/department/dashboard-summary?department_id=${departmentId}`, { method: 'GET', headers: request.headers }), env, new URL(`${url.origin}/api/department/dashboard-summary?department_id=${departmentId}`));
    const analyticsRes = await routeRequest(new Request(`${url.origin}/api/department/analytics?department_id=${departmentId}`, { method: 'GET', headers: request.headers }), env, new URL(`${url.origin}/api/department/analytics?department_id=${departmentId}`));
    const linkedRes = await routeRequest(new Request(`${url.origin}/api/department/linked-ipos?department_id=${departmentId}`, { method: 'GET', headers: request.headers }), env, new URL(`${url.origin}/api/department/linked-ipos?department_id=${departmentId}`));
    const internships = await env.DB.prepare('SELECT title, internship_category, vacancy, status, is_external FROM internships WHERE department_id = ? ORDER BY created_at DESC LIMIT 20').bind(departmentId).all<any>();
    const documents = await env.DB.prepare('SELECT type, COUNT(*) AS count FROM department_documents WHERE department_id = ? GROUP BY type').bind(departmentId).all<any>();
    const summaryData = await summaryRes.json() as ApiEnvelope<any>;
    const analyticsData = await analyticsRes.json() as ApiEnvelope<any>;
    const linkedData = await linkedRes.json() as ApiEnvelope<any>;
    const lines = [
      'Department Full Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '1. Department Overview',
      `Department: ${summaryData.data?.name ?? '-'}`,
      `Coordinator: ${summaryData.data?.coordinator_name ?? '-'}`,
      `Coordinator Email: ${summaryData.data?.coordinator_email ?? '-'}`,
      '',
      '2. Internship Summary',
      `Total Internships: ${summaryData.data?.internships_count ?? 0}`,
      `Pending Internships: ${summaryData.data?.pending_count ?? 0}`,
      '',
      '3. Application Statistics',
      `Completed Internships: ${analyticsData.data?.completed_internships ?? 0}`,
      `Ongoing Internships: ${analyticsData.data?.ongoing_internships ?? 0}`,
      '',
      '4. Programme + PO/PSO Mapping',
      `Total Programmes: ${summaryData.data?.programmes_count ?? 0}`,
      '',
      '5. IPO Collaborations',
      `Linked IPOs: ${(linkedData.data ?? []).length}`,
      '',
      '6. Internship Listings',
      ...(internships.results ?? []).slice(0, 8).map((item: any) => `- ${item.title} | ${item.internship_category ?? 'FREE'} | Vac:${item.vacancy ?? 0} | ${item.status} | ${Number(item.is_external) === 1 ? 'external' : 'internal'}`),
      '',
      '7. Compliance / Pending Items',
      `Pending Evaluations: ${analyticsData.data?.pending_evaluations ?? 0}`,
      '',
      '8. Documents Summary',
      ...((documents.results ?? []).map((item: any) => `${item.type}: ${item.count}`)),
      `Performance Score: ${analyticsData.data?.department_performance_score ?? 0}`,
    ];
    const pdfBytes = buildSimplePdf(lines);
    return new Response(pdfBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        ...NO_CACHE_HEADERS,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="department-report-${departmentId}.pdf"`,
      },
    });
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
      `SELECT i.id, i.status, i.published,
              COALESCE(i.total_vacancy, 0) AS total_vacancy,
              COALESCE(i.filled_vacancy, 0) AS filled_vacancy,
              COALESCE(i.is_external, 0) AS is_external, i.college_id, d.college_id AS department_college_id
       FROM internships i
       LEFT JOIN departments d ON d.id = i.department_id
       WHERE i.id = ?`,
    ).bind(internshipId).first<{ id: string; status: string; published: number; total_vacancy: number; filled_vacancy: number; is_external: number; college_id: string | null; department_college_id: string | null }>();
    if (!internship) return errorResponse(404, 'Internship not found');
    if (internship.status !== 'PUBLISHED' || Number(internship.published) !== 1) return forbidden('Internship is not open for applications');
    if ((Number(internship.total_vacancy ?? 0) - Number(internship.filled_vacancy ?? 0)) <= 0) return forbidden('No vacancies available');

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
    if ((app.filled_vacancy ?? 0) >= (app.total_vacancy ?? 0)) return conflict('No vacancies available');

    try {
      await runAtomic(env, null, async () => {
        const updateInternship = await env.DB.prepare(
          `UPDATE internships
           SET filled_vacancy = filled_vacancy + 1,
               remaining_vacancy = MAX(total_vacancy - (filled_vacancy + 1), 0),
               available_vacancy = MAX(total_vacancy - (filled_vacancy + 1), 0),
               status = CASE WHEN total_vacancy - (filled_vacancy + 1) <= 0 THEN 'FULL' ELSE status END,
               updated_at = datetime('now')
           WHERE id = ?
             AND filled_vacancy < total_vacancy`,
        ).bind(app.internship_id).run();
        if ((updateInternship.meta.changes ?? 0) === 0) throw new Error('No vacancies available');
        await env.DB.prepare(
          `UPDATE applications SET status = 'ACCEPTED' WHERE id = ? AND status != 'ACCEPTED'`,
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
    const industryId = toText(optional(body, ['industry_id', 'industryId', 'ipo_id', 'ipoId'])) || null;
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
    if (applicableTo === 'INTERNAL' && !industryId) return badRequest('ipoId is required for internal internships');
    if (action === 'send_to_industry' && applicableTo !== 'INTERNAL') return badRequest('Only internal internships can be sent to IPO');

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
      `INSERT INTO internships (id, title, description, department_id, college_id, ipo_id, industry_id, is_paid, fee, internship_category, vacancy, total_vacancy, filled_vacancy, remaining_vacancy, available_vacancy, is_external, created_by, source_type, visibility_type, status, stipend_amount, stipend_duration, minimum_days, gender_preference, programme, mapped_po, mapped_pso, mapped_co, internship_po, internship_co)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT name FROM programs WHERE id = ?), ?, ?, ?, ?, ?)`,
    )
      .bind(
        internshipId,
        title,
        description,
        actor.id,
        department.college_id,
        applicableTo === 'INTERNAL' ? industryId : null,
        applicableTo === 'INTERNAL' ? industryId : null,
        isPaid ? 1 : 0,
        isPaid ? Math.round(fee ?? 0) : null,
        internshipCategory,
        Math.floor(vacancy ?? 0),
        Math.floor(vacancy ?? 0),
        0,
        Math.floor(vacancy ?? 0),
        Math.floor(vacancy ?? 0),
        applicableTo === 'EXTERNAL' ? 1 : 0,
        applicableTo === 'EXTERNAL' ? 'COLLEGE' : 'INDUSTRY',
        applicableTo === 'EXTERNAL' ? 'COLLEGE' : 'DEPARTMENT_SUGGESTED',
        applicableTo === 'EXTERNAL' ? 'ALL_TARGETS' : 'SAME_COLLEGE_DEPARTMENT',
        action === 'send_to_industry' || action === 'send_to_ipo' ? 'SENT_TO_INDUSTRY' : 'PUBLISHED',
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
    if ((coCodes.length + poCodes.length) > 0 && (coCodes.some((item) => !item.trim()) || poCodes.some((item) => !item.trim()))) {
      return badRequest('Null or empty mapping values are not allowed');
    }
    for (const coCode of coCodes) {
      await env.DB.prepare(
        `INSERT INTO internship_co_mapping (id, internship_id, co_code, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(internship_id, co_code) DO UPDATE SET updated_at = datetime('now')`,
      ).bind(crypto.randomUUID(), internshipId, coCode).run();
    }
    for (const poCode of poCodes) {
      await env.DB.prepare(
        `INSERT INTO internship_po_mapping (id, internship_id, po_code, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(internship_id, po_code) DO UPDATE SET updated_at = datetime('now')`,
      ).bind(crypto.randomUUID(), internshipId, poCode).run();
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

    const existingInternship = await env.DB.prepare(
      `SELECT id, COALESCE(filled_vacancy, 0) AS filled_vacancy
       FROM internships
       WHERE id = ? AND department_id = ?`,
    ).bind(updateDepartmentInternshipMatch[1], actor.id).first<{ id: string; filled_vacancy: number }>();
    if (!existingInternship) return errorResponse(404, 'Internship not found');
    if (vacancy !== null && Math.floor(vacancy) < Number(existingInternship.filled_vacancy ?? 0)) {
      return badRequest('Cannot reduce vacancy below already filled seats');
    }

    const result = await env.DB.prepare(
      `UPDATE internships
       SET title = ?, description = ?, is_paid = ?, fee = ?, internship_category = ?,
           vacancy = COALESCE(?, vacancy),
           total_vacancy = COALESCE(?, total_vacancy),
           remaining_vacancy = MAX(COALESCE(?, total_vacancy) - COALESCE(filled_vacancy, 0), 0),
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
    const registrations = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM internship_applications WHERE internship_id = ?',
    ).bind(updateDepartmentInternshipMatch[1]).first<{ count: number }>();
    if (Number(registrations?.count ?? 0) > 0) return badRequest('Cannot delete internship with registered students. Delete is restricted to college login.');
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
         AND (COALESCE(industry_id, '') <> '' OR COALESCE(ipo_id, '') <> '')`,
    ).bind(programId ?? null, mappedCo, mappedPo, mappedPso, 'PUBLISHED', submitDepartmentAdvertisementMatch[1], actor.id, actor.id).run();

    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Industry internship not found for this department');
    await generateDocument(env, { type: 'approval', internshipId: submitDepartmentAdvertisementMatch[1], actor });
    return ok('Internship advertisement published for students');
  }

  if (request.method === 'GET' && pathname === '/api/department/internships') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const rows = await env.DB.prepare(
      `SELECT id, title, description, is_paid, fee, internship_category,
              COALESCE(total_vacancy, vacancy, 0) AS total_vacancy,
              COALESCE(filled_vacancy, 0) AS filled_vacancy,
              MAX(COALESCE(total_vacancy, vacancy, 0) - COALESCE(filled_vacancy, 0), 0) AS available_vacancy,
              COALESCE(vacancy, COALESCE(total_vacancy, 0)) AS vacancy,
              is_external,
              CASE WHEN COALESCE(is_external, 0) = 1 THEN 'EXTERNAL' ELSE 'INTERNAL' END AS applicable_to,
              status, created_at, industry_id, gender_preference, stipend_amount, stipend_duration, minimum_days
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
      `SELECT i.id,
              MAX(COALESCE(i.total_vacancy, 0) - COALESCE(i.filled_vacancy, 0), 0) AS available_vacancy,
              COALESCE(i.is_external, 0) AS is_external,
              COALESCE(i.created_by, 'INDUSTRY') AS created_by,
              i.department_id,
              d.college_id
       FROM internships i
       INNER JOIN departments d ON d.id = i.department_id
       WHERE i.id = ?`,
    ).bind(internshipId).first<{ id: string; available_vacancy: number | null; is_external: number; created_by: string; department_id: string | null; college_id: string }>();
    if (!internship) return badRequest('Invalid internship_id');
    if (actor.role === 'STUDENT') {
      const student = await env.DB.prepare('SELECT college_id, department_id FROM students WHERE id = ?').bind(actor.id).first<{ college_id: string; department_id: string }>();
      if (!student) return unauthorized('Student not found');
      const externalOnlyForOtherColleges = Number(internship.is_external) === 1
        && String(internship.created_by).toUpperCase() !== 'INDUSTRY'
        && student.college_id === internship.college_id;
      if (externalOnlyForOtherColleges) {
        return forbidden('This internship is open only to external college students');
      }
      const isDepartmentCreatedExternal = Number(internship.is_external) === 1
        && String(internship.created_by).toUpperCase() !== 'INDUSTRY';
      if (isDepartmentCreatedExternal && internship.department_id && student.department_id === internship.department_id) {
        return forbidden('External internships are not available to the same department that created them.');
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
        const vacancyUpdated = await env.DB.prepare(
          `UPDATE internships
           SET filled_vacancy = filled_vacancy + 1,
               available_vacancy = MAX(total_vacancy - (filled_vacancy + 1), 0),
               remaining_vacancy = MAX(total_vacancy - (filled_vacancy + 1), 0),
               status = CASE WHEN total_vacancy - (filled_vacancy + 1) <= 0 THEN 'FULL' ELSE status END,
               updated_at = datetime('now')
           WHERE id = ?
             AND filled_vacancy < total_vacancy`,
        ).bind(internshipId).run();
        if ((vacancyUpdated.meta.changes ?? 0) === 0) throw new Error('No vacancy available for this internship');

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

  if (request.method === 'GET' && pathname === '/api/applications/internal') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const rows = await env.DB.prepare(
      `SELECT ia.*, ipf.id AS performance_feedback_id, i.title AS internship_title, COALESCE(s.name, es.name) AS student_name, COALESCE(s.email, es.email) AS student_email
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       LEFT JOIN internship_performance_feedback ipf ON ipf.application_id = ia.id
       LEFT JOIN students s ON s.id = ia.student_id
       LEFT JOIN external_students es ON es.id = ia.external_student_id
       WHERE i.department_id = ? AND ia.student_id IS NOT NULL
       ORDER BY ia.created_at DESC`,
    ).bind(actor.id).all();
    return ok('Internal applications fetched', rows.results ?? []);
  }

  if (request.method === 'GET' && pathname === '/api/applications/external') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const rows = await env.DB.prepare(
      `SELECT ia.*, ipf.id AS performance_feedback_id, i.title AS internship_title, COALESCE(s.name, es.name) AS student_name, COALESCE(s.email, es.email) AS student_email
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       LEFT JOIN internship_performance_feedback ipf ON ipf.application_id = ia.id
       LEFT JOIN students s ON s.id = ia.student_id
       LEFT JOIN external_students es ON es.id = ia.external_student_id
       WHERE i.department_id = ? AND (ia.external_student_id IS NOT NULL OR ia.is_external = 1)
       ORDER BY ia.created_at DESC`,
    ).bind(actor.id).all();
    return ok('External applications fetched', rows.results ?? []);
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
              COALESCE(i.total_vacancy, 0) AS total_vacancy,
              COALESCE(i.filled_vacancy, 0) AS filled_vacancy,
              d.name AS department_name
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       INNER JOIN departments d ON d.id = i.department_id
       LEFT JOIN external_students es ON es.id = ia.external_student_id
       LEFT JOIN students s ON s.id = ia.student_id
       WHERE ia.id = ? AND d.id = ?`,
    ).bind(applicationId, actor.id).first<any>();

    if (!app) return errorResponse(404, 'Application not found for this department');

    try {
      await runAtomic(env, null, async () => {
        const appUpdate = await env.DB.prepare(
          `UPDATE internship_applications
           SET status = 'accepted',
               reviewed_by_industry_id = COALESCE(?, reviewed_by_industry_id),
               reviewed_at = datetime('now'),
               updated_at = datetime('now')
           WHERE id = ?
             AND lower(status) != 'accepted'`,
        ).bind(app.industry_id ?? null, applicationId).run();
        if ((appUpdate.meta.changes ?? 0) === 0) throw new Error('Application already accepted');
      });
    } catch (error) {
      return conflict(error instanceof Error ? error.message : 'Unable to accept application');
    }

    await syncInternshipVacancy(env, app.internship_id);

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
      await generateDocument(env, { type: 'approval', internshipId: app.internship_id, studentId: app.student_id, actor });
      await generateDocument(env, { type: 'allotment', internshipId: app.internship_id, studentId: app.student_id, actor });
      await generateDocument(env, { type: 'feedback', internshipId: app.internship_id, studentId: app.student_id, actor });
    }

    return ok('Application accepted and notification sent');
  }

  const rejectDepartmentAppMatch = pathname.match(/^\/api\/department\/applications\/([^/]+)\/reject$/);
  if (rejectDepartmentAppMatch && request.method === 'POST') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;

    const prior = await env.DB.prepare(
      `SELECT ia.internship_id, lower(ia.status) AS previous_status
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       WHERE ia.id = ?
         AND i.department_id = ?`,
    ).bind(rejectDepartmentAppMatch[1], actor.id).first<{ internship_id: string; previous_status: string }>();
    if (!prior) return errorResponse(404, 'Application not found for this department');

    const result = await env.DB.prepare(
      `UPDATE internship_applications
       SET status = 'rejected', updated_at = datetime('now')
       WHERE id = ?
         AND internship_id IN (SELECT id FROM internships WHERE department_id = ?)`,
    )
      .bind(rejectDepartmentAppMatch[1], actor.id)
      .run();

    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'Application not found for this department');
    if (prior.previous_status === 'accepted') {
      await env.DB.prepare(
        `UPDATE internships
         SET filled_vacancy = MAX(filled_vacancy - 1, 0),
             available_vacancy = MIN(total_vacancy, MAX(total_vacancy - MAX(filled_vacancy - 1, 0), 0)),
             remaining_vacancy = MIN(total_vacancy, MAX(total_vacancy - MAX(filled_vacancy - 1, 0), 0)),
             status = CASE WHEN status = 'FULL' THEN 'PUBLISHED' ELSE status END,
             updated_at = datetime('now')
         WHERE id = ?`,
      ).bind(prior.internship_id).run();
    }
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

  if (request.method === 'POST' && pathname === '/api/department/evaluation') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const studentId = required(body, ['student_id', 'studentId']);
    const internshipId = required(body, ['internship_id', 'internshipId']);
    const attendanceMarks = Number(required(body, ['attendance_marks', 'attendanceMarks']));
    const skillMarks = Number(required(body, ['skill_marks', 'skillMarks']));
    const reportMarks = Number(required(body, ['report_marks', 'reportMarks']));
    const vivaMarks = Number(required(body, ['viva_marks', 'vivaMarks']));
    const disciplineMarks = Number(required(body, ['discipline_marks', 'disciplineMarks']));

    if ([attendanceMarks, skillMarks, reportMarks, vivaMarks, disciplineMarks].some((mark) => Number.isNaN(mark) || mark < 0 || mark > 20)) {
      return badRequest('Each mark must be a number between 0 and 20');
    }

    const app = await env.DB.prepare(
      `SELECT ia.id, ia.student_id, ia.external_student_id, ia.internship_id
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       WHERE ia.internship_id = ?
         AND (ia.student_id = ? OR ia.external_student_id = ?)
         AND i.department_id = ?`,
    ).bind(internshipId, studentId, studentId, actor.id).first<any>();
    if (!app) return errorResponse(404, 'Application not found for this student/internship');

    const feedbackExists = await env.DB.prepare(
      'SELECT id FROM feedbacks WHERE internship_id = ? AND student_id = ?',
    ).bind(internshipId, studentId).first<{ id: string }>();
    if (!feedbackExists) return badRequest('Feedback must be submitted before evaluation');

    const total = attendanceMarks + skillMarks + reportMarks + vivaMarks + disciplineMarks;
    const grade = calculateDepartmentGrade(total);

    await env.DB.prepare(
      `INSERT INTO evaluations (
        id, application_id, student_id, internship_id, marks, feedback, co_po_score, evaluated_by,
        attendance_marks, skill_marks, report_marks, viva_marks, discipline_marks, total, grade, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(application_id) DO UPDATE SET
        student_id = excluded.student_id,
        internship_id = excluded.internship_id,
        marks = excluded.marks,
        co_po_score = excluded.co_po_score,
        evaluated_by = excluded.evaluated_by,
        attendance_marks = excluded.attendance_marks,
        skill_marks = excluded.skill_marks,
        report_marks = excluded.report_marks,
        viva_marks = excluded.viva_marks,
        discipline_marks = excluded.discipline_marks,
        total = excluded.total,
        grade = excluded.grade,
        updated_at = datetime('now')`,
    ).bind(
      crypto.randomUUID(),
      app.id,
      studentId,
      internshipId,
      total,
      '',
      JSON.stringify({ po1: skillMarks, po2: vivaMarks, po3: skillMarks, po4: reportMarks }),
      actor.id,
      attendanceMarks,
      skillMarks,
      reportMarks,
      vivaMarks,
      disciplineMarks,
      total,
      grade,
    ).run();

    return ok('Evaluation saved', { total, grade });
  }

  if (request.method === 'POST' && pathname === '/api/department/outcome-assessment') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const body = await readBody(request);
    const studentId = required(body, ['student_id', 'studentId']);
    const internshipId = required(body, ['internship_id', 'internshipId']);

    const evaluation = await env.DB.prepare(
      `SELECT skill_marks, viva_marks, report_marks
       FROM evaluations e
       INNER JOIN internships i ON i.id = e.internship_id
       WHERE e.student_id = ? AND e.internship_id = ? AND i.department_id = ?`,
    ).bind(studentId, internshipId, actor.id).first<any>();
    if (!evaluation) return badRequest('Outcome assessment can be generated only after evaluation');

    const po1Score = Number((((Number(evaluation.skill_marks ?? 0) / 20) * 100)).toFixed(2));
    const po2Score = Number((((Number(evaluation.viva_marks ?? 0) / 20) * 100)).toFixed(2));
    const po3Score = Number((((Number(evaluation.skill_marks ?? 0) / 20) * 100)).toFixed(2));
    const po4Score = Number((((Number(evaluation.report_marks ?? 0) / 20) * 100)).toFixed(2));
    const avgPo = Number(((po1Score + po2Score + po3Score + po4Score) / 4).toFixed(2));
    const attainmentLevel = calculateAttainmentLevel(avgPo);

    await env.DB.prepare(
      `INSERT INTO outcomes (
        id, student_id, internship_id, po1_score, po2_score, po3_score, po4_score, attainment_level, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(student_id, internship_id) DO UPDATE SET
        po1_score = excluded.po1_score,
        po2_score = excluded.po2_score,
        po3_score = excluded.po3_score,
        po4_score = excluded.po4_score,
        attainment_level = excluded.attainment_level,
        updated_at = datetime('now')`,
    ).bind(crypto.randomUUID(), studentId, internshipId, po1Score, po2Score, po3Score, po4Score, attainmentLevel).run();

    return ok('Outcome assessment saved', {
      po1Score,
      po2Score,
      po3Score,
      po4Score,
      attainmentLevel,
      graph: [
        { outcome: 'PO1', score: po1Score },
        { outcome: 'PO2', score: po2Score },
        { outcome: 'PO3', score: po3Score },
        { outcome: 'PO4', score: po4Score },
      ],
    });
  }

  const feedbackByStudentMatch = pathname.match(/^\/api\/department\/feedback\/([^/]+)\/([^/]+)$/);
  if (feedbackByStudentMatch && request.method === 'GET') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const studentId = feedbackByStudentMatch[1];
    const internshipId = feedbackByStudentMatch[2];

    const feedback = await env.DB.prepare(
      `SELECT f.rating,
              f.comments,
              f.skills_assessed,
              f.submitted_at,
              ipf.attendance_punctuality,
              ipf.technical_skills,
              ipf.problem_solving_ability,
              ipf.communication_skills,
              ipf.teamwork,
              ipf.professional_ethics,
              ipf.overall_performance,
              ipf.remarks,
              ipf.recommendation,
              ipf.supervisor_name,
              ipf.feedback_date
       FROM feedbacks f
       INNER JOIN internships i ON i.id = f.internship_id
       LEFT JOIN internship_performance_feedback ipf
         ON ipf.internship_id = f.internship_id
        AND (ipf.student_id = f.student_id OR ipf.external_student_id = f.student_id)
       WHERE f.student_id = ? AND f.internship_id = ? AND i.department_id = ?`,
    ).bind(studentId, internshipId, actor.id).first<any>();

    if (!feedback) return errorResponse(404, 'Feedback not found');
    return ok('Feedback fetched', feedback);
  }

  const outcomeByStudentMatch = pathname.match(/^\/api\/department\/outcome\/([^/]+)\/([^/]+)$/);
  if (outcomeByStudentMatch && request.method === 'GET') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const studentId = outcomeByStudentMatch[1];
    const internshipId = outcomeByStudentMatch[2];

    const row = await env.DB.prepare(
      `SELECT o.*
       FROM outcomes o
       INNER JOIN internships i ON i.id = o.internship_id
       WHERE o.student_id = ? AND o.internship_id = ? AND i.department_id = ?`,
    ).bind(studentId, internshipId, actor.id).first<any>();
    if (!row) return errorResponse(404, 'Outcome assessment not found');
    return ok('Outcome assessment fetched', {
      ...row,
      graph: [
        { outcome: 'PO1', score: Number(row.po1_score ?? 0) },
        { outcome: 'PO2', score: Number(row.po2_score ?? 0) },
        { outcome: 'PO3', score: Number(row.po3_score ?? 0) },
        { outcome: 'PO4', score: Number(row.po4_score ?? 0) },
      ],
    });
  }

  const departmentDocumentsMatch = pathname.match(/^\/api\/department\/documents\/([^/]+)\/([^/]+)$/);
  if (departmentDocumentsMatch && request.method === 'GET') {
    const actor = requireRole(request, ['DEPARTMENT_COORDINATOR', 'COORDINATOR']);
    if (actor instanceof Response) return actor;
    const studentId = departmentDocumentsMatch[1];
    const internshipId = departmentDocumentsMatch[2];

    const app = await env.DB.prepare(
      `SELECT ia.id, i.title AS internship_title
       FROM internship_applications ia
       INNER JOIN internships i ON i.id = ia.internship_id
       WHERE ia.internship_id = ?
         AND (ia.student_id = ? OR ia.external_student_id = ?)
         AND i.department_id = ?`,
    ).bind(internshipId, studentId, studentId, actor.id).first<any>();
    if (!app) return errorResponse(404, 'Application not found');

    const feedback = await env.DB.prepare(
      'SELECT rating, comments, skills_assessed, submitted_at FROM feedbacks WHERE internship_id = ? AND student_id = ?',
    ).bind(internshipId, studentId).first<any>();
    const evaluation = await env.DB.prepare(
      'SELECT attendance_marks, skill_marks, report_marks, viva_marks, discipline_marks, total, grade FROM evaluations WHERE internship_id = ? AND student_id = ?',
    ).bind(internshipId, studentId).first<any>();
    const outcome = await env.DB.prepare(
      'SELECT po1_score, po2_score, po3_score, po4_score, attainment_level FROM outcomes WHERE internship_id = ? AND student_id = ?',
    ).bind(internshipId, studentId).first<any>();
    const docs = await env.DB.prepare(
      `SELECT type, generated_at
       FROM documents
       WHERE internship_id = ? AND (student_id = ? OR student_id IS NULL)
       ORDER BY generated_at DESC`,
    ).bind(internshipId, studentId).all<any>();

    const lines = [
      'Department Consolidated Internship Document',
      `Internship: ${app.internship_title}`,
      '',
      '1) Internship Approval Letter',
      '2) Allotment Letter',
      '3) Acceptance Letter',
      '',
      '4) IPO Feedback',
      `Rating: ${feedback?.rating ?? '-'}`,
      `Skills Assessed: ${feedback?.skills_assessed ?? '-'}`,
      `Comments: ${feedback?.comments ?? '-'}`,
      '',
      '5) Department Evaluation Sheet',
      `Attendance / Participation: ${evaluation?.attendance_marks ?? '-'}`,
      `Technical Skills: ${evaluation?.skill_marks ?? '-'}`,
      `Report Quality: ${evaluation?.report_marks ?? '-'}`,
      `Viva / Presentation: ${evaluation?.viva_marks ?? '-'}`,
      `Discipline: ${evaluation?.discipline_marks ?? '-'}`,
      `Total: ${evaluation?.total ?? '-'} Grade: ${evaluation?.grade ?? '-'}`,
      '',
      '6) Outcome Assessment Report',
      `PO1: ${outcome?.po1_score ?? '-'}%`,
      `PO2: ${outcome?.po2_score ?? '-'}%`,
      `PO3: ${outcome?.po3_score ?? '-'}%`,
      `PO4: ${outcome?.po4_score ?? '-'}%`,
      `Attainment Level: ${outcome?.attainment_level ?? '-'}`,
      '',
      'Generated Documents',
      ...(docs.results ?? []).map((doc: any, index: number) => `${index + 1}. ${String(doc.type).toUpperCase()} (${doc.generated_at})`),
    ];
    const pdfBytes = buildSimplePdf(lines);
    return new Response(pdfBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        ...NO_CACHE_HEADERS,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="department-documents-${studentId}-${internshipId}.pdf"`,
      },
    });
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
    if (!industry) return errorResponse(404, 'IPO not found');
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

  const collegeActionMatch = pathname.match(/^\/api\/colleges\/([^/]+)\/(approve|reject)$/);
  if (collegeActionMatch && request.method === 'PATCH') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const [, collegeId, action] = collegeActionMatch;
    const status = action === 'approve' ? 'approved' : 'rejected';
    const isActive = action === 'approve' ? 1 : 0;
    const result = await env.DB.prepare(
      "UPDATE colleges SET status = ?, is_active = ?, approved_by_admin_id = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
    ).bind(status, isActive, actor.id, collegeId).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'College not found');
    await insertAuditLog(env, { action: action.toUpperCase(), entity: 'colleges', entityId: collegeId, performedBy: actor.id });
    return ok(`College ${status}`);
  }

  const industryActionMatch = pathname.match(/^\/api\/industries\/([^/]+)\/(approve|reject)$/);
  if (industryActionMatch && request.method === 'PATCH') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const [, industryId, action] = industryActionMatch;
    const status = action === 'approve' ? 'approved' : 'rejected';
    const isActive = action === 'approve' ? 1 : 0;
    const result = await env.DB.prepare(
      "UPDATE industries SET status = ?, is_active = ?, approved_by_admin_id = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
    ).bind(status, isActive, actor.id, industryId).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'IPO not found');
    await insertAuditLog(env, { action: action.toUpperCase(), entity: 'industries', entityId: industryId, performedBy: actor.id });
    return ok(`Industry ${status}`);
  }

  const collegeDeleteMatch = pathname.match(/^\/api\/colleges\/([^/]+)$/);
  if (collegeDeleteMatch && request.method === 'DELETE') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const result = await env.DB.prepare("UPDATE colleges SET is_active = 0, status = 'rejected', updated_at = datetime('now') WHERE id = ?")
      .bind(collegeDeleteMatch[1]).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'College not found');
    await insertAuditLog(env, { action: 'DELETE', entity: 'colleges', entityId: collegeDeleteMatch[1], performedBy: actor.id });
    return ok('College deleted');
  }

  const industryDeleteMatch = pathname.match(/^\/api\/industries\/([^/]+)$/);
  if (industryDeleteMatch && request.method === 'DELETE') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const result = await env.DB.prepare("UPDATE industries SET is_active = 0, status = 'rejected', updated_at = datetime('now') WHERE id = ?")
      .bind(industryDeleteMatch[1]).run();
    if ((result.meta.changes ?? 0) === 0) return errorResponse(404, 'IPO not found');
    await insertAuditLog(env, { action: 'DELETE', entity: 'industries', entityId: industryDeleteMatch[1], performedBy: actor.id });
    return ok('IPO deleted');
  }

  if (request.method === 'GET' && pathname === '/api/dashboard/metrics') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const [collegeCount, industryCount, departmentCount, internshipCount, pendingApprovals, activeInternships] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) AS count FROM colleges').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM industries').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM departments').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) AS count FROM internships').first<{ count: number }>(),
      env.DB.prepare("SELECT (SELECT COUNT(*) FROM colleges WHERE status = 'pending') + (SELECT COUNT(*) FROM industries WHERE status = 'pending') AS count").first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM internships WHERE status IN ('OPEN', 'PUBLISHED', 'ACTIVE')").first<{ count: number }>(),
    ]);
    return ok('Dashboard metrics fetched', {
      totalColleges: Number(collegeCount?.count ?? 0),
      totalIndustries: Number(industryCount?.count ?? 0),
      totalDepartments: Number(departmentCount?.count ?? 0),
      totalInternships: Number(internshipCount?.count ?? 0),
      pendingApprovals: Number(pendingApprovals?.count ?? 0),
      activeInternships: Number(activeInternships?.count ?? 0),
    });
  }

  if (request.method === 'GET' && pathname === '/api/logs') {
    const actor = requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
    if (actor instanceof Response) return actor;
    const rows = await env.DB.prepare(
      `SELECT id, action, entity, entity_id, performed_by, timestamp
       FROM logs
       ORDER BY datetime(timestamp) DESC
       LIMIT 500`,
    ).all();
    return ok('Logs fetched', rows.results ?? []);
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

async function generateApprovalLetter(
  env: EnvBindings,
  internshipId: string,
  actor: AuthSession['user'],
  studentId?: string | null,
): Promise<void> {
  await generateDocument(env, {
    type: 'approval',
    internshipId,
    studentId: studentId ?? undefined,
    actor,
  });
}

async function generateAcceptanceLetter(
  env: EnvBindings,
  internshipId: string,
  actor: AuthSession['user'],
  studentId?: string | null,
): Promise<void> {
  await generateDocument(env, {
    type: 'reply',
    internshipId,
    studentId: studentId ?? undefined,
    actor,
  });
}

async function syncInternshipVacancy(env: EnvBindings, internshipId: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE internships
     SET filled_vacancy = (
           SELECT COUNT(*)
           FROM internship_applications ia
           WHERE ia.internship_id = internships.id
             AND lower(ia.status) IN ('pending', 'accepted')
         ),
         available_vacancy = MAX(total_vacancy - (
           SELECT COUNT(*)
           FROM internship_applications ia
           WHERE ia.internship_id = internships.id
             AND lower(ia.status) IN ('pending', 'accepted')
         ), 0),
         remaining_vacancy = MAX(total_vacancy - (
           SELECT COUNT(*)
           FROM internship_applications ia
           WHERE ia.internship_id = internships.id
             AND lower(ia.status) IN ('pending', 'accepted')
         ), 0),
         status = CASE
           WHEN total_vacancy > 0 AND (
             total_vacancy - (
               SELECT COUNT(*)
               FROM internship_applications ia
               WHERE ia.internship_id = internships.id
                 AND lower(ia.status) IN ('pending', 'accepted')
             )
           ) <= 0 THEN 'FULL'
           WHEN status = 'FULL' THEN 'PUBLISHED'
           ELSE status
         END,
         updated_at = datetime('now')
     WHERE id = ?`,
  ).bind(internshipId).run();
}

async function loadStudentDashboard(env: EnvBindings, studentId: string): Promise<Response> {
  const student = await env.DB.prepare(
    `SELECT s.college_id, s.department_id, s.sex, s.name AS student_name, s.university_reg_number, c.name AS college_name
     FROM students s
     LEFT JOIN colleges c ON c.id = s.college_id
     WHERE s.id = ?`,
  ).bind(studentId).first<{ college_id: string; department_id: string; sex: string | null; college_name: string | null; student_name: string | null; university_reg_number: string | null }>();
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
       WHERE i.status IN ('ACCEPTED', 'PUBLISHED') AND COALESCE(i.student_visibility, 0) = 1
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
         AND d.id = ?
         AND i.status IN ('ACCEPTED', 'PUBLISHED')
         AND COALESCE(i.student_visibility, 0) = 1
         AND COALESCE(i.is_external, 0) = 1
         AND COALESCE(i.created_by, 'INDUSTRY') IN ('COLLEGE', 'DEPARTMENT')
         AND (
           COALESCE(i.gender_preference, 'BOTH') = 'BOTH'
           OR (COALESCE(i.gender_preference, 'BOTH') = 'BOYS' AND ? = 'MALE')
           OR (COALESCE(i.gender_preference, 'BOTH') = 'GIRLS' AND ? = 'FEMALE')
         )
       ORDER BY i.created_at DESC`,
    ).bind(student.college_id, student.department_id, student.sex ?? '', student.sex ?? '').all(),
    env.DB.prepare(
      `SELECT i.id, i.title, i.description, COALESCE(ind.name, 'Industry') AS industry_name, COALESCE(i.industry_id, ii.industry_id) AS industry_id, d.id AS department_id, d.name AS department_name, c.name AS college_name, c.id AS college_id,
              COALESCE(i.is_external, 0) AS is_external,
              COALESCE(i.created_by, 'INDUSTRY') AS created_by,
              COALESCE(i.total_vacancy, 0) AS total_vacancy,
              COALESCE(i.filled_vacancy, 0) AS filled_vacancy,
              MAX(COALESCE(i.total_vacancy, 0) - COALESCE(i.filled_vacancy, 0), 0) AS available_vacancy,
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
       WHERE i.status IN ('ACCEPTED', 'PUBLISHED')
         AND COALESCE(i.student_visibility, 0) = 1
         AND (
           COALESCE(i.created_by, 'INDUSTRY') = 'INDUSTRY'
           OR (
             COALESCE(i.created_by, 'INDUSTRY') IN ('COLLEGE', 'DEPARTMENT')
             AND COALESCE(i.is_external, 0) = 1
             AND d.id <> ?
           )
         )
         AND (
           COALESCE(i.gender_preference, 'BOTH') = 'BOTH'
           OR (COALESCE(i.gender_preference, 'BOTH') = 'BOYS' AND ? = 'MALE')
           OR (COALESCE(i.gender_preference, 'BOTH') = 'GIRLS' AND ? = 'FEMALE')
         )
       ORDER BY i.created_at DESC`,
    ).bind(studentId, student.department_id, student.sex ?? '', student.sex ?? '').all(),
    getStudentApplicationEligibility(env, studentId),
  ]);

  const internshipRows = legacyInternships.results ?? [];
  const applicationRows = applications.results ?? [];
  const collegeRows = collegeInternships.results ?? [];
  const externalRows = externalInternships.results ?? [];

  return ok('Student dashboard loaded', {
    studentName: student.student_name ?? 'Student',
    studentUniversityRegNumber: student.university_reg_number ?? '',
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
      const sameDepartment = String(row.department_id ?? '') === String(student.department_id ?? '');
      const externalOnlyBlocked = Number(row.is_external ?? 0) === 1
        && sameDepartment
        && String(row.created_by ?? 'INDUSTRY').toUpperCase() !== 'INDUSTRY';
      const limitReached = eligibility.openApplications >= MAX_ACTIVE_APPLICATIONS || eligibility.activeLock;
      return {
      id: row.id,
      title: row.title,
      description: row.description,
      industryName: row.industry_name,
      industryId: row.industry_id,
      collegeName: row.college_name,
      departmentName: row.department_name,
      totalVacancy: Number(row.total_vacancy ?? 0),
      filledVacancy: Number(row.filled_vacancy ?? 0),
      availableVacancy: Math.max(Number(row.available_vacancy ?? 0), 0),
      applied: Boolean(row.application_id),
      applicationId: row.application_id,
      status: row.application_status ? String(row.application_status).toUpperCase() : undefined,
      industryFeedback: row.industry_feedback ?? null,
      evaluationMarks: row.industry_score === null || row.industry_score === undefined ? null : Number(row.industry_score),
      outcomeMarks: row.outcome_marks === null || row.outcome_marks === undefined ? null : Number(row.outcome_marks),
      isExternal: Number(row.is_external ?? 0) === 1,
      sameCollege,
      sameDepartment,
      eligible: !externalOnlyBlocked && !limitReached,
      eligibilityMessage: externalOnlyBlocked
        ? 'Not available for your department'
        : (limitReached ? 'Application limit reached' : 'Available for your college'),
      };
    }),
    activeApplicationLock: eligibility.activeLock,
    maxSelectableApplications: MAX_ACTIVE_APPLICATIONS,
    canApplyForExternal: !eligibility.activeLock && eligibility.openApplications < MAX_ACTIVE_APPLICATIONS,
    policyNote: 'You can apply to published internships. Department-created external internships are hidden from students of the same department.',
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
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'IPO not found');
    return ok('IPO approved');
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
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'IPO not found');
    return ok('IPO rejected');
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
    if (!result.success || (result.meta.changes ?? 0) === 0) return errorResponse(404, 'IPO not found');
    return ok('IPO updated');
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

function isPasswordMatch(inputPassword: string, storedPassword: string): boolean {
  const normalizedInput = String(inputPassword ?? '');
  const normalizedStored = String(storedPassword ?? '');
  const looksHashed = /^\$2[aby]\$\d{2}\$/.test(normalizedStored);

  if (looksHashed) {
    console.warn('[AUTH] bcrypt hash detected but bcrypt is not configured in this runtime; using plain-text fallback compare only.');
  }

  return normalizedInput === normalizedStored;
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
       FROM colleges WHERE lower(coordinator_email) = lower(?)`,
    )
      .bind(email)
      .first<{ id: string; email: string; password: string; status: string; is_active: number }>();

    if (!row || !isPasswordMatch(password, row.password)) return unauthorized('Invalid credentials');
    if (row.status !== 'approved' || Number(row.is_active) !== 1) return forbidden('Waiting for approval');

    return ok('Login successful', createSession({ id: row.id, email: row.email, role: 'COLLEGE' }));
  }

  if (entity === 'industry') {
    const row = await env.DB.prepare('SELECT id, email, password, status, is_active FROM industries WHERE lower(email) = lower(?)')
      .bind(email)
      .first<{ id: string; email: string; password: string; status: string; is_active: number }>();

    if (!row || !isPasswordMatch(password, row.password)) return unauthorized('Invalid credentials');
    if (row.status !== 'approved' || Number(row.is_active) !== 1) return forbidden('Waiting for approval');

    return ok('Login successful', createSession({ id: row.id, email: row.email, role: 'INDUSTRY' }));
  }

  const row = await env.DB.prepare('SELECT id, email, password, is_active FROM students WHERE lower(email) = lower(?)')
    .bind(email)
    .first<{ id: string; email: string; password: string; is_active: number }>();

  if (!row || !isPasswordMatch(password, row.password)) return unauthorized('Invalid credentials');
  if (Number(row.is_active) !== 1) return forbidden('Account inactive');

  return ok('Login successful', createSession({ id: row.id, email: row.email, role: 'STUDENT' }));
}

async function handleCollegeRegistration(body: JsonMap, env: EnvBindings): Promise<Response> {
  console.log('[COLLEGE_REGISTER] req.body:', body);
  const payload = parseCollegeRegistrationPayload(body);
  if (payload instanceof Response) return payload;
  await ensureCollegeRegistrationSchema(env);

  const existing = await env.DB.prepare('SELECT id FROM colleges WHERE coordinator_email = ?').bind(payload.email).first();
  if (existing) return conflict('College coordinator email already exists');

  const collegeId = crypto.randomUUID();
  try {
    await env.DB.prepare(
      `INSERT INTO colleges (id, name, address, university, mobile, coordinator_name, coordinator_email, password, status, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
    )
      .bind(collegeId, payload.collegeName, payload.address, payload.university, payload.mobile, payload.coordinatorName, payload.email, payload.password)
      .run();
  } catch (error) {
    console.error('[COLLEGE_REGISTER] Prisma/DB error:', error);
    throw error;
  }

  await upsertIdentity(env, { role: 'college', entityId: collegeId, email: payload.email, isActive: 1 });
  return created('College registration submitted', { id: collegeId, status: 'pending' });
}

async function handleIndustryRegistration(body: JsonMap, env: EnvBindings): Promise<Response> {
  const name = required(body, ['name', 'companyName']);
  const email = normalizeEmail(required(body, ['email']));
  const password = required(body, ['password']);
  const businessActivity = required(body, ['business_activity', 'businessActivity']);
  const industryTypeId = required(body, ['ipo_type_id', 'industry_type_id', 'ipoTypeId', 'industryTypeId']);

  if (!name || !email || !password || !businessActivity || !industryTypeId) {
    return badRequest('name, email, password, business_activity, ipo_type_id are required');
  }

  const [existingIndustry, type] = await Promise.all([
    env.DB.prepare('SELECT id FROM industries WHERE email = ?').bind(email).first(),
    env.DB.prepare('SELECT id FROM industry_types WHERE id = ? AND is_active = 1').bind(industryTypeId).first(),
  ]);

  if (existingIndustry) return conflict('Industry email already exists');
  if (!type) return badRequest('Invalid ipo_type_id');

  const industryId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO industries (id, name, email, business_activity, industry_type_id, password, status, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)`,
  )
    .bind(industryId, name, email, businessActivity, industryTypeId, password)
    .run();

  await upsertIdentity(env, { role: 'industry', entityId: industryId, email, isActive: 1 });
  return created('IPO registration submitted', { id: industryId, status: 'pending' });
}

async function handleStudentRegistration(body: JsonMap, env: EnvBindings): Promise<Response> {
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

  if (!name || !email || !password) return badRequest('Missing required fields');

  const existing = await env.DB.prepare('SELECT id FROM students WHERE email = ?').bind(email).first();
  if (existing) return conflict('Student email already exists');

  if (collegeId) {
    const college = await env.DB.prepare("SELECT id, status, is_active FROM colleges WHERE id = ?").bind(collegeId).first<{ id: string; status: string; is_active: number }>();
    if (!college) return badRequest('Invalid college_id');
    if (college.status !== 'approved' || Number(college.is_active) !== 1) return forbidden('Waiting for approval');
  }

  if (departmentId) {
    const department = await env.DB.prepare('SELECT id, college_id FROM departments WHERE id = ?').bind(departmentId).first<{ id: string; college_id: string }>();
    if (!department) return badRequest('Invalid department_id');
    if (collegeId && department.college_id !== collegeId) return badRequest('department_id does not belong to selected college');
  }

  if (programId) {
    const program = await env.DB.prepare('SELECT id, department_id FROM programs WHERE id = ?').bind(programId).first<{ id: string; department_id: string }>();
    if (!program) return badRequest('Invalid program_id');
    if (departmentId && program.department_id !== departmentId) return badRequest('program_id does not belong to selected department');
  }

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

type AccountLookup = { id: string; type: string; table: 'students' | 'external_students' | 'departments' | 'colleges' | 'industries' };

async function findAccountByEmail(env: EnvBindings, email: string): Promise<AccountLookup | null> {
  const student = await env.DB.prepare('SELECT id FROM students WHERE lower(email) = lower(?)').bind(email).first<{ id: string }>();
  if (student) return { id: student.id, type: 'STUDENT', table: 'students' };

  const externalStudent = await env.DB.prepare('SELECT id FROM external_students WHERE lower(email) = lower(?)').bind(email).first<{ id: string }>();
  if (externalStudent) return { id: externalStudent.id, type: 'EXTERNAL_STUDENT', table: 'external_students' };

  const department = await env.DB.prepare('SELECT id FROM departments WHERE lower(coordinator_email) = lower(?)').bind(email).first<{ id: string }>();
  if (department) return { id: department.id, type: 'DEPARTMENT_COORDINATOR', table: 'departments' };

  const college = await env.DB.prepare('SELECT id FROM colleges WHERE lower(coordinator_email) = lower(?)').bind(email).first<{ id: string }>();
  if (college) return { id: college.id, type: 'COLLEGE_COORDINATOR', table: 'colleges' };

  const industry = await env.DB.prepare('SELECT id FROM industries WHERE lower(email) = lower(?)').bind(email).first<{ id: string }>();
  if (industry) return { id: industry.id, type: 'IPO', table: 'industries' };

  return null;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] ?? '*'}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

async function unifiedLogin(request: Request, env: EnvBindings) {
  const body = await readBody(request);

  const email = normalizeEmail(required(body, ['email']));
  const password = required(body, ['password']);
  console.log('[AUTH] Login attempt email:', email || '<missing>');

  if (!email || !password) return badRequest('email and password are required');

  const department = await env.DB.prepare(
    'SELECT id, coordinator_email, password, temporary_password, is_active, is_first_login FROM departments WHERE lower(coordinator_email) = lower(?)',
  )
    .bind(email)
    .first<{ id: string; coordinator_email: string; password: string; temporary_password: string | null; is_active: number; is_first_login: number }>();
  console.log('[AUTH] Department user exists:', Boolean(department));
  if (department) {
    // TODO(security): migrate all stored passwords to bcrypt hashes and compare with bcrypt.compare.
    const effectivePassword = Number(department.is_first_login) === 1
      ? String(department.temporary_password ?? department.password ?? '')
      : String(department.password ?? '');
    const isMatch = isPasswordMatch(password, effectivePassword);
    console.log('[AUTH] Department password match:', isMatch);
    if (!isMatch) return unauthorized('Invalid email or password');
    if (Number(department.is_active) !== 1) return forbidden('Department account inactive');
    return ok('Login successful', {
      ...createSession({ id: department.id, email: department.coordinator_email, role: 'DEPARTMENT_COORDINATOR' }),
      mustChangePassword: Number(department.is_first_login) === 1,
    });
  }

  const college = await env.DB.prepare('SELECT id, coordinator_email AS email, password, status, is_active FROM colleges WHERE lower(coordinator_email) = lower(?)')
    .bind(email)
    .first<{ id: string; email: string; password: string; status: string; is_active: number }>();
  console.log('[AUTH] College user exists:', Boolean(college));
  if (college) {
    // TODO(security): migrate all stored passwords to bcrypt hashes and compare with bcrypt.compare.
    const isMatch = isPasswordMatch(password, college.password);
    console.log('[AUTH] College password match:', isMatch);
    if (!isMatch) return unauthorized('Invalid email or password');
    const status = { status: college.status, is_active: college.is_active };
    if (status?.status !== 'approved' || Number(status?.is_active) !== 1) return forbidden('Waiting for approval');
    return ok('Login successful', createSession({ id: college.id, email: college.email, role: 'COLLEGE' }));
  }

  const industry = await env.DB.prepare('SELECT id, email, password, status, is_active FROM industries WHERE lower(email) = lower(?)')
    .bind(email)
    .first<{ id: string; email: string; password: string; status: string; is_active: number }>();
  console.log('[AUTH] Industry user exists:', Boolean(industry));
  if (industry) {
    // TODO(security): migrate all stored passwords to bcrypt hashes and compare with bcrypt.compare.
    const isMatch = isPasswordMatch(password, industry.password);
    console.log('[AUTH] Industry password match:', isMatch);
    if (!isMatch) return unauthorized('Invalid email or password');
    if (industry.status !== 'approved' || Number(industry.is_active) !== 1) return forbidden('Waiting for approval');
    return ok('Login successful', createSession({ id: industry.id, email: industry.email, role: 'INDUSTRY' }));
  }

  const student = await env.DB.prepare('SELECT id, email, password, is_active FROM students WHERE lower(email) = lower(?)')
    .bind(email)
    .first<{ id: string; email: string; password: string; is_active: number }>();
  console.log('[AUTH] Student user exists:', Boolean(student));
  if (student) {
    // TODO(security): migrate all stored passwords to bcrypt hashes and compare with bcrypt.compare.
    const isMatch = isPasswordMatch(password, student.password);
    console.log('[AUTH] Student password match:', isMatch);
    if (!isMatch) return unauthorized('Invalid email or password');
    if (Number(student.is_active) !== 1) return forbidden('Account inactive');
    return ok('Login successful', createSession({ id: student.id, email: student.email, role: 'STUDENT' }));
  }

  const externalStudent = await env.DB.prepare('SELECT id, email, password, is_active FROM external_students WHERE lower(email) = lower(?)')
    .bind(email)
    .first<{ id: string; email: string; password: string; is_active: number }>();
  console.log('[AUTH] External student exists:', Boolean(externalStudent));
  if (externalStudent) {
    // TODO(security): migrate all stored passwords to bcrypt hashes and compare with bcrypt.compare.
    const isMatch = isPasswordMatch(password, externalStudent.password);
    console.log('[AUTH] External password match:', isMatch);
    if (!isMatch) return unauthorized('Invalid credentials');
    if (Number(externalStudent.is_active) !== 1) return forbidden('Account inactive');
    return ok('Login successful', createSession({ id: externalStudent.id, email: externalStudent.email, role: 'EXTERNAL_STUDENT' }));
  }

  const user = await env.DB.prepare('SELECT id, email, password_hash, role, is_active FROM users WHERE lower(email) = lower(?)')
    .bind(email)
    .first<{ id: string; email: string; password_hash: string; role: string; is_active: number }>();
  console.log('[AUTH] Prisma-compatible users row exists:', Boolean(user));

  if (!user) {
    return unauthorized('User not found');
  }

  if (!isPasswordMatch(password, user.password_hash)) {
    return unauthorized('Invalid credentials');
  }

  if (Number(user.is_active) !== 1) return forbidden('Account inactive');

  return ok('Login successful', createSession({ id: user.id, email: user.email, role: String(user.role || 'STUDENT').toUpperCase() as AuthSession['user']['role'] }));
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

async function ensureSuperAdminControlSchema(env: EnvBindings): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS industry_subtypes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry_type_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (industry_type_id) REFERENCES industry_types(id) ON DELETE CASCADE,
      UNIQUE (industry_type_id, name)
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ).run();

  const industryColumns = new Set((await getTableColumns(env, 'industries')).map((column) => column.name));
  if (!industryColumns.has('industry_subtype_id')) {
    await env.DB.prepare('ALTER TABLE industries ADD COLUMN industry_subtype_id TEXT').run();
  }

  await Promise.all([
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_industry_subtypes_type ON industry_subtypes(industry_type_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_logs_entity ON logs(entity, timestamp)').run(),
  ]);
}

async function insertAuditLog(
  env: EnvBindings,
  payload: { action: string; entity: string; entityId: string; performedBy: string },
): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO logs (id, action, entity, entity_id, performed_by, timestamp) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
  ).bind(crypto.randomUUID(), payload.action, payload.entity, payload.entityId, payload.performedBy).run();
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

  if (!names.has('temporary_password')) {
    await env.DB.prepare('ALTER TABLE departments ADD COLUMN temporary_password TEXT').run();
    await env.DB.prepare(
      "UPDATE departments SET temporary_password = password WHERE is_first_login = 1 AND (temporary_password IS NULL OR temporary_password = '')",
    ).run();
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
  if (!internshipColumns.has('ipo_id')) await env.DB.prepare('ALTER TABLE internships ADD COLUMN ipo_id TEXT').run();
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
    `CREATE TABLE IF NOT EXISTS feedbacks (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      internship_id TEXT NOT NULL,
      ipo_id TEXT NOT NULL,
      rating REAL NOT NULL,
      comments TEXT,
      skills_assessed TEXT,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
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
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ).run();
  const evaluationsColumns = new Set((await getTableColumns(env, 'evaluations')).map((column) => column.name));
  if (!evaluationsColumns.has('student_id')) await env.DB.prepare('ALTER TABLE evaluations ADD COLUMN student_id TEXT').run();
  if (!evaluationsColumns.has('internship_id')) await env.DB.prepare('ALTER TABLE evaluations ADD COLUMN internship_id TEXT').run();
  if (!evaluationsColumns.has('attendance_marks')) await env.DB.prepare('ALTER TABLE evaluations ADD COLUMN attendance_marks REAL NOT NULL DEFAULT 0').run();
  if (!evaluationsColumns.has('skill_marks')) await env.DB.prepare('ALTER TABLE evaluations ADD COLUMN skill_marks REAL NOT NULL DEFAULT 0').run();
  if (!evaluationsColumns.has('report_marks')) await env.DB.prepare('ALTER TABLE evaluations ADD COLUMN report_marks REAL NOT NULL DEFAULT 0').run();
  if (!evaluationsColumns.has('viva_marks')) await env.DB.prepare('ALTER TABLE evaluations ADD COLUMN viva_marks REAL NOT NULL DEFAULT 0').run();
  if (!evaluationsColumns.has('discipline_marks')) await env.DB.prepare('ALTER TABLE evaluations ADD COLUMN discipline_marks REAL NOT NULL DEFAULT 0').run();
  if (!evaluationsColumns.has('total')) await env.DB.prepare('ALTER TABLE evaluations ADD COLUMN total REAL NOT NULL DEFAULT 0').run();
  if (!evaluationsColumns.has('grade')) await env.DB.prepare("ALTER TABLE evaluations ADD COLUMN grade TEXT NOT NULL DEFAULT 'F'").run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS outcomes (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      internship_id TEXT NOT NULL,
      po1_score REAL NOT NULL DEFAULT 0,
      po2_score REAL NOT NULL DEFAULT 0,
      po3_score REAL NOT NULL DEFAULT 0,
      po4_score REAL NOT NULL DEFAULT 0,
      attainment_level TEXT NOT NULL DEFAULT 'Low' CHECK (attainment_level IN ('Low', 'Medium', 'High')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
      UNIQUE(student_id, internship_id)
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
  if (!industryColumns.has('supervisor_name')) await env.DB.prepare('ALTER TABLE industries ADD COLUMN supervisor_name TEXT').run();

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
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_feedbacks_student_internship ON feedbacks(student_id, internship_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_evaluations_student_internship ON evaluations(student_id, internship_id)').run(),
    env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluations_student_internship_unique ON evaluations(student_id, internship_id)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_outcomes_student_internship ON outcomes(student_id, internship_id)').run(),
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
    `CREATE TABLE IF NOT EXISTS internship_performance_feedback (
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
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_perf_feedback_industry ON internship_performance_feedback(industry_id, feedback_date)').run(),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_perf_feedback_internship ON internship_performance_feedback(internship_id)').run(),
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
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS department_documents (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      internship_id TEXT NOT NULL,
      student_id TEXT,
      type TEXT NOT NULL CHECK (type IN ('approval', 'reply', 'allotment', 'feedback')),
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      file_url TEXT NOT NULL,
      generated_by TEXT NOT NULL DEFAULT 'system',
      content_hash TEXT NOT NULL,
      metadata_json TEXT,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
      FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE
    )`,
  ).run();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO department_documents (id, department_id, internship_id, student_id, type, generated_at, file_url, generated_by, content_hash, metadata_json)
     SELECT d.id, i.department_id, d.internship_id, d.student_id, d.type, d.generated_at, d.file_url, d.generated_by, d.content_hash, d.metadata_json
     FROM documents d
     INNER JOIN internships i ON i.id = d.internship_id
     WHERE i.department_id IS NOT NULL`,
  ).run();
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
    referenceNo: generateReferenceNumber(),
    issuedDate: generatedAt.slice(0, 10),
    place: 'Tirurangadi',
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
  const internshipDepartment = await env.DB.prepare('SELECT department_id FROM internships WHERE id = ?').bind(params.internshipId).first<{ department_id: string | null }>();
  if (internshipDepartment?.department_id) {
    await env.DB.prepare(
      `INSERT INTO department_documents (id, department_id, internship_id, student_id, type, generated_at, file_url, generated_by, content_hash, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'system', ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         department_id = excluded.department_id,
         internship_id = excluded.internship_id,
         student_id = excluded.student_id,
         type = excluded.type,
         generated_at = excluded.generated_at,
         file_url = excluded.file_url,
         generated_by = 'system',
         content_hash = excluded.content_hash,
         metadata_json = excluded.metadata_json`,
    ).bind(id, internshipDepartment.department_id, params.internshipId, params.studentId ?? null, params.type, generatedAt, fileUrl, contentHash, metadataJson).run();
  }
  return { id, internshipId: params.internshipId, studentId: params.studentId ?? null, type: params.type, generatedAt, fileUrl, generatedBy: 'system', regenerated: true };
}

async function buildDocumentData(
  env: EnvBindings,
  params: { type: DocumentType; internshipId: string; studentId?: string; actor: { id: string; role: AuthSession['user']['role'] }; supervisorName?: string; supervisorDesignation?: string; documentMeta?: { referenceNo?: string; issuedDate?: string; place?: string } },
) {
  const internship = await env.DB.prepare(
    `SELECT i.id, i.title, i.duration, i.internship_category, i.created_at, i.updated_at, i.department_id, i.industry_id,
            i.programme, i.mapped_po, i.mapped_pso, i.mapped_co,
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
  const feedbackForm = params.studentId
    ? await env.DB.prepare(
      `SELECT * FROM internship_performance_feedback
       WHERE internship_id = ? AND (student_id = ? OR external_student_id = ?)
       ORDER BY updated_at DESC LIMIT 1`,
    ).bind(params.internshipId, params.studentId, params.studentId).first<any>()
    : null;
  return {
    internship,
    student,
    app,
    feedbackForm,
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
    documentMeta: params.documentMeta ?? null,
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
    documentMeta: {
      referenceNo: metadata.referenceNo ?? undefined,
      issuedDate: metadata.issuedDate ?? undefined,
      place: metadata.place ?? undefined,
    },
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
  const plainLines = payload.html.replace(/<[^>]+>/g, '\n').split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 120);
  const pdfBytes = buildSimplePdf(plainLines);
  return new Response(pdfBytes.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${payload.type}-${payload.internshipId}-${payload.studentId ?? 'na'}.pdf"`,
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
      name: `${payload.type}-${payload.internshipId}-${payload.studentId ?? 'na'}.pdf`,
      content: buildSimplePdf(payload.html.replace(/<[^>]+>/g, '\n').split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 120)),
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
    return row.student_id === actor.id && ['approval', 'reply', 'allotment', 'feedback'].includes(String(row.type));
  }
  return false;
}

async function listDocumentsForActor(env: EnvBindings, actor: { id: string; role: AuthSession['user']['role'] }) {
  if (actor.role === 'STUDENT') {
    const rows = await env.DB.prepare(
      `SELECT id, internship_id, student_id, type, generated_at, file_url, generated_by
       FROM documents WHERE student_id = ? AND type IN ('approval', 'reply', 'allotment', 'feedback')
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
      `SELECT id, internship_id, student_id, type, generated_at, file_url, generated_by
       FROM department_documents
       WHERE department_id = ?
       ORDER BY generated_at DESC`,
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
  const referenceNo = escapeHtml(data.documentMeta?.referenceNo ?? generateReferenceNumber());
  const issuedDate = escapeHtml(data.documentMeta?.issuedDate ?? new Date().toISOString().slice(0, 10));
  const place = escapeHtml(data.documentMeta?.place ?? 'Tirurangadi');
  const programme = escapeHtml(data.internship.programme ?? data.internship.department_name ?? '-');
  const mappedPO = escapeHtml(data.internship.mapped_po ?? '-');
  const mappedPSO = escapeHtml(data.internship.mapped_pso ?? '-');
  const mappedCO = escapeHtml(data.internship.mapped_co ?? '-');
  if (type === 'approval') {
    return base.replace('{{BODY}}', `<h1>DEPARTMENT OF ${escapeHtml(data.internship.department_name)}</h1>
      <h2>INTERNSHIP APPROVAL LETTER</h2>
      <p>Ref No: ${referenceNo} &nbsp;&nbsp;&nbsp; Date: ${issuedDate}</p>
      <p><strong>To</strong><br/>The Manager / Authorized Signatory<br/>${escapeHtml(data.internship.industry_name)}</p>
      <p><strong>Subject:</strong> Approval of Internship Proposal-reg.</p>
      <p>This is to inform that the Department of ${escapeHtml(data.internship.department_name)}, ${escapeHtml(data.internship.college_name)}, has reviewed and approved the internship proposal in collaboration with your organization.</p>
      <p>The internship titled “${escapeHtml(data.internship.title)}” is aligned with the prescribed Programme Outcomes (PO), Programme Specific Outcomes (PSO), and Course Outcomes (CO).</p>
      <ul>
        <li>Department: ${escapeHtml(data.internship.department_name)}</li>
        <li>Programme: ${programme}</li>
        <li>Duration: ${period} hours</li>
        <li>Mode: Offline</li>
        <li>Mapped POs: ${mappedPO}</li>
        <li>Mapped PSOs: ${mappedPSO}</li>
        <li>Mapped COs: ${mappedCO}</li>
        <li>Assigned Supervisor: ${escapeHtml(data.supervisorName ?? 'Not specified')}</li>
        <li>Name of Student: ${escapeHtml(data.student?.name ?? '-')}</li>
        <li>University Reg. No.: ${escapeHtml(data.student?.university_reg_number ?? '-')}</li>
      </ul>
      <p>You are requested to facilitate the internship and assign a supervisor for monitoring the student.</p>
      <div style="page-break-before: always;"></div>
      <h1>DEPARTMENT OF ${escapeHtml(data.internship.department_name)}</h1>
      <h2>STUDENT INTERNSHIP ALLOTMENT LETTER</h2>
      <p>Ref No: ${referenceNo} &nbsp;&nbsp;&nbsp; Date: ${issuedDate}</p>
      <p>To ${escapeHtml(data.student?.name ?? '-')}<br/>Register No: ${escapeHtml(data.student?.university_reg_number ?? '-')}<br/>Programme: ${programme}</p>
      <p>You are hereby allotted to undergo internship at ${escapeHtml(data.internship.industry_name)}. Duration: ${period} hours.</p>`);
  }
  if (type === 'reply') {
    return base.replace('{{BODY}}', `<h1>Acceptance / Invitation Letter</h1>
      <p>Ref No: ${referenceNo} &nbsp;&nbsp;&nbsp; Date: ${issuedDate}</p>
      <p>To<br/>The Head of the Department<br/>Department of ${escapeHtml(data.internship.department_name)}<br/>${escapeHtml(data.internship.college_name)}<br/>Affiliated to University of Calicut<br/>${place}</p>
      <p><strong>Subject:</strong> Acceptance of Internship Proposal and Student Invitation-reg.</p>
      <p>With reference to your Internship Approval Letter, we are pleased to inform you that our organization has accepted the internship proposal titled: “${escapeHtml(data.internship.title)}”.</p>
      <ul>
        <li>Department: ${escapeHtml(data.internship.department_name)}</li>
        <li>Programme: ${programme}</li>
        <li>Mode: Offline</li>
        <li>Duration: ${period} hours</li>
        <li>Internship Type: ${escapeHtml(data.internship.internship_category ?? 'FREE')}</li>
      </ul>
      <p><strong>Student Details</strong><br/>Name: ${escapeHtml(data.student?.name ?? '-')}<br/>University Register No.: ${escapeHtml(data.student?.university_reg_number ?? '-')}</p>
      <p><strong>Supervisor Details (IPO)</strong><br/>Name: ${escapeHtml(data.supervisorName ?? '-')}<br/>Designation: ${escapeHtml(data.supervisorDesignation ?? '-')}</p>`);
  }
  if (type === 'allotment') {
    return base.replace('{{BODY}}', `<h1>Student Internship Allotment Letter</h1>
      <p>Ref No: ${referenceNo} &nbsp;&nbsp;&nbsp; Date: ${issuedDate}</p>
      <p>Student Name: ${escapeHtml(data.student?.name ?? '-')}</p>
      <p>Register Number: ${escapeHtml(data.student?.university_reg_number ?? '-')}</p>
      <p>Programme: ${programme}</p>
      <p>Organization: ${escapeHtml(data.internship.industry_name)}</p>
      <p>Duration: ${period}</p>
      <p>Period: ${period}</p>
      <p><strong>You are required to:</strong></p>
      <ul><li>Maintain a Work Register (daily log)</li><li>Follow discipline and ethical standards</li><li>Submit Internship Report after completion</li></ul>
      <p>Your performance will be evaluated based on attendance, work register, report and viva.</p>`);
  }
  return base.replace('{{BODY}}', `<h1>Performance Feedback Form (Industry)</h1>
    <h2>INTERNSHIP PERFORMANCE FEEDBACK FORM</h2>
    <p><strong>Student Name:</strong> ${escapeHtml(data.feedbackForm?.student_name ?? data.student?.name ?? '-')}</p>
    <p><strong>Register Number:</strong> ${escapeHtml(data.feedbackForm?.register_number ?? data.student?.university_reg_number ?? '-')}</p>
    <p><strong>Organization:</strong> ${escapeHtml(data.feedbackForm?.organization ?? data.internship.industry_name ?? '-')}</p>
    <p><strong>Duration:</strong> ${escapeHtml(data.feedbackForm?.duration ?? data.internship.duration ?? '-')}</p>
    <p><strong>Supervisor Name:</strong> ${escapeHtml(data.feedbackForm?.supervisor_name ?? '-')}</p>
    <h3>A. Weekly / Final Evaluation</h3>
    <ul>
      <li>Attendance & Punctuality: ${escapeHtml(String(data.feedbackForm?.attendance_punctuality ?? '-'))}/5</li>
      <li>Technical Skills: ${escapeHtml(String(data.feedbackForm?.technical_skills ?? '-'))}/5</li>
      <li>Problem Solving Ability: ${escapeHtml(String(data.feedbackForm?.problem_solving_ability ?? '-'))}/5</li>
      <li>Communication Skills: ${escapeHtml(String(data.feedbackForm?.communication_skills ?? '-'))}/5</li>
      <li>Teamwork: ${escapeHtml(String(data.feedbackForm?.teamwork ?? '-'))}/5</li>
      <li>Professional Ethics: ${escapeHtml(String(data.feedbackForm?.professional_ethics ?? '-'))}/5</li>
    </ul>
    <h3>B. Overall Performance</h3>
    <p>${escapeHtml(data.feedbackForm?.overall_performance ?? '-')}</p>
    <h3>C. Remarks</h3>
    <p>${escapeHtml(data.feedbackForm?.remarks ?? '-')}</p>
    <h3>D. Recommendation</h3>
    <p>${escapeHtml(data.feedbackForm?.recommendation ?? '-')}</p>
    <p><strong>Supervisor Signature:</strong> ${escapeHtml(data.feedbackForm?.supervisor_signature ?? '-')}</p>
    <p><strong>Date:</strong> ${escapeHtml(data.feedbackForm?.feedback_date ?? '-')}</p>`);
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


async function ensureIPOExtensionSchema(env: EnvBindings): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS ipo_connections (
      id TEXT PRIMARY KEY,
      ipo_id TEXT NOT NULL,
      college_id TEXT NOT NULL,
      department_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(ipo_id, college_id, department_id)
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS ipo_suggestions (
      id TEXT PRIMARY KEY,
      ipo_id TEXT NOT NULL,
      college_id TEXT NOT NULL,
      department_id TEXT,
      internship_title TEXT NOT NULL,
      nature_of_work TEXT NOT NULL,
      gender_preference TEXT NOT NULL DEFAULT 'BOTH',
      internship_category TEXT NOT NULL DEFAULT 'FREE',
      duration TEXT NOT NULL,
      vacancy INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ).run();

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS ipo_documents (
      id TEXT PRIMARY KEY,
      ipo_id TEXT NOT NULL,
      internship_id TEXT NOT NULL,
      application_id TEXT,
      document_type TEXT NOT NULL,
      file_url TEXT NOT NULL,
      payload_html TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ).run();
}

async function getTableColumns(env: EnvBindings, tableName: string): Promise<Array<{ name: string }>> {
  const rows = await env.DB.prepare(`PRAGMA table_info(${tableName})`).all<{ name: string }>();
  return rows.results ?? [];
}


function normalizeSessionRole(role: string): AuthSession['user']['role'] | null {
  const normalized = String(role || '').toUpperCase();
  const roleMap: Record<string, AuthSession['user']['role']> = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    COLLEGE: 'COLLEGE_COORDINATOR',
    COORDINATOR: 'COLLEGE_COORDINATOR',
    COLLEGE_ADMIN: 'COLLEGE_COORDINATOR',
    COLLEGE_COORDINATOR: 'COLLEGE_COORDINATOR',
    DEPARTMENT: 'DEPARTMENT_COORDINATOR',
    DEPARTMENT_COORDINATOR: 'DEPARTMENT_COORDINATOR',
    INDUSTRY: 'IPO',
    IPO: 'IPO',
    STUDENT: 'STUDENT',
    EXTERNAL_STUDENT: 'STUDENT',
  };

  return roleMap[normalized] ?? null;
}

function requireRole(request: Request, allowedRoles: string[]) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return unauthorized('Missing authorization token');

  const parsed = parseSessionToken(token);
  if (!parsed) return unauthorized('Invalid token');

  const normalizedAllowedRoles = allowedRoles.map((role) => normalizeSessionRole(role)).filter(Boolean);
  if (!normalizedAllowedRoles.includes(parsed.role)) return forbidden('Insufficient role permissions');

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

    const normalizedRole = normalizeSessionRole(payload.role);
    if (!normalizedRole) return null;

    return {
      id: String(payload.id),
      email: String(payload.email),
      role: normalizedRole,
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

function parseCollegeRegistrationPayload(body: JsonMap): CollegeRegistrationPayload | Response {
  const collegeName = required(body, ['collegeName']);
  const address = optional(body, ['address']);
  const university = optional(body, ['university']);
  const mobile = optional(body, ['mobile']);
  const coordinatorName = required(body, ['coordinatorName']);
  const email = normalizeEmail(required(body, ['email']));
  const password = required(body, ['password']);

  const requiredFields = {
    collegeName,
    address,
    university,
    mobile,
    coordinatorName,
    email,
    password,
  };

  for (const [field, value] of Object.entries(requiredFields)) {
    if (!value || String(value).trim() === '') {
      console.error(`[COLLEGE_REGISTER] Missing field: ${field}`, { body });
      return new Response(JSON.stringify({ success: false, message: `Missing field: ${field}`, error: `Missing field: ${field}` }), {
        status: 400,
        headers: {
          ...CORS_HEADERS,
          ...NO_CACHE_HEADERS,
          'Content-Type': 'application/json',
        },
      });
    }
  }

  return {
    collegeName,
    address,
    university,
    mobile,
    coordinatorName,
    email,
    password,
  };
}

async function ensureCollegeRegistrationSchema(env: EnvBindings): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS colleges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      university TEXT,
      mobile TEXT,
      coordinator_name TEXT NOT NULL,
      coordinator_email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ).run();
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


function buildSimplePdf(lines: string[]): Uint8Array {
  const sanitized = lines.map((line) => line.replace(/[()\\]/g, (char) => `\\${char}`));
  const content = ['BT', '/F1 11 Tf', '50 790 Td'];
  sanitized.forEach((line, index) => {
    if (index > 0) content.push('0 -16 Td');
    content.push(`(${line}) Tj`);
  });
  content.push('ET');
  const stream = content.join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
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
      ...NO_CACHE_HEADERS,
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


export default { fetch: handleLegacyApi };
