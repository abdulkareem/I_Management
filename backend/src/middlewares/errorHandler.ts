import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors.js';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error';
  return res.status(500).json({ success: false, message });
}
