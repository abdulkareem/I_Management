import type { FastifyPluginAsync } from 'fastify';
import {
  applications,
  colleges,
  internships,
  marksheets,
  mous,
  students,
} from '../lib/internsuite.js';
import { requireAuth } from '../lib/security.js';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/public/platform-content', async () => ({
    brand: 'InternSuite',
    headline: 'InternSuite – fully automated internship ERP for colleges',
    pricingPlans: [
      {
        name: 'Foundation',
        annualPriceInInr: 12000,
        limit: 'Up to 500 students',
      },
      {
        name: 'Growth',
        annualPriceInInr: 25000,
        limit: 'Up to 2000 students',
      },
    ],
  }));

  app.get('/college/dashboard', { preHandler: requireAuth({ roles: ['college'], audience: 'college-app' }) }, async (request) => {
    const collegeId = request.user?.collegeId!;
    const college = colleges.get(collegeId);
    const collegeStudents = Array.from(students.values()).filter((student) => student.collegeId === collegeId);
    const collegeApplications = Array.from(applications.values()).filter((application) => application.collegeId === collegeId);

    return {
      college,
      stats: {
        students: collegeStudents.length,
        approvedApplications: collegeApplications.filter((item) => item.status === 'APPROVED').length,
        activeInternships: Array.from(internships.values()).filter((item) => item.collegeId === collegeId).length,
        mous: Array.from(mous.values()).filter((item) => item.collegeId === collegeId).length,
      },
      quickActions: ['Add student', 'Review applications', 'Approve attendance', 'Publish marksheets'],
    };
  });

  app.get('/student/dashboard', { preHandler: requireAuth({ roles: ['student'], audience: 'student-app' }) }, async (request) => {
    const studentId = request.user?.sub!;
    const student = Array.from(students.values()).find((entry) => entry.userId === studentId || entry.id === request.user?.studentId);
    const studentApplications = Array.from(applications.values()).filter((application) => application.studentId === student?.id);
    const studentMarksheet = Array.from(marksheets.values()).find((item) => item.studentId === student?.id);

    return {
      student,
      stats: {
        applications: studentApplications.length,
        approvedApplications: studentApplications.filter((item) => item.status === 'APPROVED').length,
        downloadableMarksheet: Boolean(studentMarksheet),
      },
      quickActions: ['Apply for internship', 'Track application', 'Download marksheet'],
    };
  });

  app.get('/industry/dashboard', { preHandler: requireAuth({ roles: ['industry'], audience: 'industry-app' }) }, async (request) => {
    const industryId = request.user?.industryId!;
    const industryInternships = Array.from(internships.values()).filter((item) => item.createdByIndustryId === industryId);
    const industryApplications = Array.from(applications.values()).filter((item) => item.industryId === industryId);

    return {
      stats: {
        internships: industryInternships.length,
        applications: industryApplications.length,
        approvedApplications: industryApplications.filter((item) => item.status === 'APPROVED').length,
      },
      quickActions: ['Post internship', 'Review applicants', 'Mark attendance'],
    };
  });
};
