import { Router } from 'express';
import { requireRole, verifyJWT, type AuthenticatedRequest } from '../middlewares/auth.js';
import { prisma } from '../utils/prisma.js';

export const collegeRoutes = Router();

function ok(data: unknown, message?: string) {
  return { success: true, message, data };
}

collegeRoutes.get('/dashboard', verifyJWT, requireRole('COLLEGE_ADMIN', 'COLLEGE'), async (req: AuthenticatedRequest, res) => {
  const college = await prisma.college.findFirst({ where: { createdById: req.user!.userId } });

  if (!college) {
    return res.status(404).json({ success: false, message: 'College profile not found', data: null });
  }

  return res.json(
    ok({
      college: {
        id: college.id,
        name: college.name,
        address: college.address ?? '',
      },
      stats: {
        students: 120,
        internships: 40,
        pendingMous: 0,
        approvedIndustries: 0,
        activeStudents: 0,
        applicationsSubmitted: 0,
      },
      pendingMous: [],
      approvedIndustries: [],
      modules: ['Departments', 'Students'],
    }),
  );
});
