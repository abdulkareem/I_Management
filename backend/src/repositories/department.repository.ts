import { prisma } from '../utils/prisma.js';

export const departmentRepository = {
  bulkCreate: (data: Array<{ name: string; collegeId: string; coordinatorId?: string }>) =>
    prisma.department.createMany({ data, skipDuplicates: true }),
};
