import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

export const validate = (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
  const parsed = schema.safeParse({ body: req.body, params: req.params, query: req.query });
  if (!parsed.success) {
    return res.status(422).json({ success: false, errors: parsed.error.flatten() });
  }

  next();
};
