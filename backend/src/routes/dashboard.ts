import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@prism/database';
import { ok } from '../lib/http.js';
import { requireAuth } from '../lib/security.js';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/dashboard/summary', { preHandler: requireAuth() }, async (request) => {
    const tenantId = request.user!.tenantId;
    const [tenant, users, notifications, unreadNotifications, recentAuditLogs] = await Promise.all([
      prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
      prisma.user.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.notification.count({ where: { tenantId } }),
      prisma.notification.count({ where: { tenantId, userId: request.user!.sub, readAt: null } }),
      prisma.auditLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);

    return ok('Dashboard summary loaded successfully.', {
      tenant,
      stats: {
        totalUsers: await prisma.user.count({ where: { tenantId } }),
        adminCount: await prisma.user.count({ where: { tenantId, role: 'ADMIN' } }),
        staffCount: await prisma.user.count({ where: { tenantId, role: 'STAFF' } }),
        endUserCount: await prisma.user.count({ where: { tenantId, role: 'USER' } }),
        notifications,
        unreadNotifications,
      },
      latestUsers: users,
      recentAuditLogs,
    });
  });
};
