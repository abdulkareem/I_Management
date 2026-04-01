import { handleLegacyApi } from '../services/legacy-api';
import type { WorkerEnv } from '../db/env';

const FEEDBACK_PATHS = ['/api/feedback', '/api/department/feedback', '/api/ipo/complete'];

export async function handleFeedbackRoute(request: Request, env: WorkerEnv): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  if (!FEEDBACK_PATHS.some((prefix) => pathname.startsWith(prefix))) return null;
  return handleLegacyApi(request, env);
}
