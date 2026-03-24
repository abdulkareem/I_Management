import type { Request, Response } from 'express';
import { ApplicationStatus } from '@prisma/client';
import type { AuthenticatedRequest } from '../middlewares/auth.js';
import { prisma } from '../utils/prisma.js';

export const applicationController = {
  apply: async (req: AuthenticatedRequest | Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    if (authReq.user?.userId) {
      const student = await prisma.student.findUnique({ where: { userId: authReq.user.userId } });
      const application = await prisma.application.create({ data: { studentId: student!.id, internshipId: (req as any).body.internshipId } });
      return res.status(201).json({ success: true, data: application });
    }

    const application = await prisma.application.create({
      data: {
        studentName: (req as any).body.studentName,
        email: (req as any).body.email,
        phone: (req as any).body.phone,
        internshipId: (req as any).body.internshipId,
      },
    });

    res.status(201).json({ success: true, data: application });
  },

  updateStatus: async (req: Request, res: Response) => {
    const data = await prisma.application.update({ where: { id: req.body.applicationId }, data: { status: req.body.status as ApplicationStatus } });
    res.json({ success: true, data });
  },
};
