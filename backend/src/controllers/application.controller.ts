import type { Request, Response } from 'express';
import { applicationService } from '../services/application.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.js';
import { prisma } from '../utils/prisma.js';

export const applicationController = {
  apply: async (req: AuthenticatedRequest, res: Response) => {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
    const application = await applicationService.apply({ studentId: student!.id, internshipId: req.body.internshipId });
    res.status(201).json({ success: true, data: application });
  },
  updateStatus: async (req: Request, res: Response) => {
    const data = await applicationService.updateStatus(req.body.applicationId, req.body.status);
    res.json({ success: true, data });
  },
};
