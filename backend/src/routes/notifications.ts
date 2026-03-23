import type { FastifyPluginAsync } from 'fastify';
import { NotificationType, UserRole, prisma } from '@prism/database';
import { z } from 'zod';
import { createAuditLog } from '../lib/audit.js';
import { fail, ok } from '../lib/http.js';
import { requireAuth } from '../lib/security.js';

const assignSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(4),
  userId: z.string().optional(),
  type: z.nativeEnum(NotificationType).default(NotificationType.TASK_ASSIGNED),
});

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/notifications', { preHandler: requireAuth() }, async (request) => {
    const notifications = await prisma.notification.findMany({
      where: { tenantId: request.user!.tenantId, userId: request.user!.sub },
      orderBy: { createdAt: 'desc' },
    });
    return ok('Notifications loaded successfully.', { notifications });
  });

  app.post('/notifications/assign', { preHandler: requireAuth({ roles: [UserRole.ADMIN, UserRole.STAFF] }) }, async (request, reply) => {
    const payload = assignSchema.parse(request.body);
    const recipients = payload.userId
      ? await prisma.user.findMany({ where: { id: payload.userId, tenantId: request.user!.tenantId } })
      : await prisma.user.findMany({ where: { tenantId: request.user!.tenantId } });

    if (recipients.length === 0) {
      reply.code(404);
      return fail('No recipients found in the current tenant.', { created: 0 });
    }

    await prisma.notification.createMany({
      data: recipients.map((recipient) => ({
        tenantId: request.user!.tenantId,
        userId: recipient.id,
        title: payload.title,
        body: payload.body,
        type: payload.type,
      })),
    });

    await createAuditLog({
      tenantId: request.user!.tenantId,
      actorUserId: request.user!.sub,
      action: 'notification.assign',
      entityType: 'Notification',
      description: 'Assigned a notification to tenant users.',
      metadata: { recipients: recipients.length, type: payload.type },
    });

    return ok('Notifications assigned successfully.', { created: recipients.length });
  });

  app.post('/notifications/:notificationId/read', { preHandler: requireAuth() }, async (request) => {
    const params = z.object({ notificationId: z.string().min(1) }).parse(request.params);
    const notificationRecord = await prisma.notification.findFirstOrThrow({
      where: { id: params.notificationId, tenantId: request.user!.tenantId, userId: request.user!.sub },
    });
    const notification = await prisma.notification.update({
      where: { id: notificationRecord.id },
      data: { readAt: new Date() },
    });

    return ok('Notification marked as read.', { notification });
  });
};
