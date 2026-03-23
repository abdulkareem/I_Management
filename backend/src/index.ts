import { prisma } from '@prism/database';
import { buildServer } from './server.js';

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';

const app = buildServer();
app.listen({ port, host }).catch(async (error: unknown) => {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await prisma.$disconnect();
    await app.close();
    process.exit(0);
  });
}
