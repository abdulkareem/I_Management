const DEFAULT_API_BASE_URL = 'https://internmanagement.abdulkareem-t.workers.dev';
const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  console.warn(
    `NEXT_PUBLIC_API_BASE_URL is undefined. Falling back to ${DEFAULT_API_BASE_URL}. Configure NEXT_PUBLIC_API_BASE_URL in your deployment environment to override this value.`,
  );
}

export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, '');
