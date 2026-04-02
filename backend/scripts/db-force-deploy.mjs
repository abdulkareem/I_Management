import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const wantsD1 = args.includes('--d1');
const wantsRailway = args.includes('--railway');
const wantsLocalD1 = args.includes('--local');

function runCommand(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${commandArgs.join(' ')} failed with exit code ${code}`));
    });
  });
}

async function deployRailway() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for Railway force deploy.');
  }

  console.log('[DB_FORCE_DEPLOY] Running destructive Railway reset + Prisma sync...');
  await runCommand('npm', ['run', 'db:railway:fresh']);
}

async function deployD1() {
  if (!process.env.CLOUDFLARE_API_TOKEN && !wantsLocalD1) {
    throw new Error('CLOUDFLARE_API_TOKEN is required for remote D1 force deploy. Use --local for local D1.');
  }

  console.log(`[DB_FORCE_DEPLOY] Running D1 migration (${wantsLocalD1 ? 'local' : 'remote'})...`);
  await runCommand('npm', [
    'run',
    wantsLocalD1 ? 'db:migrate:local' : 'db:migrate',
  ]);
}

async function run() {
  if (wantsD1 && wantsRailway) {
    throw new Error('Choose only one target: --d1 or --railway.');
  }

  if (wantsRailway) {
    await deployRailway();
    console.log('[DB_FORCE_DEPLOY] Railway force deploy completed.');
    return;
  }

  if (wantsD1) {
    await deployD1();
    console.log('[DB_FORCE_DEPLOY] D1 force deploy completed.');
    return;
  }

  if (process.env.DATABASE_URL) {
    await deployRailway();
    console.log('[DB_FORCE_DEPLOY] Auto-selected Railway force deploy completed.');
    return;
  }

  await deployD1();
  console.log('[DB_FORCE_DEPLOY] Auto-selected D1 force deploy completed.');
}

run().catch((error) => {
  console.error('[DB_FORCE_DEPLOY] Failed:', error.message);
  process.exit(1);
});
