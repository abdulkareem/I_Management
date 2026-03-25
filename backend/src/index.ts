import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { SignJWT } from 'jose';

interface EnvBindings {
  DB: D1Database;
  JWT_SECRET: string;
  OTP_SECRET: string;
}

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  created_at: string;
};

const app = new Hono<{ Bindings: EnvBindings }>();

app.use('/api/*', cors());

app.get('/api/health', (c) => c.json(ok('API is healthy', { time: new Date().toISOString() })));

app.post('/api/auth/register', async (c) => {
  const body = await c.req.json<{ name?: string; email?: string; password?: string; role?: string }>().catch(() => ({}));
  const name = (body.name ?? '').trim();
  const email = normalizeEmail(body.email);
  const password = (body.password ?? '').trim();
  const role = (body.role ?? 'STUDENT').trim().toUpperCase();

  if (!name || !email || !password) {
    throw new HTTPException(400, { message: 'Name, email, and password are required.' });
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
  if (existing) {
    throw new HTTPException(409, { message: 'User already exists.' });
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password, c.env.OTP_SECRET);

  await c.env.DB.prepare(
    'INSERT INTO users (id, name, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(id, name, email, passwordHash, role, new Date().toISOString())
    .run();

  const user = { id, name, email, role };
  const token = await signToken(user, c.env.JWT_SECRET);

  return c.json(ok('User registered successfully.', { token, user }), 201);
});

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const password = (body.password ?? '').trim();

  if (!email || !password) {
    throw new HTTPException(400, { message: 'Email and password required.' });
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();

  if (!user) {
    return c.json(fail('Email not found. Please register first.', { shouldRegister: true }), 404);
  }

  const valid = await verifyPassword(password, c.env.OTP_SECRET, user.password);
  if (!valid) {
    throw new HTTPException(401, { message: 'Invalid email or password.' });
  }

  const sessionUser = toSessionUser(user);
  const token = await signToken(sessionUser, c.env.JWT_SECRET);
  return c.json(ok('Login successful.', { token, user: sessionUser }));
});

app.post('/api/admin/send-otp', async (c) => {
  const body = await c.req.json<{ email?: string }>().catch(() => ({}));
  const email = normalizeEmail(body.email);

  if (!email) {
    throw new HTTPException(400, { message: 'Email is required.' });
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    throw new HTTPException(403, { message: 'Admin account not found for this email.' });
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await c.env.DB.prepare('DELETE FROM otp_codes WHERE email = ?').bind(email).run();
  await c.env.DB.prepare('INSERT INTO otp_codes (id, email, otp, expires_at) VALUES (?, ?, ?, ?)')
    .bind(crypto.randomUUID(), email, otp, expiresAt)
    .run();

  console.log(`[OTP-SIMULATION] Send ${otp} to ${email}`);

  return c.json(ok('OTP sent successfully.', { otpSent: true, expiresAt }));
});

app.post('/api/admin/verify-otp', async (c) => {
  const body = await c.req.json<{ email?: string; otp?: string }>().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const otp = (body.otp ?? '').trim();

  if (!email || !otp) {
    throw new HTTPException(400, { message: 'Email and OTP are required.' });
  }

  const otpRow = await c.env.DB.prepare('SELECT * FROM otp_codes WHERE email = ? AND otp = ?')
    .bind(email, otp)
    .first<{ id: string; expires_at: string }>();

  if (!otpRow) {
    throw new HTTPException(401, { message: 'Invalid OTP.' });
  }

  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    await c.env.DB.prepare('DELETE FROM otp_codes WHERE id = ?').bind(otpRow.id).run();
    throw new HTTPException(401, { message: 'OTP expired.' });
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
  if (!user) {
    throw new HTTPException(404, { message: 'Admin account not found.' });
  }

  await c.env.DB.prepare('DELETE FROM otp_codes WHERE id = ?').bind(otpRow.id).run();

  const sessionUser = toSessionUser(user);
  const token = await signToken(sessionUser, c.env.JWT_SECRET);

  return c.json(ok('OTP verified successfully.', { token, user: sessionUser }));
});

app.onError((err, c) => {
  const status = err instanceof HTTPException ? err.status : 500;
  const message = err instanceof HTTPException ? err.message : 'Internal server error.';
  return c.json(fail(message, {}), status);
});

function ok<T>(message: string, data: T): ApiResponse<T> {
  return { success: true, message, data };
}

function fail<T>(message: string, data: T): ApiResponse<T> {
  return { success: false, message, data };
}

function normalizeEmail(email?: string) {
  return (email ?? '').trim().toLowerCase();
}

function toSessionUser(user: UserRow) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function hashPassword(password: string, secret: string) {
  const bytes = new TextEncoder().encode(`${password}:${secret}`);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, secret: string, expectedHash: string) {
  const actual = await hashPassword(password, secret);
  return actual === expectedHash;
}

async function signToken(user: { id: string; email: string; role: string; name?: string }, jwtSecret: string) {
  const secret = new TextEncoder().encode(jwtSecret);
  return new SignJWT(user)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export default app;
