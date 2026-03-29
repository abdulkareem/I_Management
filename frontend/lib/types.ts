export type Role =
  | 'SUPER_ADMIN'
  | 'COLLEGE_ADMIN'
  | 'DEPARTMENT_COORDINATOR'
  | 'COLLEGE_COORDINATOR'
  | 'INDUSTRY'
  | 'STUDENT'
  | 'EXTERNAL_STUDENT'
  | 'ADMIN'
  | 'COLLEGE'
  | 'COORDINATOR'
  | 'DEPARTMENT';

export interface SessionUser {
  id: string;
  name?: string;
  email: string;
  role: Role;
}

export interface SessionProfile {
  token: string;
  user: SessionUser;
  mustChangePassword?: boolean;
}

export interface StudentDashboard {
  studentName?: string;
  studentUniversityRegNumber?: string;
  studentCollegeName?: string;
  internships: Array<{ id: string; title: string; description: string; ipoName: string; applied: boolean; status?: string }>;
  collegeInternships?: Array<{ id: string; title: string; description: string; departmentName: string; collegeName: string }>;
  externalInternships?: Array<{
    id: string;
    title: string;
    description: string;
    ipoName: string;
    ipoId?: string | null;
    collegeName?: string;
    departmentName: string;
    vacancy?: number | null;
    applied: boolean;
    applicationId?: string | null;
    status?: string;
    ipoFeedback?: string | null;
    evaluationMarks?: number | null;
    outcomeMarks?: number | null;
    isExternal?: boolean;
    sameCollege?: boolean;
    eligible?: boolean;
    eligibilityMessage?: string;
  }>;
  applications: Array<{ id: string; internshipTitle: string; ipoName: string; status: string; acceptanceUrl?: string | null }>;
  activeApplicationLock?: boolean;
  maxSelectableApplications?: number;
  canApplyForExternal?: boolean;
  policyNote?: string;
  journeyCompletion?: number;
  journeySteps?: Array<{ label: string; done: boolean }>;
}

export interface CollegeDashboard {
  college: { id: string; name: string; address?: string; emblem?: string | null };
  stats?: { pendingMous: number; approvedIPOs: number; activeStudents: number; applicationsSubmitted: number };
  pendingMous?: Array<{ id: string; ipoName: string; ipoDescription?: string | null; createdAtLabel: string }>;
  approvedIPOs?: Array<{ id: string; name: string; emblem?: string | null }>;
  studentActivity?: Array<{ studentName: string; universityRegNo: string; applications: number }>;
  modules?: string[];
}

export interface IPODashboard {
  ipo: { id: string; name: string; description?: string | null; emblem?: string | null };
  stats: { liveOpportunities?: number; pendingApplications?: number; acceptedApplications?: number; attendanceToday?: number; internships?: number };
  opportunities?: Array<{ id: string; title: string; description: string; applications: number }>;
  applications?: Array<{ id: string; studentName: string; studentEmail?: string | null; collegeName: string; opportunityTitle: string; status: string; createdAt?: string; completedAt?: string | null; ipoFeedback?: string | null; ipoScore?: number | null; performanceFeedbackId?: string | null }>;
  approvedColleges?: Array<{ id: string; name: string }>;
}

export interface DepartmentDashboard {
  internships: Array<{ id: string; title: string; description: string; is_paid: number; fee?: number | null; internship_category?: 'FREE' | 'PAID' | 'STIPEND' | null; vacancy?: number | null; is_external: number; status: string; created_at: string; ipo_id?: string | null; gender_preference?: 'GIRLS' | 'BOYS' | 'BOTH' | null; stipend_amount?: number | null; stipend_duration?: 'DAY' | 'WEEK' | 'MONTH' | null; minimum_days?: number | null }>;
  applications: Array<{ id: string; status: string; internship_title: string; student_name: string; student_email: string; is_external: number; created_at: string; completed_at?: string | null }>;
  ipoRequests: Array<{ id: string; internship_title: string; description: string; mapped_co?: string | null; mapped_po?: string | null; mapped_pso?: string | null; status: string; ipo_name: string }>;
}
