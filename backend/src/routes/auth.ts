import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sendTransactionalEmail } from '../lib/mailer.js';
import {
  createNumericOtp,
  createOpaqueToken,
  createSignedSessionToken,
  hashOpaqueToken,
  hashPassword,
  requireAuth,
  type AuthRole,
  validatePasswordPolicy,
  verifyPassword,
} from '../lib/security.js';

interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: AuthRole;
  audience: string;
  identityStatus: 'pending_verification' | 'verified' | 'active';
  passwordHash?: string;
  verifiedAt?: string;
  collegeId?: string;
  industryId?: string;
  collegeStudentId?: string;
  universityRegistrationNumber?: string;
}

interface VerificationChallenge {
  email: string;
  role: AuthRole;
  tokenHash: string;
  otpHash: string;
  expiresAt: string;
}

const roleAudience: Record<AuthRole, string> = {
  college: 'college-app',
  student: 'student-app',
  industry: 'industry-app',
  super_admin: 'platform-admin',
};

const users = new Map<string, AuthUser>();
const verificationChallenges = new Map<string, VerificationChallenge>();
const passwordResetChallenges = new Map<string, VerificationChallenge>();
const activeSessions = new Map<string, { userId: string; createdAt: string }>();

users.set('super-admin@internsuite.app', {
  id: 'user-super-admin',
  tenantId: 'tenant-platform',
  email: 'super-admin@internsuite.app',
  name: 'InternSuite Super Admin',
  role: 'super_admin',
  audience: roleAudience.super_admin,
  identityStatus: 'active',
  passwordHash: hashPassword('InternSuiteAdmin!2026'),
  verifiedAt: new Date().toISOString(),
});

const registrationSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    collegeId: z.string().optional(),
    industryId: z.string().optional(),
    collegeStudentId: z.string().optional(),
    universityRegistrationNumber: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.collegeStudentId && !value.universityRegistrationNumber) {
      ctx.addIssue({ code: 'custom', path: ['universityRegistrationNumber'], message: 'University registration number is required for student identities.' });
    }
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const verifySchema = z.object({
  email: z.string().email(),
  token: z.string().optional(),
  otp: z.string().length(6).optional(),
});

