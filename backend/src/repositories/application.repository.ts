import { ApplicationStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export const applicationRepository = {
  create: (data: { studentId: string; internshipId: string }) => prisma.application.create({ data }),
  updateStatus: (id: string, status: ApplicationStatus) => prisma.application.update({ where: { id }, data: { status } }),
};
