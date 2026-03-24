import type { Request, Response } from 'express';
import { studentService } from '../services/student.service.js';

export const studentController = {
  register: async (req: Request, res: Response) => {
    const student = await studentService.register(req.body);
    res.status(201).json({ success: true, data: student });
  },
};
