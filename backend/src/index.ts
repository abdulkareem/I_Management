interface EnvBindings {
  DB: D1Database;
  RESEND_API_KEY: string;
}

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type JsonMap = Record<string, unknown>;

type SessionState = {
  token: string;
  user: {
    id: string;
    email: string;
    role: 'SUPER_ADMIN';
  };
};

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

export default {
  async fetch(request: Request, env: EnvBindings): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (err) {
      console.error('GLOBAL_API_ERROR', err);
      return new Response(
        JSON.stringify({
          error: 'SERVER_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
        }),
        { status: 500, headers: jsonHeaders },
      );
    }
  },
};

async function handleRequest(request: Request, env: EnvBindings): Promise<Response> {
  assertBindings(env);

  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: jsonHeaders });
  }

  if (request.method === 'GET' && url.pathname === '/api/health') {
    return ok('API is healthy', { time: new Date().toISOString() });
  }

  if (request.method === 'GET' && url.pathname === '/api/colleges') {
    try {
      const rows = await env.DB.prepare('SELECT id, collegeName FROM colleges ORDER BY collegeName ASC').all<{ id: string; collegeName: string }>();
      return ok('Colleges fetched successfully.', rows.results ?? []);
    } catch (error) {
      return dbError('Failed to fetch colleges.', error);
    }
  }

  if (request.method === 'GET' && url.pathname === '/api/departments') {
    const collegeId = (url.searchParams.get('collegeId') ?? '').trim();
    if (!collegeId) {
      return badRequest('collegeId is required.', { collegeId });
    }

    try {
      const rows = await env.DB.prepare('SELECT id, name, collegeId FROM departments WHERE collegeId = ? ORDER BY name ASC')
        .bind(collegeId)
        .all<{ id: string; name: string; collegeId: string }>();

      return ok('Departments fetched successfully.', rows.results ?? []);
    } catch (error) {
      return dbError('Failed to fetch departments.', error);
    }
  }

  if (request.method === 'GET' && url.pathname === '/api/courses') {
    const departmentId = (url.searchParams.get('departmentId') ?? '').trim();
    if (!departmentId) {
      return badRequest('departmentId is required.', { departmentId });
    }

    try {
      const rows = await env.DB.prepare('SELECT id, name, departmentId FROM courses WHERE departmentId = ? ORDER BY name ASC')
        .bind(departmentId)
        .all<{ id: string; name: string; departmentId: string }>();

      return ok('Courses fetched successfully.', rows.results ?? []);
    } catch (error) {
      return dbError('Failed to fetch courses.', error);
    }
  }

  if (request.method === 'GET' && url.pathname === '/api/industry-types') {
    try {
      const rows = await env.DB.prepare('SELECT id, name FROM industry_types ORDER BY name ASC').all<{ id: string; name: string }>();
      return ok('Industry types fetched successfully.', rows.results ?? []);
    } catch (error) {
      return dbError('Failed to fetch industry types.', error);
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/send-otp') {
    const body = await parseJsonBody(request);
    const email = normalizeEmail(body.email);

    if (!email) {
      return badRequest('email is required.', body);
    }

    try {
      const admin = await env.DB.prepare('SELECT id, email FROM super_admins WHERE email = ?').bind(email).first<{ id: string; email: string }>();
      if (!admin) {
        return response(403, fail('Not authorized as super admin.', { email }));
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000;

      await env.DB.prepare('DELETE FROM otps WHERE email = ?').bind(email).run();
      await env.DB.prepare('INSERT INTO otps (id, email, otp, expiresAt) VALUES (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), email, otp, expiresAt)
        .run();

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@aureliv.in',
          to: email,
          subject: 'Your OTP Code',
          html: `<h2>Your OTP is ${otp}</h2>`,
        }),
      });

      if (!resendResponse.ok) {
        const resendBody = await resendResponse.text();
        throw new Error(`Resend send failed (${resendResponse.status}): ${resendBody}`);
      }

      return ok('OTP sent successfully.', { otpSent: true, expiresAt: new Date(expiresAt).toISOString() });
    } catch (error) {
      return dbError('Failed to send OTP.', error);
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/verify-otp') {
    const body = await parseJsonBody(request);
    const email = normalizeEmail(body.email);
    const otp = asString(body.otp);

    if (!email || !otp) {
      return badRequest('email and otp are required.', body);
    }

    try {
      const record = await env.DB.prepare('SELECT id, expiresAt FROM otps WHERE email = ? AND otp = ? ORDER BY expiresAt DESC LIMIT 1')
        .bind(email, otp)
        .first<{ id: string; expiresAt: number }>();

      if (!record) {
        return response(401, fail('Invalid OTP.', { email }));
      }

      if (Date.now() > Number(record.expiresAt)) {
        await env.DB.prepare('DELETE FROM otps WHERE id = ?').bind(record.id).run();
        return response(401, fail('OTP expired.', { email }));
      }

      await env.DB.prepare('DELETE FROM otps WHERE id = ?').bind(record.id).run();

      const session: SessionState = {
        token: crypto.randomUUID(),
        user: {
          id: '1',
          email,
          role: 'SUPER_ADMIN',
        },
      };

      return ok('OTP verified successfully.', session);
    } catch (error) {
      return dbError('Failed to verify OTP.', error);
    }
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

    try {
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
    } catch (error) {
      return dbError('Failed college registration.', error);
    }
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

    try {
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
    } catch (error) {
      return dbError('Failed student registration.', error);
    }
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

    try {
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
    } catch (error) {
      return dbError('Failed industry registration.', error);
    }
  }

  return response(404, fail('Route not found.', { path: url.pathname }));
}

function assertBindings(env: EnvBindings) {
  if (!env.DB) throw new Error('DB NOT BOUND');
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');
}

async function parseJsonBody(request: Request): Promise<JsonMap> {
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

function dbError(message: string, error: unknown) {
  console.error('DB_ERROR', error);
  return response(500, fail(message, { error: error instanceof Error ? error.message : 'Unknown error' }));
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
