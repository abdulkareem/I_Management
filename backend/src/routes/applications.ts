import { handleLegacyApi } from '../services/legacy-api';
import type { WorkerEnv } from '../db/env';

const APPLICATION_PREFIXES = ['/api/applications', '/api/student/applications', '/api/external/applications'];

export async function handleApplicationsRoute(request: Request, env: WorkerEnv): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  if (!APPLICATION_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;
  return handleLegacyApi(request, env);
}
