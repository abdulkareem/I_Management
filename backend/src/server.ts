import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import { bootstrapDemoData } from './lib/bootstrap.js';
import { authRoutes } from './routes/auth.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { notificationRoutes } from './routes/notifications.js';
import { tenantRoutes } from './routes/tenants.js';
import { userRoutes } from './routes/users.js';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(swagger, {
    openapi: {
      info: {
        title: 'Prism Multi-Tenant SaaS API',
        version: '1.0.0',
        description:
          'Production-style multi-tenant SaaS API with Prisma persistence, tenant isolation, role-aware auth, Resend verification, notifications, and audit logs.',
      },
    },
  });
  app.register(swaggerUi, { routePrefix: '/docs' });

  app.get('/health', async () => ({ success: true }));

  app.register(authRoutes, { prefix: '/api' });
  app.register(tenantRoutes, { prefix: '/api' });
  app.register(userRoutes, { prefix: '/api' });
  app.register(notificationRoutes, { prefix: '/api' });
  app.register(dashboardRoutes, { prefix: '/api' });

  app.addHook('onReady', async () => {
    await bootstrapDemoData();
  });

  return app;
}
