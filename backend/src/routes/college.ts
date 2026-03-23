import type { FastifyPluginAsync } from 'fastify';
import { MouStatus, Role, prisma } from '@prism/database';
import { z } from 'zod';
import { generateMouPdf } from '../lib/documents.js';
import { ok } from '../lib/http.js';
import { sendTransactionalEmail } from '../lib/mailer.js';
import { requireAuth } from '../lib/security.js';

export const collegeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/college/dashboard', { preHandler: requireAuth({ roles: [Role.COLLEGE_COORDINATOR] }) }, async (request) => {
    const college = await prisma.college.findUniqueOrThrow({
      where: { coordinatorId: request.user!.sub },
      include: {
        mous: { include: { industry: true } },
        students: { include: { applications: true, user: true }, orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    const pendingMous = college.mous
      .filter((mou) => mou.status === MouStatus.PENDING)
      .map((mou) => ({
        id: mou.id,
        industryName: mou.industry.name,
        industryDescription: mou.industry.description,
        createdAtLabel: mou.signedAt ? mou.signedAt.toISOString().slice(0, 10) : 'Awaiting review',
      }));

    return ok('College dashboard loaded.', {
      college: {
        id: college.id,
        name: college.name,
        address: college.address,
        emblem: college.emblem,
      },
      stats: {
        pendingMous: pendingMous.length,
        approvedIndustries: college.mous.filter((mou) => mou.status === MouStatus.ACCEPTED).length,
        activeStudents: college.students.length,
        applicationsSubmitted: college.students.reduce((sum, student) => sum + student.applications.length, 0),
      },
      pendingMous,
      approvedIndustries: college.mous
        .filter((mou) => mou.status === MouStatus.ACCEPTED)
        .map((mou) => ({ id: mou.industry.id, name: mou.industry.name, emblem: mou.industry.emblem })),
      studentActivity: college.students.map((student) => ({
        studentName: student.user.name,
        universityRegNo: student.universityRegNo,
        applications: student.applications.length,
      })),
    });
  });

  app.post('/college/mous/:mouId/approve', { preHandler: requireAuth({ roles: [Role.COLLEGE_COORDINATOR] }) }, async (request) => {
    const params = z.object({ mouId: z.string().min(1) }).parse(request.params);
    const college = await prisma.college.findUniqueOrThrow({ where: { coordinatorId: request.user!.sub } });
    const mou = await prisma.moU.findFirstOrThrow({
      where: { id: params.mouId, collegeId: college.id },
      include: { industry: { include: { user: true } }, college: { include: { coordinator: true } } },
    });

    const pdfUrl = await generateMouPdf({
      collegeName: mou.college.name,
      industryName: mou.industry.name,
      coordinatorName: mou.college.coordinator.name,
    });

    const updated = await prisma.moU.update({
      where: { id: mou.id },
      data: { status: MouStatus.ACCEPTED, signedAt: new Date(), pdfUrl },
    });

    await sendTransactionalEmail({
      to: mou.industry.user.email,
      subject: `${mou.college.name} approved your MoU request`,
      html: `<p>Your MoU request has been approved.</p><p><a href="${pdfUrl}">Download signed MoU</a></p>`,
    });

    return ok('MoU approved and PDF generated.', { mou: updated, pdfUrl });
  });
};
