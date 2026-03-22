import { allocateInternshipSeats } from "@prism/compliance";
import type {
  ArchivePolicy,
  AuthArchitecture,
  CollegeCostScenario,
  CollegeStorageUsage,
  PlatformOverview,
  PricingPlan,
  SaaSReadinessReport,
  SemesterCycleSummary,
  StorageSummary,
  StudentCostProfile,
} from "@prism/types";
import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../lib/security.js";
import { z } from "zod";

const exchangeRateInInr = 83;
const annualInfraBudgetInUsd = 780;
const annualInfraBudgetInInr =
  annualInfraBudgetInUsd * exchangeRateInInr + 1200;

const pricingPlans: PricingPlan[] = [
  {
    name: "Foundation",
    tier: "FOUNDATION",
    annualPriceInInr: 22000,
    activeStudentsIncludedPerSemester: 500,
    archiveStudentsIncluded: 2000,
    additionalActiveStudentPriceInInr: 15,
    archiveAddOnPricePer500InInr: 2000,
    supportModel: "Standard email and onboarding support",
    highlights: [
      "College-only paid subscription with student and industry access included",
      "Up to 500 active students per semester",
      "Semester lifecycle automation with archive controls",
      "Partner college sharing and core analytics",
    ],
  },
  {
    name: "Growth",
    tier: "GROWTH",
    annualPriceInInr: 50000,
    activeStudentsIncludedPerSemester: 2000,
    archiveStudentsIncluded: 6000,
    additionalActiveStudentPriceInInr: 12,
    archiveAddOnPricePer500InInr: 1800,
    supportModel: "Priority support with implementation guidance",
    highlights: [
      "Advanced analytics and higher workflow volume",
      "Up to 2,000 active students per semester",
      "Cross-college internship partner network management",
      "Operational dashboards for principal, coordinator, and mentors",
    ],
  },
  {
    name: "Statewide",
    tier: "STATEWIDE",
    annualPriceInInr: 75000,
    activeStudentsIncludedPerSemester: 5000,
    archiveStudentsIncluded: 20000,
    additionalActiveStudentPriceInInr: 10,
    archiveAddOnPricePer500InInr: 1500,
    supportModel: "Dedicated success manager and quarterly reviews",
    highlights: [
      "Designed for college groups and state-wide deployment programs",
      "Shared internship demand analytics across approved partner institutions",
      "Custom onboarding, SLA, and admin controls",
      "Future AI matching add-on readiness",
    ],
  },
];

const studentCostProfile: StudentCostProfile = {
  activePerSemesterInInr: 8.4,
  archivedPerYearInInr: 0.72,
  notes: [
    "Active student cost blends Railway backend, PostgreSQL, backup overhead, and support reserve.",
    "Archived student cost assumes compressed records, essential metadata only, and low-frequency access.",
    "Cloudflare static delivery remains effectively negligible at this scale, so active workflow compute is the main driver.",
  ],
};

const storageUsage: CollegeStorageUsage[] = [
  {
    collegeId: "college-psmo",
    collegeName: "PSMO College",
    activeStudents: 480,
    archivedStudents: 1650,
    industriesRegistered: 38,
    storageBreakdownMb: {
      activeStudentData: 48,
      archivedStudentData: 84,
      industryData: 18,
      documents: 126,
    },
    totalStorageMb: 276,
    estimatedAnnualInfraCostInInr: 4280,
    recommendedPlan: "FOUNDATION",
  },
  {
    collegeId: "college-calicut-arts",
    collegeName: "Calicut Arts & Science College",
    activeStudents: 920,
    archivedStudents: 2600,
    industriesRegistered: 21,
    storageBreakdownMb: {
      activeStudentData: 92,
      archivedStudentData: 132,
      industryData: 11,
      documents: 164,
    },
    totalStorageMb: 399,
    estimatedAnnualInfraCostInInr: 7560,
    recommendedPlan: "GROWTH",
  },
  {
    collegeId: "college-malabar-tech",
    collegeName: "Malabar Tech Campus",
    activeStudents: 1860,
    archivedStudents: 5400,
    industriesRegistered: 52,
    storageBreakdownMb: {
      activeStudentData: 186,
      archivedStudentData: 270,
      industryData: 24,
      documents: 295,
    },
    totalStorageMb: 775,
    estimatedAnnualInfraCostInInr: 13380,
    recommendedPlan: "GROWTH",
  },
];

