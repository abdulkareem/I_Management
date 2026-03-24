import { API_BASE_URL } from './config';

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  try {
    const res = await fetch(`${API_BASE_URL}/api${normalizedPath}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('API failed');
    }

    const body = (await res.json().catch(() => ({
      success: false,
      message: 'Unexpected response',
      data: null,
    }))) as ApiEnvelope<T>;

    return body;
  } catch (err) {
    console.error('Fetch error:', err);
    throw err;
  }
}
