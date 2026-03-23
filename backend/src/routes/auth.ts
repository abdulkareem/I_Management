import type { FastifyPluginAsync } from 'fastify';
import { TenantPlan, UserRole, VerificationTokenType, prisma } from '@prism/database';
import { z } from 'zod';
import { createAuditLog } from '../lib/audit.js';
import { fail, ok } from '../lib/http.js';
import { sendTransactionalEmail } from '../lib/mailer.js';
import {
  createSignedSessionToken,
  hashOpaqueToken,
  hashPassword,
  randomToken,
  requireAuth,
  validatePasswordPolicy,
  verifyPassword,
} from '../lib/security.js';

const tenantPlanSchema = z.nativeEnum(TenantPlan);
const roleSchema = z.nativeEnum(UserRole);

const registerSchema = z.object({
  tenantName: z.string().min(2),
  tenantSlug: z.string().min(3).max(48).regex(/^[a-z0-9-]+$/),
  plan: tenantPlanSchema.default(TenantPlan.FREE),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).max(64),
  role: roleSchema.optional(),
  registrationNumber: z.string().min(2),
  dob: z.string().optional(),
  whatsappNumber: z.string().min(8),
  address: z.string().min(6),
  programme: z.string().min(2),
  year: z.coerce.number().int().min(1).max(8),
  semester: z.coerce.number().int().min(1).max(16),
  photoUrl: z.string().url().optional(),
});

const loginSchema = z.object({
  tenantSlug: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
});

const discoverSchema = z.object({
  tenantSlug: z.string().min(3),
  email: z.string().email(),
});

const forgotPasswordSchema = z.object({
  tenantSlug: z.string().min(3),
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(64),
});

function appUrl() {
  return process.env.APP_URL ?? 'http://localhost:3000';
}

async function issueVerificationEmail(input: { tenantId: string; userId: string; email: string }) {
  const token = randomToken(32);
  await prisma.verificationToken.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      email: input.email,
      tokenHash: hashOpaqueToken(token),
      type: VerificationTokenType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const verificationUrl = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  return sendTransactionalEmail({
    to: input.email,
    subject: 'Verify your Prism workspace email',
    html: `<div style="font-family:Inter,Arial,sans-serif;padding:24px"><h1>Verify your email</h1><p>Thanks for creating your account. Confirm your email address to activate your tenant workspace.</p><p><a href="${verificationUrl}" style="display:inline-block;padding:12px 18px;border-radius:9999px;background:#4f46e5;color:#fff;text-decoration:none">Verify email</a></p><p>If the button does not work, copy this URL: ${verificationUrl}</p></div>`,
  });
}

