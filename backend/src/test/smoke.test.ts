import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma, VerificationTokenType } from '@prism/database';
import { buildServer } from '../server.js';

const tenantSlug = 'aurora-campus';
const adminEmail = 'owner@aurora.edu';

test('multi-tenant auth lifecycle, user management, notifications, and dashboard summary work end-to-end', async () => {
  await prisma.session.deleteMany({});
  await prisma.verificationToken.deleteMany({ where: { email: adminEmail } });
  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({ where: { tenant: { slug: tenantSlug } } });
  await prisma.tenant.deleteMany({ where: { slug: tenantSlug } });

  const app = buildServer();
  await app.ready();

  const register = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      tenantName: 'Aurora Campus',
      tenantSlug,
      plan: 'PRO',
      name: 'Aurora Owner',
      email: adminEmail,
      password: 'Passw0rd123',
      registrationNumber: 'REG-9001',
      dob: '2000-01-01',
      whatsappNumber: '+15550001111',
      address: '1 SaaS Plaza, San Francisco, CA',
      programme: 'B.Tech',
      year: 4,
      semester: 8,
      photoUrl: 'https://images.example.com/avatar.png',
    },
  });
  assert.equal(register.statusCode, 201);
  const registerBody = register.json() as { success: boolean; data: { delivery: { accepted?: boolean; preview?: { simulated?: boolean } } } };
  assert.equal(registerBody.success, true);
  assert.equal(registerBody.data.delivery.preview?.simulated, true);

  const verification = await prisma.verificationToken.findFirstOrThrow({
    where: { email: adminEmail, type: VerificationTokenType.EMAIL_VERIFICATION, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  const previewHtml = registerBody.data.delivery.preview?.htmlPreview ?? '';
  const tokenMatch = previewHtml.match(/token=([^"&<]+)/);
  assert.ok(tokenMatch?.[1]);

  const verifyEmail = await app.inject({
    method: 'GET',
    url: `/api/auth/verify-email?token=${tokenMatch![1]}`,
  });
  assert.equal(verifyEmail.statusCode, 200);
  assert.equal((verifyEmail.json() as { data: { verified: boolean } }).data.verified, true);
  assert.ok(verification.id);

  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      tenantSlug,
      email: adminEmail,
      password: 'Passw0rd123',
    },
  });
  assert.equal(login.statusCode, 200);
  const token = (login.json() as { data: { accessToken: string } }).data.accessToken;
  assert.ok(token);

  const createUser = await app.inject({
    method: 'POST',
    url: '/api/users',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: 'Nova Staff',
      email: 'staff@aurora.edu',
      role: 'STAFF',
      registrationNumber: 'EMP-77',
      programme: 'Ops',
      year: 1,
      semester: 1,
      password: 'Passw0rd123',
    },
  });
  assert.equal(createUser.statusCode, 201);
  const createdUserId = (createUser.json() as { data: { user: { id: string } } }).data.user.id;

  const assignNotice = await app.inject({
    method: 'POST',
    url: '/api/notifications/assign',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      title: 'Complete onboarding tasks',
      body: 'Upload the final compliance checklist before Friday.',
      userId: createdUserId,
    },
  });
  assert.equal(assignNotice.statusCode, 200);
  assert.equal((assignNotice.json() as { data: { created: number } }).data.created, 1);

  const summary = await app.inject({
    method: 'GET',
    url: '/api/dashboard/summary',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(summary.statusCode, 200);
  const summaryBody = summary.json() as { data: { stats: { totalUsers: number } } };
  assert.equal(summaryBody.data.stats.totalUsers, 2);

  const users = await app.inject({
    method: 'GET',
    url: '/api/users',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(users.statusCode, 200);
  assert.equal((users.json() as { data: { users: Array<unknown> } }).data.users.length, 2);

  await app.close();
});
