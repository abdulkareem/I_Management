import { prisma } from '../utils/prisma.js';

export const ideaRepository = {
  createMany: (data: Array<{ title: string; description: string; outcomes: string; departmentId: string; createdById: string }>) =>
    prisma.internshipIdea.createMany({ data }),
  listByDepartment: (departmentId: string) => prisma.internshipIdea.findMany({ where: { departmentId } }),
};
