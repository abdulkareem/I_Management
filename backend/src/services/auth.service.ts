import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CollegeStatus, Role } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { authRepository } from '../repositories/auth.repository.js';
import { AppError } from '../utils/errors.js';
import { emailService } from './email.service.js';

const SUPER_ADMIN_EMAIL = 'abdulkareem@psmocollege.ac.in';

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function issueToken(user: { id: string; role: Role }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT secret missing', 500);
  }

  return jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn: '12h' });
}

export const authService = {
  async register(name: string | undefined, email: string, password: string, role: Role) {
    const exists = await authRepository.findUserByEmail(email);
    if (exists) {
      throw new AppError('Email already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    return authRepository.createUser({ name: name ?? email, email, password: hashedPassword, role });
  },

  async login(email: string, password?: string) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    if (email === SUPER_ADMIN_EMAIL) {
      if (!password) {
        const otp = generateOtp();
        await prisma.oneTimePassword.create({
          data: {
            userId: user.id,
            code: otp,
            purpose: 'LOGIN',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        });

        await emailService.sendOtpEmail({ to: email, purpose: 'LOGIN', otp });
        return { requiresOtp: true, message: 'OTP sent to super admin email' };
      }

      const otp = await prisma.oneTimePassword.findFirst({
        where: {
          userId: user.id,
          code: password,
          purpose: 'LOGIN',
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otp) {
        throw new AppError('Invalid or expired OTP', 401);
      }

      await prisma.oneTimePassword.update({ where: { id: otp.id }, data: { used: true } });
      return { token: issueToken(user), user };
    }

    if (!password) {
      throw new AppError('Password is required', 400);
    }

    const attempts = await prisma.oneTimePassword.count({
      where: {
        userId: user.id,
        purpose: 'LOGIN_FAIL',
        createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) },
      },
    });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      await prisma.oneTimePassword.create({
        data: {
          userId: user.id,
          code: 'FAILED',
          purpose: 'LOGIN_FAIL',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      const nextAttempts = attempts + 1;
      if (nextAttempts >= 3) {
        throw new AppError('Invalid credentials. 3 attempts reached. Please reset password.', 401);
      }
      throw new AppError(`Invalid credentials. ${3 - nextAttempts} attempts remaining.`, 401);
    }

    if (user.role === Role.COLLEGE_ADMIN || user.role === Role.COLLEGE) {
      const college = await prisma.college.findUnique({ where: { createdById: user.id } });
      if (college && college.status !== CollegeStatus.APPROVED) {
        throw new AppError('College account pending approval', 403);
      }
    }

    if (user.role === Role.INDUSTRY) {
      const industry = await prisma.industry.findUnique({ where: { userId: user.id } });
      if (industry && !industry.approved) {
        throw new AppError('Industry account pending approval', 403);
      }
    }

    return { token: issueToken(user), user };
  },

  async resetPassword(payload: { email: string; otp?: string; newPassword?: string }) {
    const user = await authRepository.findUserByEmail(payload.email);
    if (!user) {
      return { emailExists: false, message: 'Email not found. Please register.' };
    }

    if (!payload.otp || !payload.newPassword) {
      const otp = generateOtp();
      await prisma.oneTimePassword.create({
        data: {
          userId: user.id,
          code: otp,
          purpose: 'RESET_PASSWORD',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      await emailService.sendOtpEmail({ to: payload.email, purpose: 'RESET_PASSWORD', otp });
      return { emailExists: true, otpSent: true };
    }

    const otp = await prisma.oneTimePassword.findFirst({
      where: {
        userId: user.id,
        code: payload.otp,
        purpose: 'RESET_PASSWORD',
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(payload.newPassword, 10) } }),
      prisma.oneTimePassword.update({ where: { id: otp.id }, data: { used: true } }),
    ]);

    return { emailExists: true, passwordUpdated: true };
  },
};
