import { prisma } from '../utils/prisma.js';

export const collegeRepository = {
  createWorkspaceTransaction: prisma.$transaction.bind(prisma),
  listColleges: (skip: number, take: number) =>
    prisma.college.findMany({ skip, take, include: { departments: true, students: true, internships: true } }),
  countColleges: () => prisma.college.count(),
  findDepartmentsByCollege: (collegeId: string) => prisma.department.findMany({ where: { collegeId } }),
};
