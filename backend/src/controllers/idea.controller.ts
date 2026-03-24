import type { Request, Response } from 'express';
import { ideaService } from '../services/idea.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.js';
import { coordinatorService } from '../services/coordinator.service.js';

export const ideaController = {
  create: async (req: AuthenticatedRequest, res: Response) => {
    const coordinator = await coordinatorService.findByUserId(req.user!.userId);
    const createdById = coordinator?.id ?? req.body.createdById;
    const ideas = req.body.ideas.map((idea: { title: string; description: string; outcomes: string; departmentId: string }) => ({
      ...idea,
      createdById,
    }));
    const result = await ideaService.createMany(ideas);
    res.status(201).json({ success: true, data: result });
  },
  listByDepartment: async (req: Request, res: Response) => {
    const data = await ideaService.listByDepartment(req.params.departmentId);
    res.json({ success: true, data });
  },
};
