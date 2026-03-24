import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { CollegeStatus, Role } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { emailService } from '../services/email.service.js';
import { requireRole, verifyJWT, type AuthenticatedRequest } from '../middlewares/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const SUPER_ADMIN_EMAIL = 'abdulkareem@psmocollege.ac.in';

const otpStore = new Map<string, { code: string; expiresAt: number }>();
const resetOtpStore = new Map<string, { code: string; expiresAt: number }>();
const loginAttemptsStore = new Map<string, { count: number; lastAttemptAt: number }>();
const industryTypes = new Map<string, { id: string; name: string }>();

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

router.post('/college/register', async (req, res) => {
  const { collegeName, address, email, phone, university, loginEmail, password } = req.body ?? {};
  if (!collegeName || !loginEmail || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields', data: null });
  }

  const existing = await prisma.user.findUnique({ where: { email: String(loginEmail).toLowerCase() } });
  if (existing) return res.status(409).json({ success: false, message: 'Coordinator account already exists', data: null });

  const user = await prisma.user.create({
    data: { email: String(loginEmail).toLowerCase(), name: String(collegeName), password: await bcrypt.hash(String(password), 10), role: 'COLLEGE_ADMIN' },
  });

  const college = await prisma.college.create({
    data: {
      name: String(collegeName),
      email: email ? String(email) : null,
      phone: phone ? String(phone) : null,
      address: address ? String(address) : null,
      university: university ? String(university) : null,
      status: CollegeStatus.PENDING_APPROVAL,
      createdById: user.id,
    },
  });

  return res.status(201).json(ok({ token: signToken(user.id, user.role), role: user.role, user: { id: user.id, email: user.email, role: user.role }, college }));
});

router.get('/catalog/colleges', async (_req, res) => {
  const colleges = await prisma.college.findMany({ where: { status: CollegeStatus.APPROVED }, orderBy: { name: 'asc' }, select: { id: true, name: true } });
  return res.json(ok({ colleges }));
});

router.post('/industry-type/create', async (req, res) => {
  const { name } = req.body ?? {};
  if (!name) return res.status(400).json({ success: false, message: 'name is required', data: null });
  const id = crypto.randomUUID();
  industryTypes.set(id, { id, name: String(name) });
  return res.status(201).json(ok({ id, name: String(name) }, 'Industry type created'));
});

router.get('/industry-type/list', async (_req, res) => {
  return res.json(ok(Array.from(industryTypes.values()).sort((a, b) => a.name.localeCompare(b.name))));
});

router.put('/industry-type/:id', verifyJWT, requireRole('SUPER_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name } = req.body ?? {};
  const found = industryTypes.get(id);
  if (!found) return res.status(404).json({ success: false, message: 'Industry type not found', data: null });
  found.name = String(name);
  industryTypes.set(id, found);
  return res.json(ok(found, 'Industry type updated'));
});

router.delete('/industry-type/:id', async (req, res) => {
  industryTypes.delete(req.params.id);
  return res.json(ok({ id: req.params.id }, 'Industry type deleted'));
});

router.post('/industry/create', async (req, res) => {
  const { name, email, password, industryType, registrationNumber, registrationYear } = req.body ?? {};
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Missing required fields', data: null });

  const normalized = String(email).toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) return res.status(409).json({ success: false, message: 'Industry account already exists', data: null });

  const user = await prisma.user.create({ data: { email: normalized, password: await bcrypt.hash(String(password), 10), role: 'INDUSTRY' } });
  const industry = await prisma.industry.create({
    data: {
      name: String(name),
      email: normalized,
      approved: false,
      userId: user.id,
      registrationDetails: `${String(industryType ?? 'General')} | ${String(registrationNumber ?? '-')}/${String(registrationYear ?? '-')}`,
    },
  });

  return res.status(201).json(ok({ industry, token: signToken(user.id, user.role), role: user.role, user: { id: user.id, email: user.email, role: user.role } }));
});

router.post('/student/register', async (req, res) => {
  const { email, password, collegeId } = req.body ?? {};
  if (!email || !password || !collegeId) return res.status(400).json({ success: false, message: 'Missing required fields', data: null });

  const user = await prisma.user.create({
    data: { email: String(email).toLowerCase(), name: String(req.body?.name ?? 'Student'), password: await bcrypt.hash(String(password), 10), role: 'STUDENT' },
  });

  const department = await prisma.department.findFirst({ where: { collegeId: String(collegeId) }, orderBy: { createdAt: 'asc' } });
  if (!department) return res.status(400).json({ success: false, message: 'Selected college has no departments yet', data: null });

  const student = await prisma.student.create({ data: { userId: user.id, collegeId: String(collegeId), departmentId: department.id } });
  return res.status(201).json(ok({ student, token: signToken(user.id, user.role), role: user.role, user: { id: user.id, email: user.email, role: user.role } }));
});

