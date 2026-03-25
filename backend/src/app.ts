import 'express-async-errors';
import cors from 'cors';
import express from 'express';
import { router } from './routes/index.js';
import { adminAuthRoutes } from './routes/adminAuthRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { httpLogger } from './utils/logger.js';

export const app = express();

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);

app.get('/', (_req: any, res: any) => {
  res.send('Backend is live');
});

app.get('/health', (_req: any, res: any) => {
  res.json({ success: true, service: 'internship-management-platform' });
});

app.use('/api/admin', adminAuthRoutes);
console.log('Admin routes loaded');
app.use('/api', router);
app.use(errorHandler);
