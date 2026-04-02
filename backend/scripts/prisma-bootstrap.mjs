import { execSync } from 'node:child_process';

async function run() {
  const internalDatabaseUrl = process.env.DATABASE_URL_INTERNAL || process.env.DATABASE_URL;
  if (!internalDatabaseUrl) {
    console.warn('[PRISMA_BOOTSTRAP] DATABASE_URL_INTERNAL/DATABASE_URL missing. Skipping Prisma bootstrap.');
    return;
  }

  process.env.DATABASE_URL = internalDatabaseUrl;
  console.log('[PRISMA_BOOTSTRAP] Using Railway internal DATABASE_URL.');

  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$connect();
    await prisma.$executeRaw`SELECT 1`;
    await prisma.$disconnect();
    console.log('[PRISMA_BOOTSTRAP] Prisma DB connection verified with SELECT 1.');
  } catch (error) {
    console.error('[PRISMA_BOOTSTRAP] Prisma connection check failed:', error);
    throw error;
  }

  try {
    execSync('command -v psql >/dev/null 2>&1', { stdio: 'ignore' });
    execSync('psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/schema.sql', { stdio: 'inherit' });
    console.log('[PRISMA_BOOTSTRAP] Base SQL schema applied from packages/db/schema.sql.');
  } catch (error) {
    console.warn('[PRISMA_BOOTSTRAP] psql unavailable or schema apply failed, continuing with Prisma sync:', error.message);
  }

  try {
    execSync('npx prisma db push --schema packages/db/prisma/schema.prisma', { stdio: 'inherit' });
    execSync('npx prisma migrate deploy --schema packages/db/prisma/schema.prisma', { stdio: 'inherit' });
    console.log('[PRISMA_BOOTSTRAP] Prisma schema sync complete.');
  } catch (error) {
    console.error('[PRISMA_BOOTSTRAP] Prisma migration failed:', error);
    throw error;
  }
}

run().catch((error) => {
  console.error('[PRISMA_BOOTSTRAP] Fatal error:', error);
  process.exit(1);
});
