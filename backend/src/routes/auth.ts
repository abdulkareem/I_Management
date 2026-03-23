import type { FastifyPluginAsync } from 'fastify';
import { Role, prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { ok } from '../lib/http.js';
import { createAccessToken, hashPassword, requireAuth, validatePasswordPolicy, verifyPassword } from '../lib/security.js';

const baseSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(64),
  name: z.string().min(2),
});

const studentRegisterSchema = baseSchema.extend({
  collegeId: z.string().min(1),
  departmentId: z.string().optional(),
  universityRegNo: z.string().min(4),
  dob: z.string().datetime(),
  whatsapp: z.string().min(8),
  address: z.string().min(5),
});

const collegeRegisterSchema = baseSchema.extend({
  collegeName: z.string().min(2),
  emblem: z.string().url().optional(),
  address: z.string().min(5),
  departments: z.array(z.string().min(2)).min(1),
});

const industryRegisterSchema = baseSchema.extend({
  companyName: z.string().min(2),
  emblem: z.string().url().optional(),
  description: z.string().min(10).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(64),
});

async function buildSession(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { college: true, industry: true, student: true },
  });

  const profile = {
    collegeId: user.college?.id,
    industryId: user.industry?.id,
    studentId: user.student?.id,
  };

  return {
    accessToken: createAccessToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profile,
    }),
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    profile,
  };
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/register/student', async (request, reply) => {
    const payload = studentRegisterSchema.parse(request.body);
    if (!validatePasswordPolicy(payload.password)) {
      reply.code(400);
      throw new Error('Password must include letters and numbers and be 8-64 characters long.');
    }

    const created = await prisma.user.create({
      data: {
        email: payload.email.toLowerCase(),
        password: hashPassword(payload.password),
        name: payload.name,
        role: Role.STUDENT,
        student: {
          create: {
            collegeId: payload.collegeId,
            departmentId: payload.departmentId,
            universityRegNo: payload.universityRegNo,
            dob: new Date(payload.dob),
            whatsapp: payload.whatsapp,
            address: payload.address,
          },
        },
      },
    });

    reply.code(201);
    return ok('Student account created successfully.', await buildSession(created.id));
  });

  app.post('/auth/register/college', async (request, reply) => {
    const payload = collegeRegisterSchema.parse(request.body);
    if (!validatePasswordPolicy(payload.password)) {
      reply.code(400);
      throw new Error('Password must include letters and numbers and be 8-64 characters long.');
    }

    const created = await prisma.user.create({
      data: {
        email: payload.email.toLowerCase(),
        password: hashPassword(payload.password),
        name: payload.name,
        role: Role.COLLEGE_COORDINATOR,
        college: {
          create: {
            name: payload.collegeName,
            emblem: payload.emblem,
            address: payload.address,
            departments: { create: payload.departments.map((name) => ({ name })) },
          },
        },
      },
    });

    reply.code(201);
    return ok('College registered successfully.', await buildSession(created.id));
  });

  app.post('/auth/register/industry', async (request, reply) => {
    const payload = industryRegisterSchema.parse(request.body);
    if (!validatePasswordPolicy(payload.password)) {
      reply.code(400);
      throw new Error('Password must include letters and numbers and be 8-64 characters long.');
    }

    const created = await prisma.user.create({
      data: {
        email: payload.email.toLowerCase(),
        password: hashPassword(payload.password),
        name: payload.name,
        role: Role.INDUSTRY,
        industry: {
          create: {
            name: payload.companyName,
            emblem: payload.emblem,
            description: payload.description,
          },
        },
      },
    });

    reply.code(201);
    return ok('Industry account created successfully.', await buildSession(created.id));
  });

  app.post('/auth/login', async (request) => {
    const payload = loginSchema.parse(request.body);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: payload.email.toLowerCase() },
    });

    if (!verifyPassword(payload.password, user.password)) {
      throw new Error('Invalid email or password.');
    }

    return ok('Login successful.', await buildSession(user.id));
  });

  app.get('/auth/me', { preHandler: requireAuth() }, async (request) => {
    return ok('Authenticated session loaded.', request.user!);
  });
};
