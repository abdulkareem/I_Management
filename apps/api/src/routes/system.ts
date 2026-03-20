import { allocateInternshipSeats } from '@prism/compliance';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

export const systemRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({ status: 'ok', service: 'prism-api' }));

  app.get('/bootstrap', async () => ({
    platform: 'PRISM – PSMO Rural Internship & Skill Mission',
    superAdminEmail: 'abdulkareem@psmocollege.ac.in',
    pricing: '₹5/student/month',
    whatsappAlerts: ['OTP', 'Approval', 'Submission reminders'],
    evaluationScheme: { cca: 15, ese: 35, total: 50 },
    paymentRules: {
      internal: 500,
      external: 1000,
      verificationLayers: ['Faculty mentor', 'College coordinator'],
    },
  }));

  app.post('/allocation/auto-assign', async (request) => {
    const payload = z
      .object({
        ranking: z.array(
          z.object({
            studentId: z.string(),
            rankScore: z.number(),
            preferredInternshipIds: z.array(z.string()).min(1),
          }),
        ),
        inventory: z.array(
          z.object({
            internshipId: z.string(),
            seats: z.number().int().nonnegative(),
          }),
        ),
      })
      .parse(request.body);

    return {
      allocations: allocateInternshipSeats(payload.ranking, payload.inventory),
    };
  });
};
