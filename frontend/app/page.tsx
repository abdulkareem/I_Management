import {
  erpCapabilityCards,
  homepageJourney,
  homepageOverview,
  lifecycleSteps,
  roleAccessCards,
} from './content';
import { PublicShell, SectionCard } from './ui';

export default function HomePage() {
  return (
    <PublicShell
      title="InternSuite for colleges, students, and industry partners"
      lead="Verified identity, automated documents, tenant-safe storage, and full internship lifecycle control in one mobile-first ERP."
    >
      <section className="hero-layout">
        <div className="hero-main card-surface">
          <div className="hero-copy">
            <h2>Production-ready internship ERP for the full campus lifecycle.</h2>
            <p>
              InternSuite now connects identity verification, college approvals,
              MoU generation, student applications, attendance review, and final
              marksheet publishing in one deployment-stable platform.
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
        <SectionCard title="Why this layout works" kicker="Focused and practical">
          <div className="card-list">
            {homepageJourney.map((item) => (
              <article key={item.title} className="mini-card info-card">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="ERP capability stack" kicker="Production-ready modules">
          <div className="card-list">
            {erpCapabilityCards.map((item) => (
              <article key={item.title} className="mini-card info-card">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>

      <SectionCard title="Automated lifecycle" kicker="Industry to marksheet">
        <div className="card-list">
          {lifecycleSteps.map((item) => (
            <article key={item.title} className="mini-card info-card">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </PublicShell>
  );
}
