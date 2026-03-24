import { API_BASE_URL } from './config';

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const res = await fetch(`${API_BASE_URL}/api${normalizedPath}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const body = (await res.json().catch(() => ({
    success: false,
    message: 'Unexpected response',
    data: null,
  }))) as ApiEnvelope<T>;

  if (!res.ok || body.success === false) {
    throw new Error(body.message ?? 'API failed');
  }

  return body;
}
