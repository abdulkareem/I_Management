import type { WorkerEnv } from './db';

export async function listInternships(env: WorkerEnv) {
  const res = await env.DB.prepare(
    `SELECT id, title, status, source_type, department_id, COALESCE(total_vacancy, vacancy, 0) AS total, COALESCE(filled_vacancy,0) AS filled
     FROM internships ORDER BY created_at DESC`
  ).all();
  return res.results ?? [];
}
