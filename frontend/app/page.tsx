import {
  featureCards,
  howItWorks,
  landingStats,
  publicHighlights,
  publicPlans,
  roleAccessCards,
} from './content';
import { PricingGrid, PublicShell, SectionCard, SimpleGrid, StatGrid } from './ui';

export default function HomePage() {
  return (
    <PublicShell
      title="InternSuite – Internship Cloud ERP for Colleges"
      lead="A clean, public-facing SaaS platform for colleges to manage internship operations, student applications, industry collaboration, and semester-ready reporting without changing core university rules."
    >
      <section className="hero-grid">
        <article className="card-surface hero-card">
          <span className="eyebrow">Public SaaS platform</span>
          <h2>Launch internship operations with clarity, not dashboard clutter.</h2>
          <p>
            InternSuite helps colleges manage students, internship listings,
            compliance checkpoints, reports, and partner collaboration through a
            single mobile-first system.
          </p>
          <div className="action-row stacked-mobile">
            <a className="button primary" href="/signup/college">
              Register Your College
            </a>
            <a className="button secondary" href="/internships">
              Explore Internships
            </a>
          </div>
        </article>
        <article className="card-surface detail-stack">
          <h2>Why colleges choose InternSuite</h2>
          <ul className="bullet-list">
            {publicHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <StatGrid items={landingStats} />

      <section className="section-grid two-col">
        <SectionCard title="Features" kicker="Complete SaaS scope">
          <div className="card-list">
            {featureCards.map((item) => (
              <article key={item.title} className="mini-card">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="How it works" kicker="Simple navigation">
          <div className="step-list">
            {howItWorks.map((item) => (
              <article key={item.step} className="mini-card">
                <span className="step-index">{item.step}</span>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>

      <SectionCard title="Plans for colleges" kicker="Foundation & Growth only">
        <PricingGrid plans={publicPlans} />
      </SectionCard>

      <SimpleGrid>
        {roleAccessCards.map((card) => (
          <article key={card.title} className="card-surface role-card">
            <span className="eyebrow">{card.title}</span>
            <h3>{card.title} access</h3>
            <p>{card.detail}</p>
            <a className="button secondary" href={card.href}>
              {card.cta}
            </a>
          </article>
        ))}
      </SimpleGrid>
    </PublicShell>
  );
}
