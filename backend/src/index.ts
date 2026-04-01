import type { WorkerEnv } from './db/env';
import { handleLegacyApi } from './services/legacy-api';
import { handleAuthRoute } from './routes/auth';
import { handleInternshipsRoute } from './routes/internships';
import { handleApplicationsRoute } from './routes/applications';
import { handleFeedbackRoute } from './routes/feedback';

let hasLoggedDbStatus = false;

async function verifyDatabaseConnection(env: WorkerEnv): Promise<void> {
  if (hasLoggedDbStatus) return;
  try {
    await env.DB.prepare('SELECT 1 AS ok').first();
    console.log('[BOOT] Database connection verified.');
    hasLoggedDbStatus = true;
  } catch (error) {
    console.error('[BOOT] Database connection check failed:', error);
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    await verifyDatabaseConnection(env);
    const routed =
      (await handleAuthRoute(request, env))
      ?? (await handleInternshipsRoute(request, env))
      ?? (await handleApplicationsRoute(request, env))
      ?? (await handleFeedbackRoute(request, env));

    if (routed) return routed;
    return handleLegacyApi(request, env);
  },
};
