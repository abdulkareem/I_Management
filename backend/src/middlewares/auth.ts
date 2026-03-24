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

export function verifyJWT(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Unauthorized', 401);
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT secret missing', 500);
  }

  const payload = jwt.verify(token, secret) as TokenPayload;
  req.user = payload;
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
