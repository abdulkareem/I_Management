import type { Request, Response } from 'express';
import { collegeService } from '../services/college.service.js';

export const departmentController = {
  create: async (req: Request, res: Response) => {
    const data = await collegeService.createDepartment(req.body);
    res.status(201).json({ success: true, data: data.department, generatedPassword: data.generatedPassword });
  },
};
