import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { compareSync, hashSync } from 'bcryptjs';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { Role } from '@prism/database';

export interface SessionPrincipal {
  sub: string;
  email: string;
  name: string;
  role: Role;
  profile: {
    collegeId?: string;
    industryId?: string;
    studentId?: string;
  };
  exp: number;
}

const SECRET = process.env.JWT_SECRET ?? 'internsuite-single-workspace-secret';
const TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 60 * 60 * 12);

function encode(value: string) {
  return Buffer.from(value).toString('base64url');
}

function decode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function hashPassword(password: string) {
  return hashSync(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return compareSync(password, hash);
}

export function validatePasswordPolicy(password: string) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(password);
}

export function randomToken(size = 32) {
  return randomBytes(size).toString('hex');
}

export function createAccessToken(payload: Omit<SessionPrincipal, 'exp'>) {
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = encode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }));
  const signature = createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyAccessToken(token: string) {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) {
    throw new Error('Invalid token format.');
  }
  const expected = createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    throw new Error('Invalid token signature.');
  }
  const principal = JSON.parse(decode(body)) as SessionPrincipal;
  if (principal.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired.');
  }
  return principal;
}

export function extractBearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('Missing bearer token.');
  }
  return authorization.slice(7);
}

export function requireAuth(options?: { roles?: Role[] }): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = extractBearerToken(request);
      const principal = verifyAccessToken(token);
      if (options?.roles && !options.roles.includes(principal.role)) {
        reply.code(403);
        throw new Error('You do not have permission to access this resource.');
      }
      request.user = principal;
    } catch (error) {
      reply.code(reply.statusCode >= 400 ? reply.statusCode : 401);
      throw error;
    }
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionPrincipal;
  }
}
