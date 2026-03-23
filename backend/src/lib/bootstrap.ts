import { TenantPlan, TenantStatus, UserRole, prisma } from '@prism/database';
import { createAuditLog } from './audit.js';
import { hashPassword } from './security.js';

export async function bootstrapDemoData() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'northstar-university' },
    update: {},
    create: {
      name: 'Northstar University',
      slug: 'northstar-university',
      plan: TenantPlan.PRO,
      status: TenantStatus.ACTIVE,
    },
  });

  const existing = await prisma.user.findFirst({ where: { tenantId: tenant.id, email: 'admin@northstar.edu' } });
  if (!existing) {
    const admin = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: 'Ariana Admin',
        email: 'admin@northstar.edu',
        passwordHash: hashPassword('Demo12345'),
        role: UserRole.ADMIN,
        registrationNumber: 'ADM-001',
        programme: 'MBA',
        year: 1,
        semester: 1,
        emailVerifiedAt: new Date(),
      },
    });

    const staff = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: 'Sam Staff',
        email: 'staff@northstar.edu',
        passwordHash: hashPassword('Demo12345'),
        role: UserRole.STAFF,
        registrationNumber: 'STF-114',
        programme: 'Operations',
        emailVerifiedAt: new Date(),
      },
    });

    const learner = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: 'Uma User',
        email: 'user@northstar.edu',
        passwordHash: hashPassword('Demo12345'),
        role: UserRole.USER,
        registrationNumber: 'REG-2026-1001',
        programme: 'BCA',
        year: 3,
        semester: 6,
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.notification.createMany({
      data: [
        {
          tenantId: tenant.id,
          userId: admin.id,
          title: 'Workspace ready',
          body: 'Northstar University has been provisioned with the Pro plan and audit logging enabled.',
        },
        {
          tenantId: tenant.id,
          userId: staff.id,
          title: 'Review queue synced',
          body: 'The staff review queue is active and ready for task assignment.',
        },
        {
          tenantId: tenant.id,
          userId: learner.id,
          title: 'Welcome aboard',
          body: 'Complete your profile and enable notifications to stay updated on assignments.',
        },
      ],
    });

    await createAuditLog({
      tenantId: tenant.id,
      actorUserId: admin.id,
      action: 'tenant.bootstrap',
      entityType: 'Tenant',
      entityId: tenant.id,
      description: 'Created the default multi-tenant workspace seed data.',
    });
  }
}
