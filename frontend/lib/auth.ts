import { apiRequest } from './api';

export type Role = 'ADMIN' | 'STAFF' | 'USER';

export interface SessionState {
  accessToken: string;
  user: { id: string; name: string; email: string; role: Role };
  tenant: { id: string; name: string; slug: string; plan: 'FREE' | 'PRO'; status: 'ACTIVE' | 'SUSPENDED' };
}

const SESSION_KEY = 'prism.session';

export function saveSession(session: SessionState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): SessionState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as SessionState) : null;
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function register(payload: Record<string, unknown>) {
  return apiRequest<{ user: SessionState['user']; tenant: SessionState['tenant']; delivery: unknown }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function discover(payload: { tenantSlug: string; email: string }) {
  return apiRequest<{ exists: boolean; tenantFound: boolean; nextStep: 'LOGIN' | 'REGISTER'; redirectTo: string; role: Role | null }>('/auth/discover', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: { tenantSlug: string; email: string; password: string }) {
  const response = await apiRequest<{ accessToken: string; user: SessionState['user']; tenant: SessionState['tenant'] }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  saveSession(response.data);
  return response;
}

export function verifyEmail(token: string) {
  return apiRequest<{ verified: boolean }>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export function forgotPassword(payload: { tenantSlug: string; email: string }) {
  return apiRequest<{ delivery: unknown }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function resetPassword(payload: { token: string; password: string }) {
  return apiRequest<{ reset: boolean }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchWithSession<T>(path: string, init?: RequestInit) {
  const session = loadSession();
  return apiRequest<T>(path, {
    ...init,
    headers: {
      Authorization: session ? `Bearer ${session.accessToken}` : '',
      ...(init?.headers ?? {}),
    },
  });
}
