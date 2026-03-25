const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://internmanagement.abdulkareem-t.workers.dev';
export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, '');