function upsertChallenge(store: Map<string, VerificationChallenge>, user: AuthUser) {
  const token = createOpaqueToken();
  const otp = createNumericOtp();
  const challenge: VerificationChallenge = {
    email: user.email,
    role: user.role,
    tokenHash: hashOpaqueToken(token),
    otpHash: hashOpaqueToken(otp),
    expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
  };
  store.set(user.email, challenge);
  return { token, otp, challenge };
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/register/:role', async (request, reply) => {
    const params = z.object({ role: z.enum(['college', 'student', 'industry']) }).parse(request.params);
    const payload = registrationSchema.parse(request.body);

    if (users.has(payload.email)) {
      reply.code(409);
      return { message: 'An account with this email already exists.' };
    }

    if (params.role === 'student' && (!payload.collegeStudentId || !payload.universityRegistrationNumber || !payload.collegeId)) {
      reply.code(400);
      return {
        message: 'Students must register with college ID and university registration number.',
      };
    }

    const duplicateStudent = Array.from(users.values()).find(
      (user) =>
        user.role === 'student' &&
        user.email === payload.email &&
        user.universityRegistrationNumber === payload.universityRegistrationNumber,
    );

    if (duplicateStudent) {
      reply.code(409);
      return { message: 'A student with this email and university registration number already exists.' };
    }

    const user: AuthUser = {
      id: randomUUID(),
      tenantId: payload.collegeId ?? payload.industryId ?? 'tenant-platform',
      email: payload.email,
      name: payload.name,
      role: params.role,
      audience: roleAudience[params.role],
      identityStatus: 'pending_verification',
      collegeId: params.role === 'college' || params.role === 'student' ? payload.collegeId ?? 'college-demo' : undefined,
      industryId: params.role === 'industry' ? payload.industryId ?? 'industry-demo' : undefined,
      collegeStudentId: payload.collegeStudentId,
      universityRegistrationNumber: payload.universityRegistrationNumber,
    };

    users.set(payload.email, user);
    const { token, otp } = upsertChallenge(verificationChallenges, user);
    const delivery = await sendTransactionalEmail({
      to: payload.email,
      subject: 'Verify your InternSuite email',
      html: `<p>Hello ${payload.name},</p><p>Your verification code is <strong>${otp}</strong>.</p><p>Or open <a href="${process.env.APP_BASE_URL ?? 'http://localhost:4000'}/api/auth/verify-email?email=${encodeURIComponent(payload.email)}&token=${token}">this verification link</a>.</p>`,
    });

    reply.code(201);
    return {
      message: 'Registration accepted. Verify the email address before creating a password.',
      account: {
        email: user.email,
        role: user.role,
        identityStatus: user.identityStatus,
      },
      delivery,
      verificationPreview: {
        otp,
        token,
      },
    };
  });

  app.post('/auth/verify-email', async (request, reply) => {
    const payload = verifySchema.parse(request.body);
    const challenge = verificationChallenges.get(payload.email);

    if (!challenge || new Date(challenge.expiresAt).getTime() < Date.now()) {
      reply.code(400);
      return { message: 'Verification challenge is invalid or expired.' };
    }

    const tokenMatch = payload.token ? hashOpaqueToken(payload.token) === challenge.tokenHash : false;
    const otpMatch = payload.otp ? hashOpaqueToken(payload.otp) === challenge.otpHash : false;

    if (!tokenMatch && !otpMatch) {
      reply.code(400);
      return { message: 'Verification token or OTP is invalid.' };
    }

    const user = users.get(payload.email);
    if (!user) {
      reply.code(404);
      return { message: 'User account not found.' };
    }

    user.identityStatus = 'verified';
    user.verifiedAt = new Date().toISOString();
    users.set(payload.email, user);
    verificationChallenges.delete(payload.email);

    return {
      message: 'Email verified successfully. Password creation is now enabled.',
      account: {
        email: user.email,
        role: user.role,
        verifiedAt: user.verifiedAt,
        passwordReady: true,
      },
    };
  });

  app.get('/auth/verify-email', async (request, reply) => {
    const payload = z.object({ email: z.string().email(), token: z.string() }).parse(request.query);
    return app.inject({
      method: 'POST',
      url: '/api/auth/verify-email',
      payload,
    }).then((response) => {
      reply.code(response.statusCode);
      return response.json();
    });
  });

  app.post('/auth/set-password', async (request, reply) => {
    const payload = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(request.body);
    const user = users.get(payload.email);

    if (!user) {
      reply.code(404);
      return { message: 'User account not found.' };
    }

    if (user.identityStatus === 'pending_verification') {
      reply.code(403);
      return { message: 'Email verification is required before creating a password.' };
    }

    if (!validatePasswordPolicy(payload.password)) {
      reply.code(400);
      return { message: 'Password must contain at least 8 characters.' };
    }

    user.passwordHash = hashPassword(payload.password);
    user.identityStatus = 'active';
    users.set(payload.email, user);

    return { message: 'Password created successfully.' };
  });

  app.post('/auth/login/:role', async (request, reply) => {
    const params = z.object({ role: z.enum(['college', 'student', 'industry', 'super_admin']) }).parse(request.params);
    const payload = loginSchema.parse(request.body);
    const user = users.get(payload.email);

    if (!user || user.role !== params.role || !user.passwordHash || !verifyPassword(payload.password, user.passwordHash)) {
      reply.code(401);
      return { message: 'Invalid credentials.' };
    }

    if (user.identityStatus !== 'active') {
      reply.code(403);
      return { message: 'Complete email verification and password creation before login.' };
    }

    const { token, principal } = createSignedSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      audience: user.audience,
      tenantId: user.tenantId,
      collegeId: user.collegeId,
      industryId: user.industryId,
    });

    activeSessions.set(principal.sessionId, { userId: user.id, createdAt: new Date().toISOString() });
    user.verifiedAt ??= new Date().toISOString();

    return {
      message: 'Login successful.',
      accessToken: token,
      expiresAt: new Date(principal.exp * 1000).toISOString(),
      principal,
    };
  });

  app.post('/auth/forgot-password', async (request) => {
    const payload = z.object({ email: z.string().email() }).parse(request.body);
    const user = users.get(payload.email);

    if (!user) {
      return { message: 'If an account exists, a reset email has been prepared.' };
    }

    const { token, otp } = upsertChallenge(passwordResetChallenges, user);
    const delivery = await sendTransactionalEmail({
      to: payload.email,
      subject: 'Reset your InternSuite password',
      html: `<p>Hello ${user.name},</p><p>Your password reset code is <strong>${otp}</strong>.</p><p>Or use <a href="${process.env.APP_BASE_URL ?? 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(payload.email)}">this reset link</a>.</p>`,
    });

    return {
      message: 'If an account exists, a reset email has been prepared.',
      delivery,
      resetPreview: { token, otp },
    };
  });

  app.post('/auth/reset-password', async (request, reply) => {
    const payload = z
      .object({ email: z.string().email(), token: z.string().optional(), otp: z.string().length(6).optional(), password: z.string().min(8) })
      .parse(request.body);

    const challenge = passwordResetChallenges.get(payload.email);
    if (!challenge || new Date(challenge.expiresAt).getTime() < Date.now()) {
      reply.code(400);
      return { message: 'Reset challenge is invalid or expired.' };
    }

    const tokenMatch = payload.token ? hashOpaqueToken(payload.token) === challenge.tokenHash : false;
    const otpMatch = payload.otp ? hashOpaqueToken(payload.otp) === challenge.otpHash : false;

    if (!tokenMatch && !otpMatch) {
      reply.code(400);
      return { message: 'Reset token or OTP is invalid.' };
    }

    const user = users.get(payload.email);
    if (!user) {
      reply.code(404);
      return { message: 'User account not found.' };
    }

    if (!validatePasswordPolicy(payload.password)) {
      reply.code(400);
      return { message: 'Password must contain at least 8 characters.' };
    }

    user.passwordHash = hashPassword(payload.password);
    user.identityStatus = 'active';
    users.set(payload.email, user);
    passwordResetChallenges.delete(payload.email);

    return { message: 'Password updated successfully.' };
  });

  app.get(
    '/auth/session',
    {
      preHandler: requireAuth({ audience: undefined }),
    },
    async (request) => {
      const principal = request.user!;
      const session = activeSessions.get(principal.sessionId);
      return {
        principal,
        session,
      };
    },
  );

  app.post(
    '/auth/logout',
    {
      preHandler: requireAuth({ audience: undefined }),
    },
    async (request) => {
      const principal = request.user!;
      activeSessions.delete(principal.sessionId);
      return { message: 'Session closed successfully.' };
    },
  );
};
