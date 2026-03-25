import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { Role } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { emailService } from '../services/email.service.js';
import { requireRole, verifyJWT, type AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

const loginAttemptsStore = new Map<string, { count: number; lastAttemptAt: number }>();

function ok(data: unknown, message?: string) {
  return { success: true, message, data };
}

function signToken(userId: string, role: Role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

function trackAttempt(email: string) {
  const now = Date.now();
  const existing = loginAttemptsStore.get(email);
  if (!existing || now - existing.lastAttemptAt > 15 * 60_000) {
    loginAttemptsStore.set(email, { count: 1, lastAttemptAt: now });
    return 1;
  }
  const next = { count: existing.count + 1, lastAttemptAt: now };
  loginAttemptsStore.set(email, next);
  return next.count;
}

function placeholderPhone(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

router.post('/college/register', async (req, res) => {
  const { collegeName, address, email, phone, university, loginEmail, password } = req.body ?? {};
  if (!collegeName || !loginEmail || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields', data: null });
  }

  const normalizedEmail = String(loginEmail).toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return res.status(409).json({ success: false, message: 'Coordinator account already exists', data: null });

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: String(collegeName),
      password: await bcrypt.hash(String(password), 10),
      phone: String(phone ?? placeholderPhone('college')),
      universityRegNo: `COLLEGE-${crypto.randomUUID()}`,
      collegeId: 'N/A',
      role: 'COLLEGE_ADMIN',
    },
  });

  const college = await prisma.college.create({
    data: {
      name: String(collegeName),
      email: String(email ?? normalizedEmail),
      phone: String(phone ?? placeholderPhone('college-contact')),
      address: String(address ?? 'Not provided'),
      university: String(university ?? 'Not provided'),
      status: 'PENDING_APPROVAL',
      coordinatorId: user.id,
    },
  });

  return res.status(201).json(ok({ token: signToken(user.id, user.role), user: { id: user.id, email: user.email, role: user.role }, college }));
});

router.get('/catalog/colleges', async (_req, res) => {
  const colleges = await prisma.college.findMany({
    where: { status: 'APPROVED' },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  return res.json(ok({ colleges }));
});

router.post('/industry/create', async (req, res) => {
  const { name, email, password, industryType } = req.body ?? {};
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Missing required fields', data: null });

  const normalized = String(email).toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) return res.status(409).json({ success: false, message: 'Industry account already exists', data: null });

  const typeName = String(industryType ?? 'General').trim();
  const existingType = await prisma.industryType.findFirst({ where: { name: typeName } });
  const type = existingType ?? (await prisma.industryType.create({ data: { name: typeName } }));

  const user = await prisma.user.create({
    data: {
      email: normalized,
      name: String(name),
      password: await bcrypt.hash(String(password), 10),
      phone: placeholderPhone('industry'),
      universityRegNo: `IND-${crypto.randomUUID()}`,
      collegeId: 'N/A',
      role: 'INDUSTRY',
    },
  });

  const industry = await prisma.industry.create({
    data: {
      name: String(name),
      email: normalized,
      approved: false,
      userId: user.id,
      typeId: type.id,
    },
  });

  return res.status(201).json(ok({ industry, token: signToken(user.id, user.role), user: { id: user.id, email: user.email, role: user.role } }));
});

router.post('/student/register', async (req, res) => {
  const { name, email, password, phone, universityRegNo, collegeId } = req.body ?? {};
  if (!name || !email || !password || !phone || !universityRegNo || !collegeId) {
    return res.status(400).json({ success: false, message: 'name, email, password, phone, universityRegNo and collegeId are required', data: null });
  }

  const normalizedEmail = String(email).toLowerCase();
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { phone: String(phone) }, { universityRegNo: String(universityRegNo) }],
    },
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'User already registered',
      data: { actions: ['reset_password', 'forgot_user_id'] },
    });
  }

  const user = await prisma.user.create({
    data: {
      name: String(name),
      email: normalizedEmail,
      password: await bcrypt.hash(String(password), 10),
      phone: String(phone),
      universityRegNo: String(universityRegNo),
      collegeId: String(collegeId),
      role: 'STUDENT',
    },
  });

  const student = await prisma.student.create({
    data: {
      name: String(name),
      email: normalizedEmail,
      phone: String(phone),
      userId: user.id,
      collegeId: String(collegeId),
    },
  });

  return res.status(201).json(ok({ student, token: signToken(user.id, user.role), user: { id: user.id, name: user.name, email: user.email, role: user.role } }));
});

