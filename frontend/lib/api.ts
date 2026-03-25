import { API_BASE_URL } from './config';

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const requestUrl = `${API_BASE_URL}/api${normalizedPath}`;

  console.log('API URL:', API_BASE_URL, 'Request:', requestUrl);

  const res = await fetch(requestUrl, {
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

  if (res.status === 404) {
    console.error('Service unavailable for URL:', requestUrl);
    throw new Error('Service unavailable');
  }

  if (!res.ok || body.success === false) {
    throw new Error(body.message ?? 'API failed');
  }

  return body;
}
