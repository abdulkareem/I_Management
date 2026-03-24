import 'express-async-errors';
import cors from 'cors';
import express from 'express';
import { router } from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { httpLogger } from './utils/logger.js';

export const app = express();
const allowedOrigins = ['https://*.pages.dev', 'https://your-custom-domain.com'];
const corsOptions = {
  origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const isPagesDomain = /^https:\/\/[a-z0-9-]+\.pages\.dev$/i.test(origin);
    const isAllowedOrigin = allowedOrigins.includes(origin);

    if (isPagesDomain || isAllowedOrigin) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);

app.get('/health', (_req: any, res: any) => {
  res.json({ success: true, service: 'internship-management-platform' });
});

app.use('/api', router);
app.use(errorHandler);
