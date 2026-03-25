const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://internshipmanagement-production-48ee.up.railway.app';

export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, '');

console.log('API URL:', API_BASE_URL);
