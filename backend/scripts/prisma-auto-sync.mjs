import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..');
const schemaPath = path.join(repoRoot, 'packages', 'db', 'prisma', 'schema.prisma');

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
    });
  });
}

const extraArgs = process.argv.slice(2);

async function run() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL || process.env.DATABASE_URL_INTERNAL);

  if (!hasDatabaseUrl) {
    console.warn('[PRISMA_SYNC] DATABASE_URL/DATABASE_URL_INTERNAL missing. Skipping Prisma schema sync.');
    return;
  }

  console.log('[PRISMA_SYNC] Synchronizing schema.prisma to PostgreSQL...');
  await runCommand('npx', ['prisma', 'db', 'push', '--schema', schemaPath, ...extraArgs], { cwd: repoRoot });

  console.log('[PRISMA_SYNC] Generating Prisma Client...');
  await runCommand('npx', ['prisma', 'generate', '--schema', schemaPath], { cwd: repoRoot });

  console.log('[PRISMA_SYNC] Schema synchronized successfully.');
}

run().catch((error) => {
  console.error('[PRISMA_SYNC] Failed to synchronize Prisma schema:', error);
  process.exit(1);
});
