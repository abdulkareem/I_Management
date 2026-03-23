import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { compareSync, hashSync } from 'bcryptjs';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { prisma, type Session, type UserRole } from '@prism/database';

export interface SessionPrincipal {
  sub: string;
  tenantId: string;
  email: string;
  role: UserRole;
  sessionId: string;
  exp: number;
}

const SECRET = process.env.JWT_SECRET ?? 'prism-dev-secret';
const TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 60 * 60 * 8);

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

export function randomToken(size = 32) {
  return randomBytes(size).toString('base64url');
}

export function hashOpaqueToken(token: string) {
  return createHmac('sha256', SECRET).update(token).digest('hex');
}

export function createSignedSessionToken(
  payload: Omit<SessionPrincipal, 'exp' | 'sessionId'> & { sessionId?: string; expiresInSeconds?: number },
) {
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const principal: SessionPrincipal = {
    ...payload,
    sessionId: payload.sessionId ?? randomUUID(),
    exp: Math.floor(Date.now() / 1000) + (payload.expiresInSeconds ?? TOKEN_TTL_SECONDS),
  };
  const body = encode(JSON.stringify(principal));
  const signature = createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return { token: `${header}.${body}.${signature}`, principal };
}

export function verifySignedSessionToken(token: string) {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) {
    throw new Error('Invalid token format.');
  }
  const expected = createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url');
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    throw new Error('Invalid token signature.');
  }
  const principal = JSON.parse(decode(payload)) as SessionPrincipal;
  if (principal.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Session expired.');
  }
  return principal;
}

export function validatePasswordPolicy(password: string) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(password);
}

export function extractBearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('Missing bearer token.');
  }
  return authorization.slice('Bearer '.length);
}

async function resolveSession(token: string): Promise<Session | null> {
  return prisma.session.findFirst({
    where: {
      tokenHash: hashOpaqueToken(token),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

export function requireAuth(options?: { roles?: UserRole[] }): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const rawToken = extractBearerToken(request);
      const principal = verifySignedSessionToken(rawToken);
      const session = await resolveSession(rawToken);
      if (!session || session.id !== principal.sessionId) {
        reply.code(401);
        throw new Error('Session is no longer valid.');
      }
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
