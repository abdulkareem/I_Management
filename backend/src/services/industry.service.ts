import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';

export const industryService = {
  async create(payload: {
    name: string;
    registrationDetails: string;
    owner: { name: string; email: string; password: string };
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: payload.owner.name,
          email: payload.owner.email,
          password: await bcrypt.hash(payload.owner.password, 10),
          role: Role.INDUSTRY,
        },
      });

      return tx.industry.create({
        data: {
          name: payload.name,
          registrationDetails: payload.registrationDetails,
          email: payload.owner.email,
          approved: false,
          userId: user.id,
        },
      });
    });
  },
};
