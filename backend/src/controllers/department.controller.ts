import type { Request, Response } from 'express';
import { departmentService } from '../services/department.service.js';

export const departmentController = {
  bulkCreate: async (req: Request, res: Response) => {
    const result = await departmentService.bulkCreate(req.body.departments);
    res.status(201).json({ success: true, data: result });
  },
};
