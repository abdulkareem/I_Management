interface EnvBindings {
  DB: D1Database;
}

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type JsonMap = Record<string, unknown>;

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

export default {
  async fetch(request: Request, env: EnvBindings): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: jsonHeaders });
    }

    try {
      if (request.method === 'GET' && url.pathname === '/api/health') {
        return ok('API is healthy', { time: new Date().toISOString() });
      }

      if (request.method === 'GET' && url.pathname === '/api/colleges') {
        const rows = await env.DB.prepare('SELECT id, collegeName FROM colleges ORDER BY collegeName ASC').all<{ id: string; collegeName: string }>();
        return ok('Colleges fetched successfully.', rows.results ?? []);
      }

      if (request.method === 'GET' && url.pathname === '/api/departments') {
        const collegeId = (url.searchParams.get('collegeId') ?? '').trim();
        if (!collegeId) {
          return badRequest('collegeId is required.', { collegeId });
        }

        const rows = await env.DB.prepare('SELECT id, name, collegeId FROM departments WHERE collegeId = ? ORDER BY name ASC')
          .bind(collegeId)
          .all<{ id: string; name: string; collegeId: string }>();

        return ok('Departments fetched successfully.', rows.results ?? []);
      }

      if (request.method === 'GET' && url.pathname === '/api/courses') {
        const departmentId = (url.searchParams.get('departmentId') ?? '').trim();
        if (!departmentId) {
          return badRequest('departmentId is required.', { departmentId });
        }

        const rows = await env.DB.prepare('SELECT id, name, departmentId FROM courses WHERE departmentId = ? ORDER BY name ASC')
          .bind(departmentId)
          .all<{ id: string; name: string; departmentId: string }>();

        return ok('Courses fetched successfully.', rows.results ?? []);
      }

      if (request.method === 'GET' && url.pathname === '/api/industry-types') {
        const rows = await env.DB.prepare('SELECT id, name FROM industry_types ORDER BY name ASC').all<{ id: string; name: string }>();
        return ok('Industry types fetched successfully.', rows.results ?? []);
      }

      if (request.method === 'POST' && url.pathname === '/api/college/register') {
        const body = await parseJsonBody(request);
        console.log('BODY:/api/college/register', body);

        const collegeName = asString(body.collegeName);
        const address = asString(body.address);
        const university = asString(body.university);
        const mobile = asString(body.mobile);
        const coordinatorName = asString(body.coordinatorName);
        const email = normalizeEmail(body.email);
        const password = asString(body.password);

        if (!collegeName || !email || !password) {
          return badRequest('Missing required fields', body);
        }

        const existing = await env.DB.prepare('SELECT id FROM colleges WHERE email = ?').bind(email).first<{ id: string }>();
        if (existing) {
          return conflict('College already exists for this email.', { email });
        }

        await env.DB.prepare(`
          INSERT INTO colleges (id, collegeName, address, university, mobile, coordinatorName, email, password, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(crypto.randomUUID(), collegeName, address, university, mobile, coordinatorName, email, password, 'PENDING')
          .run();

        return ok('College registration submitted.', { success: true });
      }

      if (request.method === 'POST' && url.pathname === '/api/student/register') {
        const body = await parseJsonBody(request);
        console.log('BODY:/api/student/register', body);

        const studentName = asString(body.studentName);
        const email = normalizeEmail(body.email);
        const password = asString(body.password);
        const universityRegNumber = asString(body.universityRegNumber);
        const programme = asString(body.programme);
        const collegeId = asString(body.collegeId);
        const departmentId = asString(body.departmentId);
        const courseId = asString(body.courseId);

        if (!studentName || !email || !password || !universityRegNumber || !programme || !collegeId || !departmentId || !courseId) {
          return badRequest('Missing required fields', body);
        }

        const [existingEmail, college, department, course] = await Promise.all([
          env.DB.prepare('SELECT id FROM students WHERE email = ?').bind(email).first<{ id: string }>(),
          env.DB.prepare('SELECT id FROM colleges WHERE id = ?').bind(collegeId).first<{ id: string }>(),
          env.DB.prepare('SELECT id, collegeId FROM departments WHERE id = ?').bind(departmentId).first<{ id: string; collegeId: string }>(),
          env.DB.prepare('SELECT id, departmentId FROM courses WHERE id = ?').bind(courseId).first<{ id: string; departmentId: string }>(),
        ]);

        if (existingEmail) {
          return conflict('Student already exists for this email.', { email });
        }
        if (!college) {
          return badRequest('Invalid collegeId.', { collegeId });
        }
        if (!department || department.collegeId !== collegeId) {
          return badRequest('Invalid departmentId for selected college.', { collegeId, departmentId });
        }
        if (!course || course.departmentId !== departmentId) {
          return badRequest('Invalid courseId for selected department.', { departmentId, courseId });
        }

        await env.DB.prepare(`
          INSERT INTO students (id, studentName, email, password, universityRegNumber, programme, collegeId, departmentId, courseId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(crypto.randomUUID(), studentName, email, password, universityRegNumber, programme, collegeId, departmentId, courseId)
          .run();

        return ok('Student registered successfully.', { success: true });
      }

      if (request.method === 'POST' && url.pathname === '/api/industry/register') {
        const body = await parseJsonBody(request);
        console.log('BODY:/api/industry/register', body);

        const companyName = asString(body.companyName);
        const email = normalizeEmail(body.email);
        const password = asString(body.password);
        const businessActivity = asString(body.businessActivity);
        const industryTypeId = asString(body.industryTypeId);

        if (!companyName || !email || !password || !businessActivity || !industryTypeId) {
          return badRequest('Missing required fields', body);
        }

        const [existingEmail, industryType] = await Promise.all([
          env.DB.prepare('SELECT id FROM industries WHERE email = ?').bind(email).first<{ id: string }>(),
          env.DB.prepare('SELECT id FROM industry_types WHERE id = ?').bind(industryTypeId).first<{ id: string }>(),
        ]);

        if (existingEmail) {
          return conflict('Industry already exists for this email.', { email });
        }

        if (!industryType) {
          return badRequest('Invalid industryTypeId.', { industryTypeId });
        }

        await env.DB.prepare(`
          INSERT INTO industries (id, companyName, email, password, businessActivity, industryTypeId)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
          .bind(crypto.randomUUID(), companyName, email, password, businessActivity, industryTypeId)
          .run();

        return ok('Industry registered successfully.', { success: true });
      }

      return response(404, fail('Route not found.', { path: url.pathname }));
    } catch (error) {
      console.error('API_ERROR', error);
      return response(500, fail('Internal server error.', { error: error instanceof Error ? error.message : 'Unknown error' }));
    }
  },
};

async function parseJsonBody(request: Request): Promise<JsonMap> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return {};
  }

  const body = (await request.json().catch(() => ({}))) as JsonMap;
  return body ?? {};
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value: unknown) {
  return asString(value).toLowerCase();
}

function ok<T>(message: string, data: T) {
  return response(200, success(message, data));
}

function badRequest(message: string, received: JsonMap | Record<string, string>) {
  return response(400, fail(message, { received }));
}

function conflict(message: string, received: JsonMap | Record<string, string>) {
  return response(409, fail(message, { received }));
}

function response(status: number, body: ApiEnvelope<unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function success<T>(message: string, data: T): ApiEnvelope<T> {
  return { success: true, message, data };
}

function fail<T>(message: string, data: T): ApiEnvelope<T> {
  return { success: false, message, data };
}
