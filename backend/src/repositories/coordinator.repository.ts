import { prisma } from '../utils/prisma.js';

export const coordinatorRepository = {
  create: (data: { userId: string; departmentId: string; phone: string }) => prisma.coordinator.create({ data }),
  findByUserId: (userId: string) => prisma.coordinator.findUnique({ where: { userId } }),
};
