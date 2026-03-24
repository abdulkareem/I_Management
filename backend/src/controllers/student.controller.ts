import type { Request, Response } from 'express';
import { studentService } from '../services/student.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.js';
import { prisma } from '../utils/prisma.js';

export const studentController = {
  register: async (req: Request, res: Response) => {
    const student = await studentService.register(req.body);
    res.status(201).json({ success: true, data: student });
  },
  dashboard: async (req: AuthenticatedRequest, res: Response) => {
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.userId },
      include: {
        applications: {
          include: {
            internship: {
              include: {
                industry: true,
                idea: true,
              },
            },
          },
        },
        department: true,
      },
    });

    const internships = await prisma.internship.findMany({
      where: {
        departmentId: student!.departmentId,
      },
      include: {
        industry: true,
        idea: true,
        applications: {
          where: { studentId: student!.id },
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const completedSteps = [
      true,
      student!.applications.length > 0,
      student!.applications.some((application) => application.status === 'APPROVED'),
    ].filter(Boolean).length;

    res.json({
      success: true,
      data: {
        journeyCompletion: Math.round((completedSteps / 3) * 100),
        journeySteps: [
          { label: 'Profile completed', done: true },
          { label: 'Applied to internship', done: student!.applications.length > 0 },
          { label: 'Approved by industry', done: student!.applications.some((application) => application.status === 'APPROVED') },
        ],
        internships: internships.map((internship) => ({
          id: internship.id,
          title: internship.idea.title,
          description: internship.idea.description,
          industryName: internship.industry.name,
          mouStatus: 'APPROVED',
          applied: internship.applications.length > 0,
          status: internship.applications[0]?.status,
        })),
        applications: student!.applications.map((application) => ({
          id: application.id,
          internshipTitle: application.internship.idea.title,
          industryName: application.internship.industry.name,
          status: application.status,
          acceptanceUrl: null,
        })),
      },
    });
  },
  apply: async (req: AuthenticatedRequest, res: Response) => {
    const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
    const application = await prisma.application.create({
      data: {
        studentId: student!.id,
        internshipId: req.params.internshipId,
      },
    });
    res.status(201).json({ success: true, data: application });
  },
};
