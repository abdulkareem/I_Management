import type { FastifyPluginAsync } from 'fastify';
import { ApplicationStatus, AttendanceStatus, MouStatus, Role, prisma } from '@prism/database';
import { z } from 'zod';
import { generateOfferLetterPdf } from '../lib/documents.js';
import { ok } from '../lib/http.js';
import { sendTransactionalEmail } from '../lib/mailer.js';
import { requireAuth } from '../lib/security.js';

const mouRequestSchema = z.object({ collegeId: z.string().min(1) });
const opportunitySchema = z.object({ title: z.string().min(2), description: z.string().min(10) });
const attendanceSchema = z.object({
  studentId: z.string().min(1),
  date: z.string().datetime(),
  status: z.nativeEnum(AttendanceStatus),
});

export const industryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/industry/dashboard', { preHandler: requireAuth({ roles: [Role.INDUSTRY] }) }, async (request) => {
    const industry = await prisma.industry.findUniqueOrThrow({
      where: { userId: request.user!.sub },
      include: {
        opportunities: {
          include: { applications: { include: { student: { include: { college: true, user: true } } } } },
        },
        attendances: true,
      },
    });

    const applications = industry.opportunities.flatMap((opportunity) =>
      opportunity.applications.map((application) => ({
        id: application.id,
        studentName: application.student.user.name,
        collegeName: application.student.college.name,
        opportunityTitle: opportunity.title,
        status: application.status,
      })),
    );

    return ok('Industry dashboard loaded.', {
      industry: {
        id: industry.id,
        name: industry.name,
        description: industry.description,
        emblem: industry.emblem,
      },
      stats: {
        liveOpportunities: industry.opportunities.length,
        pendingApplications: applications.filter((item) => item.status === 'APPLIED').length,
        acceptedApplications: applications.filter((item) => item.status === 'ACCEPTED').length,
        attendanceToday: industry.attendances.filter((item) => item.date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
      },
      opportunities: industry.opportunities.map((opportunity) => ({
        id: opportunity.id,
        title: opportunity.title,
        description: opportunity.description,
        applications: opportunity.applications.length,
      })),
      applications,
    });
  });

  app.post('/industry/mous/request', { preHandler: requireAuth({ roles: [Role.INDUSTRY] }) }, async (request, reply) => {
    const payload = mouRequestSchema.parse(request.body);
    const industry = await prisma.industry.findUniqueOrThrow({ where: { userId: request.user!.sub } });
    const mou = await prisma.moU.upsert({
      where: { collegeId_industryId: { collegeId: payload.collegeId, industryId: industry.id } },
      update: { status: MouStatus.PENDING, signedAt: null, pdfUrl: null },
      create: { collegeId: payload.collegeId, industryId: industry.id },
    });
    reply.code(201);
    return ok('MoU request sent to college.', { mou });
  });

  app.post('/industry/opportunities', { preHandler: requireAuth({ roles: [Role.INDUSTRY] }) }, async (request, reply) => {
    const payload = opportunitySchema.parse(request.body);
    const industry = await prisma.industry.findUniqueOrThrow({ where: { userId: request.user!.sub } });
    const opportunity = await prisma.internshipOpportunity.create({
      data: { industryId: industry.id, title: payload.title, description: payload.description },
    });
    reply.code(201);
    return ok('Internship opportunity published.', { opportunity });
  });

  app.post('/industry/applications/:applicationId/accept', { preHandler: requireAuth({ roles: [Role.INDUSTRY] }) }, async (request) => {
    const params = z.object({ applicationId: z.string().min(1) }).parse(request.params);
    const industry = await prisma.industry.findUniqueOrThrow({ where: { userId: request.user!.sub } });
    const application = await prisma.application.findFirstOrThrow({
      where: { id: params.applicationId, opportunity: { industryId: industry.id } },
      include: {
        student: { include: { user: true } },
        opportunity: true,
      },
    });

    const acceptanceUrl = await generateOfferLetterPdf({
      studentName: application.student.user.name,
      opportunityTitle: application.opportunity.title,
      industryName: industry.name,
    });

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: ApplicationStatus.ACCEPTED, acceptanceUrl },
    });

    await sendTransactionalEmail({
      to: application.student.user.email,
      subject: `You were accepted for ${application.opportunity.title}`,
      html: `<p>Congratulations, your application has been accepted.</p><p><a href="${acceptanceUrl}">Download offer letter</a></p>`,
    });

    return ok('Application accepted and offer letter generated.', { application: updated, acceptanceUrl });
  });

  app.post('/industry/attendance', { preHandler: requireAuth({ roles: [Role.INDUSTRY] }) }, async (request, reply) => {
    const payload = attendanceSchema.parse(request.body);
    const industry = await prisma.industry.findUniqueOrThrow({ where: { userId: request.user!.sub } });
    const attendance = await prisma.attendance.upsert({
      where: { studentId_date: { studentId: payload.studentId, date: new Date(payload.date) } },
      update: { status: payload.status, industryId: industry.id },
      create: {
        studentId: payload.studentId,
        industryId: industry.id,
        date: new Date(payload.date),
        status: payload.status,
      },
    });
    reply.code(201);
    return ok('Attendance recorded successfully.', { attendance });
  });
};
