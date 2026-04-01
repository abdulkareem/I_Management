import { API_BASE_URL } from './config';

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

const DEFAULT_ERROR = 'Unable to complete request. Please try again.';

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const requestUrl = `${API_BASE_URL}${normalizedPath}`;

  if (!API_BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured.');
  }

  let res: Response;

  try {
    res = await fetch(requestUrl, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
  } catch {
    throw new Error('Network error: backend is unreachable.');
  }

  const rawResponse = await res.text();

  let body: ApiEnvelope<T> | null = null;
  try {
    body = rawResponse ? (JSON.parse(rawResponse) as ApiEnvelope<T>) : null;
  } catch {
    throw new Error(DEFAULT_ERROR);
  }

  if (!res.ok || !body || body.success === false) {
    throw new Error(body?.message ?? `API request failed (${res.status})`);
  }

  return body;
}
