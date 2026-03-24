import type { Request, Response } from 'express';
import { internshipService } from '../services/internship.service.js';

export const internshipController = {
  create: async (req: Request, res: Response) => {
    const data = await internshipService.create(req.body);
    res.status(201).json({ success: true, data });
  },
};
