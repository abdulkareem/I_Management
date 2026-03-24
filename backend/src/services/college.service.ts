import { Role } from '@prisma/client';
import { authRepository } from '../repositories/auth.repository.js';
import { collegeRepository } from '../repositories/college.repository.js';
import { getPagination } from '../utils/pagination.js';
import { prisma } from '../utils/prisma.js';

export const collegeService = {
  async createCollegeWorkspace(payload: {
    collegeName: string;
    emblemUrl?: string;
    emblemBinary?: string;
    createdBy: { name: string; email: string; password: string };
    departments: Array<{ name: string; coordinator: { name: string; email: string; password: string; phone: string } }>;
  }) {
    return collegeRepository.createWorkspaceTransaction(async (tx) => {
      const creator = await tx.user.create({
        data: {
          ...payload.createdBy,
          role: Role.COLLEGE,
        },
      });

      const college = await tx.college.create({
        data: {
          name: payload.collegeName,
          emblemUrl: payload.emblemUrl,
          emblemBinary: payload.emblemBinary ? Uint8Array.from(Buffer.from(payload.emblemBinary, 'base64')) : undefined,
          createdById: creator.id,
        },
      });

      for (const department of payload.departments) {
        const coordinatorUser = await tx.user.create({
          data: {
            name: department.coordinator.name,
            email: department.coordinator.email,
            password: department.coordinator.password,
            role: Role.COORDINATOR,
          },
        });

        const coordinator = await tx.coordinator.create({
          data: {
            userId: coordinatorUser.id,
            phone: department.coordinator.phone,
          },
        });

        await tx.department.create({
          data: {
            name: department.name,
            collegeId: college.id,
            coordinatorId: coordinator.id,
          },
        });
      }

      return college;
    });
  },

  async listColleges(query: { page?: string; limit?: string }) {
    const { page, limit, skip } = getPagination(query);
    const [items, total] = await prisma.$transaction([
      collegeRepository.listColleges(skip, limit),
      collegeRepository.countColleges(),
    ]);

    return { items, pagination: { page, limit, total } };
  },

  getDepartmentsByCollege: collegeRepository.findDepartmentsByCollege,
};
