import type { Request, Response } from 'express';
import { CollegeStatus, Role } from '@prisma/client';
import { collegeService } from '../services/college.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.js';
import { prisma } from '../utils/prisma.js';

export const collegeController = {
  register: async (req: Request, res: Response) => {
    const college = await collegeService.registerCollege(req.body);
    res.status(201).json({ success: true, message: 'College registration submitted', data: { ...college, status: 'PENDING' } });
  },

  approve: async (req: Request, res: Response) => {
    const updated = await collegeService.approveCollege(req.body.collegeId, req.body.action);
    res.json({ success: true, data: updated });
  },

  list: async (_req: Request, res: Response) => {
    const colleges = await collegeService.listColleges();
    res.json({ success: true, data: colleges });
  },

  dashboard: async (req: AuthenticatedRequest, res: Response) => {
    const college = await prisma.college.findUnique({
      where: { createdById: req.user!.userId },
      include: {
        departments: { include: { coordinatorUser: true } },
      },
    });

    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found' });
    }

    if (college.status !== CollegeStatus.APPROVED) {
      return res.status(403).json({ success: false, message: 'College pending approval' });
    }

    res.json({
      success: true,
      data: {
        college,
        modules: ['Departments', 'Coordinators', 'Reports'],
      },
    });
  },

  departmentsByCollege: async (req: Request, res: Response) => {
    const departments = await prisma.department.findMany({ where: { collegeId: req.params.collegeId }, select: { id: true, name: true } });
    res.json({ success: true, data: departments });
  },

  catalog: async (_req: Request, res: Response) => {
    const data = await collegeService.catalogApproved();
    res.json({ success: true, data });
  },

  addDepartment: async (req: Request, res: Response) => {
    const created = await collegeService.createDepartment(req.body);
    res.status(201).json({ success: true, data: created.department, generatedPassword: created.generatedPassword });
  },

  superAdminDashboard: async (_req: Request, res: Response) => {
    const [colleges, industries, internships, applications] = await Promise.all([
      prisma.college.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.industry.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.internship.count(),
      prisma.application.count(),
    ]);

    res.json({
      success: true,
      data: {
        colleges,
        industries,
        analytics: { totalInternships: internships, totalApplications: applications },
      },
    });
  },
};
