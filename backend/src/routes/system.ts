import { allocateInternshipSeats } from '@prism/compliance';
import type {
  CollegeStorageUsage,
  PlatformOverview,
  PricingPlan,
  StorageSummary,
} from '@prism/types';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const pricingPlans: PricingPlan[] = [
  {
    name: 'Launch',
    audience: 'Small and mid-sized colleges',
    basePricePerStudentInInr: 12,
    storagePricePerGbInInr: 120,
    highlights: ['Common public website', 'College + student + industry dashboards', 'Basic compliance reports'],
  },
  {
    name: 'Growth',
    audience: 'Colleges that need automation',
    basePricePerStudentInInr: 18,
    storagePricePerGbInInr: 120,
    highlights: ['Attendance and logbook workflows', 'AI-assisted matching', 'Storage-based pricing analytics'],
  },
  {
    name: 'Enterprise',
    audience: 'College groups and platform operators',
    basePricePerStudentInInr: 0,
    storagePricePerGbInInr: 120,
    highlights: ['Custom contracts', 'Advanced billing', 'Priority onboarding and support'],
  },
];

const storageUsage: CollegeStorageUsage[] = [
  {
    collegeId: 'college-psmo',
    collegeName: 'PSMO College',
    studentsRegistered: 1420,
    industriesRegistered: 38,
    storageBreakdownMb: {
      studentData: 19046,
      industryData: 6963,
      documents: 24986,
    },
    totalStorageMb: 50995,
    estimatedMonthlyChargeInInr: 5976,
  },
  {
    collegeId: 'college-calicut-arts',
    collegeName: 'Calicut Arts & Science College',
    studentsRegistered: 980,
    industriesRegistered: 21,
    storageBreakdownMb: {
      studentData: 12698,
      industryData: 4198,
      documents: 16179,
    },
    totalStorageMb: 33075,
    estimatedMonthlyChargeInInr: 3876,
  },
  {
    collegeId: 'college-malabar-tech',
    collegeName: 'Malabar Tech Campus',
    studentsRegistered: 1760,
    industriesRegistered: 52,
    storageBreakdownMb: {
      studentData: 24781,
      industryData: 9728,
      documents: 31885,
    },
    totalStorageMb: 66394,
    estimatedMonthlyChargeInInr: 7776,
  },
];

const storageSummary: StorageSummary = storageUsage.reduce(
  (summary, college) => {
    summary.collegesRegistered += 1;
    summary.studentsRegistered += college.studentsRegistered;
    summary.industriesRegistered += college.industriesRegistered;
    summary.totalStorageMb += college.totalStorageMb;
    summary.estimatedMonthlyChargeInInr += college.estimatedMonthlyChargeInInr;
    return summary;
  },
  {
    collegesRegistered: 0,
    studentsRegistered: 0,
    industriesRegistered: 0,
    totalStorageMb: 0,
    estimatedMonthlyChargeInInr: 0,
  },
);

const platformOverview: PlatformOverview = {
  platform: 'PRISM – PSMO Rural Internship & Skill Mission',
  deployment: {
    frontendDirectory: 'frontend',
    frontendTarget: 'Cloudflare Pages',
    backendDirectory: 'backend',
    backendTarget: 'Railway',
  },
  superAdminEmail: 'abdulkareem@psmocollege.ac.in',
  headlineMetrics: {
    collegesRegistered: storageSummary.collegesRegistered,
    studentsRegistered: storageSummary.studentsRegistered,
    industriesRegistered: storageSummary.industriesRegistered,
    totalStorageMb: storageSummary.totalStorageMb,
  },
  pricingPlans,
  storageSummary,
  storageUsage,
};

export const systemRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({ status: 'ok', service: 'prism-api' }));

  app.get('/bootstrap', async () => ({
    platform: platformOverview.platform,
    superAdminEmail: platformOverview.superAdminEmail,
    pricing: '₹12/student/month + storage overage',
    whatsappAlerts: ['OTP', 'Approval', 'Submission reminders'],
    evaluationScheme: { cca: 15, ese: 35, total: 50 },
    paymentRules: {
      internal: 500,
      external: 1000,
      verificationLayers: ['Faculty mentor', 'College coordinator'],
    },
    deployment: platformOverview.deployment,
  }));

  app.get('/platform-overview', async () => platformOverview);

  app.get('/super-admin/storage-usage', async () => ({
    generatedAt: new Date().toISOString(),
    storageSummary,
    colleges: storageUsage,
    billingRule: {
      basePricePerStudentInInr: 12,
      storagePricePerGbInInr: 120,
      note: 'Charge colleges by registered students plus measured storage for student data, industries, and documents.',
    },
  }));

  app.post('/allocation/auto-assign', async (request) => {
    const payload = z
      .object({
        ranking: z.array(
          z.object({
            studentId: z.string(),
            rankScore: z.number(),
            preferredInternshipIds: z.array(z.string()).min(1),
          }),
        ),
        inventory: z.array(
          z.object({
            internshipId: z.string(),
            seats: z.number().int().nonnegative(),
          }),
        ),
      })
      .parse(request.body);

    return {
      allocations: allocateInternshipSeats(payload.ranking, payload.inventory),
    };
  });
};
