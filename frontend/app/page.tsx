import { homepageJourney, homepageOverview, roleAccessCards } from "./content";
import { PublicShell, SectionCard } from "./ui";

export default function HomePage() {
  return (
    <PublicShell
      title="InternSuite for colleges, students, and industry partners"
      lead="One internship ERP that keeps college operations organised, gives students a clean progress view, and lets industry partners coordinate hiring without friction."
    >
      <section className="hero-layout">
        <div className="hero-main card-surface">
          <div className="hero-copy">
            <span className="eyebrow">Internship ERP</span>
            <h2>
              Built for campus internship management with a cleaner public
              experience.
            </h2>
            <p>
              Colleges can manage access, approvals, reporting, and compliance
              from a single workspace while students and industry partners get
              focused dashboards made for their role.
            </p>
          </div>

          <div className="hero-spotlight">
            <div className="hero-kpi card-surface inset-card">
              <span className="chip">What the platform covers</span>
              <ul className="bullet-list compact-bullets">
                {homepageOverview.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="hero-actions">
              <a className="button primary" href="/signup/college">
                Register Your College
              </a>
              <a className="button secondary" href="/internships">
                View Internships
              </a>
            </div>
          </div>
        </div>

        <aside className="access-panel">
          <div className="access-head">
            <span className="eyebrow">Access points</span>
            <h2>Choose your workspace</h2>
          </div>
          <div className="access-stack">
            {roleAccessCards.map((card) => (
              <article key={card.title} className="card-surface access-card">
                <div>
                  <span className="eyebrow">{card.title}</span>
                  <h3>{card.title} Login</h3>
                  <p>{card.detail}</p>
                </div>
                <a className="button secondary" href={card.href}>
                  {card.cta}
                </a>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="section-grid two-col landing-detail-grid">
        <SectionCard
          title="Why this layout works"
          kicker="Focused and practical"
        >
          <div className="card-list">
            {homepageJourney.map((item) => (
              <article key={item.title} className="mini-card info-card">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Operational view" kicker="College-first control">
          <article className="overview-panel">
            <p>
              The platform keeps colleges in control of internship operations,
              provides a streamlined student journey, and gives industry
              partners a simple way to post opportunities and review applicants.
            </p>
            <div className="overview-grid">
              <div className="mini-card stat-mini">
                <strong>College workspace</strong>
                <p>
                  Student management, partner sharing, reporting, and compliance
                  oversight.
                </p>
              </div>
              <div className="mini-card stat-mini">
                <strong>Student workspace</strong>
                <p>
                  Applications, resume tracking, internship status, and semester
                  progress.
                </p>
              </div>
              <div className="mini-card stat-mini">
                <strong>Industry workspace</strong>
                <p>
                  Internship posting, applicant review, and shortlist
                  coordination at no cost.
                </p>
              </div>
            </div>
          </article>
        </SectionCard>
      </section>
    </PublicShell>
  );
}
