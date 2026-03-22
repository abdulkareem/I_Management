export type InternshipType = "MAJOR" | "MINOR" | "INTERDISCIPLINARY" | "ALLIED";
export type InternshipMode = "OFFLINE" | "ONLINE";
export type ProviderCategory =
  | "EDUCATIONAL_INSTITUTION"
  | "RESEARCH_LAB"
  | "GOVERNMENT_INSTITUTION"
  | "NGO"
  | "MSME_OR_INDUSTRY"
  | "BANK_OR_FINANCIAL"
  | "IT_OR_DIGITAL"
  | "HEALTHCARE_OR_WELLNESS"
  | "MEDIA_OR_CULTURAL"
  | "AGRICULTURE_OR_ENVIRONMENT";

export type ProgramCode =
  | "BA"
  | "BSC"
  | "BCOM"
  | "BBA"
  | "BCA"
  | "BVOC"
  | "OTHER";
export type WorkflowState =
  | "DRAFT"
  | "SUBMITTED"
  | "DEPARTMENT_REVIEW"
  | "DEPARTMENT_APPROVED"
  | "COLLEGE_APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "COMPLETED";

export type StudentLifecycleStatus =
  | "ACTIVE"
  | "AT_RISK"
  | "READY_TO_ARCHIVE"
  | "ARCHIVED";
export type PlanTier = "FOUNDATION" | "GROWTH" | "STATEWIDE";
export type ListingVisibility = "PUBLIC" | "SELECTED_COLLEGES";

export interface InternshipCellStructure {
  principalUserId: string;
  internshipCoordinatorUserId: string;
  departmentCoordinatorUserIds: string[];
}

export interface InternshipDraft {
  collegeId: string;
  studentCollegeId: string;
  studentProgram: ProgramCode;
  internshipType: InternshipType;
  mode: InternshipMode;
  providerCategory: ProviderCategory;
  providerName: string;
  providerIsPrivate: boolean;
  providerYearsOfExperience: number;
  partnerYearsOfExperience?: number | null;
  hasMoUUpload: boolean;
  isOwnCollege: boolean;
  semester: number;
  affectsAcademicSchedule: boolean;
  vacationPreferred: boolean;
  startDate: string;
  endDate: string;
  totalHours: number;
  industrySupervisorUserId?: string | null;
  externalPlatform?: "KSHEC" | "DIRECT" | null;
  departmentCouncilApproved: boolean;
}

export interface ComplianceResult {
  isEligible: boolean;
  errors: string[];
  warnings: string[];
  derived: {
    minimumHoursRequired: number;
    evaluation: {
      cca: number;
      ese: number;
      total: number;
    };
    reportLanguages: string[];
  };
}

export interface StudentRankingInput {
  studentId: string;
  rankScore: number;
  preferredInternshipIds: string[];
}

export interface SeatInventory {
  internshipId: string;
  seats: number;
}

export interface AllocationResult {
  internshipId: string;
  studentId: string;
  rankScore: number;
  allocationRank: number;
}

export interface EvaluationMarks {
  ccaMarks: number;
  eseMarks: number;
}

export interface PaymentRule {
  internshipSource: "INTERNAL" | "EXTERNAL";
  amountInInr: number;
  requiresFacultyVerification: true;
  requiresCoordinatorVerification: true;
}

export interface StorageBreakdownMb {
  activeStudentData: number;
  archivedStudentData: number;
  industryData: number;
  documents: number;
}

export interface StudentCostProfile {
  activePerSemesterInInr: number;
  archivedPerYearInInr: number;
  notes: string[];
}

export interface CollegeCostScenario {
  activeStudents: number;
  archivedStudents: number;
  annualInfraCostInInr: number;
  recommendedPlan: PlanTier;
  recommendedFeeInInr: number;
  projectedGrossMarginMultiple: number;
}

export interface CollegeStorageUsage {
  collegeId: string;
  collegeName: string;
  activeStudents: number;
  archivedStudents: number;
  industriesRegistered: number;
  storageBreakdownMb: StorageBreakdownMb;
  totalStorageMb: number;
  estimatedAnnualInfraCostInInr: number;
  recommendedPlan: PlanTier;
}

export interface StorageSummary {
  collegesRegistered: number;
  activeStudents: number;
  archivedStudents: number;
  industriesRegistered: number;
  totalStorageMb: number;
  estimatedAnnualInfraCostInInr: number;
}

export interface PricingPlan {
  name: string;
  tier: PlanTier;
  annualPriceInInr: number;
  activeStudentsIncludedPerSemester: number;
  archiveStudentsIncluded: number;
  additionalActiveStudentPriceInInr: number;
  archiveAddOnPricePer500InInr: number;
  supportModel: string;
  highlights: string[];
}

export interface SemesterCycleSummary {
  id: string;
  label: string;
  semester: number;
  academicYear: string;
  activeStudents: number;
  archivedStudents: number;
  applications: number;
  placementRate: number;
  lifecycleStatus: "PLANNING" | "ACTIVE" | "CLOSED" | "ARCHIVED";
}

export interface PlatformOverview {
  platform: string;
  positioning: string;
  deployment: {
    frontendDirectory: string;
    frontendTarget: string;
    backendDirectory: string;
    backendTarget: string;
  };
  superAdminEmail: string;
  headlineMetrics: {
    collegesRegistered: number;
    activeStudents: number;
    archivedStudents: number;
    industriesRegistered: number;
    totalStorageMb: number;
  };
  pricingPlans: PricingPlan[];
  studentCostProfile: StudentCostProfile;
  storageSummary: StorageSummary;
  storageUsage: CollegeStorageUsage[];
  collegeCostScenarios: CollegeCostScenario[];
  semesterCycles: SemesterCycleSummary[];
}

export interface AuthArchitecture {
  scopes: Array<{
    role: "COLLEGE" | "STUDENT" | "INDUSTRY" | "SUPER_ADMIN";
    authSurface: string;
    tokenAudience: string;
    accessRules: string[];
  }>;
  multiTenantRules: string[];
}

export interface ArchivePolicy {
  baseArchiveIncludedStudents: number;
  readOnlyAccess: string[];
  compressionPolicy: string[];
  monetization: string[];
}

export interface SaaSReadinessReport {
  architecture: AuthArchitecture;
  archivePolicy: ArchivePolicy;
  profitGuardrail: {
    targetMultiple: number;
    achievedOnPlans: PlanTier[];
    explanation: string;
  };
  dbUpgradeNotes: string[];
  apiUpgradeNotes: string[];
  workflowGuarantees: string[];
}
