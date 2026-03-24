import morgan from 'morgan';
import type { Request } from 'express';

morgan.token('body', (req: Request) => JSON.stringify(req.body ?? {}));

export const httpLogger = morgan(':method :url :status :response-time ms body=:body');
