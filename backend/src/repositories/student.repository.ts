import { prisma } from '../utils/prisma.js';

export const studentRepository = {
  create: (data: { userId: string; collegeId: string; departmentId: string }) => prisma.student.create({ data }),
};
