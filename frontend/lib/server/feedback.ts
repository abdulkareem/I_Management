import type { WorkerEnv } from './db';

export async function hasPerformanceFeedback(env: WorkerEnv, studentId: string, internshipId: string) {
  const row = await env.DB.prepare(
    `SELECT 1 AS exists_flag
     FROM internship_performance_feedback
     WHERE student_id = ? AND internship_id = ? LIMIT 1`
  ).bind(studentId, internshipId).first();
  return Boolean(row?.exists_flag);
}
