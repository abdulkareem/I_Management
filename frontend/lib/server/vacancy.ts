import type { WorkerEnv } from './db';

export async function bookVacancyAtomically(env: WorkerEnv, internshipId: string) {
  const result = await env.DB.prepare(
    `UPDATE internships
      SET filled_vacancy = COALESCE(filled_vacancy, 0) + 1
      WHERE id = ? AND COALESCE(filled_vacancy, 0) < COALESCE(total_vacancy, vacancy, 0)`
  ).bind(internshipId).run();

  if (!result.success || (result.meta?.changes ?? 0) === 0) {
    throw new Error('Vacancy is full for this internship.');
  }

  return result;
}
