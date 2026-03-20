export type InternshipType = 'MAJOR' | 'MINOR' | 'INTERDISCIPLINARY' | 'ALLIED';
export type InternshipMode = 'OFFLINE' | 'ONLINE';
export type ProviderCategory =
  | 'EDUCATIONAL_INSTITUTION'
  | 'RESEARCH_LAB'
  | 'GOVERNMENT_INSTITUTION'
  | 'NGO'
  | 'MSME_OR_INDUSTRY'
  | 'BANK_OR_FINANCIAL'
  | 'IT_OR_DIGITAL'
  | 'HEALTHCARE_OR_WELLNESS'
  | 'MEDIA_OR_CULTURAL'
  | 'AGRICULTURE_OR_ENVIRONMENT';

export type ProgramCode = 'BA' | 'BSC' | 'BCOM' | 'BBA' | 'BCA' | 'BVOC' | 'OTHER';

export type WorkflowState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DEPARTMENT_REVIEW'
  | 'DEPARTMENT_APPROVED'
  | 'COLLEGE_APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'COMPLETED';

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
  externalPlatform?: 'KSHEC' | 'DIRECT' | null;
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
  internshipSource: 'INTERNAL' | 'EXTERNAL';
  amountInInr: number;
  requiresFacultyVerification: true;
  requiresCoordinatorVerification: true;
}
