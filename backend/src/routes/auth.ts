import { handleLegacyApi } from '../services/legacy-api';
import type { WorkerEnv } from '../db/env';

export async function handleAuthRoute(request: Request, env: WorkerEnv): Promise<Response | null> {
  if (!new URL(request.url).pathname.startsWith('/api/auth')) return null;
  return handleLegacyApi(request, env);
}
