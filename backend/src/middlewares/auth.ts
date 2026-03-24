import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors.js';

type TokenPayload = {
  userId: string;
  role: string;
};

export type AuthenticatedRequest = Request & {
  user?: TokenPayload;
};

function decodeToken(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT secret missing', 500);
  }
  return jwt.verify(token, secret) as TokenPayload;
}

export function verifyJWT(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Unauthorized', 401);
  }

  req.user = decodeToken(authHeader.slice(7));
  next();
}

export function optionalJWT(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      req.user = decodeToken(authHeader.slice(7));
    } catch {
      req.user = undefined;
    }
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError('Forbidden', 403);
    }

    next();
  };
}
