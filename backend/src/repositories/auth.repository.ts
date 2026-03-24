import { Role } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export const authRepository = {
  findUserByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  createUser: (payload: { name: string; email: string; password: string; role: Role }) => prisma.user.create({ data: payload }),
};
