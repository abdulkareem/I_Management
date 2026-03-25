import { API_BASE_URL } from './config';

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const requestUrl = `${API_BASE_URL}${normalizedPath}`;

  console.log('API URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
  console.log('Request URL:', requestUrl);

  const res = await fetch(requestUrl, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const rawResponse = await res.text();
  console.log('Raw response:', rawResponse);

  let body: ApiEnvelope<T> | null = null;
  try {
    body = rawResponse ? (JSON.parse(rawResponse) as ApiEnvelope<T>) : null;
  } catch (parseError) {
    console.error('Failed to parse API JSON response.', parseError);
  }

  const fallbackMessage = `API request failed (${res.status})`;

  if (!res.ok || !body || body.success === false) {
    const message = body?.message ?? fallbackMessage;
    throw new Error(message);
  }

  return body;
}
