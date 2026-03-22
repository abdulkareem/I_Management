export const navLinks = [
  { label: "Pricing", href: "/pricing" },
  { label: "College dashboard", href: "/portal/college" },
  { label: "Student dashboard", href: "/portal/student" },
  { label: "Industry panel", href: "/portal/industry" },
];

export const heroStats = [
  {
    label: "Active students per semester",
    value: "500–2,000",
    detail:
      "Billing counts only active semester students, not historical archives.",
  },
  {
    label: "Archive retention included",
    value: "2,000+",
    detail:
      "Base plans include read-only historical storage for accreditation and audits.",
  },
  {
    label: "Average annual fee",
    value: "₹22k–₹75k",
    detail:
      "Simple college subscription with free student and industry participation.",
  },
  {
    label: "Infra efficiency target",
    value: "5×+",
    detail:
      "Growth and higher plans are priced to preserve healthy SaaS margins.",
  },
];

export const platformPillars = [
  "Only colleges pay; industry joins free to increase opportunity supply.",
  "Each internship belongs to one semester cycle and closes into a bill-free archive.",
  "Logical multi-tenancy keeps college data isolated while internship listings stay shareable.",
  "Existing FYUGP and university validations remain enforced by the compliance engine.",
];

export const pricingPlans = [
  {
    name: "Foundation",
    price: "₹22,000 / year",
    audience: "Single college launching internship digitization",
    students: "Up to 500 active students / semester",
    archive: "2,000 archived students included",
    support: "Standard onboarding and support",
    addOn: "₹15 per extra active student / semester",
    archiveAddOn: "₹2,000 per extra 500 archived students / year",
    highlight:
      "Best for arts, science, and autonomous colleges starting SaaS adoption.",
  },
  {
    name: "Growth",
    price: "₹50,000 / year",
    audience: "Colleges with scale, analytics, and multiple departments",
    students: "Up to 2,000 active students / semester",
    archive: "6,000 archived students included",
    support: "Priority support and review calls",
    addOn: "₹12 per extra active student / semester",
    archiveAddOn: "₹1,800 per extra 500 archived students / year",
    highlight:
      "Designed to hold a 5× gross margin even near 2,000 active students.",
  },
  {
    name: "Statewide",
    price: "₹75,000+ / year",
    audience: "College groups, consortia, or state-wide missions",
    students: "Up to 5,000 active students / semester",
    archive: "20,000 archived students included",
    support: "Dedicated success manager and SLA",
    addOn: "₹10 per extra active student / semester",
    archiveAddOn: "₹1,500 per extra 500 archived students / year",
    highlight:
      "Built for district networks, university groups, and policy-backed expansion programs.",
  },
];

export const costModel = [
  {
    label: "Active student cost",
    value: "≈ ₹8.4 / semester",
    detail:
      "Covers Railway compute, PostgreSQL usage, routine backups, and workflow reserve.",
  },
  {
    label: "Archived student cost",
    value: "≈ ₹0.72 / year",
    detail:
      "Assumes compressed documents, read-only access, and essential metadata storage.",
  },
  {
    label: "500 active student college",
    value: "≈ ₹4.3k infra / year",
    detail:
      "Foundation pricing is kept above the 5× profitability floor for small colleges.",
  },
  {
    label: "2,000 active student college",
    value: "≈ ₹9.8k infra / year",
    detail:
      "Growth-plus pricing keeps 5× profitability intact at higher utilization.",
  },
];

export const lifecycleSteps = [
  {
    title: "1. Semester opens",
    detail:
      "College activates a semester cycle, imports active students, and publishes eligible opportunities by department and program.",
  },
  {
    title: "2. Internship runs",
    detail:
      "Students apply, mentors review, industry confirms, and compliance validations continue through attendance, logbook, and report stages.",
  },
  {
    title: "3. Semester closes",
    detail:
      "Completed students become archive-ready, documents are compressed, and their records become read-only.",
  },
  {
    title: "4. Archive retained",
    detail:
      "Archived data stays searchable for audits, NAAC/NBA evidence, and placement history while excluded from active billing.",
  },
];

export const partnerColleges = [
  {
    name: "Calicut Arts & Science College",
    status: "Active partner",
    shareRule: "Can receive public and partner-routed listings only",
  },
  {
    name: "Malabar Tech Campus",
    status: "Priority partner",
    shareRule: "Can exchange verified internship demand and seat alerts",
  },
  {
    name: "PSMO College",
    status: "Anchor institution",
    shareRule:
      "Operates the shared industry network without exposing student records",
  },
];

export const applicationTrend = [42, 58, 66, 73, 89, 104];
export const participationBars = [
  { label: "Semester 3", value: 64 },
  { label: "Semester 4", value: 78 },
  { label: "Semester 5", value: 91 },
];
export const categoryMix = [
  { label: "IT & Digital", value: 38, color: "#1E3A8A" },
  { label: "MSME & Industry", value: 29, color: "#10B981" },
  { label: "Banking & Finance", value: 18, color: "#F59E0B" },
  { label: "Research & Social", value: 15, color: "#7C3AED" },
];

export const studentApplications = [
  {
    title: "Operations Analyst Intern",
    company: "Kozhikode Agro Systems",
    status: "Faculty review",
    timeline: "Applied 12 Mar • Interview scheduled 25 Mar",
  },
  {
    title: "Community Research Fellow",
    company: "Malabar Social Lab",
    status: "Shortlisted",
    timeline: "Applied 08 Mar • Awaiting industry confirmation",
  },
  {
    title: "Digital Support Intern",
    company: "North Kerala FinServe",
    status: "Submitted",
    timeline: "Application complete • Documents verified",
  },
];

export const industryPostingChecklist = [
  "Choose public visibility or selected colleges only.",
  "Define seats, stipend, mode, department preference, and semester preference.",
  "Upload or renew MoU before assigning private-organization placements.",
  "Access student profiles only after application or college recommendation.",
];

export const archiveHighlights = [
  "Past internship records remain searchable by semester, department, and accreditation year.",
  "Archived students are excluded from active billing and student login actions.",
  "Certificates, report summaries, and evaluation totals stay preserved in compressed form.",
];

export const readinessChecklist = [
  "Separate JWT audiences for college, student, industry, and super admin",
  "Tenant-scoped queries on every student and workflow table",
  "Semester cycle automation for opening, closure, and archival",
  "Archive compression policy and add-on monetization",
  "PWA installability, mobile-first navigation, and low-bandwidth pages",
  "Indexing for collegeId + semesterCycleId + workflowState hotspots",
  "Audit logging for approvals, compliance exceptions, and archive actions",
  "Production monitoring for API latency, failed jobs, and storage growth",
];
