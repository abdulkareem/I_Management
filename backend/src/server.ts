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
        title: 'Internship Cloud ERP API',
        version: '2.0.0',
        description: 'College-paid internship ERP API with semester lifecycle governance, archive economics, and preserved FYUGP compliance rules.',
      },
    },
  });
  app.register(swaggerUi, { routePrefix: '/docs' });

  app.register(systemRoutes, { prefix: '/api' });
  app.register(complianceRoutes, { prefix: '/api' });

  return app;
}
