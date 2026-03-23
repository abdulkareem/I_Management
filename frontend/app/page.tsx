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
      title="The internship platform colleges will actually be proud to launch"
      lead="InternSuite now blends modern SaaS aesthetics with practical identity orchestration: role-aware email discovery, OTP verification, dashboard routing, and lifecycle operations in one polished product."
    >
      <section className="hero-layout modern-hero-layout">
        <div className="hero-main card-surface hero-gradient-panel">
          <div className="hero-copy">
            <span className="eyebrow">Human-made SaaS experience</span>
            <h2>From first click to dashboard, every step feels intentional.</h2>
            <p>
              Whether a college admin, student, or industry partner clicks login or register, InternSuite first checks
              whether the email already exists, routes them intelligently, sends a six-digit OTP when needed, and keeps
              the journey beautifully simple.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="/auth?role=college">
                Start with email access
              </a>
              <a className="button secondary" href="/pricing">
                Explore pricing
              </a>
            </div>
          </div>

          <div className="hero-spotlight modern-spotlight">
            <div className="hero-kpi card-surface inset-card glass-card">
              <span className="chip">Experience snapshot</span>
              <ul className="bullet-list compact-bullets">
                {homepageOverview.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="saas-mockup card-surface">
              <div className="mockup-topbar">
                <span />
                <span />
                <span />
              </div>
              <div className="mockup-content">
                <div className="mockup-card active">
                  <strong>Email discovery</strong>
                  <p>Returning users are routed to the right login instantly.</p>
                </div>
                <div className="mockup-card">
                  <strong>OTP verification</strong>
                  <p>New accounts verify with a six-digit code before password setup.</p>
                </div>
                <div className="mockup-card accent">
                  <strong>Role dashboards</strong>
                  <p>Students, colleges, and industries each enter their own workspace.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="access-panel modern-access-panel">
          <div className="access-head">
            <span className="eyebrow">Jump in by role</span>
            <h2>One platform, three beautifully separated experiences.</h2>
            <p>Choose the workspace you belong to and let InternSuite decide the next step automatically.</p>
          </div>
          <div className="access-stack">
            {roleAccessCards.map((card) => (
              <article key={card.title} className="card-surface access-card access-card-modern">
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
        <SectionCard title="Why the new flow feels premium" kicker="Product thinking">
          <div className="card-list">
            {homepageJourney.map((item) => (
              <article key={item.title} className="mini-card info-card">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Capability stack" kicker="Platform depth">
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

      <SectionCard title="Modern authentication sequence" kicker="Login + registration logic">
        <div className="card-list auth-logic-grid">
          {authFlowCards.map((item) => (
            <article key={item.title} className="mini-card info-card flow-step-card">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="How the operating system unfolds" kicker="Lifecycle automation">
        <div className="card-list lifecycle-grid">
          {lifecycleSteps.map((item) => (
            <article key={item.title} className="mini-card info-card flow-step-card">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Simple annual pricing" kicker="For colleges">
        <PricingGrid plans={publicPlans} />
      </SectionCard>
    </PublicShell>
  );
}
