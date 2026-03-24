import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

function ok(data: unknown, message?: string) {
  return { success: true, message, data };
}

function signToken(userId: string, role: Role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

router.post('/college/register', async (req, res) => {
  console.log('BODY:', req.body);
  const { collegeName, address, email, phone, university, loginEmail, password } = req.body ?? {};
  if (!collegeName || !address || !email || !phone || !university || !loginEmail || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields', data: null });
  }

  const existing = await prisma.user.findUnique({ where: { email: String(loginEmail) } });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Coordinator account already exists', data: null });
  }

  const hashedPassword = await bcrypt.hash(String(password), 10);
  const user = await prisma.user.create({
    data: {
      email: String(loginEmail),
      password: hashedPassword,
      role: 'COLLEGE_ADMIN',
    },
  });

  const college = await prisma.college.create({
    data: {
      name: String(collegeName),
      email: String(email),
      phone: String(phone),
      address: String(address),
      university: String(university),
      status: 'PENDING',
      coordinatorId: user.id,
    },
  });

  return res.status(201).json(
    ok(
      {
        token: signToken(user.id, user.role),
        role: user.role,
        user: { id: user.id, email: user.email },
        college,
      },
      'College registration submitted',
    ),
  );
});

router.get('/catalog/colleges', async (_req, res) => {
  const colleges = await prisma.college.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  return res.json(ok({ colleges }));
});

router.post('/industry-type/create', async (req, res) => {
  console.log('BODY:', req.body);
  const { name } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ success: false, message: 'name is required', data: null });
  }
  const industryType = await prisma.industryType.create({ data: { name: String(name) } });
  return res.status(201).json(ok(industryType, 'Industry type created'));
});

router.get('/industry-type/list', async (_req, res) => {
  const list = await prisma.industryType.findMany({ orderBy: { name: 'asc' } });
  return res.json(ok(list));
});

router.delete('/industry-type/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.industryType.delete({ where: { id } });
  return res.json(ok({ id }, 'Industry type deleted'));
});

router.post('/industry/create', async (req, res) => {
  console.log('BODY:', req.body);
  const { name, email, password, industryType } = req.body ?? {};
  if (!name || !email || !password || !industryType) {
    return res.status(400).json({ success: false, message: 'Missing required fields', data: null });
  }

  const type = await prisma.industryType.findFirst({ where: { name: String(industryType) } });
  const typeId = type
    ? type.id
    : (
        await prisma.industryType.create({
          data: { name: String(industryType) },
        })
      ).id;

  const existing = await prisma.user.findUnique({ where: { email: String(email) } });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Industry account already exists', data: null });
  }

  const hashedPassword = await bcrypt.hash(String(password), 10);
  const user = await prisma.user.create({
    data: { email: String(email), password: hashedPassword, role: 'INDUSTRY' },
  });

  const industry = await prisma.industry.create({
    data: {
      name: String(name),
      email: String(email),
      typeId,
      userId: user.id,
      approved: false,
    },
    include: { type: true },
  });

  return res.status(201).json(ok({ industry, token: signToken(user.id, user.role) }, 'Industry created'));
});

router.post('/student/register', async (req, res) => {
  console.log('BODY:', req.body);
  const { name, email, password, phone, collegeId } = req.body ?? {};
  if (!name || !email || !password || !phone || !collegeId) {
    return res.status(400).json({ success: false, message: 'Missing required fields', data: null });
  }

  const hashedPassword = await bcrypt.hash(String(password), 10);
  const user = await prisma.user.create({
    data: { email: String(email), password: hashedPassword, role: 'STUDENT' },
  });

  const student = await prisma.student.create({
    data: {
      name: String(name),
      email: String(email),
      phone: String(phone),
      collegeId: String(collegeId),
      userId: user.id,
    },
  });

  return res.status(201).json(ok({ student, token: signToken(user.id, user.role), role: user.role }, 'Student created'));
});

router.get('/internships/public', async (_req, res) => {
  const internships = await prisma.internship.findMany({
    include: { college: { select: { id: true, name: true } } },
    orderBy: { title: 'asc' },
  });

  return res.json(
    ok(
      internships.map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        departmentId: '',
        departmentName: 'General',
        collegeId: i.collegeId,
        collegeName: i.college.name,
      })),
    ),
  );
});

router.post('/external/apply', async (req, res) => {
  console.log('BODY:', req.body);
  const { fullName, email, phone, college, university, internshipId, password } = req.body ?? {};
  if (!fullName || !email || !phone || !college || !university || !internshipId || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields', data: null });
  }

  const hashedPassword = await bcrypt.hash(String(password), 10);
  const user = await prisma.user.create({
    data: { email: String(email), password: hashedPassword, role: 'EXTERNAL_STUDENT' },
  });

  const externalStudent = await prisma.externalStudent.create({
    data: {
      name: String(fullName),
      email: String(email),
      phone: String(phone),
      college: String(college),
      university: String(university),
      userId: user.id,
    },
  });

  return res.status(201).json(ok({ externalStudent, internshipId }, 'External student application submitted'));
});

router.post('/auth/login', async (req, res) => {
  console.log('BODY:', req.body);
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required', data: null });
  }

  const user = await prisma.user.findUnique({ where: { email: String(email) } });
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials', data: null });
  }

  const valid = await bcrypt.compare(String(password), user.password);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid credentials', data: null });
  }

  return res.json(ok({ token: signToken(user.id, user.role), role: user.role, user: { id: user.id, email: user.email } }));
});

export { router };
