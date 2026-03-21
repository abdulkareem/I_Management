import { buildReportTemplate, getMinimumRequiredHours } from '@prism/compliance';

const reportTemplate = buildReportTemplate();

const providerCategories = [
  'Educational institutions',
  'Research labs',
  'Government institutions',
  'NGOs',
  'MSMEs and industries',
  'Banks and financial institutions',
  'IT and digital platforms',
  'Healthcare and wellness centers',
  'Media and cultural organizations',
  'Agriculture and environmental sectors',
];

const rolePortals = [
  {
    name: 'College dashboard',
    href: '/portal/college',
    audience: 'Principal, internship cell, faculty mentors',
    summary: 'Approve internships, monitor compliance, manage students, verify reports, and watch subscription usage.',
  },
  {
    name: 'Student dashboard',
    href: '/portal/student',
    audience: 'Registered students',
    summary: 'Apply for internships, upload logbooks, submit reports, track attendance, and receive approval alerts.',
  },
  {
    name: 'Industry dashboard',
    href: '/portal/industry',
    audience: 'Industry and enterprise partners',
    summary: 'Publish slots, sign MoUs, verify student attendance, upload certificates, and manage college partnerships.',
  },
  {
    name: 'Super admin dashboard',
    href: '/portal/super-admin',
    audience: 'Platform owner',
    summary: 'Monitor memory usage, pricing, onboarding, platform-wide registrations, billing, and storage-heavy tenants.',
  },
];

const headlineMetrics = [
  { label: 'Colleges registered', value: '48', detail: 'Multi-tenant onboarding with isolated data and billing.' },
  { label: 'Industries registered', value: '326', detail: 'Shared network mapped to college-specific MoUs.' },
  { label: 'Students registered', value: '18,240', detail: 'Students, logbooks, reports, attendance, and certificates.' },
  { label: 'Storage billable this month', value: '412 GB', detail: 'Documents, student records, and industry uploads.' },
];

const pricingPlans = [
  {
    tier: 'Launch',
    price: '₹12 / student / month',
    description: 'For colleges starting with digital internship governance.',
    inclusions: ['Up to 1,000 students', 'College dashboard', 'Student + industry portals', 'Basic compliance reports'],
  },
  {
    tier: 'Growth',
    price: '₹18 / student / month',
    description: 'For colleges that need workflow automation and stronger reporting.',
    inclusions: ['Attendance + logbooks', 'AI matching support', 'Payment tracking', 'Storage analytics for billing'],
  },
  {
    tier: 'Enterprise',
    price: 'Custom + storage overage',
    description: 'For large groups of colleges or franchise-style deployments.',
    inclusions: ['Dedicated onboarding', 'Advanced tenant billing', 'Custom integrations', 'Priority support + analytics'],
  },
];

const storageUsage = [
  {
    college: 'PSMO College',
    students: 1420,
    industries: 38,
    studentData: '18.6 GB',
    industryData: '6.8 GB',
    documents: '24.4 GB',
    total: '49.8 GB',
    billable: '₹5,976',
  },
  {
    college: 'Calicut Arts & Science College',
    students: 980,
    industries: 21,
    studentData: '12.4 GB',
    industryData: '4.1 GB',
    documents: '15.8 GB',
    total: '32.3 GB',
    billable: '₹3,876',
  },
  {
    college: 'Malabar Tech Campus',
    students: 1760,
    industries: 52,
    studentData: '24.2 GB',
    industryData: '9.5 GB',
    documents: '31.1 GB',
    total: '64.8 GB',
    billable: '₹7,776',
  },
];

const platformBenefits = [
  'Single public website for all personas with separate role-based dashboards.',
  'Cloudflare-ready frontend and Railway-ready backend separated into dedicated top-level directories.',
  'Super-admin storage accounting for students, industries, and uploaded documents to support usage-based pricing.',
  'Compliance guardrails for FYUGP, private-organization approval, and semester-safe internship execution.',
  'Shared industry network with college-specific relationship controls and document workflows.',
  'Built-in pricing narrative, onboarding journey, and conversion-focused landing page sections.',
];

