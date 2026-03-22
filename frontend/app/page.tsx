import {
  buildReportTemplate,
  getMinimumRequiredHours,
} from "@prism/compliance";
import {
  costModel,
  heroStats,
  lifecycleSteps,
  navLinks,
  platformPillars,
  pricingPlans,
  readinessChecklist,
} from "./content";

const reportTemplate = buildReportTemplate();
const minimumHours = getMinimumRequiredHours("BCA");

export default function HomePage() {
  return (
    <main>
      <header className="panel top-nav">
        <div>
          <span className="badge">Internship Cloud ERP for Colleges</span>
          <p className="lead compact nav-copy">
            A mobile-first, semester-based internship ERP where colleges are the
            only paying customers and industry participation stays free.
          </p>
        </div>
        <nav className="nav-links" aria-label="Primary navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      <section className="hero hero-grid">
        <div className="panel hero-panel spotlight-panel">
          <span className="badge">Built for simple college SaaS rollout</span>
          <h1>
            Manage every internship semester without turning history into
            billing waste.
          </h1>
          <p className="lead">
            Internship Cloud ERP helps colleges run semester-based internship
            operations, isolate student data by institution, collaborate with
            free industry partners, and automatically move completed students
            into a low-cost archive after each cycle.
          </p>

          <div className="pill-row">
            <span className="pill">Only colleges pay</span>
            <span className="pill">Industry access stays free</span>
            <span className="pill">Semester lifecycle + archive billing</span>
            <span className="pill">PWA-ready mobile UX</span>
          </div>

          <div className="cta-row">
            <a className="cta" href="/pricing">
              Register Your College →
            </a>
            <a className="ghost-cta" href="/portal/industry">
              Explore industry panel
            </a>
          </div>
        </div>

        <aside className="panel">
          <div className="section-heading-row">
            <h2 className="section-title">Why this model wins</h2>
            <span className="table-highlight">Founder-first SaaS</span>
          </div>
          <div className="kpi-list">
            {platformPillars.map((item) => (
              <div className="kpi-item" key={item}>
                <strong>✓</strong>
                <span className="detail">{item}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="stats stats-4 section-block">
        {heroStats.map((stat) => (
          <article className="card" key={stat.label}>
            <div className="metric">{stat.value}</div>
            <div className="label">{stat.label}</div>
            <p className="detail">{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid-2 section-block">
        <article className="panel">
          <div className="section-heading-row">
            <h2 className="section-title">Semester lifecycle design</h2>
            <span className="table-highlight">Archive-aware</span>
          </div>
          <div className="stack-list">
            {lifecycleSteps.map((step) => (
              <article className="card" key={step.title}>
                <strong>{step.title}</strong>
                <p className="detail">{step.detail}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="section-heading-row">
            <h2 className="section-title">Cost and pricing guardrails</h2>
            <span className="table-highlight">5× margin driven</span>
          </div>
          <div className="stack-list">
            {costModel.map((item) => (
              <article className="card" key={item.label}>
                <div className="metric small">{item.value}</div>
                <div className="label">{item.label}</div>
                <p className="detail">{item.detail}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="panel section-block">
        <div className="section-heading-row">
          <h2 className="section-title">College plans</h2>
          <a className="ghost-cta inline-link" href="/pricing">
            Compare Plans
          </a>
        </div>
        <div className="pricing-grid top-gap">
          {pricingPlans.map((plan) => (
            <article className="pricing-card" key={plan.name}>
              <div className="pricing-tier">{plan.name}</div>
              <div className="pricing-price">{plan.price}</div>
              <p className="detail">{plan.audience}</p>
              <ul className="feature-list">
                <li>{plan.students}</li>
                <li>{plan.archive}</li>
                <li>{plan.support}</li>
                <li>{plan.addOn}</li>
                <li>{plan.archiveAddOn}</li>
              </ul>
              <p className="detail top-gap">{plan.highlight}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid-2 section-block">
        <article className="panel">
          <div className="section-heading-row">
            <h2 className="section-title">University rules preserved</h2>
            <span className="table-highlight">No logic breakage</span>
          </div>
          <ul className="feature-list benefit-list">
            <li>
              Internship hours remain validated, including {minimumHours} hours
              for BCA/BBA programs.
            </li>
            <li>
              Private organization checks, MoU rules, own-college restriction,
              and department approvals remain enforced.
            </li>
            <li>
              Report templates still support{" "}
              {reportTemplate.supportedLanguages.join(" and ")} submissions
              before {reportTemplate.submissionDeadline}.
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="section-heading-row">
            <h2 className="section-title">SaaS readiness checklist</h2>
            <span className="table-highlight">Production focused</span>
          </div>
          <ul className="feature-list benefit-list">
            {readinessChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <footer>
        Internship Cloud ERP is designed for state-wide college rollout: simple
        pricing, isolated student data, archive-aware billing, and mobile-first
        execution.
      </footer>
    </main>
  );
}