router.post('/auth/login', async (req, res) => {
  const { email } = req.body ?? {};
  if (!email) return res.status(400).json({ success: false, message: 'Email is required', data: null });

  const normalizedEmail = String(email).toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return res.status(404).json({ success: false, message: 'User not found', data: null });

  if (normalizedEmail === SUPER_ADMIN_EMAIL) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(normalizedEmail, { code: otp, expiresAt: Date.now() + 10 * 60_000 });
    await emailService.sendEmail(normalizedEmail, 'Your Admin Login Code', `Your OTP: ${otp}`, `<h2>Your OTP: ${otp}</h2>`);
    return res.json(ok({ requiresOtp: true }, 'OTP sent to super admin email'));
  }

  return res.json(ok({ requiresPassword: true }, 'Password required'));
});

router.post('/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body ?? {};
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required', data: null });

  const normalizedEmail = String(email).toLowerCase();
  if (normalizedEmail !== SUPER_ADMIN_EMAIL) return res.status(403).json({ success: false, message: 'OTP login allowed only for super admin', data: null });

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return res.status(404).json({ success: false, message: 'User not found', data: null });

  const entry = otpStore.get(normalizedEmail);
  if (!entry || Date.now() > entry.expiresAt) return res.status(400).json({ success: false, message: 'Code expired', data: null });
  if (entry.code !== String(otp)) return res.status(401).json({ success: false, message: 'Incorrect code', data: null });

  otpStore.delete(normalizedEmail);
  return res.json(ok({ token: signToken(user.id, user.role), role: user.role, user: { id: user.id, email: user.email, role: user.role } }));
});

router.post('/auth/login-password', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required', data: null });

  const normalizedEmail = String(email).toLowerCase();
  if (normalizedEmail === SUPER_ADMIN_EMAIL) return res.status(400).json({ success: false, message: 'Super admin must use OTP login', data: null });

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !(await bcrypt.compare(String(password), user.password))) {
    const attempts = trackAttempt(normalizedEmail);
    if (attempts >= 3) return res.status(401).json({ success: false, message: 'Invalid credentials. 3 attempts reached. Please reset password.', data: null });
    return res.status(401).json({ success: false, message: `Invalid credentials. ${3 - attempts} attempts remaining.`, data: null });
  }

  if (user.role === 'COLLEGE_ADMIN') {
    const college = await prisma.college.findFirst({ where: { createdById: user.id } });
    if (!college || college.status !== CollegeStatus.APPROVED) return res.status(403).json({ success: false, message: 'College account pending approval', data: null });
  }
  if (user.role === 'INDUSTRY') {
    const industry = await prisma.industry.findFirst({ where: { userId: user.id } });
    if (!industry || !industry.approved) return res.status(403).json({ success: false, message: 'Industry account pending approval', data: null });
  }

  loginAttemptsStore.delete(normalizedEmail);
  return res.json(ok({ token: signToken(user.id, user.role), role: user.role, user: { id: user.id, email: user.email, role: user.role } }));
});

router.post('/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body ?? {};
  if (!email) return res.status(400).json({ success: false, message: 'Email is required', data: null });

  const normalizedEmail = String(email).toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return res.json(ok({ emailExists: false }, 'Email not found'));

  if (!otp || !newPassword) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    resetOtpStore.set(normalizedEmail, { code, expiresAt: Date.now() + 10 * 60_000 });
    await emailService.sendEmail(normalizedEmail, 'Your Password Reset OTP', `Your verification code is ${code}`, `<h2>Your OTP: ${code}</h2>`);
    return res.json(ok({ emailExists: true, otpSent: true }));
  }

  const entry = resetOtpStore.get(normalizedEmail);
  if (!entry || Date.now() > entry.expiresAt) return res.status(400).json({ success: false, message: 'Code expired', data: null });
  if (entry.code !== String(otp)) return res.status(401).json({ success: false, message: 'Incorrect code', data: null });

  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(String(newPassword), 10) } });
  resetOtpStore.delete(normalizedEmail);
  return res.json(ok({ emailExists: true, passwordUpdated: true }));
});

router.get('/super-admin/dashboard', verifyJWT, requireRole('SUPER_ADMIN'), async (_req, res) => {
  const [colleges, industries, applications] = await Promise.all([
    prisma.college.findMany({ include: { createdBy: true }, orderBy: { createdAt: 'desc' } }),
    prisma.industry.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.application.count(),
  ]);

  return res.json(ok({
    colleges: colleges.map((c) => ({ id: c.id, name: c.name, coordinatorName: c.createdBy.name ?? '-', email: c.email ?? '-', phone: c.phone ?? '-', status: c.status, studentsCount: 0 })),
    industries: industries.map((i) => ({ id: i.id, name: i.name, category: i.registrationDetails?.split('|')[0]?.trim() ?? 'General', email: i.email ?? '-', phone: '-', status: i.approved ? 'APPROVED' : 'REJECTED' })),
    analytics: { totalApplications: applications, totalInternships: 0 },
  }));
});

