import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  createSignedSessionToken,
  hashPassword,
  requireAuth,
  type AuthRole,
  verifyPassword,
} from '../lib/security.js';

interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: AuthRole;
  audience: string;
  verifiedAt?: string;
  collegeId?: string;
  industryId?: string;
}

const roleAudience: Record<AuthRole, string> = {
  college: 'college-app',
  student: 'student-app',
  industry: 'industry-app',
  super_admin: 'platform-admin',
};

const users = new Map<string, AuthUser>();
const emailVerificationTokens = new Map<string, string>();
const passwordResetTokens = new Map<string, string>();
const activeSessions = new Map<string, { userId: string; createdAt: string }>();

const defaultAdminPassword = hashPassword('InternSuiteAdmin!2026');
users.set('super-admin@internsuite.app', {
  id: 'user-super-admin',
  email: 'super-admin@internsuite.app',
  passwordHash: defaultAdminPassword,
  name: 'InternSuite Super Admin',
  role: 'super_admin',
  audience: roleAudience.super_admin,
  verifiedAt: new Date().toISOString(),
});

const registrationSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  collegeId: z.string().optional(),
  industryId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/register/:role', async (request, reply) => {
    const params = z
      .object({ role: z.enum(['college', 'student', 'industry']) })
      .parse(request.params);
    const payload = registrationSchema.parse(request.body);

    if (users.has(payload.email)) {
      reply.code(409);
      return { message: 'An account with this email already exists.' };
    }

    const user: AuthUser = {
      id: randomUUID(),
      email: payload.email,
      passwordHash: hashPassword(payload.password),
      name: payload.name,
      role: params.role,
      audience: roleAudience[params.role],
      collegeId: params.role === 'college' || params.role === 'student' ? payload.collegeId ?? 'college-demo' : undefined,
      industryId: params.role === 'industry' ? payload.industryId ?? 'industry-demo' : undefined,
    };

    const verificationToken = randomUUID();
    users.set(payload.email, user);
    emailVerificationTokens.set(verificationToken, user.email);

    reply.code(201);
    return {
      message: 'Registration successful. Verify the email address before login.',
      account: {
        email: user.email,
        role: user.role,
        verificationRequired: true,
      },
      deliveryPreview: {
        channel: 'email',
        verificationToken,
        verifyUrl: `/api/auth/verify-email?token=${verificationToken}`,
      },
    };
  });

  app.post('/auth/login/:role', async (request, reply) => {
    const params = z
      .object({ role: z.enum(['college', 'student', 'industry', 'super_admin']) })
      .parse(request.params);
    const payload = loginSchema.parse(request.body);
    const user = users.get(payload.email);

    if (!user || user.role !== params.role || !verifyPassword(payload.password, user.passwordHash)) {
      reply.code(401);
      return { message: 'Invalid credentials.' };
    }

    if (!user.verifiedAt) {
      reply.code(403);
      return { message: 'Email verification is required before login.' };
    }

    const { token, principal } = createSignedSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      audience: user.audience,
      collegeId: user.collegeId,
      industryId: user.industryId,
    });

    activeSessions.set(principal.sessionId, { userId: user.id, createdAt: new Date().toISOString() });

    return {
      message: 'Login successful.',
      accessToken: token,
      expiresAt: new Date(principal.exp * 1000).toISOString(),
      principal,
    };
  });

  app.get('/auth/verify-email', async (request, reply) => {
    const params = z.object({ token: z.string() }).parse(request.query);
    const email = emailVerificationTokens.get(params.token);
    if (!email) {
      reply.code(400);
      return { message: 'Verification token is invalid or expired.' };
    }

    const user = users.get(email);
    if (!user) {
      reply.code(404);
      return { message: 'User account not found.' };
    }

    user.verifiedAt = new Date().toISOString();
    users.set(email, user);
    emailVerificationTokens.delete(params.token);

    return {
      message: 'Email verified successfully.',
      account: { email: user.email, role: user.role, verifiedAt: user.verifiedAt },
    };
  });

  app.post('/auth/forgot-password', async (request) => {
    const payload = z.object({ email: z.string().email() }).parse(request.body);
    const user = users.get(payload.email);

    if (!user) {
      return { message: 'If an account exists, a reset email has been prepared.' };
    }

    const resetToken = randomUUID();
    passwordResetTokens.set(resetToken, user.email);

    return {
      message: 'If an account exists, a reset email has been prepared.',
      deliveryPreview: {
        channel: 'email',
        resetToken,
        resetUrl: `/api/auth/reset-password?token=${resetToken}`,
      },
    };
  });

  app.post('/auth/reset-password', async (request, reply) => {
    const payload = z
      .object({ token: z.string(), password: z.string().min(8) })
      .parse(request.body);
    const email = passwordResetTokens.get(payload.token);

    if (!email) {
      reply.code(400);
      return { message: 'Reset token is invalid or expired.' };
    }

    const user = users.get(email);
    if (!user) {
      reply.code(404);
      return { message: 'User account not found.' };
    }

    user.passwordHash = hashPassword(payload.password);
    users.set(email, user);
    passwordResetTokens.delete(payload.token);

    return { message: 'Password updated successfully.' };
  });

  app.get('/auth/session', {
    preHandler: requireAuth({ audience: undefined }),
  }, async (request) => {
    const principal = request.user!;
    const session = activeSessions.get(principal.sessionId);
    return {
      principal,
      session,
    };
  });

  app.post('/auth/logout', {
    preHandler: requireAuth({ audience: undefined }),
  }, async (request) => {
    const principal = request.user!;
    activeSessions.delete(principal.sessionId);
    return { message: 'Session closed successfully.' };
  });
};
