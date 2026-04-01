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

  let data: ApiEnvelope<T> | null = null;
  try {
    data = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error(DEFAULT_ERROR);
  }

  if (!res.ok) {
    throw new Error(data?.message || 'Request failed');
  }

  if (!data || data.success === false) {
    throw new Error(data?.message || DEFAULT_ERROR);
  }

  return data;
}


export async function fetchData<T>(endpoint: string): Promise<T> {
  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await apiRequest<T>(normalizedPath, { method: 'GET' });
  return response.data;
}
