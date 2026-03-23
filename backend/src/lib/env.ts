const requiredEnvironmentVariables = ['DATABASE_URL'] as const;

export function validateRuntimeEnv() {
  const missing = requiredEnvironmentVariables.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`,
    );
  }
}
