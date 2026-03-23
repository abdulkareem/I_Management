import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sendTransactionalEmail } from '../lib/mailer.js';
import {
  authUsers,
  colleges,
  demoCollegeId,
  demoIndustryId,
  dynamicRolesForField,
  generateId,
  industries,
  loginSchema,
  otpSendSchema,
  passwordResetChallenges,
  passwordSchema,
  students,
  emailDiscoverySchema,
  studentRegistrationSchema,
  collegeRegistrationSchema,
  industryRegistrationSchema,
  verifyOtpSchema,
  verificationChallenges,
} from '../lib/internsuite.js';
import {
  createNumericOtp,
  createSignedSessionToken,
  hashOpaqueToken,
  hashPassword,
  requireAuth,
  verifyPassword,
} from '../lib/security.js';

const loginAudience = {
  college: 'college-app',
  student: 'student-app',
  industry: 'industry-app',
  super_admin: 'platform-admin',
} as const;

function nextOtp(email: string, purpose: 'registration' | 'password_reset') {
  const otp = createNumericOtp();
  const record = {
    email,
    purpose,
    otpHash: hashOpaqueToken(otp),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
  (purpose === 'registration' ? verificationChallenges : passwordResetChallenges).set(email, record);
  return otp;
}

function resolveRoleSpecificProfile(email: string, role: 'college' | 'student' | 'industry', registration: Record<string, unknown>) {
  const user = authUsers.get(email)!;

  if (role === 'college') {
    const payload = collegeRegistrationSchema.parse(registration);
    const collegeId = generateId('college');
    colleges.set(collegeId, {
      id: collegeId,
      tenantId: collegeId,
      userId: user.id,
      name: payload.collegeName,
      logoUrl: payload.logoUrl,
      address: payload.address,
      university: payload.university,
      isAutonomous: payload.isAutonomous,
      subscriptionPlan: payload.subscriptionPlan,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    user.tenantId = collegeId;
    user.collegeId = collegeId;
    user.profile = payload;
    return;
  }

  if (role === 'industry') {
    const payload = industryRegistrationSchema.parse(registration);
    const industryId = generateId('industry');
    industries.set(industryId, {
      id: industryId,
      tenantId: industryId,
      userId: user.id,
      name: payload.industryName,
      logoUrl: payload.logoUrl,
      industryField: payload.industryField,
      description: payload.description,
      internshipRoles: payload.internshipRoles.length > 0 ? payload.internshipRoles : dynamicRolesForField(payload.industryField),
      createdAt: new Date().toISOString(),
    });
    user.tenantId = industryId;
    user.industryId = industryId;
    user.profile = payload;
    return;
  }

  const payload = studentRegistrationSchema.parse(registration);
  const studentExists = Array.from(students.values()).find(
    (entry) => entry.email === email && entry.universityRegNo === payload.universityRegNo,
  );
  if (studentExists) {
    throw new Error('A student with this email and university registration number already exists.');
  }
  const studentId = generateId('student');
  students.set(studentId, {
    id: studentId,
    tenantId: payload.collegeId,
    userId: user.id,
    collegeId: payload.collegeId,
    email,
    fullName: payload.fullName,
    universityRegNo: payload.universityRegNo,
    dob: payload.dob,
    whatsappNumber: payload.whatsappNumber,
    address: payload.address,
    programme: payload.programme,
    year: payload.year,
    semester: payload.semester,
    photoUrl: payload.photoUrl,
    createdAt: new Date().toISOString(),
  });
  user.tenantId = payload.collegeId;
  user.collegeId = payload.collegeId;
  user.studentId = studentId;
  user.fullName = payload.fullName;
  user.profile = payload;
}

export const authRoutes: FastifyPluginAsync = async (app) => {

  app.post('/auth/discover', async (request) => {
    const payload = emailDiscoverySchema.parse(request.body);
    const existingUser = authUsers.get(payload.email);

    if (existingUser) {
      return {
        email: payload.email,
        exists: true,
        role: existingUser.role,
        nextStep: 'LOGIN_PASSWORD',
        redirectTo:
          existingUser.role === 'college'
            ? '/login/college'
            : existingUser.role === 'student'
              ? '/login/student'
              : '/login/industry',
        dashboard:
          existingUser.role === 'college'
            ? '/portal/college'
            : existingUser.role === 'student'
              ? '/portal/student'
              : '/portal/industry',
        message: 'Existing account found. Continue to login.',
      };
    }

    const role = payload.role ?? 'student';
    return {
      email: payload.email,
      exists: false,
      role,
      nextStep: 'REGISTER',
      redirectTo:
        role === 'college'
          ? '/signup/college'
          : role === 'student'
            ? '/signup/student'
            : '/signup/industry',
      message: 'No account found. Continue with registration.',
    };
  });

  app.post('/auth/send-otp', async (request, reply) => {
    const payload = otpSendSchema.parse(request.body);
    const existingUser = authUsers.get(payload.email);

    if (existingUser) {
      return {
        email: payload.email,
        exists: true,
        nextStep: 'LOGIN_PASSWORD',
        role: existingUser.role,
        message: 'Email already exists. Continue to password login.',
      };
    }

    const role = payload.role!;
    const userId = generateId('user');
    authUsers.set(payload.email, {
      id: userId,
      tenantId: role === 'college' ? demoCollegeId : role === 'industry' ? demoIndustryId : payload.registration && 'collegeId' in payload.registration ? String(payload.registration.collegeId) : demoCollegeId,
      email: payload.email,
      role,
      isVerified: false,
      status: 'pending_verification',
      createdAt: new Date().toISOString(),
      fullName: role === 'student' && payload.registration && 'fullName' in payload.registration ? String(payload.registration.fullName) : role === 'college' ? 'College Admin' : 'Industry Admin',
    });

    try {
      resolveRoleSpecificProfile(payload.email, role, payload.registration as Record<string, unknown>);
    } catch (error) {
      authUsers.delete(payload.email);
      throw error;
    }

    const otp = nextOtp(payload.email, 'registration');
    const delivery = await sendTransactionalEmail({
      to: payload.email,
      subject: 'InternSuite OTP verification',
      html: `<p>Your InternSuite OTP is <strong>${otp}</strong>. It expires in 15 minutes.</p>`,
    });

    reply.code(201);
    return {
      email: payload.email,
      exists: false,
      nextStep: 'VERIFY_OTP',
      role,
      delivery,
      otpPreview: otp,
      message: 'Registration profile captured. Verify the OTP to continue.',
    };
  });

  app.post('/auth/verify-otp', async (request, reply) => {
    const payload = verifyOtpSchema.parse(request.body);
    const record = verificationChallenges.get(payload.email);
    if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
      reply.code(400);
      return { message: 'OTP is invalid or expired.' };
    }

    if (record.otpHash !== hashOpaqueToken(payload.otp)) {
      reply.code(400);
      return { message: 'OTP is invalid or expired.' };
    }

    const user = authUsers.get(payload.email);
    if (!user) {
      reply.code(404);
      return { message: 'User account not found.' };
    }

    user.isVerified = true;
    user.status = 'verified';
    verificationChallenges.delete(payload.email);
    return {
      email: user.email,
      verified: true,
      nextStep: 'SET_PASSWORD',
      message: 'OTP verified successfully. You can now create your password.',
    };
  });

  app.post('/auth/set-password', async (request, reply) => {
    const payload = passwordSchema.parse(request.body);
    const user = authUsers.get(payload.email);
    if (!user) {
      reply.code(404);
      return { message: 'User account not found.' };
    }
    if (!user.isVerified || user.status === 'pending_verification') {
      reply.code(403);
      return { message: 'Verify OTP before setting a password.' };
    }

    user.passwordHash = hashPassword(payload.password);
    user.status = 'active';
    return {
      email: user.email,
      passwordCreated: true,
      nextStep: 'LOGIN',
      message: 'Password created successfully.',
    };
  });

  app.post('/auth/login', async (request, reply) => {
    const payload = loginSchema.parse(request.body);
    const user = authUsers.get(payload.email);

    if (!user || !user.passwordHash || !verifyPassword(payload.password, user.passwordHash)) {
      reply.code(401);
      return { message: 'Invalid credentials.' };
    }

    if (user.status !== 'active' || !user.isVerified) {
      reply.code(403);
      return { message: 'Complete OTP verification and password setup before login.' };
    }

    const { token, principal } = createSignedSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      audience: loginAudience[user.role],
      tenantId: user.tenantId,
      collegeId: user.collegeId,
      industryId: user.industryId,
      studentId: user.studentId,
    });

    return {
      message: 'Login successful.',
      accessToken: token,
      principal,
      redirectTo:
        user.role === 'college'
          ? '/portal/college'
          : user.role === 'student'
            ? '/portal/student'
            : user.role === 'industry'
              ? '/portal/industry'
              : '/portal/admin',
    };
  });

  app.post('/auth/forgot-password', async (request) => {
    const payload = z.object({ email: z.string().email() }).parse(request.body);
    const user = authUsers.get(payload.email);
    if (!user) {
      return { message: 'If an account exists, a reset OTP has been sent.' };
    }
    const otp = nextOtp(payload.email, 'password_reset');
    const delivery = await sendTransactionalEmail({
      to: payload.email,
      subject: 'InternSuite password reset OTP',
      html: `<p>Your password reset OTP is <strong>${otp}</strong>. It expires in 15 minutes.</p>`,
    });
    return { message: 'If an account exists, a reset OTP has been sent.', delivery, otpPreview: otp };
  });

  app.post('/auth/reset-password', async (request, reply) => {
    const payload = z.object({ email: z.string().email(), otp: z.string().regex(/^\d{6}$/), password: passwordSchema.shape.password }).parse(request.body);
    const challenge = passwordResetChallenges.get(payload.email);
    if (!challenge || challenge.otpHash !== hashOpaqueToken(payload.otp) || new Date(challenge.expiresAt).getTime() < Date.now()) {
      reply.code(400);
      return { message: 'Reset OTP is invalid or expired.' };
    }
    const user = authUsers.get(payload.email);
    if (!user) {
      reply.code(404);
      return { message: 'User account not found.' };
    }
    user.passwordHash = hashPassword(payload.password);
    user.status = 'active';
    passwordResetChallenges.delete(payload.email);
    return { message: 'Password updated successfully.' };
  });

  app.get('/auth/session', { preHandler: requireAuth({ audience: undefined }) }, async (request) => ({ principal: request.user }));
};
