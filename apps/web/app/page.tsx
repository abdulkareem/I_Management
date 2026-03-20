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

const roles = [
  'Principal (Chairperson)',
  'Internship Coordinator',
  'Department Coordinators',
  'Faculty Mentors',
  'Industry Supervisors',
];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="panel">
          <span className="badge">Installable SaaS PWA • Cloudflare Pages + Railway</span>
          <h1>PRISM – PSMO Rural Internship &amp; Skill Mission</h1>
          <p className="lead">
            A production-ready multi-tenant internship management platform for colleges that need strict University of
            Calicut FYUGP compliance, shared industry partnerships, digital logbooks, attendance, MoUs, evaluations,
            AI-assisted matching, payments, and submission governance.
          </p>
          <div className="pill-row">
            <span className="pill">Multiple colleges, one industry network</span>
            <span className="pill">Semester 1–5 validation</span>
            <span className="pill">Private org + MoU enforcement</span>
            <span className="pill">CCA 15 / ESE 35 / Total 50</span>
          </div>
          <a className="cta" href="/api/docs">
            View API blueprint →
          </a>
          <div className="stats">
            <div className="card">
              <div className="metric">₹5</div>
              <div className="label">Default SaaS pricing per student / month</div>
            </div>
            <div className="card">
              <div className="metric">{getMinimumRequiredHours('BA')}h</div>
              <div className="label">Default minimum internship hours</div>
            </div>
            <div className="card">
              <div className="metric">{getMinimumRequiredHours('BBA')}h</div>
              <div className="label">BBA/BCA internship hours per internship</div>
            </div>
          </div>
        </div>

        <aside className="panel">
          <h2 className="section-title">Executive Control Tower</h2>
          <div className="kpi-list">
            <div className="kpi-item"><span>Super admin</span><strong>abdulkareem@psmocollege.ac.in</strong></div>
            <div className="kpi-item"><span>Payments</span><strong>₹500 internal / ₹1000 external</strong></div>
            <div className="kpi-item"><span>WhatsApp alerts</span><strong>OTP • approvals • reminders</strong></div>
            <div className="kpi-item"><span>Host validation</span><strong>10+ years or linked partner</strong></div>
            <div className="kpi-item"><span>Report submission</span><strong>Before Semester 6</strong></div>
          </div>
        </aside>
      </section>

      <section className="grid-3">
        <article className="panel">
          <h2 className="section-title">Compliance guardrails</h2>
          <ul className="feature-list">
            <li>Major, minor, interdisciplinary, and allied internship tagging.</li>
            <li>Own-college restriction and department approval workflow.</li>
            <li>Vacation-friendly scheduling without affecting academics.</li>
            <li>KSHEC external internship entry with approval controls.</li>
            <li>Mandatory host-industry supervisor and digital signatures.</li>
          </ul>
        </article>
        <article className="panel">
          <h2 className="section-title">Industry network</h2>
          <ul className="feature-list">
            {providerCategories.map((category) => (
              <li key={category}>{category}</li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <h2 className="section-title">Internship cell mapping</h2>
          <ul className="feature-list">
            {roles.map((role) => (
              <li key={role}>{role}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid-2">
        <article className="panel">
          <h2 className="section-title">Academic workflow</h2>
          <div className="timeline">
            <div><strong>1.</strong> Student application and AI-guided matching.</div>
            <div><strong>2.</strong> Department council review + private-organization MoU validation.</div>
            <div><strong>3.</strong> Faculty/coordinator verification, attendance, and logbook tracking.</div>
            <div><strong>4.</strong> Report, certificate, work register, and marksheet generation before semester 6.</div>
          </div>
        </article>

        <article className="panel">
          <h2 className="section-title">Report template contract</h2>
          <ul className="feature-list">
            {reportTemplate.sections.map((section) => (
              <li key={section}>{section}</li>
            ))}
          </ul>
          <p className="lead">
            Supported submission languages: {reportTemplate.supportedLanguages.join(' and ')}. Daily logbooks, host
            approvals, attendance sheets, and printable PDF exports are designed into the platform contract.
          </p>
        </article>
      </section>

      <section className="grid-3">
        <article className="panel">
          <h2 className="section-title">AI matching</h2>
          <p className="lead">
            Match students to internships using department affinity, skills, preferred sectors, distance, and historical
            performance.
          </p>
        </article>
        <article className="panel">
          <h2 className="section-title">Auto allocation</h2>
          <p className="lead">
            Allocate seats transparently by rank score and student preference while respecting seat caps per internship.
          </p>
        </article>
        <article className="panel">
          <h2 className="section-title">Multi-tenant reporting</h2>
          <p className="lead">
            Consolidated college analytics across internships, attendance, compliance exceptions, payments, and marks.
          </p>
        </article>
      </section>

      <footer>
        PRISM is designed for Cloudflare Pages, Railway, PostgreSQL, Prisma, and a GitHub monorepo deployment model.
      </footer>
    </main>
  );
}
