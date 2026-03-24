import type { Request, Response } from 'express';
import { attendanceService } from '../services/attendance.service.js';

export const attendanceController = {
  mark: async (req: Request, res: Response) => {
    const data = await attendanceService.mark(req.body);
    res.status(201).json({ success: true, data });
  },
  report: async (req: Request, res: Response) => {
    const data = await attendanceService.report(String(req.query.internshipId), String(req.query.startDate), String(req.query.endDate));
    res.json({ success: true, data, printable: true });
  },
};
