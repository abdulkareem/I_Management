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

export async function loginWithPassword(email: string, password: string) {
  const response = await apiRequest<SessionState>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  saveSession(response.data);
  return response;
}

export async function sendAdminOtp(email: string) {
  return apiRequest<{ otpSent: boolean }>('/admin/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyAdminOtp(email: string, otp: string) {
  const response = await apiRequest<SessionState & { redirect?: string }>('/admin/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
  saveSession(response.data);
  return response;
}

export async function forgotPassword(identifier: string) {
  return apiRequest<{ otpSent: boolean }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: identifier, phone: identifier, universityRegNo: identifier }),
  });
}

export async function resetPassword(identifier: string, otp: string, newPassword: string) {
  return apiRequest<{ passwordUpdated: boolean }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ identifier, otp, newPassword }),
  });
}

export async function forgotUserId(payload: { phone?: string; universityRegNo?: string }) {
  return apiRequest<{ email: string; maskedEmail: string }>('/auth/forgot-userid', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function register(role: Role, payload: Record<string, unknown>) {
  const routeMap: Record<Role, string> = {
    STUDENT: '/student/register',
    COLLEGE: '/college/register',
    COLLEGE_ADMIN: '/college/register',
    INDUSTRY: '/industry/create',
    COORDINATOR: '/auth/register',
    DEPARTMENT_COORDINATOR: '/auth/register',
    COLLEGE_COORDINATOR: '/auth/register',
    ADMIN: '/auth/register',
    SUPER_ADMIN: '/auth/register',
    EXTERNAL_STUDENT: '/external/apply',
  };
  const response = await apiRequest<SessionState>(routeMap[role], {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (response?.data?.token) {
    saveSession(response.data);
  }

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
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return '/dashboard/admin';
  if (role === 'DEPARTMENT_COORDINATOR' || role === 'COORDINATOR') return '/dashboard/department';
  if (role === 'COLLEGE_COORDINATOR') return '/dashboard/college';
  if (role === 'EXTERNAL_STUDENT') return '/dashboard/external-student';
  return '/dashboard/college';
}
