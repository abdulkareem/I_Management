import type { CollegeDashboard, IndustryDashboard, Role, SessionProfile, StudentDashboard } from '@/lib/types';
import { apiRequest } from './api';

export type DashboardPayload = StudentDashboard | CollegeDashboard | IndustryDashboard;
export type SessionState = SessionProfile;

const SESSION_KEY = 'internsuite.session';

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

export async function login(payload: { email: string; password: string }) {
  const response = await apiRequest<SessionState>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  saveSession(response.data);
  return response;
}

export async function register(role: Role, payload: Record<string, unknown>) {
  const routeMap: Record<Role, string> = {
    STUDENT: '/student/register',
    COLLEGE: '/college/create',
    INDUSTRY: '/industry/create',
    COORDINATOR: '/auth/register',
    ADMIN: '/auth/register',
  };
  const response = await apiRequest<SessionState>(routeMap[role], {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  saveSession(response.data);
  return response;
}

export function fetchWithSession<T>(path: string, init?: RequestInit) {
  const session = loadSession();
  return apiRequest<T>(path, {
    ...init,
    headers: {
      Authorization: session ? `Bearer ${session.token}` : '',
      ...(init?.headers ?? {}),
    },
  });
}

export function dashboardPathFor(role: Role) {
  if (role === 'STUDENT') return '/dashboard/student';
  if (role === 'INDUSTRY') return '/dashboard/industry';
  return '/dashboard/college';
}
