const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  ?? process.env.NEXT_PUBLIC_API_URL?.trim()
  ?? '';

export const API_BASE_URL = base.endsWith('/') ? base.slice(0, -1) : base;

export const DASHBOARD_POLL_INTERVAL_MS = 5000;
