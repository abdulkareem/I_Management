import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../lib/security.js';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/public/platform-content',
    async () => ({
      brand: 'InternSuite',
      headline: 'InternSuite – Internship Cloud ERP for Colleges',
      pricingPlans: [
        {
          name: 'Foundation',
          annualPriceInInr: 22000,
          audience: 'For colleges launching internship digitization.',
        },
        {
          name: 'Growth',
          annualPriceInInr: 50000,
          audience: 'For larger colleges managing multi-department internship operations.',
        },
      ],
    }),
  );

  app.get(
    '/college/dashboard',
    { preHandler: requireAuth({ roles: ['college'], audience: 'college-app' }) },
    async (request) => ({
      collegeId: request.user?.collegeId,
      stats: {
        activeInternships: 128,
        studentApplications: 342,
        activeStudents: 486,
      },
      quickActions: ['Add Student', 'Assign Internship', 'View Applications', 'Upgrade Plan'],
    }),
  );

  app.get(
    '/student/dashboard',
    { preHandler: requireAuth({ roles: ['student'], audience: 'student-app' }) },
    async (request) => ({
      studentId: request.user?.sub,
      stats: {
        availableInternships: 24,
        applications: 3,
        profileCompletion: 82,
      },
      quickActions: ['Apply Now', 'Update Profile', 'Upload Resume'],
    }),
  );

  app.get(
    '/industry/dashboard',
    { preHandler: requireAuth({ roles: ['industry'], audience: 'industry-app' }) },
    async (request) => ({
      industryId: request.user?.industryId,
      stats: {
        postedInternships: 14,
        applicants: 26,
      },
      quickActions: ['Post Internship', 'Shortlist Candidate', 'Reject Application'],
    }),
  );

  app.get(
    '/super-admin/dashboard',
    { preHandler: requireAuth({ roles: ['super_admin'], audience: 'platform-admin' }) },
    async () => ({
      stats: {
        totalColleges: 48,
        activeStudents: 9420,
        revenueInInr: 1860000,
      },
      controls: ['Activate College', 'Deactivate College', 'Delete College', 'View Payment Status'],
    }),
  );
};
