import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { hashSync, compareSync } from 'bcryptjs';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

export type AuthRole = 'college' | 'student' | 'industry' | 'super_admin';

export interface SessionPrincipal {
  sub: string;
  email: string;
  role: AuthRole;
  audience: string;
  tenantId: string;
  collegeId?: string;
  industryId?: string;
  sessionId: string;
  exp: number;
}

const SECRET = process.env.JWT_SECRET ?? 'internsuite-dev-secret';
const TOKEN_TTL_SECONDS = 60 * 60 * 8;

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function validatePasswordPolicy(password: string) {
  return password.length >= 8;
}

export function hashPassword(password: string) {
  return hashSync(password, 12);
}

export function verifyPassword(password: string, storedHash: string) {
  return compareSync(password, storedHash);
}

export function createOpaqueToken(size = 32) {
  return randomBytes(size).toString('base64url');
}

export function hashOpaqueToken(token: string) {
  return createHmac('sha256', SECRET).update(token).digest('hex');
}

export function createNumericOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createSignedSessionToken(
  payload: Omit<SessionPrincipal, 'exp' | 'sessionId'> & { sessionId?: string; expiresInSeconds?: number },
) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const principal: SessionPrincipal = {
    ...payload,
    sessionId: payload.sessionId ?? randomUUID(),
    exp: Math.floor(Date.now() / 1000) + (payload.expiresInSeconds ?? TOKEN_TTL_SECONDS),
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(principal));
  const signature = createHmac('sha256', SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return {
    token: `${encodedHeader}.${encodedPayload}.${signature}`,
    principal,
  };
}

export function verifySignedSessionToken(token: string): SessionPrincipal {
  const [encodedHeader, encodedPayload, signature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error('Invalid token format.');
  }

  const expectedSignature = createHmac('sha256', SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    throw new Error('Invalid token signature.');
  }

  const principal = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPrincipal;
  if (principal.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Session expired.');
  }

  return principal;
}

export function extractBearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('Missing bearer token.');
  }
  return authorization.slice('Bearer '.length);
}

export function requireAuth(options: { roles?: AuthRole[]; audience?: string }): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = extractBearerToken(request);
      const principal = verifySignedSessionToken(token);
      if (options.roles && !options.roles.includes(principal.role)) {
        reply.code(403);
        throw new Error('Role does not have access to this resource.');
      }
      if (options.audience && principal.audience !== options.audience) {
        reply.code(403);
        throw new Error('Token audience mismatch.');
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
