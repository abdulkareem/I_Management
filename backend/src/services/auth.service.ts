import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CollegeStatus, Role } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { authRepository } from '../repositories/auth.repository.js';
import { AppError } from '../utils/errors.js';

export const authService = {
  async register(name: string | undefined, email: string, password: string, role: Role) {
    const exists = await authRepository.findUserByEmail(email);
    if (exists) {
      throw new AppError('Email already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    return authRepository.createUser({ name: name ?? email, email, password: hashedPassword, role });
  },

  async login(email: string, password: string) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new AppError('Invalid credentials', 401);
    }

    if (user.role === Role.COLLEGE_ADMIN || user.role === Role.COLLEGE) {
      const college = await prisma.college.findUnique({ where: { createdById: user.id } });
      if (college && college.status !== CollegeStatus.APPROVED) {
        throw new AppError('College account pending approval', 403);
      }
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('JWT secret missing', 500);
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn: '12h' });
    return { token, user };
  },
};
