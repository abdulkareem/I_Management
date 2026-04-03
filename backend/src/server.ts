import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import { z } from 'zod';
import { randomInt, randomUUID } from 'crypto';

const prisma = new PrismaClient();
const app = express();
const ADMIN_OTP_TTL_MS = 10 * 60 * 1000;
const DEFAULT_SUPER_ADMIN_EMAIL = 'abdulkareem@psmocollege.ac.in';
const RESEND_API_URL = 'https://api.resend.com/emails';

const allowedOrigins = (process.env.CORS_ORIGIN ?? process.env.FRONTEND_URL ?? '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins.includes('*') ? true : allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
attachHttpLogging(app);

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


function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => {
      const normalized = key.toLowerCase();
      if (
        normalized.includes('password')
        || normalized === 'otp'
        || normalized.includes('token')
        || normalized.includes('authorization')
      ) {
        return [key, '[REDACTED]'];
      }
      return [key, redactSensitive(entryValue)];
    });
    return Object.fromEntries(entries);
  }
  return value;
}

function attachHttpLogging(appInstance: express.Express): void {
  appInstance.use((req, res, next) => {
    const startedAt = Date.now();
    const requestId = randomUUID();

    console.log(`[api][${requestId}] -> ${req.method} ${req.originalUrl}`, {
      query: redactSensitive(req.query),
      body: redactSensitive(req.body),
    });

    const originalJson = res.json.bind(res);
    res.json = ((payload: unknown) => {
      const elapsedMs = Date.now() - startedAt;
      console.log(`[api][${requestId}] <- ${req.method} ${req.originalUrl} ${res.statusCode} (${elapsedMs}ms)`, {
        response: redactSensitive(payload),
      });
      return originalJson(payload);
    }) as typeof res.json;

    next();
  });
}

async function ensureConfiguredSuperAdmin(email: string): Promise<void> {
  if (email !== DEFAULT_SUPER_ADMIN_EMAIL) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const generatedPassword = await bcrypt.hash(`superadmin-${randomUUID()}`, 12);
    await prisma.user.create({
      data: {
        email,
        name: 'Super Admin',
        password: generatedPassword,
        role: Role.SUPER_ADMIN,
      },
    });
    return;
  }

  if (existing.role !== Role.SUPER_ADMIN) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: Role.SUPER_ADMIN },
    });
  }
}

async function sendAdminOtpEmail(email: string, otp: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'no-reply@aureliv.in';
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: 'Your Super Admin OTP',
      html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to send OTP email: ${response.status} ${details}`);
  }
}

function generateTemporaryPassword(length = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
  return Array.from({ length }, () => alphabet[randomInt(0, alphabet.length)]).join('');
}

async function sendDepartmentTemporaryPasswordEmail(email: string, password: string, departmentName: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'no-reply@aureliv.in';
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: 'Department coordinator temporary password',
      html: `<p>Your department coordinator account for <strong>${departmentName}</strong> is ready.</p><p>Temporary password: <strong>${password}</strong></p><p>Please reset it on first login.</p>`,
      text: `Your department coordinator account for ${departmentName} is ready. Temporary password: ${password}. Please reset it on first login.`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to send department temporary password email: ${response.status} ${details}`);
  }
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

type AuthUser = { id: string; email: string; role: Role };

function decodeSessionUserId(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;
  const token = authorizationHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token.startsWith('dev.')) return null;

  try {
    const decoded = Buffer.from(token.slice(4), 'base64url').toString('utf8');
    const [userId] = decoded.split(':');
    return userId || null;
  } catch {
    return null;
  }
}

async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const userId = decodeSessionUserId(req.header('authorization'));
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });
}

async function getCollegeIdForCoordinator(user: AuthUser): Promise<string | null> {
  if (user.role !== Role.COLLEGE_COORDINATOR) return null;
  const college = await prisma.college.findFirst({
    where: { coordinatorEmail: user.email },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });
  return college?.id ?? null;
}

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    apiOk(res, 'API healthy', { status: 'ok', database: 'connected' });
  } catch {
    apiError(res, 500, 'Database connection failed');
  }
});

app.get('/api/ipo-types', async (_req, res) => {
  try {
    const types = await prisma.ipoType.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    apiOk(res, 'IPO types fetched', types);
  } catch (error) {
    apiError(res, 500, toMessage(error));
  }
});

