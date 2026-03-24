import { AttendanceStatus } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export const attendanceRepository = {
  mark: (data: { studentId: string; internshipId: string; date: Date; status: AttendanceStatus }) =>
    prisma.attendance.upsert({
      where: { studentId_internshipId_date: { studentId: data.studentId, internshipId: data.internshipId, date: data.date } },
      update: { status: data.status },
      create: data,
    }),
  report: (internshipId: string, startDate: Date, endDate: Date) =>
    prisma.attendance.findMany({
      where: { internshipId, date: { gte: startDate, lte: endDate } },
      include: { student: { include: { user: true } } },
      orderBy: [{ date: 'asc' }],
    }),
};
