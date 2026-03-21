import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import { complianceRoutes } from './routes/compliance.js';
import { systemRoutes } from './routes/system.js';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(swagger, {
    openapi: {
      info: {
        title: 'PRISM API',
        version: '1.0.0',
        description: 'Multi-tenant rural internship compliance and management platform for FYUGP colleges.',
      },
    },
  });
  app.register(swaggerUi, { routePrefix: '/docs' });

  app.register(systemRoutes, { prefix: '/api' });
  app.register(complianceRoutes, { prefix: '/api' });

  return app;
}
