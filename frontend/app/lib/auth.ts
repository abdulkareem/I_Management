const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000/api';

interface ApiErrorShape {
  message?: string;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as T & ApiErrorShape;

  if (!response.ok) {
    throw new Error(body.message ?? 'Request failed.');
  }

  return body;
}

export type AuthRole = 'college' | 'student' | 'industry';

export interface DiscoveryResponse {
  email: string;
  exists: boolean;
  role: AuthRole;
  nextStep: 'LOGIN_PASSWORD' | 'REGISTER';
  redirectTo: string;
  dashboard?: string;
  message: string;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  principal: {
    email: string;
    role: AuthRole | 'super_admin';
  };
  redirectTo: string;
}

export function discoverEmail(email: string, role: AuthRole) {
  return request<DiscoveryResponse>('/auth/discover', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export function sendOtp(payload: { email: string; role: AuthRole; registration: Record<string, unknown> }) {
  return request<{
    email: string;
    exists: boolean;
    nextStep: 'VERIFY_OTP';
    otpPreview?: string;
    delivery?: { accepted?: boolean; preview?: { simulated?: boolean } };
    message: string;
  }>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function verifyOtp(email: string, otp: string) {
  return request<{ email: string; verified: true; nextStep: 'SET_PASSWORD'; message: string }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export function setPassword(email: string, password: string) {
  return request<{ email: string; passwordCreated: true; nextStep: 'LOGIN'; message: string }>('/auth/set-password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
