export const publicNav = [
  { label: 'Platform', href: '/' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Access', href: '/auth' },
];

export const homepageOverview = [
  'Role-aware email discovery that routes existing users to login and brand-new users into the right registration flow.',
  'OTP-first onboarding with a six-digit email verification step before password creation for colleges, students, and industry partners.',
  'Operational dashboards for approvals, internships, applications, attendance, evaluations, and audit-safe document delivery.',
  'A premium, mobile-friendly SaaS experience designed to feel custom-built rather than template-generated.',
];

export const homepageJourney = [
  {
    title: 'Detect identity before the form maze',
    detail:
      'Every primary CTA starts with email discovery so InternSuite can instantly decide whether a person should log in or continue to role-specific registration.',
  },
  {
    title: 'Make verification feel trustworthy',
    detail:
      'A 6-digit OTP is created during registration and emailed before password creation, giving institutions and partners a clean, human-friendly trust checkpoint.',
  },
  {
    title: 'Move users into work, not admin',
    detail:
      'After login, users land directly in the correct dashboard context—college, student, or industry—without friction or role confusion.',
  },
];

export const publicPlans = [
  {
    name: 'Foundation',
    price: '₹12,000 / year',
    audience: 'For colleges launching a polished internship operating system with verified onboarding and workflow automation.',
    bullets: [
      'Up to 500 active students',
      'Email discovery, OTP verification, and password-based access',
      'Approvals, attendance, evaluations, and core reporting',
      'Modern mobile-first dashboards for all roles',
    ],
    cta: 'Start Foundation',
  },
  {
    name: 'Growth',
    price: '₹25,000 / year',
    audience: 'For institutions scaling across departments and requiring stronger analytics, partner coordination, and higher throughput.',
    bullets: [
      'Up to 2000 active students',
      'Advanced reporting and portfolio-level visibility',
      'Larger internship, application, and document volumes',
      'Built for multi-department internship operations',
    ],
    cta: 'Talk to Growth',
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
    detail: 'Use an official email to check whether your institution should log in or continue to verified onboarding.',
    href: '/auth?role=college',
    cta: 'Access College Workspace',
  },
  {
    title: 'Student',
    detail: 'Students are routed to the right next step automatically—login if registered, OTP onboarding if new.',
    href: '/auth?role=student',
    cta: 'Access Student Workspace',
  },
  {
    title: 'Industry',
    detail: 'Partners can launch directly into login or verified registration before posting internships.',
    href: '/auth?role=industry',
    cta: 'Access Industry Workspace',
  },
];

export const lifecycleSteps = [
  {
    title: '1. Smart entry',
    detail: 'Users start with email discovery, reducing duplicate accounts and routing every role into the correct authentication path.',
  },
  {
    title: '2. Verified onboarding',
    detail: 'New users receive a six-digit OTP by email, verify it, and then create a short alphanumeric password to activate access.',
  },
  {
    title: '3. Role-specific workspaces',
    detail: 'College teams, students, and industry partners enter dashboards tailored to their exact workflow and permissions.',
  },
  {
    title: '4. Full lifecycle automation',
    detail: 'Internship posting, approvals, attendance, evaluations, and marksheets continue inside one connected SaaS operating layer.',
  },
];

export const erpCapabilityCards = [
  {
    title: 'Identity orchestration',
    detail: 'Email discovery, OTP verification, and gated password creation align registration and login without role confusion.',
  },
  {
    title: 'Operations automation',
    detail: 'Approval flows, attendance capture, evaluations, and generated artifacts stay connected in one workflow system.',
  },
  {
    title: 'Prisma-first SaaS schema',
    detail: 'Tenant-safe entities, indexed relationships, and production-minded structures support real deployment paths.',
  },
  {
    title: 'Modern frontend system',
    detail: 'The landing page and access flows now feel deliberate, premium, and human-designed instead of generic or mechanical.',
  },
];

export const authFlowCards = [
  {
    title: 'Step 1',
    detail: 'User clicks a login/register CTA, chooses a role, and enters only an email first.',
  },
  {
    title: 'Step 2',
    detail: 'The system checks whether that email is already registered and routes to login or role-specific registration.',
  },
  {
    title: 'Step 3',
    detail: 'New users receive a 6-digit OTP by email and must verify it before password creation.',
  },
  {
    title: 'Step 4',
    detail: 'After OTP verification, the user creates a 4 to 12 character alphanumeric password and continues to the correct dashboard login flow.',
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
