import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import { z } from 'zod';
import { randomInt } from 'crypto';

const prisma = new PrismaClient();
const app = express();
const ADMIN_OTP_TTL_MS = 10 * 60 * 1000;
const DEFAULT_SUPER_ADMIN_EMAIL = 'abdulkareem@psmocollege.ac.in';
const adminOtpStore = new Map<string, { otp: string; expiresAt: number }>();

const allowedOrigins = (process.env.CORS_ORIGIN ?? process.env.FRONTEND_URL ?? '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins.includes('*') ? true : allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const studentRegistrationSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  universityRegNumber: z.string().trim().min(2),
  sex: z.enum(['MALE', 'FEMALE']).optional(),
  collegeId: z.string().trim().optional().nullable(),
  departmentId: z.string().trim().optional().nullable(),
  programId: z.string().trim().optional().nullable(),
  customCollegeName: z.string().trim().optional().nullable(),
  customDepartmentName: z.string().trim().optional().nullable(),
  customProgramName: z.string().trim().optional().nullable(),
});

const collegeRegistrationSchema = z.object({
  collegeName: z.string().trim().min(2),
  address: z.string().trim().optional().nullable(),
  university: z.string().trim().optional().nullable(),
  mobile: z.string().trim().optional().nullable(),
  coordinatorName: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
});

const ipoRegistrationSchema = z.object({
  companyName: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(8),
  businessActivity: z.string().trim().min(2).optional().nullable(),
  ipoTypeId: z.string().trim().optional().nullable(),
  ipoType: z.string().trim().optional().nullable(),
  ipoSubCategory: z.string().trim().optional().nullable(),
});

function toMessage(error: unknown): string {
  if (error instanceof z.ZodError) return error.errors.map((item) => item.message).join(', ');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return `Duplicate value for: ${String(error.meta?.target ?? 'unique field')}`;
  }
  if (error instanceof Error) return error.message;
  return 'Unexpected server error';
}

function apiOk<T>(res: Response, message: string, data: T, status = 200): void {
  res.status(status).json({ success: true, message, data });
}

function apiError(res: Response, status: number, message: string): void {
  res.status(status).json({ success: false, message, data: null });
}


async function ensureConfiguredSuperAdmin(email: string): Promise<void> {
  if (email !== DEFAULT_SUPER_ADMIN_EMAIL) return;

  await prisma.user.updateMany({
    where: { email, role: { not: Role.SUPER_ADMIN } },
    data: { role: Role.SUPER_ADMIN },
  });
}

function buildSessionData(user: { id: string; email: string; role: Role; name: string | null }) {
  return {
    token: `dev.${Buffer.from(`${user.id}:${Date.now()}`).toString('base64url')}`,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name ?? undefined,
    },
  };
}

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    apiOk(res, 'API healthy', { status: 'ok', database: 'connected' });
  } catch {
    apiError(res, 500, 'Database connection failed');
  }
});

app.get('/api/ipo-types', (_req, res) => {
  apiOk(res, 'IPO types fetched', [
    { id: 'service', name: 'Service' },
    { id: 'manufacturing', name: 'Manufacturing' },
    { id: 'technology', name: 'Technology' },
  ]);
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!email || !password) {
    apiError(res, 400, 'Email and password are required');
    return;
  }

  await ensureConfiguredSuperAdmin(email);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    apiError(res, 401, 'Invalid email or password');
    return;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    apiError(res, 401, 'Invalid email or password');
    return;
  }

  apiOk(res, 'Login successful', buildSessionData(user));
});

app.post('/api/admin/send-otp', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (!email) {
    apiError(res, 400, 'Email is required');
    return;
  }

  await ensureConfiguredSuperAdmin(email);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
    apiError(res, 404, 'Admin account not found for this email');
    return;
  }

  const otp = String(randomInt(100000, 1000000));
  const expiresAt = Date.now() + ADMIN_OTP_TTL_MS;
  adminOtpStore.set(email, { otp, expiresAt });
  console.log(`[admin-otp] ${email} -> ${otp} (expires ${new Date(expiresAt).toISOString()})`);

  apiOk(res, 'OTP sent successfully', { otpSent: true, expiresAt: new Date(expiresAt).toISOString() });
});

app.post('/api/admin/verify-otp', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const otp = String(req.body?.otp ?? '').trim();
  if (!email || !otp) {
    apiError(res, 400, 'Email and OTP are required');
    return;
  }

  const record = adminOtpStore.get(email);
  if (!record || record.expiresAt < Date.now() || record.otp !== otp) {
    apiError(res, 401, 'Invalid or expired OTP');
    return;
  }

  await ensureConfiguredSuperAdmin(email);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
    apiError(res, 404, 'Admin account not found for this email');
    return;
  }

  adminOtpStore.delete(email);
  apiOk(res, 'OTP verified', buildSessionData(user));
});

app.post(['/api/student/register', '/join/student'], async (req, res) => {
  try {
    const payload = studentRegistrationSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(payload.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: payload.name,
          email: payload.email.toLowerCase(),
          password: passwordHash,
          role: Role.STUDENT,
        },
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          collegeId: payload.collegeId ?? null,
          departmentId: payload.departmentId ?? null,
          universityRegNumber: payload.universityRegNumber,
          sex: payload.sex ?? null,
          collegeNameManual: payload.customCollegeName ?? null,
          departmentNameManual: payload.customDepartmentName ?? null,
          programme: payload.customProgramName ?? payload.programId ?? null,
        },
      });

      return { userId: user.id, studentId: student.id };
    });

    apiOk(res, 'Student registration successful', result, 201);
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.post(['/api/college/register', '/join/college'], async (req, res) => {
  try {
    const payload = collegeRegistrationSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(payload.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: payload.coordinatorName,
          email: payload.email.toLowerCase(),
          phone: payload.mobile ?? null,
          password: passwordHash,
          role: Role.COLLEGE_COORDINATOR,
        },
      });

      const college = await tx.college.create({
        data: {
          name: payload.collegeName,
          address: payload.address ?? null,
          university: payload.university ?? null,
          mobile: payload.mobile ?? null,
          coordinatorName: payload.coordinatorName,
          coordinatorEmail: payload.email.toLowerCase(),
          status: 'PENDING',
        },
      });

      return { userId: user.id, collegeId: college.id };
    });

    apiOk(res, 'College registration submitted', result, 201);
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.post(['/api/ipo/register', '/join/ipo'], async (req, res) => {
  try {
    const payload = ipoRegistrationSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(payload.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: payload.companyName,
          email: payload.email.toLowerCase(),
          password: passwordHash,
          role: Role.IPO,
        },
      });

      const ipo = await tx.ipo.create({
        data: {
          name: payload.companyName,
          email: payload.email.toLowerCase(),
          activity: payload.businessActivity ?? null,
          ipoType: payload.ipoType ?? payload.ipoTypeId ?? null,
          ipoSubCategory: payload.ipoSubCategory ?? null,
          userId: user.id,
        },
      });

      return { userId: user.id, ipoId: ipo.id };
    });

    apiOk(res, 'IPO registration submitted', result, 201);
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.use((req, res) => {
  apiError(res, 404, `Route not found: ${req.method} ${req.path}`);
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  apiError(res, 500, toMessage(error));
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, '0.0.0.0', () => {
  console.log(`[backend] listening on ${port}`);
});
