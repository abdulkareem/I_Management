import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';

export const internshipController = {
  create: async (req: Request, res: Response) => {
    const data = await prisma.internship.create({
      data: {
        title: req.body.title,
        description: req.body.description,
        industryId: req.body.industryId,
        collegeId: req.body.collegeId,
        departmentId: req.body.departmentId,
        ideaId: req.body.ideaId,
      },
    });
    res.status(201).json({ success: true, data });
  },

  publicList: async (req: Request, res: Response) => {
    const internships = await prisma.internship.findMany({
      where: req.query.collegeId ? { collegeId: String(req.query.collegeId) } : undefined,
      include: {
        department: { select: { id: true, name: true, college: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: internships.map((internship) => ({
        id: internship.id,
        title: internship.title || internship.id,
        description: internship.description,
        departmentId: internship.department.id,
        departmentName: internship.department.name,
        collegeId: internship.department.college.id,
        collegeName: internship.department.college.name,
      })),
    });
  },
};
