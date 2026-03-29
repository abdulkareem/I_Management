import type { CollegeDashboard, IPODashboard, Role, SessionProfile, StudentDashboard } from '@/lib/types';
import { apiRequest } from './api';

export type DashboardPayload = StudentDashboard | CollegeDashboard | IPODashboard;
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
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.cookie.split(';').forEach((cookie) => {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
    if (name) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  });
  if ('caches' in window) {
    window.caches.keys().then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))));
  }
}

export async function loginWithPassword(email: string, password: string) {
  const response = await apiRequest<SessionState>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  saveSession(response.data);
  return response;
}

export async function sendAdminOtp(email: string) {
  return apiRequest<{ otpSent: boolean; expiresAt: string }>('/api/admin/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyAdminOtp(email: string, otp: string) {
  const response = await apiRequest<SessionState>('/api/admin/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
  saveSession(response.data);
  return response;
}

export async function register(role: Role, payload: Record<string, unknown>) {
  const response = await apiRequest<SessionState>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: role === 'SUPER_ADMIN' || role === 'ADMIN' ? role : 'STUDENT',
    }),
  });
  saveSession(response.data);
  return response;
}

export async function forgotPassword(identifier: string) {
  return apiRequest<{ otpSent: boolean }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: identifier }),
  });
}
export async function resetPassword(identifier: string, otp: string, newPassword: string) {
  return apiRequest<{ passwordUpdated: boolean }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ identifier, otp, newPassword }),
  });
}
export async function forgotUserId(payload: { phone?: string; universityRegNo?: string }) {
  return apiRequest<{ email: string; maskedEmail: string }>('/api/auth/forgot-userid', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return '/superadmin/dashboard';
  if (role === 'STUDENT' || role === 'EXTERNAL_STUDENT') return '/dashboard/student';
  if (role === 'INDUSTRY') return '/dashboard/industry';
  if (role === 'DEPARTMENT_COORDINATOR' || role === 'COORDINATOR') return '/dashboard/department';
  if (role === 'COLLEGE' || role === 'COLLEGE_ADMIN' || role === 'COLLEGE_COORDINATOR') return '/dashboard/college';
  return '/dashboard';
}
