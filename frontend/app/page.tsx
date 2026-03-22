import {
  authFlowCards,
  erpCapabilityCards,
  homepageJourney,
  homepageOverview,
  lifecycleSteps,
  publicPlans,
  roleAccessCards,
} from './content';
import { PricingGrid, PublicShell, SectionCard } from './ui';

export default function HomePage() {
  return (
    <PublicShell
      title="InternSuite: production-ready internship ERP for colleges"
      lead="Multi-tenant onboarding, OTP + password authentication, workflow automation, PDF generation, and mobile-first SaaS delivery in one system."
    >
      <section className="hero-layout">
        <div className="hero-main card-surface">
          <div className="hero-copy">
            <h2>Paperless internship lifecycle automation from posting to marksheet.</h2>
            <p>
              InternSuite unifies college, student, industry, and admin operations with a scalable data model,
              verified onboarding, compliance-safe approvals, and auto-generated documents.
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
              <a className="button primary" href="/auth">
                Register / Login
              </a>
              <a className="button secondary" href="/pricing">
                View Pricing
              </a>
            </div>
          </div>
        </div>

        <aside className="access-panel">
          <div className="access-head">
            <span className="eyebrow">Role access</span>
            <h2>Choose your workspace</h2>
          </div>
          <div className="access-stack">
            {roleAccessCards.map((card) => (
              <article key={card.title} className="card-surface access-card">
                <div>
                  <span className="eyebrow">{card.title}</span>
                  <h3>{card.title}</h3>
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
        <SectionCard title="Why this architecture works" kicker="SaaS readiness">
          <div className="card-list">
            {homepageJourney.map((item) => (
              <article key={item.title} className="mini-card info-card">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Capability stack" kicker="Backend + frontend">
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

      <SectionCard title="Authentication flow" kicker="Email-first onboarding">
        <div className="card-list">
          {authFlowCards.map((item) => (
            <article key={item.title} className="mini-card info-card">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Automated internship lifecycle" kicker="Industry to marksheet">
        <div className="card-list">
          {lifecycleSteps.map((item) => (
            <article key={item.title} className="mini-card info-card">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="College pricing" kicker="Simple annual plans">
        <PricingGrid plans={publicPlans} />
      </SectionCard>
    </PublicShell>
  );
}
