import type { Request, Response } from 'express';
import { coordinatorService } from '../services/coordinator.service.js';

export const coordinatorController = {
  create: async (req: Request, res: Response) => {
    const coordinator = await coordinatorService.create(req.body);
    res.status(201).json({ success: true, data: coordinator });
  },
};
