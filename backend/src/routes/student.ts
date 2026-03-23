import type { FastifyPluginAsync } from 'fastify';
import { MouStatus, Role, prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { ok } from '../lib/http.js';
import { requireAuth } from '../lib/security.js';

export const studentRoutes: FastifyPluginAsync = async (app) => {
  app.get('/student/dashboard', { preHandler: requireAuth({ roles: [Role.STUDENT] }) }, async (request) => {
    const student = await prisma.student.findUniqueOrThrow({
      where: { userId: request.user!.sub },
      include: {
        applications: {
          include: {
            opportunity: { include: { industry: true } },
          },
          orderBy: { id: 'desc' },
        },
      },
    });

    const approvedIndustries = await prisma.moU.findMany({
      where: { collegeId: student.collegeId, status: MouStatus.ACCEPTED },
      include: { industry: { include: { opportunities: true } } },
    });

    const appliedOpportunityIds = new Map(student.applications.map((application) => [application.opportunityId, application]));
    const internships = approvedIndustries.flatMap((mou) =>
      mou.industry.opportunities.map((opportunity) => ({
        id: opportunity.id,
        title: opportunity.title,
        description: opportunity.description,
        industryName: mou.industry.name,
        industryEmblem: mou.industry.emblem,
        mouStatus: 'APPROVED' as const,
        applied: appliedOpportunityIds.has(opportunity.id),
        status: appliedOpportunityIds.get(opportunity.id)?.status,
      })),
    );

    const doneFlags = {
      registered: true,
      applied: student.applications.length > 0,
      accepted: student.applications.some((item) => item.status === 'ACCEPTED'),
    };
    const journeySteps = [
      { label: 'Profile completed', done: doneFlags.registered },
      { label: 'Applied to internship', done: doneFlags.applied },
      { label: 'Accepted by industry', done: doneFlags.accepted },
    ];

    return ok('Student dashboard loaded.', {
      journeyCompletion: Math.round((journeySteps.filter((step) => step.done).length / journeySteps.length) * 100),
      journeySteps,
      internships,
      applications: student.applications.map((application) => ({
        id: application.id,
        internshipTitle: application.opportunity.title,
        industryName: application.opportunity.industry.name,
        status: application.status,
        acceptanceUrl: application.acceptanceUrl,
      })),
    });
  });

  app.post('/student/applications/:opportunityId', { preHandler: requireAuth({ roles: [Role.STUDENT] }) }, async (request, reply) => {
    const params = z.object({ opportunityId: z.string().min(1) }).parse(request.params);
    const student = await prisma.student.findUniqueOrThrow({ where: { userId: request.user!.sub } });
    const opportunity = await prisma.internshipOpportunity.findUniqueOrThrow({
      where: { id: params.opportunityId },
      include: { industry: true },
    });

    const mou = await prisma.moU.findUnique({
      where: { collegeId_industryId: { collegeId: student.collegeId, industryId: opportunity.industryId } },
    });

    if (!mou || mou.status !== MouStatus.ACCEPTED) {
      reply.code(403);
      throw new Error('This opportunity is not available because the partnership is not approved yet.');
    }

    const application = await prisma.application.upsert({
      where: { studentId_opportunityId: { studentId: student.id, opportunityId: opportunity.id } },
      update: {},
      create: { studentId: student.id, opportunityId: opportunity.id },
    });

    reply.code(201);
    return ok('Application submitted successfully.', { application });
  });
};
