import 'express-async-errors';
import cors from 'cors';
import express from 'express';
import { router } from './routes/index.js';
import { adminAuthRoutes } from './routes/adminAuthRoutes.js';
import { collegeRoutes } from './routes/collegeRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { httpLogger } from './utils/logger.js';

export const app = express();

const allowedOrigins = [
  process.env.FRONTEND_APP_URL,
  process.env.CLOUDFLARE_PAGES_URL,
  process.env.APP_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);

app.get('/', (_req: any, res: any) => {
  res.send('Backend is live');
});

app.get('/health', (_req: any, res: any) => {
  res.send('Server running');
});

app.use('/api/admin', adminAuthRoutes);
app.use('/api/college', collegeRoutes);
app.use('/api', router);
app.use(errorHandler);
