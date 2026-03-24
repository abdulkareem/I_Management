const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
console.log('API:', BASE_URL);

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  if (!BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured.');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  try {
    const response = await fetch(`${BASE_URL}/api${normalizedPath}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });

    const body = (await response.json().catch(() => ({ success: false, message: 'Unexpected response', data: null }))) as ApiEnvelope<T>;
    if (!response.ok) {
      console.error(await response.clone().text());
      throw new Error(body.message || 'Request failed.');
    }

    return body;
  } catch (err) {
    console.error('Fetch failed:', err);
    throw err;
  }
}
