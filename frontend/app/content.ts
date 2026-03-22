export const publicNav = [
  { label: "Platform", href: "/" },
  { label: "Internships", href: "/internships" },
  { label: "College Login", href: "/login/college" },
];

export const homepageOverview = [
  "College access for administration, partner sharing, reporting, and compliance.",
  "Student access for applications, resumes, internship status, and semester progress.",
  "Industry access for posting internships and reviewing shortlisted applicants.",
  "A simpler public experience with less repetition and faster navigation.",
];

export const homepageJourney = [
  {
    title: "Start with the right login",
    detail:
      "The public page keeps college, student, and industry entry points visible at the top so each user reaches the correct workspace immediately.",
  },
  {
    title: "Use the space more effectively",
    detail:
      "The landing area balances a clear product message on the left with dedicated access cards on the right for a cleaner first impression.",
  },
  {
    title: "Keep only essential information",
    detail:
      "Repeated promotional blocks and extra cards are reduced so the page feels lighter, more direct, and easier to scan.",
  },
];

export const publicPlans = [
  {
    name: "Annual plan",
    price: "₹9,999 / year",
    audience:
      "For colleges using InternSuite with up to 200 students for one year.",
    bullets: [
      "One-year access for up to 200 students",
      "College, student, and industry dashboards included",
      "Internship workflows, reporting, and compliance tools",
      "Recommended starting package for campus deployment",
    ],
    cta: "Start Annual Plan",
  },
  {
    name: "Below 150 students",
    price: "₹5 / student / month",
    audience:
      "Usage-based pricing for colleges managing fewer than 150 students.",
    bullets: [
      "Monthly billing for smaller student cohorts",
      "College, student, and industry access included",
      "Internship tracking, approvals, and reporting",
      "Flexible option for low-volume campuses",
    ],
    cta: "Choose Monthly Plan",
  },
  {
    name: "Above 200 students",
    price: "₹4 / student / month",
    audience: "Usage-based pricing for colleges with more than 200 students.",
    bullets: [
      "Lower per-student pricing for larger cohorts",
      "Scales with active student usage each month",
      "College administration with student and industry access",
      "Supports larger internship operations efficiently",
    ],
    cta: "Contact for Scale",
  },
];

export const publicInternships = [
  {
    title: "Operations Analyst Intern",
    organization: "North Kerala FinServe",
    category: "Banking & Finance",
    mode: "Hybrid",
    seats: "12 seats",
    deadline: "Applications close 12 April 2026",
  },
  {
    title: "Digital Support Intern",
    organization: "Malabar Smart Systems",
    category: "IT & Digital",
    mode: "On-site",
    seats: "18 seats",
    deadline: "Applications close 18 April 2026",
  },
  {
    title: "Community Research Fellow",
    organization: "Coastal Development Forum",
    category: "Research & Social",
    mode: "Field + Remote",
    seats: "8 seats",
    deadline: "Applications close 24 April 2026",
  },
  {
    title: "Production Planning Intern",
    organization: "Kerala Agro Works",
    category: "MSME & Industry",
    mode: "On-site",
    seats: "10 seats",
    deadline: "Applications close 27 April 2026",
  },
];

export const roleAccessCards = [
  {
    title: "College",
    detail:
      "Subscription-backed workspace for student management, partner sharing, reporting, and compliance oversight.",
    href: "/login/college",
    cta: "College Login",
  },
  {
    title: "Student",
    detail:
      "Personal dashboard for applications, resumes, internship status, and semester progress tracking.",
    href: "/login/student",
    cta: "Student Login",
  },
  {
    title: "Industry",
    detail:
      "Free dashboard for posting internships, reviewing applicants, and coordinating shortlisted candidates.",
    href: "/login/industry",
    cta: "Industry Login",
  },
];

export const collegeNav = [
  { label: "Dashboard", href: "/portal/college" },
  { label: "Students", href: "/portal/college/students" },
  { label: "Internships", href: "/portal/college/internships" },
  { label: "Partners", href: "/portal/college/partners" },
  { label: "Applications", href: "/portal/college/applications" },
  { label: "Reports", href: "/portal/college/reports" },
  { label: "Settings", href: "/portal/college/settings" },
];

export const studentNav = [
  { label: "Dashboard", href: "/portal/student" },
  { label: "Profile", href: "/portal/student/profile" },
  { label: "Internships", href: "/portal/student/internships" },
  { label: "Applications", href: "/portal/student/applications" },
];

export const industryNav = [
  { label: "Dashboard", href: "/portal/industry" },
  { label: "Post Internship", href: "/portal/industry/postings" },
  { label: "Applications", href: "/portal/industry/applications" },
];

export const adminNav = [
  { label: "Dashboard", href: "/portal/super-admin" },
  { label: "Colleges", href: "/portal/super-admin/colleges" },
  { label: "Payments", href: "/portal/super-admin/payments" },
  { label: "Analytics", href: "/portal/super-admin/analytics" },
];

export const applicationTrend = [42, 58, 66, 73, 89, 104];
export const participationBars = [
  { label: "Semester 3", value: 64 },
  { label: "Semester 4", value: 78 },
  { label: "Semester 5", value: 91 },
];
export const categoryMix = [
  { label: "IT & Digital", value: 38, color: "#1e40af" },
  { label: "MSME & Industry", value: 27, color: "#10b981" },
  { label: "Banking & Finance", value: 19, color: "#f59e0b" },
  { label: "Research & Social", value: 16, color: "#7c3aed" },
];

export const partnerColleges = [
  {
    name: "Calicut Arts & Science College",
    status: "Active sharing partner",
    shareRule:
      "Receives public and selected-college listings for applied departments.",
  },
  {
    name: "Malabar Tech Campus",
    status: "Priority routing enabled",
    shareRule:
      "Shares verified demand and urgent seat alerts for approved programs.",
  },
  {
    name: "PSMO College",
    status: "Network anchor",
    shareRule:
      "Maintains collaboration rules without cross-tenant student exposure.",
  },
];

export const studentApplications = [
  {
    title: "Operations Analyst Intern",
    company: "North Kerala FinServe",
    status: "Faculty review",
    timeline: "Applied 12 March • Interview scheduled 25 March",
  },
  {
    title: "Community Research Fellow",
    company: "Coastal Development Forum",
    status: "Shortlisted",
    timeline: "Applied 8 March • Awaiting final industry confirmation",
  },
  {
    title: "Digital Support Intern",
    company: "Malabar Smart Systems",
    status: "Submitted",
    timeline: "Applied 15 March • Resume and cover note shared",
  },
];

export const industryApplicants = [
  {
    student: "Nivedya P.",
    college: "Calicut Arts & Science College",
    program: "BBA",
    status: "Shortlisted",
  },
  {
    student: "Fahim K.",
    college: "Malabar Tech Campus",
    program: "B.Com",
    status: "Faculty cleared",
  },
  {
    student: "Ardra M.",
    college: "PSMO College",
    program: "BA Economics",
    status: "New applicant",
  },
];

export const complianceChecklist = [
  "Semester eligibility checked before application submission.",
  "Internship duration thresholds validated by workflow rules.",
  "Private-industry and offer evidence captured for audits.",
  "Report milestones retained with archive-ready student records.",
];

export const archiveHighlights = [
  "Past internship records remain searchable by semester, department, and accreditation cycle.",
  "Archived students are excluded from active billing and new application actions.",
  "Certificates, reports, and evaluation summaries stay preserved for audits and placement evidence.",
];
