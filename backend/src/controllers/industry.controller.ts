import type { Request, Response } from 'express';
import { industryService } from '../services/industry.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.js';
import { prisma } from '../utils/prisma.js';
import { ApplicationStatus } from '@prisma/client';

export const industryController = {
  create: async (req: Request, res: Response) => {
    const industry = await industryService.create(req.body);
    res.status(201).json({ success: true, data: industry, redirect: '/dashboard/industry' });
  },
  dashboard: async (req: AuthenticatedRequest, res: Response) => {
    const industry = await prisma.industry.findUnique({
      where: { userId: req.user!.userId },
      include: {
        internships: {
          include: {
            idea: true,
            applications: {
              include: {
                student: {
                  include: {
                    user: true,
                    college: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const allApplications = industry!.internships.flatMap((internship) =>
      internship.applications.map((application) => ({ internship, application })),
    );

    const attendanceToday = await prisma.attendance.count({
      where: {
        internship: { industryId: industry!.id },
        date: {
          gte: new Date(new Date().toISOString().slice(0, 10)),
          lt: new Date(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
        },
      },
    });

    res.json({
      success: true,
      data: {
        industry: { id: industry!.id, name: industry!.name, description: industry!.registrationDetails, emblem: industry!.emblemUrl },
        stats: {
          liveOpportunities: industry!.internships.length,
          pendingApplications: allApplications.filter(({ application }) => application.status === ApplicationStatus.PENDING).length,
          acceptedApplications: allApplications.filter(({ application }) => application.status === ApplicationStatus.APPROVED).length,
          attendanceToday,
        },
        opportunities: industry!.internships.map((internship) => ({
          id: internship.id,
          title: internship.idea.title,
          description: internship.idea.description,
          applications: internship.applications.length,
        })),
        applications: allApplications.map(({ internship, application }) => ({
          id: application.id,
          studentName: application.student.user.name,
          collegeName: application.student.college.name,
          opportunityTitle: internship.idea.title,
          status: application.status,
        })),
      },
    });
  },
  acceptApplication: async (req: AuthenticatedRequest, res: Response) => {
    const data = await prisma.application.update({
      where: { id: req.params.applicationId },
      data: { status: ApplicationStatus.APPROVED },
    });
    res.json({ success: true, data });
  },
};
