import { CollegeStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../utils/prisma.js';
import { AppError } from '../utils/errors.js';

export const collegeService = {
  async registerCollege(payload: {
    collegeName: string;
    address: string;
    email: string;
    phone: string;
    university: string;
    loginEmail: string;
    password: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: payload.loginEmail } });
    if (existing) throw new AppError('Email already exists', 409);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: payload.collegeName,
          email: payload.loginEmail,
          password: await bcrypt.hash(payload.password, 10),
          role: Role.COLLEGE_ADMIN,
        },
      });

      return tx.college.create({
        data: {
          name: payload.collegeName,
          email: payload.email,
          phone: payload.phone,
          address: payload.address,
          university: payload.university,
          status: CollegeStatus.PENDING,
          createdById: user.id,
        },
      });
    });
  },

  async approveCollege(collegeId: string, action: 'APPROVED' | 'REJECTED') {
    return prisma.college.update({ where: { id: collegeId }, data: { status: action } });
  },

  async listColleges() {
    return prisma.college.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async createDepartment(payload: { collegeId: string; name: string; coordinatorName: string; coordinatorEmail: string; coordinatorPhone: string }) {
    const password = crypto.randomBytes(8).toString('base64url');
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: payload.coordinatorName,
          email: payload.coordinatorEmail,
          password: await bcrypt.hash(password, 10),
          role: Role.DEPARTMENT_COORDINATOR,
        },
      });

      const coordinator = await tx.coordinator.create({
        data: { userId: user.id, phone: payload.coordinatorPhone },
      });

      const department = await tx.department.create({
        data: {
          name: payload.name,
          collegeId: payload.collegeId,
          coordinatorId: coordinator.id,
          coordinatorUserId: user.id,
        },
      });

      return { department, generatedPassword: password, coordinatorUser: user };
    });
  },

  async catalogApproved() {
    const colleges = await prisma.college.findMany({
      where: { status: CollegeStatus.APPROVED },
      select: { id: true, name: true, departments: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    return { colleges };
  },
};
