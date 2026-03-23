import { readFile } from 'node:fs/promises';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import { bootstrapDemoData } from './lib/bootstrap.js';
import { fail } from './lib/http.js';
import { resolveStoredAsset } from './lib/storage.js';
import { authRoutes } from './routes/auth.js';
import { catalogRoutes } from './routes/catalog.js';
import { collegeRoutes } from './routes/college.js';
import { industryRoutes } from './routes/industry.js';
import { studentRoutes } from './routes/student.js';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(swagger, {
    openapi: {
      info: {
        title: 'InternSuite Single Workspace API',
        version: '2.0.0',
        description: 'Single-workspace internship platform API with role-based access, MoU automation, offer letters, attendance, and PWA-ready frontend integration.',
      },
    },
  });
  app.register(swaggerUi, { routePrefix: '/docs' });

  app.get('/health', async () => ({ success: true, mode: 'single-workspace' }));
  app.get('/assets/:fileName', async (request, reply) => {
    const fileName = (request.params as { fileName: string }).fileName;
    const file = await readFile(resolveStoredAsset(fileName));
    reply.header('Content-Type', 'application/pdf');
    return reply.send(file);
  });

  app.register(authRoutes, { prefix: '/api' });
  app.register(catalogRoutes, { prefix: '/api' });
  app.register(studentRoutes, { prefix: '/api' });
  app.register(collegeRoutes, { prefix: '/api' });
  app.register(industryRoutes, { prefix: '/api' });

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = reply.statusCode >= 400 ? reply.statusCode : 500;
    reply.code(statusCode).send(fail(error.message || 'Unexpected error', { statusCode }));
  });

  app.addHook('onReady', async () => {
    if (process.env.NODE_ENV !== 'production') {
      await bootstrapDemoData();
    }
  });

  return app;
}
