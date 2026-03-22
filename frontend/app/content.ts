export const publicNav = [
  { label: 'Platform', href: '/' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Auth', href: '/auth' },
];

export const homepageOverview = [
  'Email-first OTP + password onboarding for colleges, students, and industry.',
  'College-controlled internship approvals, MoU generation, attendance review, and evaluations.',
  'Industry workflows for posting internships, managing applicants, and submitting attendance.',
  'Student workspace for verified registration, internship applications, approval letters, and marksheets.',
];

export const homepageJourney = [
  {
    title: 'Discover by email first',
    detail:
      'The primary Register / Login CTA first asks for email, then routes the user to login or role-specific registration based on account existence.',
  },
  {
    title: 'Automate the paperwork',
    detail:
      'InternSuite turns internship approvals into system-generated documents including MOU, approval letter, attendance report, and marksheet PDFs.',
  },
  {
    title: 'Protect tenant boundaries',
    detail:
      'Every workflow is scoped by tenant, college, role, and entity ownership so one college never sees another college’s records.',
  },
];

export const publicPlans = [
  {
    name: 'Foundation',
    price: '₹12,000 / year',
    audience: 'For colleges managing up to 500 students with core internship ERP automation.',
    bullets: [
      'Up to 500 students',
      'OTP + password authentication',
      'Internship approvals, attendance, evaluation, and basic document automation',
      'Mobile-first dashboards for college, student, and industry',
    ],
    cta: 'Register Your College',
  },
  {
    name: 'Growth',
    price: '₹25,000 / year',
    audience: 'For colleges managing up to 2000 students with analytics and higher workflow throughput.',
    bullets: [
      'Up to 2000 students',
      'Advanced analytics and reporting',
      'Higher internship, application, and document volumes',
      'Designed for scaled multi-department internship operations',
    ],
    cta: 'Register Your College',
  },
];

export const publicInternships = [
  {
    title: 'Backend Platform Intern',
    organization: 'Northstar Digital Labs',
    category: 'IT',
    mode: 'Hybrid',
    seats: '10 seats',
    deadline: 'Applications close 18 April 2026',
  },
  {
    title: 'Operations Excellence Intern',
    organization: 'Kerala Precision Manufacturing',
    category: 'Manufacturing',
    mode: 'On-site',
    seats: '6 seats',
    deadline: 'Applications close 22 April 2026',
  },
  {
    title: 'Finance Analytics Intern',
    organization: 'Malabar FinCore',
    category: 'Finance',
    mode: 'Hybrid',
    seats: '8 seats',
    deadline: 'Applications close 24 April 2026',
  },
];

export const roleAccessCards = [
  {
    title: 'College',
    detail: 'Approve internships, onboard students, review attendance, capture evaluations, and publish marksheets.',
    href: '/auth',
    cta: 'Register / Login',
  },
  {
    title: 'Student',
    detail: 'Verify identity, complete profile, apply for internships, track approvals, and download marksheets.',
    href: '/auth',
    cta: 'Register / Login',
  },
  {
    title: 'Industry',
    detail: 'Create internships, collaborate with colleges, review applicants, and record daily attendance.',
    href: '/auth',
    cta: 'Register / Login',
  },
];

export const lifecycleSteps = [
  {
    title: '1. Industry posts internship',
    detail: 'Industry creates a listing with visibility, field, duration, stipend, and target college scope.',
  },
  {
    title: '2. College approves and MOU is generated',
    detail: 'Once the college approves, the system generates a branded MOU PDF and stores its file URL.',
  },
  {
    title: '3. Students apply and receive approval letters',
    detail: 'Students apply through verified accounts, and approved applications trigger approval-letter generation.',
  },
  {
    title: '4. Attendance, evaluation, and marksheet',
    detail: 'Industry marks attendance, college approves it, then evaluation marks produce a final marksheet PDF.',
  },
];

export const erpCapabilityCards = [
  {
    title: 'Authentication system',
    detail: '6-digit OTP verification through Resend with password creation only after successful verification.',
  },
  {
    title: 'PDF automation',
    detail: 'System-triggered MOU, approval letter, attendance report, and marksheet documents with stored file URLs.',
  },
  {
    title: 'Prisma-first SaaS schema',
    detail: 'Tenant-safe entities, indexed relationships, and workflow approvals for production-grade scale.',
  },
  {
    title: 'Role-aware API design',
    detail: 'Copy-paste ready routes for auth, college, student, industry, PDF retrieval, and governance endpoints.',
  },
];

export const authFlowCards = [
  {
    title: 'Step 1',
    detail: 'User clicks Register / Login and enters email only.',
  },
  {
    title: 'Step 2',
    detail: 'Existing email routes to password login. New email routes to role-specific registration.',
  },
  {
    title: 'Step 3',
    detail: 'System sends a 6-digit OTP by email using Resend.',
  },
  {
    title: 'Step 4',
    detail: 'After OTP verification, user sets a 12+ character alphanumeric password and enters the dashboard.',
  },
];

export const collegeNav = [
  { label: 'Dashboard', href: '/portal/college' },
  { label: 'Students', href: '/portal/college/students' },
  { label: 'Internships', href: '/portal/college/internships' },
  { label: 'Partners', href: '/portal/college/partners' },
  { label: 'Applications', href: '/portal/college/applications' },
  { label: 'Reports', href: '/portal/college/reports' },
  { label: 'Archive', href: '/portal/college/archive' },
  { label: 'Settings', href: '/portal/college/settings' },
];

export const studentNav = [
  { label: 'Dashboard', href: '/portal/student' },
  { label: 'Profile', href: '/portal/student/profile' },
  { label: 'Internships', href: '/portal/student/internships' },
  { label: 'Applications', href: '/portal/student/applications' },
];

export const industryNav = [
  { label: 'Dashboard', href: '/portal/industry' },
  { label: 'Post Internship', href: '/portal/industry/postings' },
  { label: 'Applications', href: '/portal/industry/applications' },
];

export const adminNav = [
  { label: 'Dashboard', href: '/portal/super-admin' },
  { label: 'Colleges', href: '/portal/super-admin/colleges' },
  { label: 'Payments', href: '/portal/super-admin/payments' },
  { label: 'Analytics', href: '/portal/super-admin/analytics' },
];

export const applicationTrend = [42, 58, 66, 73, 89, 104];
export const participationBars = [
  { label: 'Semester 3', value: 64 },
  { label: 'Semester 4', value: 78 },
  { label: 'Semester 5', value: 91 },
];
export const categoryMix = [
  { label: 'IT', value: 38, color: '#1e40af' },
  { label: 'Manufacturing', value: 24, color: '#10b981' },
  { label: 'Finance', value: 18, color: '#f59e0b' },
  { label: 'Education', value: 20, color: '#7c3aed' },
];

export const archiveHighlights = [
  'Completed students move into archive without polluting live billing counts.',
  'Archived records preserve approval letters, attendance reports, and marksheets for audits.',
  'Read-only history remains searchable by college administrators with tenant-safe access.',
];

export const partnerColleges = [
  {
    name: 'Malabar Arts & Science College',
    status: 'Active partner',
    shareRule: 'Can view shared public and selected internship slots only.',
  },
  {
    name: 'Calicut Institute of Commerce',
    status: 'Pending review',
    shareRule: 'Will receive selected internships after approval policy activation.',
  },
  {
    name: 'Kozhikode Technology Campus',
    status: 'Active partner',
    shareRule: 'Seat-sharing enabled for approved industry cohorts.',
  },
];

export const studentApplications = [
  {
    title: 'Backend Platform Intern',
    company: 'Northstar Digital Labs',
    status: 'Approved by college',
    timeline: 'Approval letter generated and industry onboarding pending.',
  },
  {
    title: 'Finance Analytics Intern',
    company: 'Malabar FinCore',
    status: 'Under review',
    timeline: 'College review in progress.',
  },
  {
    title: 'Operations Excellence Intern',
    company: 'Kerala Precision Manufacturing',
    status: 'Applied',
    timeline: 'Submitted to college queue.',
  },
];
