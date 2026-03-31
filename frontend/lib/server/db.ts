export type WorkerEnv = {
  DB: D1Database;
  JWT_SECRET?: string;
  CACHE_KV?: KVNamespace;
  RATE_LIMIT_KV?: KVNamespace;
};

export function getWorkerEnv(): WorkerEnv {
  const runtime = (globalThis as any).cloudflare?.env ?? (globalThis as any).__ENV__;
  if (!runtime?.DB) {
    throw new Error('Cloudflare DB binding is not available in runtime env.');
  }
  return runtime as WorkerEnv;
}

export function getDb(env: WorkerEnv = getWorkerEnv()): D1Database {
  return env.DB;
}
