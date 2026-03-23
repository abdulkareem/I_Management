export type Role = 'COLLEGE_COORDINATOR' | 'INDUSTRY' | 'STUDENT';
export type MouStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ApplicationStatus = 'APPLIED' | 'ACCEPTED' | 'REJECTED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface SessionProfile {
  accessToken: string;
  user: SessionUser;
  profile: {
    collegeId?: string;
    industryId?: string;
    studentId?: string;
  };
}

export interface StudentOpportunityCard {
  id: string;
  title: string;
  description: string;
  industryName: string;
  industryEmblem?: string | null;
  mouStatus: 'APPROVED';
  applied: boolean;
  status?: ApplicationStatus;
}

export interface StudentDashboard {
  journeyCompletion: number;
  journeySteps: Array<{ label: string; done: boolean }>;
  internships: StudentOpportunityCard[];
  applications: Array<{
    id: string;
    internshipTitle: string;
    industryName: string;
    status: ApplicationStatus;
    acceptanceUrl?: string | null;
  }>;
}

export interface CollegeDashboard {
  college: { id: string; name: string; address: string; emblem?: string | null };
  stats: {
    pendingMous: number;
    approvedIndustries: number;
    activeStudents: number;
    applicationsSubmitted: number;
  };
  pendingMous: Array<{
    id: string;
    industryName: string;
    industryDescription?: string | null;
    createdAtLabel: string;
  }>;
  approvedIndustries: Array<{ id: string; name: string; emblem?: string | null }>;
  studentActivity: Array<{ studentName: string; universityRegNo: string; applications: number }>;
}

export interface IndustryDashboard {
  industry: { id: string; name: string; description?: string | null; emblem?: string | null };
  stats: {
    liveOpportunities: number;
    pendingApplications: number;
    acceptedApplications: number;
    attendanceToday: number;
  };
  opportunities: Array<{ id: string; title: string; description: string; applications: number }>;
  applications: Array<{
    id: string;
    studentName: string;
    collegeName: string;
    opportunityTitle: string;
    status: ApplicationStatus;
  }>;
}