export default function HomePage() {
  return (
    <main>
      <section className="hero hero-grid">
        <div className="panel hero-panel">
          <span className="badge">Separated deployment • Frontend on Cloudflare • Backend on Railway</span>
          <h1>One public PRISM website. Separate dashboards for colleges, students, industries, and super admin.</h1>
          <p className="lead">
            Launch a single platform entry point where every user logs in from the same homepage, while your codebase is
            clearly separated into dedicated <strong>frontend</strong> and <strong>backend</strong> directories for
            deployment and maintenance.
          </p>

          <div className="pill-row">
            <span className="pill">Common login + register entry</span>
            <span className="pill">College, student, industry, super-admin portals</span>
            <span className="pill">Storage-based billing insight</span>
            <span className="pill">Compliance + MoU governance</span>
          </div>

          <div className="cta-row">
            <a className="cta" href="/portal/super-admin">
              Open super admin overview →
            </a>
            <a className="ghost-cta" href="http://localhost:4000/docs">
              Backend API docs
            </a>
          </div>

          <div className="stats stats-4">
            {headlineMetrics.map((metric) => (
              <div className="card" key={metric.label}>
                <div className="metric">{metric.value}</div>
                <div className="label">{metric.label}</div>
                <p className="detail">{metric.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="panel spotlight-panel">
          <h2 className="section-title">Super admin billing snapshot</h2>
          <div className="kpi-list">
            <div className="kpi-item">
              <span>Monthly storage tracked</span>
              <strong>Students + industries + documents</strong>
            </div>
            <div className="kpi-item">
              <span>Default base fee</span>
              <strong>₹12 / student / month</strong>
            </div>
            <div className="kpi-item">
              <span>Storage overage</span>
              <strong>₹120 / GB / month</strong>
            </div>
            <div className="kpi-item">
              <span>Largest tenant</span>
              <strong>Malabar Tech Campus</strong>
            </div>
            <div className="kpi-item">
              <span>Compliance minimum hours</span>
              <strong>
                {getMinimumRequiredHours('BA')}h default / {getMinimumRequiredHours('BBA')}h BBA-BCA
              </strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="panel section-block">
        <div className="section-heading-row">
          <div>
            <h2 className="section-title">Shared entry website with role-based dashboard access</h2>
            <p className="lead compact">
              This homepage acts as the common entry point for colleges, students, industry partners, and the super
              admin. Each role can log in or register from one place and enter its own dashboard.
            </p>
          </div>
          <div className="action-pills">
            <span className="action-chip">Login</span>
            <span className="action-chip secondary">Register</span>
          </div>
        </div>

        <div className="grid-4 top-gap">
          {rolePortals.map((portal) => (
            <article className="portal-card" key={portal.name}>
              <div className="portal-audience">{portal.audience}</div>
              <h3>{portal.name}</h3>
              <p>{portal.summary}</p>
              <a href={portal.href}>Enter dashboard →</a>
            </article>
          ))}
        </div>
      </section>

      <section className="grid-2">
        <article className="panel section-block">
          <h2 className="section-title">Pricing strategy for colleges</h2>
          <div className="pricing-grid">
            {pricingPlans.map((plan) => (
              <div className="pricing-card" key={plan.tier}>
                <div className="pricing-tier">{plan.tier}</div>
                <div className="pricing-price">{plan.price}</div>
                <p className="detail">{plan.description}</p>
                <ul className="feature-list">
                  {plan.inclusions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </article>

        <article className="panel section-block">
          <h2 className="section-title">Why colleges choose PRISM</h2>
          <ul className="feature-list benefit-list">
            {platformBenefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel section-block">
        <div className="section-heading-row">
          <div>
            <h2 className="section-title">Storage usage dashboard for super admin billing</h2>
            <p className="lead compact">
              Usage includes registered colleges, their student data, associated industries, and all uploaded documents
              such as MoUs, certificates, reports, attendance files, and verification attachments.
            </p>
          </div>
          <span className="table-highlight">Bill by actual memory usage</span>
        </div>

        <div className="table-wrap top-gap">
          <table>
            <thead>
              <tr>
                <th>College</th>
                <th>Students</th>
                <th>Industries</th>
                <th>Student data</th>
                <th>Industry data</th>
                <th>Documents</th>
                <th>Total memory</th>
                <th>Estimated charge</th>
              </tr>
            </thead>
            <tbody>
              {storageUsage.map((row) => (
                <tr key={row.college}>
                  <td>{row.college}</td>
                  <td>{row.students}</td>
                  <td>{row.industries}</td>
                  <td>{row.studentData}</td>
                  <td>{row.industryData}</td>
                  <td>{row.documents}</td>
                  <td>{row.total}</td>
                  <td>{row.billable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-3">
        <article className="panel section-block">
          <h2 className="section-title">Compliance guardrails</h2>
          <ul className="feature-list">
            <li>Major, minor, interdisciplinary, and allied internship tagging.</li>
            <li>Own-college restriction and department approval workflow.</li>
            <li>Vacation-friendly scheduling without affecting academics.</li>
            <li>KSHEC external internship entry with approval controls.</li>
            <li>Mandatory host-industry supervisor and digital signatures.</li>
          </ul>
        </article>
        <article className="panel section-block">
          <h2 className="section-title">Industry categories supported</h2>
          <ul className="feature-list">
            {providerCategories.map((category) => (
              <li key={category}>{category}</li>
            ))}
          </ul>
        </article>
        <article className="panel section-block">
          <h2 className="section-title">Report template contract</h2>
          <ul className="feature-list">
            {reportTemplate.sections.map((section) => (
              <li key={section}>{section}</li>
            ))}
          </ul>
          <p className="detail">
            Supported submission languages: {reportTemplate.supportedLanguages.join(' and ')}.
          </p>
        </article>
      </section>

      <footer>
        PRISM now keeps deployment-ready code in dedicated <strong>frontend</strong> and <strong>backend</strong>{' '}
        directories while preserving the shared packages workspace for types, compliance, and database models.
      </footer>
    </main>
  );
}
