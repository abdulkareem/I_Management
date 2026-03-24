import type { Request, Response } from 'express';
import { industryService } from '../services/industry.service.js';

export const industryController = {
  create: async (req: Request, res: Response) => {
    const industry = await industryService.create(req.body);
    res.status(201).json({ success: true, data: industry, redirect: '/dashboard/industry' });
  },
};
