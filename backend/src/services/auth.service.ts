import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { authRepository } from '../repositories/auth.repository.js';
import { AppError } from '../utils/errors.js';

export const authService = {
  async register(name: string, email: string, password: string, role: Role) {
    const exists = await authRepository.findUserByEmail(email);
    if (exists) {
      throw new AppError('Email already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    return authRepository.createUser({ name, email, password: hashedPassword, role });
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

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('JWT secret missing', 500);
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn: '12h' });
    return { token, user };
  },
};
