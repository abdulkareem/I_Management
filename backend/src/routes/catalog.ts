import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { ok } from '../lib/http.js';

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  app.get('/catalog/colleges', async () => {
    const colleges = await prisma.college.findMany({
      include: { departments: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    });

    return ok('College catalog loaded.', { colleges });
  });
};