router.post('/auth/login', async (req, res) => {

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required', data: null });
  }

  const normalizedEmail = String(email).toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not registered', data: { redirect: '/register' } });
  }

  const isPasswordCorrect = user.password ? await bcrypt.compare(String(password), user.password) : false;
  if (!isPasswordCorrect) {
    const attempts = trackAttempt(normalizedEmail);
    if (attempts >= 3) return res.status(401).json({ success: false, message: 'Invalid credentials. 3 attempts reached. Please reset password.', data: null });
    return res.status(401).json({ success: false, message: `Invalid credentials. ${3 - attempts} attempts remaining.`, data: null });
  }

  loginAttemptsStore.delete(normalizedEmail);
  const payload = { token: signToken(user.id, user.role), user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  return res.json({ ...ok(payload), ...payload });
});

router.post('/auth/forgot-password', async (req, res) => {
  const { email, phone, universityRegNo } = req.body ?? {};
  if (!email && !phone && !universityRegNo) {
    return res.status(400).json({ success: false, message: 'Provide email or phone or universityRegNo', data: null });
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        email ? { email: String(email).toLowerCase() } : undefined,
        phone ? { phone: String(phone) } : undefined,
        universityRegNo ? { universityRegNo: String(universityRegNo) } : undefined,
      ].filter(Boolean) as NonNullable<unknown> as Array<{ email?: string; phone?: string; universityRegNo?: string }>,
    },
  });
  if (!user) return res.status(404).json({ success: false, message: 'User not registered', data: null });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.user.update({
    where: { id: user.id },
    data: { otp: code, otpExpiry: new Date(Date.now() + 5 * 60_000) },
  });
  await emailService.sendEmail(user.email, 'Your Password Reset OTP', `Your verification code is ${code}`, `<h2>Your OTP: ${code}</h2>`);
  return res.json(ok({ otpSent: true }));
});

router.post('/auth/reset-password', async (req, res) => {
  const { identifier, otp, newPassword } = req.body ?? {};
  if (!identifier || !otp || !newPassword) {
    return res.status(400).json({ success: false, message: 'identifier, otp and newPassword are required', data: null });
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: String(identifier).toLowerCase() }, { phone: String(identifier) }, { universityRegNo: String(identifier) }],
    },
  });

  if (!user) return res.status(404).json({ success: false, message: 'User not registered', data: null });
  if (!user.otp || user.otp !== String(otp) || !user.otpExpiry || user.otpExpiry.getTime() < Date.now()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP', data: null });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(String(newPassword), 10),
      otp: null,
      otpExpiry: null,
    },
  });
  return res.json(ok({ passwordUpdated: true }));
});

router.post('/auth/forgot-userid', async (req, res) => {
  const { phone, universityRegNo } = req.body ?? {};
  if (!phone && !universityRegNo) {
    return res.status(400).json({ success: false, message: 'phone or universityRegNo is required', data: null });
  }
  const user = await prisma.user.findFirst({
    where: {
      OR: [phone ? { phone: String(phone) } : undefined, universityRegNo ? { universityRegNo: String(universityRegNo) } : undefined].filter(Boolean) as NonNullable<unknown> as Array<{ phone?: string; universityRegNo?: string }>,
    },
  });
  if (!user) return res.status(404).json({ success: false, message: 'User not registered', data: null });
  const [localPart, domain] = user.email.split('@');
  const maskedLocal = localPart.length <= 2 ? `${localPart[0]}*` : `${localPart[0]}${'*'.repeat(Math.max(localPart.length - 2, 1))}${localPart.at(-1)}`;
  return res.json(ok({ email: user.email, maskedEmail: `${maskedLocal}@${domain}` }));
});

router.get('/admin/dashboard', verifyJWT, requireRole('SUPER_ADMIN'), async (_req, res) => {
  const [colleges, industries, students] = await Promise.all([prisma.college.count(), prisma.industry.count(), prisma.student.count()]);
  return res.json(ok({ summary: { colleges, industries, students } }));
});

router.get('/super-admin/dashboard', verifyJWT, requireRole('SUPER_ADMIN'), async (_req, res) => {
  const [colleges, industries, applications] = await Promise.all([prisma.college.count(), prisma.industry.count(), prisma.application.count()]);
  return res.json(ok({ analytics: { totalColleges: colleges, totalIndustries: industries, totalApplications: applications } }));
});

router.get('/industry/dashboard', verifyJWT, requireRole('INDUSTRY'), async (req: AuthenticatedRequest, res) => {
  const industry = await prisma.industry.findFirst({ where: { userId: req.user!.userId } });
  if (!industry) return res.status(404).json({ success: false, message: 'Industry profile not found', data: null });

  const approvedColleges = await prisma.college.findMany({ where: { status: 'APPROVED' }, select: { id: true, name: true } });
  return res.json(ok({ industry: { id: industry.id, name: industry.name }, stats: { liveOpportunities: 0, pendingApplications: 0, acceptedApplications: 0, attendanceToday: 0 }, approvedColleges, applications: [] }));
});