app.post('/api/ipo-types', async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (!name) {
      apiError(res, 400, 'name is required');
      return;
    }

    const duplicate = await prisma.ipoType.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (duplicate) {
      apiError(res, 409, 'IPO type already exists');
      return;
    }

    const type = await prisma.ipoType.create({
      data: { name },
      select: { id: true, name: true },
    });
    apiOk(res, 'IPO type created', type, 201);
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.delete('/api/ipo-types/:id', async (req, res) => {
  try {
    await prisma.ipoType.delete({ where: { id: req.params.id } });
    apiOk(res, 'IPO type deleted', { id: req.params.id });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});



app.get('/api/dashboard/metrics', async (_req, res) => {
  try {
    const [totalColleges, totalIPOs, totalDepartments, totalInternships, pendingApprovals] = await Promise.all([
      prisma.college.count(),
      prisma.ipo.count(),
      prisma.department.count(),
      prisma.internship.count(),
      prisma.college.count({ where: { status: 'PENDING' } }),
    ]);

    apiOk(res, 'Dashboard metrics fetched', {
      totalColleges,
      totalIPOs,
      totalDepartments,
      totalInternships,
      pendingApprovals,
      activeInternships: totalInternships,
    });
  } catch (error) {
    apiError(res, 500, toMessage(error));
  }
});

app.get('/api/colleges', async (_req, res) => {
  try {
    const colleges = await prisma.college.findMany({ orderBy: { createdAt: 'desc' } });
    apiOk(res, 'Colleges fetched', colleges.map((college) => ({
      id: college.id,
      name: college.name,
      coordinator: college.coordinatorName ?? '-',
      email: college.coordinatorEmail ?? '-',
      status: college.status,
    })));
  } catch (error) {
    apiError(res, 500, toMessage(error));
  }
});

app.get('/api/ipos', async (_req, res) => {
  try {
    const [ipos, types, subtypes] = await Promise.all([
      prisma.ipo.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.ipoType.findMany({ select: { id: true, name: true } }),
      prisma.ipoSubtype.findMany({ select: { id: true, name: true } }),
    ]);
    const typeLookup = new Map(types.map((type) => [type.id, type.name]));
    const subtypeLookup = new Map(subtypes.map((subtype) => [subtype.id, subtype.name]));
    apiOk(res, 'IPOs fetched', ipos.map((ipo) => ({
      id: ipo.id,
      name: ipo.name,
      email: ipo.email ?? '-',
      status: 'APPROVED',
      ipo_type_name: ipo.ipoType ? (typeLookup.get(ipo.ipoType) ?? ipo.ipoType) : '-',
      ipo_subtype_name: ipo.ipoSubCategory ? (subtypeLookup.get(ipo.ipoSubCategory) ?? ipo.ipoSubCategory) : '-',
    })));
  } catch (error) {
    apiError(res, 500, toMessage(error));
  }
});

app.get('/api/departments', async (req, res) => {
  try {
    const authUser = await getAuthUser(req);
    const requestedCollegeId = String(req.query.collegeId ?? req.query.college_id ?? '').trim();
    const scopedCollegeId = authUser?.role === Role.COLLEGE_COORDINATOR
      ? await getCollegeIdForCoordinator(authUser)
      : (requestedCollegeId || null);

    const departments = await prisma.department.findMany({
      where: scopedCollegeId ? { collegeId: scopedCollegeId } : undefined,
      include: { college: true },
      orderBy: { name: 'asc' },
    });

    apiOk(res, 'Departments fetched', departments.map((department) => ({
      id: department.id,
      name: department.name,
      college_id: department.collegeId,
      college_name: department.college.name,
      coordinator_name: department.coordinatorName ?? '-',
      coordinator_email: department.coordinatorEmail ?? '-',
      is_first_login: department.isFirstLogin,
      login_status: department.isFirstLogin ? 'Not Logged In' : 'Logged In',
      coordinator: department.coordinatorName ?? '-',
      email: department.coordinatorEmail ?? '-',
    })));
  } catch (error) {
    apiError(res, 500, toMessage(error));
  }
});

app.post('/api/departments', async (req, res) => {
  try {
    const authUser = await getAuthUser(req);
    const requestedCollegeId = String(req.body?.college_id ?? req.body?.collegeId ?? '').trim();
    const scopedCollegeId = authUser?.role === Role.COLLEGE_COORDINATOR
      ? await getCollegeIdForCoordinator(authUser)
      : (requestedCollegeId || null);

    const name = String(req.body?.name ?? '').trim();
    const coordinatorName = String(req.body?.coordinator_name ?? req.body?.coordinatorName ?? '').trim();
    const coordinatorEmail = String(req.body?.coordinator_email ?? req.body?.coordinatorEmail ?? '').trim().toLowerCase();

    if (!scopedCollegeId || !name || !coordinatorName || !coordinatorEmail) {
      apiError(res, 400, 'college_id, name, coordinator_name, coordinator_email are required');
      return;
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const department = await prisma.department.create({
      data: {
        collegeId: scopedCollegeId,
        name,
        coordinatorName,
        coordinatorEmail,
        password: hashedPassword,
        isFirstLogin: true,
      },
      include: { college: true },
    });

    await sendDepartmentTemporaryPasswordEmail(coordinatorEmail, temporaryPassword, name);

    apiOk(res, 'Department created', {
      id: department.id,
      name: department.name,
      college_id: department.collegeId,
      college_name: department.college.name,
      coordinator_name: department.coordinatorName ?? '-',
      coordinator_email: department.coordinatorEmail ?? '-',
      is_first_login: department.isFirstLogin,
      login_status: department.isFirstLogin ? 'Not Logged In' : 'Logged In',
    }, 201);
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.patch('/api/departments/:id', async (req, res) => {
  try {
    const authUser = await getAuthUser(req);
    const existing = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: { college: { select: { coordinatorEmail: true } } },
    });
    if (!existing) {
      apiError(res, 404, 'Department not found');
      return;
    }

    if (authUser?.role === Role.COLLEGE_COORDINATOR) {
      const coordinatorCollegeId = await getCollegeIdForCoordinator(authUser);
      if (!coordinatorCollegeId || coordinatorCollegeId !== existing.collegeId) {
        apiError(res, 403, 'Not allowed to modify this department');
        return;
      }
    }

    const name = String(req.body?.name ?? '').trim();
    const coordinatorName = String(req.body?.coordinator_name ?? req.body?.coordinatorName ?? '').trim();

    const incomingEmail = String(req.body?.coordinator_email ?? req.body?.coordinatorEmail ?? '').trim().toLowerCase();
    const emailChanged = Boolean(incomingEmail) && incomingEmail !== (existing.coordinatorEmail ?? '').toLowerCase();
    const shouldRotatePassword = emailChanged || Boolean(name) || Boolean(coordinatorName);
    const temporaryPassword = shouldRotatePassword ? generateTemporaryPassword() : null;
    const hashedPassword = temporaryPassword ? await bcrypt.hash(temporaryPassword, 12) : null;

    const department = await prisma.department.update({
      where: { id: req.params.id },
      data: {
        name: name || undefined,
        coordinatorName: coordinatorName || undefined,
        coordinatorEmail: incomingEmail || undefined,
        password: hashedPassword ?? undefined,
        isFirstLogin: temporaryPassword ? true : undefined,
      },
      include: { college: true },
    });

    if (temporaryPassword && department.coordinatorEmail) {
      await sendDepartmentTemporaryPasswordEmail(department.coordinatorEmail, temporaryPassword, department.name);
    }

    apiOk(res, 'Department updated', {
      id: department.id,
      name: department.name,
      college_id: department.collegeId,
      college_name: department.college.name,
      coordinator_name: department.coordinatorName ?? '-',
      coordinator_email: department.coordinatorEmail ?? '-',
      is_first_login: department.isFirstLogin,
      login_status: department.isFirstLogin ? 'Not Logged In' : 'Logged In',
    });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.delete('/api/departments/:id', async (req, res) => {
  try {
    const authUser = await getAuthUser(req);
    const existing = await prisma.department.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      apiError(res, 404, 'Department not found');
      return;
    }

    if (authUser?.role === Role.COLLEGE_COORDINATOR) {
      const coordinatorCollegeId = await getCollegeIdForCoordinator(authUser);
      if (!coordinatorCollegeId || coordinatorCollegeId !== existing.collegeId) {
        apiError(res, 403, 'Not allowed to delete this department');
        return;
      }
    }

    await prisma.department.delete({ where: { id: req.params.id } });
    apiOk(res, 'Department deleted', { id: req.params.id });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.get('/api/dashboard/college/control-center', async (_req, res) => {
  try {
    const [
      totalInternships,
      totalApplications,
      selectedApplications,
      departments,
      ipos,
      internships,
      applications,
    ] = await Promise.all([
      prisma.internship.count(),
      prisma.internshipApplication.count(),
      prisma.internshipApplication.count({ where: { status: 'SELECTED' } }),
      prisma.department.findMany({
        include: {
          students: { select: { id: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.ipo.findMany({
        include: { internships: { select: { id: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.internship.findMany({
        include: {
          ipo: { select: { name: true } },
          applications: { select: { id: true } },
          targets: { include: { college: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.internshipApplication.findMany({
        include: {
          internship: { select: { title: true } },
          student: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const internshipsPayload = internships.map((item) => ({
      id: item.id,
      title: item.title,
      created_by: item.ipo?.name ?? 'IPO',
      target_department: item.targets[0]?.college?.name ?? 'All departments',
      vacancy: 'N/A',
      applications_count: item.applications.length,
      status: 'OPEN',
      alert: item.applications.length === 0 ? 'No applications yet' : 'Healthy',
    }));

    const internalApplications = applications.map((item) => ({
      id: item.id,
      student_name: item.student?.user?.name ?? item.user?.name ?? 'Student',
      student_email: item.student?.user?.email ?? item.user?.email ?? '-',
      internship_title: item.internship.title,
      status: item.status,
      application_type: 'INTERNAL' as const,
    }));

    const payload = {
      summary: {
        totalInternships,
        activeInternships: totalInternships,
        totalStudentsApplied: totalApplications,
        studentsPlaced: selectedApplications,
        pendingAllocations: Math.max(totalApplications - selectedApplications, 0),
        externalApplicationsCount: 0,
      },
      approvalQueue: internshipsPayload.slice(0, 20).map((item) => ({
        id: item.id,
        title: item.title,
        industry_name: item.created_by,
        assigned_department: item.target_department,
        status: item.status,
      })),
      departmentPerformance: departments.map((department) => ({
        id: department.id,
        department_name: department.name,
        total_students: department.students.length,
        applications_submitted: 0,
        students_selected: 0,
        completion_rate: 0,
        evaluation_status: 'PENDING',
      })),
      internships: internshipsPayload,
      applications: {
        internal: internalApplications,
        external: [],
      },
      evaluationStatus: departments.map((department) => ({
        department: department.name,
        students_evaluated: 0,
        pending_evaluations: 0,
        submission_status: 'PENDING',
      })),
      analytics: {
        departmentParticipation: departments.map((department) => ({
          label: department.name,
          value: department.students.length,
        })),
        internshipDistribution: internshipsPayload.slice(0, 10).map((item) => ({
          label: item.title,
          value: item.applications_count,
        })),
        completionRate: departments.map((department) => ({
          label: department.name,
          value: 0,
        })),
        externalInternalRatio: { internal: totalApplications, external: 0 },
      },
      notifications: [],
      ipoSummary: ipos.map((ipo) => ({
        ipo_id: ipo.id,
        ipo_name: ipo.name,
        internship_count: ipo.internships.length,
        active_engagements: ipo.internships.length,
      })),
    };

    apiOk(res, 'College control center fetched', payload);
  } catch (error) {
    apiError(res, 500, toMessage(error));
  }
});

app.get('/api/logs', async (_req, res) => {
  try {
    const [colleges, ipos, departments] = await Promise.all([
      prisma.college.findMany({ select: { id: true, createdAt: true, name: true }, orderBy: { createdAt: 'desc' }, take: 40 }),
      prisma.ipo.findMany({ select: { id: true, createdAt: true, name: true }, orderBy: { createdAt: 'desc' }, take: 40 }),
      prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 40 }),
    ]);

    const logs = [
      ...colleges.map((item) => ({
        id: `college-${item.id}`,
        action: 'CREATE',
        entity: 'COLLEGE',
        entity_id: item.id,
        performed_by: 'SYSTEM',
        timestamp: item.createdAt.toISOString(),
      })),
      ...ipos.map((item) => ({
        id: `ipo-${item.id}`,
        action: 'CREATE',
        entity: 'IPO',
        entity_id: item.id,
        performed_by: 'SYSTEM',
        timestamp: item.createdAt.toISOString(),
      })),
      ...departments.map((item) => ({
        id: `department-${item.id}`,
        action: 'REGISTER',
        entity: 'DEPARTMENT',
        entity_id: item.id,
        performed_by: 'SYSTEM',
        timestamp: new Date(0).toISOString(),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    apiOk(res, 'Audit logs fetched', logs.slice(0, 100));
  } catch (error) {
    apiError(res, 500, toMessage(error));
  }
});

app.get('/api/ipo-subtypes', async (req, res) => {
  try {
    const ipoTypeId = String(req.query.ipo_type_id ?? req.query.ipoTypeId ?? '').trim();
    const subtypes = await prisma.ipoSubtype.findMany({
      where: ipoTypeId ? { ipoTypeId } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, ipoTypeId: true },
    });

    apiOk(res, 'IPO subtypes fetched', subtypes.map((subtype) => ({
      id: subtype.id,
      name: subtype.name,
      ipo_type_id: subtype.ipoTypeId,
    })));
  } catch (error) {
    apiError(res, 500, toMessage(error));
  }
});

app.post('/api/ipo-subtypes', async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const ipoTypeId = String(req.body?.ipo_type_id ?? req.body?.ipoTypeId ?? '').trim();
    if (!name || !ipoTypeId) {
      apiError(res, 400, 'name and ipo_type_id are required');
      return;
    }

    const type = await prisma.ipoType.findUnique({ where: { id: ipoTypeId }, select: { id: true } });
    if (!type) {
      apiError(res, 400, 'Invalid ipo_type_id');
      return;
    }

    const duplicate = await prisma.ipoSubtype.findFirst({
      where: { ipoTypeId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (duplicate) {
      apiError(res, 409, 'IPO subtype already exists for this type');
      return;
    }

    const subtype = await prisma.ipoSubtype.create({
      data: { name, ipoTypeId },
      select: { id: true, name: true, ipoTypeId: true },
    });
    apiOk(res, 'IPO subtype created', {
      id: subtype.id,
      name: subtype.name,
      ipo_type_id: subtype.ipoTypeId,
    }, 201);
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.delete('/api/ipo-subtypes/:id', async (req, res) => {
  try {
    await prisma.ipoSubtype.delete({ where: { id: req.params.id } });
    apiOk(res, 'IPO subtype deleted', { id: req.params.id });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.patch('/api/colleges/:id/:action(approve|reject)', async (req, res) => {
  const status = req.params.action === 'approve' ? 'APPROVED' : 'REJECTED';
  try {
    const college = await prisma.college.update({
      where: { id: req.params.id },
      data: { status },
    });
    apiOk(res, `College ${status.toLowerCase()}`, { id: college.id, status: college.status });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.patch('/api/ipos/:id/:action(approve|reject)', async (req, res) => {
  const action = req.params.action === 'approve' ? 'approved' : 'rejected';
  const exists = await prisma.ipo.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) {
    apiError(res, 404, 'IPO not found');
    return;
  }
  apiOk(res, `IPO ${action}`, { id: req.params.id, status: action.toUpperCase() });
});

app.delete('/api/colleges/:id', async (req, res) => {
  try {
    await prisma.college.delete({ where: { id: req.params.id } });
    apiOk(res, 'College deleted', { id: req.params.id });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.delete('/api/ipos/:id', async (req, res) => {
  try {
    await prisma.ipo.delete({ where: { id: req.params.id } });
    apiOk(res, 'IPO deleted', { id: req.params.id });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
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
  if (email !== DEFAULT_SUPER_ADMIN_EMAIL) {
    apiError(res, 403, 'Only the configured super admin email can login here');
    return;
  }

  await ensureConfiguredSuperAdmin(email);
  console.log('[admin-send-otp] Checking admin account', { email });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
    console.warn('[admin-send-otp] Admin account lookup failed', {
      email,
      foundUser: Boolean(user),
      role: user?.role ?? null,
    });
    apiError(res, 404, 'Admin account not found for this email');
    return;
  }

  console.log('[admin-send-otp] Admin account verified', { email, role: user.role, userId: user.id });

  const otp = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + ADMIN_OTP_TTL_MS);
  await prisma.adminOtp.updateMany({
    where: { email, verified: false },
    data: { verified: true, verifiedAt: new Date() },
  });
  await prisma.adminOtp.create({
    data: {
      userId: user.id,
      email,
      otp,
      expiresAt,
    },
  });

  try {
    await sendAdminOtpEmail(email, otp);
  } catch (error) {
    console.error('[admin-send-otp] Failed to send OTP email', { email, error: toMessage(error) });
    apiError(res, 500, 'Failed to send OTP email');
    return;
  }

  apiOk(res, 'OTP sent successfully', { otpSent: true, expiresAt: expiresAt.toISOString() });
});

app.post('/api/admin/verify-otp', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const otp = String(req.body?.otp ?? '').trim();
  if (!email || !otp) {
    apiError(res, 400, 'Email and OTP are required');
    return;
  }

  if (email !== DEFAULT_SUPER_ADMIN_EMAIL) {
    apiError(res, 403, 'Only the configured super admin email can login here');
    return;
  }

  const record = await prisma.adminOtp.findFirst({
    where: { email, verified: false },
    orderBy: { createdAt: 'desc' },
  });
  const isExpired = record ? record.expiresAt.getTime() < Date.now() : false;
  if (!record || isExpired || record.otp !== otp) {
    if (record) {
      await prisma.adminOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
    }
    console.warn('[admin-verify-otp] OTP verification failed', {
      email,
      hasOtpRecord: Boolean(record),
      otpExpired: record ? isExpired : null,
    });
    apiError(res, 401, 'Invalid or expired OTP');
    return;
  }

  await ensureConfiguredSuperAdmin(email);
  console.log('[admin-verify-otp] Checking admin account', { email });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
    console.warn('[admin-verify-otp] Admin account lookup failed after OTP verification', {
      email,
      foundUser: Boolean(user),
      role: user?.role ?? null,
    });
    apiError(res, 404, 'Admin account not found for this email');
    return;
  }

  console.log('[admin-verify-otp] Admin login successful after OTP verification', { email, role: user.role, userId: user.id });

  await prisma.adminOtp.update({
    where: { id: record.id },
    data: {
      verified: true,
      verifiedAt: new Date(),
    },
  });
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
    const ipoTypeId = payload.ipoTypeId?.trim() || null;
    const [ipoType, ipoSubtype] = await Promise.all([
      ipoTypeId ? prisma.ipoType.findUnique({ where: { id: ipoTypeId }, select: { id: true, name: true } }) : Promise.resolve(null),
      payload.ipoSubCategory?.trim() ? prisma.ipoSubtype.findUnique({ where: { id: payload.ipoSubCategory.trim() }, select: { id: true } }) : Promise.resolve(null),
    ]);
    if (ipoTypeId && !ipoType) {
      apiError(res, 400, 'Invalid ipoTypeId');
      return;
    }
    if (payload.ipoSubCategory?.trim() && !ipoSubtype) {
      apiError(res, 400, 'Invalid ipoSubCategory');
      return;
    }

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
          ipoType: ipoType?.id ?? payload.ipoType ?? null,
          ipoSubCategory: ipoSubtype?.id ?? null,
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

app.get('/api/dashboard/ipo', async (req, res) => {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== Role.IPO) {
      apiError(res, 401, 'Unauthorized');
      return;
    }

    const ipo = await prisma.ipo.findUnique({ where: { userId: authUser.id } });
    if (!ipo) {
      apiError(res, 404, 'IPO profile not found');
      return;
    }

    const internships = await prisma.internship.findMany({
      where: { ipoId: ipo.id },
      include: {
        applications: {
          include: {
            student: { include: { user: true, college: true } },
            user: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const applications = internships.flatMap((internship) => internship.applications.map((application) => ({
      id: application.id,
      studentId: application.studentId ?? null,
      internshipId: application.internshipId,
      studentName: application.student?.user?.name ?? application.user?.name ?? 'Student',
      studentEmail: application.student?.user?.email ?? application.user?.email ?? null,
      collegeName: application.student?.college?.name ?? '-',
      opportunityTitle: internship.title,
      status: application.status,
      createdAt: application.createdAt.toISOString(),
      completedAt: application.status === 'COMPLETED' ? application.updatedAt.toISOString() : null,
    })));

    apiOk(res, 'IPO dashboard fetched', {
      ipo: { id: ipo.id, name: ipo.name, description: ipo.activity ?? null, emblem: null },
      stats: {
        liveOpportunities: internships.length,
        pendingApplications: applications.filter((item) => item.status === 'PENDING').length,
        acceptedApplications: applications.filter((item) => item.status === 'ACCEPTED' || item.status === 'SELECTED' || item.status === 'COMPLETED').length,
        internships: internships.length,
      },
      opportunities: internships.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description ?? '',
        applications: item.applications.length,
      })),
      applications,
      approvedColleges: [],
    });
  } catch (error) {
    apiError(res, 500, toMessage(error));
  }
});

app.get('/api/ipo/ideas', async (_req, res) => {
  apiOk(res, 'IPO ideas fetched', []);
});

app.put('/api/ipo-requests/:id/update', async (_req, res) => {
  apiOk(res, 'IPO request updated', { id: _req.params.id });
});

app.post('/api/ipo-requests/:id/respond', async (_req, res) => {
  apiOk(res, 'IPO request responded', { id: _req.params.id });
});

app.post('/api/ipo/ideas/:id/publish', async (_req, res) => {
  apiOk(res, 'Idea published', { id: _req.params.id });
});

app.get('/api/ipo/colleges', async (_req, res) => {
  try {
    const colleges = await prisma.college.findMany({ orderBy: { name: 'asc' } });
    apiOk(res, 'Colleges fetched', colleges.map((college) => ({ id: college.id, name: college.name })));
  } catch (error) {
    apiError(res, 500, toMessage(error));
  }
});

app.get('/api/ipo/colleges/:collegeId/departments', async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { collegeId: req.params.collegeId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    apiOk(res, 'Departments fetched', departments);
  } catch (error) {
    apiError(res, 500, toMessage(error));
  }
});

app.get('/api/programs', async (req, res) => {
  try {
    const departmentId = String(req.query.departmentId ?? '').trim();
    if (!departmentId) {
      apiOk(res, 'Programs fetched', []);
      return;
    }
    const rows = await prisma.student.findMany({
      where: { departmentId, NOT: { programme: null } },
      select: { programme: true },
      distinct: ['programme'],
      orderBy: { programme: 'asc' },
    });
    const programs = rows
      .map((row) => row.programme?.trim())
      .filter((row): row is string => Boolean(row))
      .map((name) => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name }));
    apiOk(res, 'Programs fetched', programs);
  } catch (error) {
    apiError(res, 500, toMessage(error));
  }
});

app.get('/api/ipo/profile', async (req, res) => {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== Role.IPO) {
      apiError(res, 401, 'Unauthorized');
      return;
    }
    const ipo = await prisma.ipo.findUnique({ where: { userId: authUser.id } });
    if (!ipo) {
      apiError(res, 404, 'IPO profile not found');
      return;
    }
    apiOk(res, 'IPO profile fetched', {
      id: ipo.id,
      name: ipo.name,
      email: ipo.email ?? authUser.email,
      company_address: ipo.activity ?? null,
      contact_number: null,
      registration_number: null,
      registration_year: null,
      supervisor_name: null,
    });
  } catch (error) {
    apiError(res, 500, toMessage(error));
  }
});

app.put('/api/ipo/profile', async (req, res) => {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== Role.IPO) {
      apiError(res, 401, 'Unauthorized');
      return;
    }
    const ipo = await prisma.ipo.findUnique({ where: { userId: authUser.id } });
    if (!ipo) {
      apiError(res, 404, 'IPO profile not found');
      return;
    }
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const companyAddress = String(req.body?.companyAddress ?? '').trim();
    const updated = await prisma.ipo.update({
      where: { id: ipo.id },
      data: {
        email: email || undefined,
        activity: companyAddress || undefined,
      },
    });
    apiOk(res, 'IPO profile updated', { id: updated.id });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.post('/api/ipo/send-to-department', async (req, res) => {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== Role.IPO) {
      apiError(res, 401, 'Unauthorized');
      return;
    }
    const ipo = await prisma.ipo.findUnique({ where: { userId: authUser.id } });
    const collegeId = String(req.body?.college ?? '').trim();
    const internshipTitle = String(req.body?.internshipTitle ?? '').trim();
    const natureOfWork = String(req.body?.natureOfWork ?? '').trim();

    if (!ipo) {
      apiError(res, 404, 'IPO profile not found');
      return;
    }
    if (!collegeId || !internshipTitle) {
      apiError(res, 400, 'college and internshipTitle are required');
      return;
    }
    const created = await prisma.internship.create({
      data: {
        title: internshipTitle,
        description: natureOfWork,
        ipoId: ipo.id,
        createdById: authUser.id,
        targets: { create: [{ collegeId }] },
      },
    });
    apiOk(res, 'Sent to Department', { id: created.id }, 201);
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.get('/api/ipo/internships', async (req, res) => {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== Role.IPO) {
      apiError(res, 401, 'Unauthorized');
      return;
    }
    const ipo = await prisma.ipo.findUnique({ where: { userId: authUser.id } });
    if (!ipo) {
      apiError(res, 404, 'IPO profile not found');
      return;
    }
    const internships = await prisma.internship.findMany({
      where: { ipoId: ipo.id },
      include: { targets: { include: { college: true } } },
      orderBy: { createdAt: 'desc' },
    });
    apiOk(res, 'IPO internships fetched', internships.map((item) => ({
      id: item.id,
      internship_title: item.title,
      description: item.description ?? '',
      college_id: item.targets[0]?.collegeId ?? '',
      college_name: item.targets[0]?.college?.name ?? '-',
      department_id: '',
      department_name: '-',
      programme: null,
      category: 'FREE',
      vacancy: null,
      status: item.description === '[CLOSED]' ? 'CLOSED' : 'PUBLISHED',
      student_visibility: 1,
      created_at: item.createdAt.toISOString(),
    })));
  } catch (error) {
    apiError(res, 500, toMessage(error));
  }
});

app.put('/api/ipo/internships/:id', async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    const description = String(req.body?.description ?? '').trim();
    const internship = await prisma.internship.update({
      where: { id: req.params.id },
      data: { title: title || undefined, description: description || undefined },
    });
    apiOk(res, 'Internship updated', { id: internship.id });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.post('/api/ipo/publish', async (req, res) => {
  apiOk(res, 'Published for students', { id: req.body?.id ?? null });
});

app.post('/api/ipo/internships/:id/close', async (req, res) => {
  try {
    const internship = await prisma.internship.update({
      where: { id: req.params.id },
      data: { description: '[CLOSED]' },
    });
    apiOk(res, 'Internship closed', { id: internship.id });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.post('/api/ipo/internships/:id/republish', async (req, res) => {
  try {
    const internship = await prisma.internship.update({
      where: { id: req.params.id },
      data: { description: '' },
    });
    apiOk(res, 'Internship published again', { id: internship.id });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.delete('/api/ipo/internships/:id', async (req, res) => {
  try {
    await prisma.internship.delete({ where: { id: req.params.id } });
    apiOk(res, 'Internship removed', { id: req.params.id });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.post('/api/ipo/applications/:id/accept', async (req, res) => {
  try {
    const updated = await prisma.internshipApplication.update({
      where: { id: req.params.id },
      data: { status: 'ACCEPTED' },
    });
    apiOk(res, 'Application accepted', { id: updated.id, status: updated.status });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.post('/api/ipo/applications/:id/reject', async (req, res) => {
  try {
    const updated = await prisma.internshipApplication.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
    });
    apiOk(res, 'Application rejected', { id: updated.id, status: updated.status });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.post('/api/ipo/applications/:id/complete', async (req, res) => {
  try {
    const updated = await prisma.internshipApplication.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' },
    });
    apiOk(res, 'Application completed', { id: updated.id, status: updated.status });
  } catch (error) {
    apiError(res, 400, toMessage(error));
  }
});

app.post('/api/ipo/applications/:id/generate-letters', async (_req, res) => {
  apiOk(res, 'Letters generated', { generated: true });
});

app.post('/api/ipo/applications/:id/feedback', async (_req, res) => {
  apiOk(res, 'Feedback submitted', { saved: true });
});

app.get('/api/documents/my', async (_req, res) => {
  apiOk(res, 'Documents fetched', []);
});

app.get('/api/documents/:id/download', async (_req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.send(Buffer.from('%PDF-1.4\n%EOF'));
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
