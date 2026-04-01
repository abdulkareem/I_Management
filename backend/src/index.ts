import type { WorkerEnv } from './db/env';
import { handleLegacyApi } from './services/legacy-api';
import { handleAuthRoute } from './routes/auth';
import { handleInternshipsRoute } from './routes/internships';
import { handleApplicationsRoute } from './routes/applications';
import { handleFeedbackRoute } from './routes/feedback';

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const routed =
      (await handleAuthRoute(request, env))
      ?? (await handleInternshipsRoute(request, env))
      ?? (await handleApplicationsRoute(request, env))
      ?? (await handleFeedbackRoute(request, env));

    if (routed) return routed;
    return handleLegacyApi(request, env);
  },
};
