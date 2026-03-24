import { prisma } from '../utils/prisma.js';

export const internshipRepository = {
  create: (data: { industryId: string; collegeId: string; departmentId: string; ideaId: string }) => prisma.internship.create({ data }),
};
