const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!rawApiBaseUrl) {
  console.error('NEXT_PUBLIC_API_BASE_URL is undefined. Configure it in Cloudflare Pages environment variables and redeploy.');
}

export const API_BASE_URL = (rawApiBaseUrl ?? '').replace(/\/$/, '');
