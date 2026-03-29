const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

/**
 * Keep API calls relative by default so frontend and backend stay connected
 * when served behind the same domain/reverse proxy.
 */
const DEFAULT_API_BASE_URL = '';

if (!configuredApiBaseUrl && process.env.NODE_ENV !== 'test') {
  console.warn(
    'NEXT_PUBLIC_API_BASE_URL is undefined. Falling back to same-origin relative API calls. Configure NEXT_PUBLIC_API_BASE_URL if your API is hosted on a separate domain.',
  );
}

export const API_BASE_URL = (configuredApiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