router.get('/student/dashboard', verifyJWT, requireRole('STUDENT', 'EXTERNAL_STUDENT'), async (req: AuthenticatedRequest, res) => {
  const student = await prisma.student.findFirst({ where: { userId: req.user!.userId } });
  const internships = await prisma.internship.findMany({ orderBy: { title: 'asc' } });

  if (!student) {
    return res.json(ok({ internships: internships.map((i) => ({ id: i.id, title: i.title, description: i.description, industryName: 'Industry partner', applied: false })), applications: [], journeyCompletion: 25, journeySteps: [{ label: 'Create profile', done: true }, { label: 'Apply', done: false }] }));
  }

  const applications = await prisma.application.findMany({ where: { studentId: student.id }, include: { internship: true } });

  return res.json(ok({
    internships: internships.map((i) => ({ id: i.id, title: i.title, description: i.description, industryName: 'Industry partner', applied: applications.some((a) => a.internshipId === i.id), status: applications.some((a) => a.internshipId === i.id) ? 'SUBMITTED' : undefined })),
    applications: applications.map((a) => ({ id: a.id, internshipTitle: a.internship.title, industryName: 'Industry partner', status: 'SUBMITTED' })),
    journeyCompletion: applications.length ? 60 : 30,
    journeySteps: [{ label: 'Complete profile', done: true }, { label: 'Apply internships', done: applications.length > 0 }, { label: 'Track decision', done: false }],
  }));
});

router.get('/department/dashboard', verifyJWT, requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN'), async (_req, res) => {
  return res.json(ok({ modules: ['Approvals', 'Monitor Students', 'Reports'] }));
});



// Prefix-mounted aliases (for /api/auth, /api/student, /api/industry, /api/department)
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required', data: null });
  }

  const normalizedEmail = String(email).toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return res.status(404).json({ success: false, message: 'User not registered', data: { redirect: '/register' } });

  const isPasswordCorrect = user.password ? await bcrypt.compare(String(password), user.password) : false;
  if (!isPasswordCorrect) return res.status(401).json({ success: false, message: 'Invalid credentials', data: null });

  const payload = { token: signToken(user.id, user.role), user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  return res.json({ ...ok(payload), ...payload });
});

router.post('/forgot-password', async (req, res) => {
  const { email, phone, universityRegNo } = req.body ?? {};
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        email ? { email: String(email).toLowerCase() } : undefined,
        phone ? { phone: String(phone) } : undefined,
        universityRegNo ? { universityRegNo: String(universityRegNo) } : undefined,
      ].filter(Boolean) as Array<{ email?: string; phone?: string; universityRegNo?: string }>,
    },
  });
  if (!user) return res.status(404).json({ success: false, message: 'User not registered', data: null });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.user.update({ where: { id: user.id }, data: { otp: code, otpExpiry: new Date(Date.now() + 5 * 60_000) } });
  await emailService.sendEmail(user.email, 'Your Password Reset OTP', `Your verification code is ${code}`, `<h2>Your OTP: ${code}</h2>`);
  return res.json(ok({ otpSent: true }));
});

router.post('/reset-password', async (req, res) => {
  const { identifier, otp, newPassword } = req.body ?? {};
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: String(identifier).toLowerCase() }, { phone: String(identifier) }, { universityRegNo: String(identifier) }] },
  });
  if (!user || !user.otp || user.otp !== String(otp) || !user.otpExpiry || user.otpExpiry.getTime() < Date.now()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP', data: null });
  }
  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(String(newPassword), 10), otp: null, otpExpiry: null } });
  return res.json(ok({ passwordUpdated: true }));
});

router.post('/forgot-userid', async (req, res) => {
  const { phone, universityRegNo } = req.body ?? {};
  const user = await prisma.user.findFirst({
    where: {
      OR: [phone ? { phone: String(phone) } : undefined, universityRegNo ? { universityRegNo: String(universityRegNo) } : undefined].filter(Boolean) as Array<{ phone?: string; universityRegNo?: string }>,
    },
  });
  if (!user) return res.status(404).json({ success: false, message: 'User not registered', data: null });
  return res.json(ok({ email: user.email }));
});

router.get('/dashboard', verifyJWT, async (req: AuthenticatedRequest, res) => {
  if (req.user?.role === 'STUDENT' || req.user?.role === 'EXTERNAL_STUDENT') return res.redirect(307, '/api/student/dashboard');
  if (req.user?.role === 'INDUSTRY') return res.redirect(307, '/api/industry/dashboard');
  if (req.user?.role === 'SUPER_ADMIN') return res.redirect(307, '/api/admin/dashboard');
  if (req.user?.role === 'COLLEGE_ADMIN') return res.redirect(307, '/api/college/dashboard');
  return res.json(ok({ role: req.user?.role ?? 'UNKNOWN' }));
});

export { router };