async function issuePasswordResetEmail(input: { tenantId: string; userId: string; email: string }) {
  const token = randomToken(32);
  await prisma.verificationToken.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      email: input.email,
      tokenHash: hashOpaqueToken(token),
      type: VerificationTokenType.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30),
    },
  });

  const resetUrl = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return sendTransactionalEmail({
    to: input.email,
    subject: 'Reset your Prism workspace password',
    html: `<div style="font-family:Inter,Arial,sans-serif;padding:24px"><h1>Reset password</h1><p>We received a password reset request for your workspace account.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:9999px;background:#0f172a;color:#fff;text-decoration:none">Reset password</a></p><p>If the button does not work, copy this URL: ${resetUrl}</p></div>`,
  });
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/discover', async (request, reply) => {
    const payload = discoverSchema.parse(request.body);
    const tenant = await prisma.tenant.findUnique({ where: { slug: payload.tenantSlug } });
    if (!tenant) {
      reply.code(404);
      return fail('Workspace not found.', { exists: false, tenantFound: false, nextStep: 'REGISTER', redirectTo: '/register' });
    }

    const user = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: payload.email.toLowerCase() } },
    });

    return ok(user ? 'Existing account found. Continue to login.' : 'No account found. Continue to registration.', {
      exists: Boolean(user),
      tenantFound: true,
      nextStep: user ? 'LOGIN' : 'REGISTER',
      redirectTo: user ? '/login' : '/register',
      role: user?.role ?? null,
    });
  });

  app.post('/auth/register', async (request, reply) => {
    const payload = registerSchema.parse(request.body);
    if (!validatePasswordPolicy(payload.password)) {
      reply.code(400);
      return fail('Password must include at least one letter and one number and be 8-64 characters long.', { field: 'password' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let tenant = await tx.tenant.findUnique({ where: { slug: payload.tenantSlug } });
      const isNewTenant = !tenant;
      if (!tenant) {
        tenant = await tx.tenant.create({
          data: {
            name: payload.tenantName,
            slug: payload.tenantSlug,
            plan: payload.plan,
          },
        });
      }

      const existingUser = await tx.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email: payload.email.toLowerCase() } },
      });
      if (existingUser) {
        throw new Error('An account with this email already exists in the selected workspace.');
      }

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: payload.name,
          email: payload.email.toLowerCase(),
          passwordHash: hashPassword(payload.password),
          role: isNewTenant ? UserRole.ADMIN : payload.role ?? UserRole.USER,
          registrationNumber: payload.registrationNumber,
          dob: payload.dob ? new Date(payload.dob) : undefined,
          whatsappNumber: payload.whatsappNumber,
          address: payload.address,
          programme: payload.programme,
          year: payload.year,
          semester: payload.semester,
          photoUrl: payload.photoUrl,
        },
      });

      return { tenant, user, isNewTenant };
    });

    const delivery = await issueVerificationEmail({
      tenantId: result.tenant.id,
      userId: result.user.id,
      email: result.user.email,
    });

    await createAuditLog({
      tenantId: result.tenant.id,
      actorUserId: result.user.id,
      action: 'auth.register',
      entityType: 'User',
      entityId: result.user.id,
      description: 'Registered a user and initiated email verification.',
      metadata: { tenantSlug: result.tenant.slug, createdTenant: result.isNewTenant },
    });

    reply.code(201);
    return ok('Registration successful. Please verify your email before logging in.', {
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        plan: result.tenant.plan,
      },
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      delivery,
    });
  });

  app.get('/auth/verify-email', async (request, reply) => {
    const payload = z.object({ token: z.string().min(20) }).parse(request.query);
    const tokenHash = hashOpaqueToken(payload.token);
    const verification = await prisma.verificationToken.findFirst({
      where: {
        tokenHash,
        type: VerificationTokenType.EMAIL_VERIFICATION,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!verification?.user) {
      reply.code(400);
      return fail('Verification link is invalid or expired.', { verified: false });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.user.id },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.verificationToken.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await createAuditLog({
      tenantId: verification.user.tenantId,
      actorUserId: verification.user.id,
      action: 'auth.verify_email',
      entityType: 'User',
      entityId: verification.user.id,
      description: 'Verified a user email address.',
    });

    return ok('Email verified successfully.', { verified: true });
  });

  app.post('/auth/login', async (request, reply) => {
    const payload = loginSchema.parse(request.body);
    const tenant = await prisma.tenant.findUnique({ where: { slug: payload.tenantSlug } });
    if (!tenant || tenant.status !== 'ACTIVE') {
      reply.code(403);
      return fail('The selected workspace is not available.', { field: 'tenantSlug' });
    }

    const user = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: payload.email.toLowerCase() } },
    });

    if (!user || !verifyPassword(payload.password, user.passwordHash)) {
      reply.code(401);
      return fail('Invalid tenant-aware credentials.', { field: 'password' });
    }

    if (!user.emailVerifiedAt) {
      reply.code(403);
      return fail('Verify your email before logging in.', { field: 'email' });
    }

    const { token, principal } = createSignedSessionToken({
      sub: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role,
    });

    await prisma.session.create({
      data: {
        id: principal.sessionId,
        tenantId: tenant.id,
        userId: user.id,
        tokenHash: hashOpaqueToken(token),
        expiresAt: new Date(principal.exp * 1000),
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      },
    });

    await createAuditLog({
      tenantId: tenant.id,
      actorUserId: user.id,
      action: 'auth.login',
      entityType: 'Session',
      entityId: principal.sessionId,
      description: 'Created a new authenticated session.',
    });

    return ok('Login successful.', {
      accessToken: token,
      session: principal,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
      },
    });
  });

  app.post('/auth/forgot-password', async (request) => {
    const payload = forgotPasswordSchema.parse(request.body);
    const tenant = await prisma.tenant.findUnique({ where: { slug: payload.tenantSlug } });
    if (!tenant) {
      return ok('If an account exists, a reset email has been sent.', { delivery: null });
    }

    const user = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: payload.email.toLowerCase() } },
    });

    if (!user) {
      return ok('If an account exists, a reset email has been sent.', { delivery: null });
    }

    const delivery = await issuePasswordResetEmail({
      tenantId: tenant.id,
      userId: user.id,
      email: user.email,
    });

    await createAuditLog({
      tenantId: tenant.id,
      actorUserId: user.id,
      action: 'auth.request_password_reset',
      entityType: 'User',
      entityId: user.id,
      description: 'Requested a password reset email.',
    });

    return ok('If an account exists, a reset email has been sent.', { delivery });
  });

  app.post('/auth/reset-password', async (request, reply) => {
    const payload = resetPasswordSchema.parse(request.body);
    if (!validatePasswordPolicy(payload.password)) {
      reply.code(400);
      return fail('Password must include at least one letter and one number and be 8-64 characters long.', { field: 'password' });
    }

    const tokenHash = hashOpaqueToken(payload.token);
    const resetToken = await prisma.verificationToken.findFirst({
      where: {
        tokenHash,
        type: VerificationTokenType.PASSWORD_RESET,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetToken?.user) {
      reply.code(400);
      return fail('Reset token is invalid or expired.', { reset: false });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.user.id },
        data: { passwordHash: hashPassword(payload.password) },
      }),
      prisma.verificationToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await createAuditLog({
      tenantId: resetToken.user.tenantId,
      actorUserId: resetToken.user.id,
      action: 'auth.reset_password',
      entityType: 'User',
      entityId: resetToken.user.id,
      description: 'Reset the account password using a signed token.',
    });

    return ok('Password reset successful.', { reset: true });
  });

  app.get('/auth/session', { preHandler: requireAuth() }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.sub },
      include: { tenant: true },
    });

    return ok('Active session loaded.', {
      session: request.user,
      user,
    });
  });
};
