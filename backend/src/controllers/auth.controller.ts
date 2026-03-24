import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';

export const authController = {
  register: async (req: Request, res: Response) => {
    const user = await authService.register(req.body.name, req.body.email, req.body.password, req.body.role);
    res.status(201).json({ success: true, data: user });
  },
  login: async (req: Request, res: Response) => {
    const data = await authService.login(req.body.email, req.body.password);
    res.json({ success: true, data });
  },
};
