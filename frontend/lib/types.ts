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
  | 'COORDINATOR';

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
  internships: Array<{ id: string; title: string; description: string; industryName: string; applied: boolean; status?: string }>;
  applications: Array<{ id: string; internshipTitle: string; industryName: string; status: string; acceptanceUrl?: string | null }>;
  journeyCompletion?: number;
  journeySteps?: Array<{ label: string; done: boolean }>;
}

export interface CollegeDashboard {
  college: { id: string; name: string; address?: string; emblem?: string | null };
  stats?: { pendingMous: number; approvedIndustries: number; activeStudents: number; applicationsSubmitted: number };
  pendingMous?: Array<{ id: string; industryName: string; industryDescription?: string | null; createdAtLabel: string }>;
  approvedIndustries?: Array<{ id: string; name: string; emblem?: string | null }>;
  studentActivity?: Array<{ studentName: string; universityRegNo: string; applications: number }>;
  modules?: string[];
}

export interface IndustryDashboard {
  industry: { id: string; name: string; description?: string | null; emblem?: string | null };
  stats: { liveOpportunities?: number; pendingApplications?: number; acceptedApplications?: number; attendanceToday?: number; internships?: number };
  opportunities?: Array<{ id: string; title: string; description: string; applications: number }>;
  applications?: Array<{ id: string; studentName: string; collegeName: string; opportunityTitle: string; status: string }>;
  approvedColleges?: Array<{ id: string; name: string }>;
}
