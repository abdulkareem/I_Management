import type { FastifyPluginAsync } from 'fastify';
import { UserRole, prisma } from '@prism/database';
import { z } from 'zod';
import { createAuditLog } from '../lib/audit.js';
import { fail, ok } from '../lib/http.js';
import { hashPassword, requireAuth } from '../lib/security.js';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  registrationNumber: z.string().min(2),
  programme: z.string().min(2),
  year: z.coerce.number().int().min(1).max(8),
  semester: z.coerce.number().int().min(1).max(16),
  password: z.string().min(8),
});

const updateUserSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  programme: z.string().min(2).optional(),
  year: z.coerce.number().int().min(1).max(8).optional(),
  semester: z.coerce.number().int().min(1).max(16).optional(),
});

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get('/users', { preHandler: requireAuth() }, async (request) => {
    const users = await prisma.user.findMany({
      where: { tenantId: request.user!.tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        registrationNumber: true,
        programme: true,
        year: true,
        semester: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });
    return ok('Users loaded successfully.', { users });
  });

  app.post('/users', { preHandler: requireAuth({ roles: [UserRole.ADMIN] }) }, async (request, reply) => {
    const payload = createUserSchema.parse(request.body);
    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: request.user!.tenantId, email: payload.email.toLowerCase() } },
    });
    if (existing) {
      reply.code(409);
      return fail('A user with this email already exists in the tenant.', { field: 'email' });
    }

    const user = await prisma.user.create({
      data: {
        tenantId: request.user!.tenantId,
        name: payload.name,
        email: payload.email.toLowerCase(),
        role: payload.role,
        registrationNumber: payload.registrationNumber,
        programme: payload.programme,
        year: payload.year,
        semester: payload.semester,
        passwordHash: hashPassword(payload.password),
      },
    });

    await createAuditLog({
      tenantId: request.user!.tenantId,
      actorUserId: request.user!.sub,
      action: 'user.create',
      entityType: 'User',
      entityId: user.id,
      description: 'Created a user inside the current tenant.',
      metadata: { role: user.role, email: user.email },
    });

    reply.code(201);
    return ok('User created successfully.', { user });
  });

  app.patch('/users/:userId', { preHandler: requireAuth({ roles: [UserRole.ADMIN] }) }, async (request) => {
    const params = z.object({ userId: z.string().min(1) }).parse(request.params);
    const payload = updateUserSchema.parse(request.body);
    const existing = await prisma.user.findFirstOrThrow({
      where: { id: params.userId, tenantId: request.user!.tenantId },
    });
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: payload,
    });

    await createAuditLog({
      tenantId: request.user!.tenantId,
      actorUserId: request.user!.sub,
      action: 'user.update',
      entityType: 'User',
      entityId: user.id,
      description: 'Updated a user record.',
      metadata: payload,
    });

    return ok('User updated successfully.', { user });
  });
};
