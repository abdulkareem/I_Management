import { Router } from 'express';
import { requireRole, verifyJWT, type AuthenticatedRequest } from '../middlewares/auth.js';
import { prisma } from '../utils/prisma.js';

export const collegeRoutes = Router();

function ok(data: unknown, message?: string) {
  return { success: true, message, data };
}

collegeRoutes.get('/dashboard', verifyJWT, requireRole('COLLEGE_ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res) => {
  const college = await prisma.college.findFirst({ where: { coordinatorId: req.user!.userId } });

  if (!college) {
    return res.status(404).json({ success: false, message: 'College profile not found', data: null });
  }

  const [activeStudents, applicationsSubmitted] = await Promise.all([
    prisma.student.count({ where: { collegeId: college.id } }),
    prisma.application.count({ where: { student: { collegeId: college.id } } }),
  ]);

  return res.json(
    ok({
      college: {
        id: college.id,
        name: college.name,
        address: college.address,
      },
      stats: {
        pendingMous: 0,
        approvedIndustries: 0,
        activeStudents,
        applicationsSubmitted,
      },
      pendingMous: [],
      approvedIndustries: [],
      modules: ['Departments', 'Students'],
    }),
  );
});
