import type { Request, Response } from 'express';
import { ApplicationStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { AuthenticatedRequest } from '../middlewares/auth.js';
import { prisma } from '../utils/prisma.js';

export const applicationController = {
  apply: async (req: AuthenticatedRequest | Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    if (authReq.user?.userId) {
      const student = await prisma.student.findUnique({ where: { userId: authReq.user.userId } });
      const application = await prisma.application.create({
        data: {
          studentType: 'INTERNAL',
          studentId: student!.id,
          internshipId: (req as any).body.internshipId,
        },
      });
      return res.status(201).json({ success: true, data: application });
    }

    const application = await prisma.application.create({
      data: {
        studentType: 'EXTERNAL_QUICK',
        studentName: (req as any).body.studentName,
        email: (req as any).body.email,
        phone: (req as any).body.phone,
        internshipId: (req as any).body.internshipId,
      },
    });

    res.status(201).json({ success: true, data: application });
  },

  applyAsExternalStudent: async (req: Request, res: Response) => {
    const data = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: req.body.fullName,
          email: req.body.email,
          password: await bcrypt.hash(req.body.password, 10),
          role: Role.EXTERNAL_STUDENT,
        },
      });

      const externalStudent = await tx.externalStudent.create({
        data: {
          userId: user.id,
          name: req.body.fullName,
          email: req.body.email,
          phone: req.body.phone,
          whatsapp: req.body.whatsapp,
          college: req.body.college,
          university: req.body.university,
          regNumber: req.body.regNumber,
          department: req.body.department,
        },
      });

      const application = await tx.application.create({
        data: {
          studentType: 'EXTERNAL',
          externalStudentId: externalStudent.id,
          studentName: externalStudent.name,
          email: externalStudent.email,
          phone: externalStudent.phone,
          internshipId: req.body.internshipId,
        },
      });

      return { user, externalStudent, application };
    });

    res.status(201).json({ success: true, data });
  },

  updateStatus: async (req: Request, res: Response) => {
    const data = await prisma.application.update({ where: { id: req.body.applicationId }, data: { status: req.body.status as ApplicationStatus } });
    res.json({ success: true, data });
  },
};
