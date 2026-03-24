import type { Request, Response } from 'express';
import { collegeService } from '../services/college.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.js';
import { prisma } from '../utils/prisma.js';

export const collegeController = {
  create: async (req: Request, res: Response) => {
    const college = await collegeService.createCollegeWorkspace(req.body);
    res.status(201).json({ success: true, data: college });
  },
  list: async (req: Request, res: Response) => {
    const result = await collegeService.listColleges(req.query as { page?: string; limit?: string });
    res.json({ success: true, data: result.items, pagination: result.pagination });
  },
  departmentsByCollege: async (req: Request, res: Response) => {
    const data = await collegeService.getDepartmentsByCollege(req.params.collegeId);
    res.json({ success: true, data });
  },
  dashboard: async (req: AuthenticatedRequest, res: Response) => {
    const college = await prisma.college.findUnique({
      where: { createdById: req.user!.userId },
      include: {
        students: true,
        departments: true,
        internships: {
          include: {
            industry: true,
            applications: true,
          },
        },
      },
    });

    const approvedIndustryMap = new Map(
      college!.internships.map((internship) => [internship.industryId, { id: internship.industry.id, name: internship.industry.name, emblem: internship.industry.emblemUrl }]),
    );
    const applicationsSubmitted = college!.internships.reduce((sum, internship) => sum + internship.applications.length, 0);

    res.json({
      success: true,
      data: {
        college: { id: college!.id, name: college!.name, address: '', emblem: college!.emblemUrl },
        stats: {
          pendingMous: 0,
          approvedIndustries: approvedIndustryMap.size,
          activeStudents: college!.students.length,
          applicationsSubmitted,
        },
        pendingMous: [],
        approvedIndustries: Array.from(approvedIndustryMap.values()),
        studentActivity: [],
      },
    });
  },
  catalog: async (_req: Request, res: Response) => {
    const colleges = await prisma.college.findMany({
      select: {
        id: true,
        name: true,
        departments: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: { colleges } });
  },
};
