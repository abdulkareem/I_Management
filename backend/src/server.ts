import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import { authRoutes } from './routes/auth.js';
import { complianceRoutes } from './routes/compliance.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { systemRoutes } from './routes/system.js';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(swagger, {
    openapi: {
      info: {
        title: 'InternSuite API',
        version: '3.0.0',
        description: 'InternSuite API for public SaaS access, secure role-based sessions, dashboard delivery, and preserved FYUGP internship compliance rules.',
      },
    },
  });
  app.register(swaggerUi, { routePrefix: '/docs' });

  app.register(systemRoutes, { prefix: '/api' });
  app.register(authRoutes, { prefix: '/api' });
  app.register(dashboardRoutes, { prefix: '/api' });
  app.register(complianceRoutes, { prefix: '/api' });

  return app;
}
