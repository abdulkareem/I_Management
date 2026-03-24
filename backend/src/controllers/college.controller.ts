import type { Request, Response } from 'express';
import { collegeService } from '../services/college.service.js';

export const collegeController = {
  create: async (req: Request, res: Response) => {
    const college = await collegeService.createCollegeWorkspace(req.body);
    res.status(201).json({ success: true, data: college });
  },
  list: async (req: Request, res: Response) => {
    const result = await collegeService.listColleges(req.query as { page?: string; limit?: string });
    res.json({ success: true, data: result.items, pagination: result.pagination });
  },
  departmentsByCollege: async (req: Request, res: Response) => {
    const data = await collegeService.getDepartmentsByCollege(req.params.collegeId);
    res.json({ success: true, data });
  },
};
