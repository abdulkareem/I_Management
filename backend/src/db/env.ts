export type WorkerEnv = {
  DB: D1Database;
  INTERNSHIP_STATE?: DurableObjectNamespace;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  JWT_SECRET?: string;
};
