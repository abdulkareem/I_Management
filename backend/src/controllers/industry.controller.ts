import type { Request, Response } from 'express';
import { ApplicationStatus } from '@prisma/client';
import { industryService } from '../services/industry.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.js';
import { prisma } from '../utils/prisma.js';

export const industryController = {
  create: async (req: Request, res: Response) => {
    const industry = await industryService.create(req.body);
    res.status(201).json({ success: true, data: industry });
  },

  approve: async (req: Request, res: Response) => {
    const industry = await industryService.approve(req.body.industryId, req.body.action === 'APPROVED');
    res.json({ success: true, data: industry });
  },

  dashboard: async (req: AuthenticatedRequest, res: Response) => {
    const industry = await prisma.industry.findUnique({
      where: { userId: req.user!.userId },
      include: {
        internships: {
          include: {
            applications: true,
            college: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        industry,
        approvedColleges: await prisma.college.findMany({ where: { status: 'APPROVED' }, select: { id: true, name: true } }),
        stats: {
          internships: industry?.internships.length ?? 0,
          pendingApplications:
            industry?.internships.reduce((acc, internship) => acc + internship.applications.filter((a) => a.status === ApplicationStatus.PENDING).length, 0) ?? 0,
        },
      },
    });
  },
};