const storageSummary: StorageSummary = storageUsage.reduce(
  (summary, college) => {
    summary.collegesRegistered += 1;
    summary.activeStudents += college.activeStudents;
    summary.archivedStudents += college.archivedStudents;
    summary.industriesRegistered += college.industriesRegistered;
    summary.totalStorageMb += college.totalStorageMb;
    summary.estimatedAnnualInfraCostInInr +=
      college.estimatedAnnualInfraCostInInr;
    return summary;
  },
  {
    collegesRegistered: 0,
    activeStudents: 0,
    archivedStudents: 0,
    industriesRegistered: 0,
    totalStorageMb: 0,
    estimatedAnnualInfraCostInInr: 0,
  },
);

const collegeCostScenarios: CollegeCostScenario[] = [
  {
    activeStudents: 500,
    archivedStudents: 2000,
    annualInfraCostInInr: 4300,
    recommendedPlan: "FOUNDATION",
    recommendedFeeInInr: 22000,
    projectedGrossMarginMultiple: 5.12,
  },
  {
    activeStudents: 1200,
    archivedStudents: 4000,
    annualInfraCostInInr: 7200,
    recommendedPlan: "GROWTH",
    recommendedFeeInInr: 50000,
    projectedGrossMarginMultiple: 5,
  },
  {
    activeStudents: 2000,
    archivedStudents: 6000,
    annualInfraCostInInr: 9800,
    recommendedPlan: "GROWTH",
    recommendedFeeInInr: 50000,
    projectedGrossMarginMultiple: 5.1,
  },
  {
    activeStudents: 5000,
    archivedStudents: 20000,
    annualInfraCostInInr: 14800,
    recommendedPlan: "STATEWIDE",
    recommendedFeeInInr: 75000,
    projectedGrossMarginMultiple: 5.07,
  },
];

const semesterCycles: SemesterCycleSummary[] = [
  {
    id: "sem-2025-odd-s5",
    label: "Semester 5 Industry Cycle",
    semester: 5,
    academicYear: "2025-26",
    activeStudents: 420,
    archivedStudents: 0,
    applications: 668,
    placementRate: 78,
    lifecycleStatus: "ACTIVE",
  },
  {
    id: "sem-2025-even-s4",
    label: "Semester 4 Community & Allied Cycle",
    semester: 4,
    academicYear: "2025-26",
    activeStudents: 318,
    archivedStudents: 0,
    applications: 472,
    placementRate: 71,
    lifecycleStatus: "ACTIVE",
  },
  {
    id: "sem-2024-odd-s3",
    label: "Semester 3 Foundation Cycle",
    semester: 3,
    academicYear: "2024-25",
    activeStudents: 0,
    archivedStudents: 605,
    applications: 740,
    placementRate: 82,
    lifecycleStatus: "ARCHIVED",
  },
];

const architecture: AuthArchitecture = {
  scopes: [
    {
      role: "COLLEGE",
      authSurface: "/portal/college",
      tokenAudience: "college-app",
      accessRules: [
        "JWT contains collegeId and role claims for every dashboard request.",
        "Queries must always filter by collegeId before applying workflow conditions.",
        "College users can view only their own students, reports, analytics, and subscriptions.",
      ],
    },
    {
      role: "STUDENT",
      authSurface: "/portal/student",
      tokenAudience: "student-app",
      accessRules: [
        "Student sessions are bound to both studentId and collegeId.",
        "Students can view only internships they applied to, were assigned to, or were explicitly published for their college.",
        "Archived students stay read-only and cannot create new applications.",
      ],
    },
    {
      role: "INDUSTRY",
      authSurface: "/portal/industry",
      tokenAudience: "industry-app",
      accessRules: [
        "Industry accounts can post internships for public or selected-college visibility.",
        "Industry users can access student data only after student application or college assignment.",
        "Industry analytics remain limited to their own listings, interviews, and conversion metrics.",
      ],
    },
    {
      role: "SUPER_ADMIN",
      authSurface: "/portal/super-admin",
      tokenAudience: "platform-admin",
      accessRules: [
        "Platform administrators can monitor tenant health, billing, and compliance exceptions.",
        "Super admin views aggregate performance without exposing tenant-to-tenant raw student data by default.",
      ],
    },
  ],
  multiTenantRules: [
    "Every tenant-owned table stores collegeId and uses compound indexes with lifecycle or workflow columns.",
    "Shared internship listings are visible across colleges only through controlled listing-access tables, never through direct student joins.",
    "Partner-college links enable discovery and sharing while preserving separate analytics and separate student databases.",
  ],
};

