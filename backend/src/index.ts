import { app } from './app.js';
import { prisma } from './utils/prisma.js';

const PORT = Number(process.env.PORT ?? 8080);
const DATABASE_URL = process.env.DATABASE_URL ?? '';

function getSafeDatabaseUrl(url: string): string {
  if (!url) {
    return 'DATABASE_URL is not set';
  }

  try {
    const parsed = new URL(url);
    const hasPassword = parsed.password.length > 0;
    parsed.username = parsed.username ? '***' : '';
    parsed.password = hasPassword ? '***' : '';
    return parsed.toString();
  } catch {
    return 'DATABASE_URL is set but could not be parsed';
  }
}

async function startServer() {
  console.log(`[startup] DATABASE_URL: ${getSafeDatabaseUrl(DATABASE_URL)}`);

  await prisma.$connect();
  const currentDbResult = await prisma.$queryRawUnsafe<Array<{ current_database: string }>>(
    'SELECT current_database()',
  );
  const currentDatabase = currentDbResult[0]?.current_database ?? 'unknown';
  console.log(`[startup] Connected database: ${currentDatabase}`);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(async (error) => {
  console.error('[startup] Failed to initialize backend:', error);
  await prisma.$disconnect();
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
