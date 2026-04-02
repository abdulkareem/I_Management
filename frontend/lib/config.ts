const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  ?? process.env.NEXT_PUBLIC_API_URL?.trim()
  ?? process.env.NEXT_PUBLIC_BACKEND_URL?.trim()
  ?? '';

const normalized = fromEnv.endsWith('/') ? fromEnv.slice(0, -1) : fromEnv;

if (process.env.NODE_ENV === 'production' && normalized.includes('localhost')) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL cannot point to localhost in production.');
}

export const API_BASE_URL = normalized;

export const DASHBOARD_POLL_INTERVAL_MS = 5000;
