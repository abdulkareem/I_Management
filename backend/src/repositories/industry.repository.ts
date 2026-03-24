import { prisma } from '../utils/prisma.js';

export const industryRepository = {
  create: (data: { name: string; registrationDetails: string; emblemUrl?: string; emblemBinary?: Uint8Array; userId: string }) =>
    prisma.industry.create({ data: data as any }),
  findByUserId: (userId: string) => prisma.industry.findUnique({ where: { userId } }),
};
