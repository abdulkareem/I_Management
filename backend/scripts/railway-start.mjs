import http from 'node:http';
import { spawn } from 'node:child_process';

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
const SYNC_INTERVAL_MS = Math.max(30_000, Number.parseInt(process.env.DB_SYNC_INTERVAL_MS ?? '120000', 10));

let lastSyncStatus = 'never';
let lastSyncAt = null;
let lastError = null;
let syncInFlight = false;

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
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

async function syncDatabase() {
  if (syncInFlight) return;
  syncInFlight = true;
  lastError = null;

  try {
    console.log('[RAILWAY_START] Running Prisma sync...');
    await runCommand('node', ['./scripts/prisma-auto-sync.mjs']);

    console.log('[RAILWAY_START] Running SQL bootstrap...');
    await runCommand('node', ['./scripts/prisma-bootstrap.mjs']);

    lastSyncStatus = 'ok';
    lastSyncAt = new Date().toISOString();
    console.log(`[RAILWAY_START] Database sync completed at ${lastSyncAt}.`);
  } catch (error) {
    lastSyncStatus = 'failed';
    lastSyncAt = new Date().toISOString();
    lastError = error instanceof Error ? error.message : String(error);
    console.error('[RAILWAY_START] Database sync failed:', lastError);
  } finally {
    syncInFlight = false;
  }
}

function startHealthServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (url.pathname === '/healthz' || url.pathname === '/api/health') {
      const healthy = lastSyncStatus !== 'failed';
      const body = JSON.stringify({
        success: healthy,
        service: 'railway-backend-sync',
        status: lastSyncStatus,
        syncing: syncInFlight,
        lastSyncAt,
        lastError,
      });

      res.writeHead(healthy ? 200 : 503, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(body);
      return;
    }

    if (url.pathname === '/admin/db-sync' && req.method === 'POST') {
      syncDatabase().finally(() => undefined);
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Database sync started' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Backend sync service is running. Use /healthz.');
  });

  server.listen(PORT, () => {
    console.log(`[RAILWAY_START] Health server listening on port ${PORT}.`);
  });
}

async function run() {
  console.log('[RAILWAY_START] Boot sequence started.');
  await syncDatabase();
  startHealthServer();

  setInterval(() => {
    syncDatabase().finally(() => undefined);
  }, SYNC_INTERVAL_MS).unref();
}

run().catch((error) => {
  console.error('[RAILWAY_START] Fatal startup failure:', error);
  process.exit(1);
});
