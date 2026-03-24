import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';

export const industryService = {
  async create(payload: {
    name: string;
    internshipSupervisorName: string;
    email: string;
    password: string;
    registrationNumber: string;
    registrationYear: string;
    industryType: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: payload.internshipSupervisorName,
          email: payload.email,
          password: await bcrypt.hash(payload.password, 10),
          role: Role.INDUSTRY,
        },
      });

      return tx.industry.create({
        data: {
          name: payload.name,
          registrationDetails: `${payload.registrationNumber} / ${payload.registrationYear}`,
          type: payload.industryType,
          email: payload.email,
          approved: false,
          userId: user.id,
        },
      });
    });
  },

  async approve(industryId: string, approved: boolean) {
    return prisma.industry.update({ where: { id: industryId }, data: { approved } });
  },
};
