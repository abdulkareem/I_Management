const encoder = new TextEncoder();

function toBase64Url(input: string) {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

async function hmacSha256(data: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type AuthClaims = {
  sub: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'COLLEGE_COORDINATOR' | 'DEPARTMENT_COORDINATOR' | 'IPO' | 'STUDENT' | string;
  exp: number;
};

export async function signJwt(claims: AuthClaims, secret: string) {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = toBase64Url(JSON.stringify(claims));
  const data = `${header}.${payload}`;
  const sig = await hmacSha256(data, secret);
  return `${data}.${sig}`;
}

export async function verifyJwt(token: string, secret: string): Promise<AuthClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = await hmacSha256(`${header}.${payload}`, secret);
  if (signature !== expected) return null;
  const claims = JSON.parse(fromBase64Url(payload)) as AuthClaims;
  if (!claims.exp || claims.exp * 1000 < Date.now()) return null;
  return claims;
}

export function sessionCookie(token: string) {
  return `im_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`;
}