const archivePolicy: ArchivePolicy = {
  baseArchiveIncludedStudents: 2000,
  readOnlyAccess: [
    "Archived students remain available for audit, reports, and accreditation evidence.",
    "Archived records are excluded from active billing and placement workflow counts.",
    "Archived students cannot log new attendance, apply, or upload fresh submissions.",
  ],
  compressionPolicy: [
    "Retain essential student profile, internship summary, evaluation totals, and document pointers in the primary database.",
    "Move large files such as resumes, certificates, and reports to compressed object storage with checksum tracking.",
    "Store denormalized archive snapshots for reporting to reduce joins against active workflow tables.",
  ],
  monetization: [
    "Hybrid model: include archive allowance in every paid college plan.",
    "Charge archive expansion as a storage add-on in 500-student blocks once allowance is exceeded.",
    "Reserve per-student retention fee logic for later only if long-term storage materially exceeds plan assumptions.",
  ],
};

const saasReadinessReport: SaaSReadinessReport = {
  architecture,
  archivePolicy,
  profitGuardrail: {
    targetMultiple: 5,
    achievedOnPlans: ["FOUNDATION", "GROWTH", "STATEWIDE"],
    explanation:
      "All modeled plans are kept at or above the 5x annual infra multiple by separating active billing, archive allowances, and step-up plan thresholds.",
  },
  dbUpgradeNotes: [
    "Introduce semester_cycle records so each internship and application belongs to one academic lifecycle.",
    "Add student lifecycle status and archived snapshot tables to separate active workflow data from long-term retention.",
    "Index collegeId with semesterCycleId, lifecycleStatus, and workflowState to prevent role leaks and speed tenant-scoped queries.",
    "Model internship partner colleges and listing visibility through explicit join tables instead of shared student access.",
  ],
  apiUpgradeNotes: [
    "Use separate JWT audiences and claims validation for college, student, industry, and super-admin entry points.",
    "Apply request-level tenant guards before business logic so existing university rules stay intact inside safe scopes.",
    "Expose pricing, archive, and lifecycle analytics through dedicated admin endpoints for product and billing transparency.",
  ],
  workflowGuarantees: [
    "Internship duration, semester window, private-organization validation, own-college restriction, and evaluation rules remain preserved by the compliance package.",
    "Industry access stays gated until a student applies or is assigned.",
    "Archived students are excluded from active-semester counts and billing while retaining report history.",
  ],
};

const platformOverview: PlatformOverview = {
  platform: "InternSuite",
  positioning:
    "Public internship cloud ERP for colleges with free industry participation, semester-based student lifecycle management, and controlled partner-college collaboration.",
  deployment: {
    frontendDirectory: "frontend",
    frontendTarget: "Cloudflare Pages",
    backendDirectory: "backend",
    backendTarget: "Railway",
  },
  superAdminEmail: "private@internsuite.app",
  headlineMetrics: {
    collegesRegistered: storageSummary.collegesRegistered,
    activeStudents: storageSummary.activeStudents,
    archivedStudents: storageSummary.archivedStudents,
    industriesRegistered: storageSummary.industriesRegistered,
    totalStorageMb: storageSummary.totalStorageMb,
  },
  pricingPlans,
  studentCostProfile,
  storageSummary,
  storageUsage,
  collegeCostScenarios,
  semesterCycles,
};

export const systemRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({
    status: "ok",
    service: "internsuite-api",
  }));

  app.get("/bootstrap", async () => ({
    platform: platformOverview.platform,
    positioning: platformOverview.positioning,
    pricingAnchor: "₹22,000/year for up to 500 active students per semester",
    archivePolicy: {
      baseArchiveIncludedStudents: archivePolicy.baseArchiveIncludedStudents,
      readOnlyAccess: archivePolicy.readOnlyAccess,
    },
    evaluationScheme: { cca: 15, ese: 35, total: 50 },
    paymentRules: {
      internal: 500,
      external: 1000,
      verificationLayers: ["Faculty mentor", "College coordinator"],
    },
    deployment: platformOverview.deployment,
  }));

  app.get("/platform-overview", async () => platformOverview);

  app.get("/saas-readiness", async () => saasReadinessReport);

  app.get("/super-admin/storage-usage", { preHandler: requireAuth({ roles: ["super_admin"], audience: "platform-admin" }) }, async () => ({
    generatedAt: new Date().toISOString(),
    annualInfraBudgetInInr,
    storageSummary,
    colleges: storageUsage,
    studentCostProfile,
    collegeCostScenarios,
    archivePolicy: {
      baseArchiveIncludedStudents: archivePolicy.baseArchiveIncludedStudents,
      readOnlyAccess: archivePolicy.readOnlyAccess,
    },
    billingRule: {
      collegesAreOnlyPayingCustomers: true,
      activeStudentBilling:
        "Included up to plan cap, then semester add-on applies.",
      archivedStudentBilling:
        "Included up to plan archive allowance, then archive storage add-on applies.",
      note: "Industry participation remains free to maximize internship supply while college subscriptions fund the platform.",
    },
  }));

  app.post("/allocation/auto-assign", async (request) => {
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
