import { AttendanceStatus } from '@prisma/client';
import { attendanceRepository } from '../repositories/attendance.repository.js';

export const attendanceService = {
  mark: (data: { studentId: string; internshipId: string; date: string; status: AttendanceStatus }) =>
    attendanceRepository.mark({ ...data, date: new Date(data.date) }),
  report: (internshipId: string, startDate: string, endDate: string) =>
    attendanceRepository.report(internshipId, new Date(startDate), new Date(endDate)),
};
