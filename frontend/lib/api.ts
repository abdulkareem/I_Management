const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000/api';

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const body = (await response.json().catch(() => ({ success: false, message: 'Unexpected response', data: null }))) as ApiEnvelope<T>;
  if (!response.ok) {
    throw new Error(body.message || 'Request failed.');
  }
  return body;
}
