import type { FastifyPluginAsync } from 'fastify';
import { TenantPlan, TenantStatus, UserRole, prisma } from '@prism/database';
import { z } from 'zod';
import { createAuditLog } from '../lib/audit.js';
import { ok } from '../lib/http.js';
import { requireAuth } from '../lib/security.js';

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  plan: z.nativeEnum(TenantPlan).optional(),
  status: z.nativeEnum(TenantStatus).optional(),
});

export const tenantRoutes: FastifyPluginAsync = async (app) => {
  app.get('/tenants/current', { preHandler: requireAuth() }, async (request) => {
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: request.user!.tenantId } });
    return ok('Tenant loaded successfully.', { tenant });
  });

  app.patch('/tenants/current', { preHandler: requireAuth({ roles: [UserRole.ADMIN] }) }, async (request) => {
    const payload = updateTenantSchema.parse(request.body);
    const tenant = await prisma.tenant.update({
      where: { id: request.user!.tenantId },
      data: payload,
    });

    await createAuditLog({
      tenantId: tenant.id,
      actorUserId: request.user!.sub,
      action: 'tenant.update',
      entityType: 'Tenant',
      entityId: tenant.id,
      description: 'Updated tenant settings.',
      metadata: payload,
    });

    return ok('Tenant updated successfully.', { tenant });
  });
};