router.get('/super-admin/college/:id/students', verifyJWT, requireRole('SUPER_ADMIN'), async (req, res) => {
  const students = await prisma.student.findMany({ where: { collegeId: req.params.id }, include: { user: true }, orderBy: { createdAt: 'desc' } });
  return res.json(ok(students.map((s) => ({ id: s.id, name: s.user.name ?? 'Student', email: s.user.email, phone: '-' }))));
});

router.put('/super-admin/college/:id', verifyJWT, requireRole('SUPER_ADMIN'), async (req, res) => {
  const { action, ...updates } = req.body ?? {};
  const data: Record<string, unknown> = {};
  if (action === 'APPROVED') data.status = CollegeStatus.APPROVED;
  if (action === 'REJECTED') data.status = CollegeStatus.REJECTED;
  if (updates.name) data.name = String(updates.name);
  if (updates.email) data.email = String(updates.email);
  if (updates.phone) data.phone = String(updates.phone);
  const college = await prisma.college.update({ where: { id: req.params.id }, data });
  return res.json(ok(college));
});

router.delete('/super-admin/college/:id', verifyJWT, requireRole('SUPER_ADMIN'), async (req, res) => {
  await prisma.college.delete({ where: { id: req.params.id } });
  return res.json(ok({ id: req.params.id }));
});

router.put('/super-admin/industry/:id', verifyJWT, requireRole('SUPER_ADMIN'), async (req, res) => {
  const { action, ...updates } = req.body ?? {};
  const data: Record<string, unknown> = {};
  if (action === 'APPROVED') data.approved = true;
  if (action === 'REJECTED') data.approved = false;
  if (updates.name) data.name = String(updates.name);
  if (updates.email) data.email = String(updates.email);
  const industry = await prisma.industry.update({ where: { id: req.params.id }, data });
  return res.json(ok(industry));
});

router.delete('/super-admin/industry/:id', verifyJWT, requireRole('SUPER_ADMIN'), async (req, res) => {
  await prisma.industry.delete({ where: { id: req.params.id } });
  return res.json(ok({ id: req.params.id }));
});

router.get('/college/dashboard', verifyJWT, requireRole('COLLEGE_ADMIN', 'COLLEGE'), async (req: AuthenticatedRequest, res) => {
  const college = await prisma.college.findFirst({ where: { createdById: req.user!.userId } });
  if (!college) return res.status(404).json({ success: false, message: 'College profile not found', data: null });
  return res.json(ok({ college: { id: college.id, name: college.name, address: college.address ?? '' }, stats: { pendingMous: 0, approvedIndustries: 0, activeStudents: 0, applicationsSubmitted: 0 }, pendingMous: [], approvedIndustries: [], modules: ['Departments', 'Students'] }));
});

router.get('/industry/dashboard', verifyJWT, requireRole('INDUSTRY'), async (req: AuthenticatedRequest, res) => {
  const industry = await prisma.industry.findFirst({ where: { userId: req.user!.userId } });
  if (!industry) return res.status(404).json({ success: false, message: 'Industry profile not found', data: null });
  const approvedColleges = await prisma.college.findMany({ where: { status: CollegeStatus.APPROVED }, select: { id: true, name: true } });
  return res.json(ok({ industry: { id: industry.id, name: industry.name }, stats: { liveOpportunities: 0, pendingApplications: 0, acceptedApplications: 0, attendanceToday: 0 }, approvedColleges, applications: [] }));
});

router.get('/student/dashboard', verifyJWT, requireRole('STUDENT', 'EXTERNAL_STUDENT'), async (req: AuthenticatedRequest, res) => {
  const student = await prisma.student.findFirst({ where: { userId: req.user!.userId } });
  if (!student) {
    return res.json(ok({ internships: [], applications: [], journeyCompletion: 25, journeySteps: [{ label: 'Create profile', done: true }, { label: 'Apply', done: false }] }));
  }

  const [internships, applications] = await Promise.all([
    prisma.internship.findMany({ include: { industry: true }, orderBy: { createdAt: 'desc' } }),
    prisma.application.findMany({ where: { studentId: student.id }, include: { internship: { include: { industry: true } } } }),
  ]);

  return res.json(ok({
    internships: internships.map((i) => ({ id: i.id, title: i.title, description: i.description, industryName: i.industry.name, applied: applications.some((a) => a.internshipId === i.id), status: applications.find((a) => a.internshipId === i.id)?.status })),
    applications: applications.map((a) => ({ id: a.id, internshipTitle: a.internship.title, industryName: a.internship.industry.name, status: a.status })),
    journeyCompletion: applications.length ? 60 : 30,
    journeySteps: [{ label: 'Complete profile', done: true }, { label: 'Apply internships', done: applications.length > 0 }, { label: 'Track decision', done: false }],
  }));
});

export { router };
