import type { WorkerEnv } from './db';
import { bookVacancyAtomically } from './vacancy';

export async function createApplication(env: WorkerEnv, internshipId: string, studentId: string, isExternal = false) {
  await bookVacancyAtomically(env, internshipId);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO internship_applications (id, internship_id, student_id, status, is_external)
     VALUES (?, ?, ?, 'APPLIED', ?)`
  ).bind(id, internshipId, studentId, isExternal ? 1 : 0).run();
  return { id, internshipId, studentId, isExternal };
}
