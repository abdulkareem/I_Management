import { costModel, pricingPlans, readinessChecklist } from '../../content';
import { PortalShell } from '../../ui';

const usageCards = [
  {
    title: 'Colleges onboarded',
    value: '48',
    description: 'Active paying institutions across the platform.',
  },
  {
    title: 'Active students',
    value: '9,420',
    description: 'Students currently counted inside semester billing windows.',
  },
  {
    title: 'Archived students',
    value: '24,800',
    description: 'Read-only historical records retained for reporting and audits.',
  },
  {
    title: 'Industry partners',
    value: '326',
    description: 'Free participation channel driving internship supply and market value.',
  },
];

export default function SuperAdminPortalPage() {
  return (
    <PortalShell
      badge="Super admin dashboard"
      title="Monitor profitability, tenant isolation, and archive growth"
      lead="The platform owner tracks plan fit, archive utilization, and operational readiness without turning the product into a complex enterprise maze."
    >
      <section className="stats stats-4 top-gap">
        {usageCards.map((card) => (
          <article className="card" key={card.title}>
            <div className="metric">{card.value}</div>
            <div className="label">{card.title}</div>
            <p className="detail">{card.description}</p>
          </article>
        ))}
      </section>

      <section className="grid-2 section-block">
        <article className="panel nested-panel">
          <div className="section-heading-row">
            <h2 className="section-title">Profitability guardrail</h2>
            <span className="table-highlight">5× target</span>
          </div>
          <div className="stack-list top-gap">
            {costModel.map((item) => (
              <article className="card" key={item.label}>
                <div className="metric small">{item.value}</div>
                <div className="label">{item.label}</div>
                <p className="detail">{item.detail}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel nested-panel">
          <div className="section-heading-row">
            <h2 className="section-title">Plan positioning</h2>
            <span className="table-highlight">Revenue model</span>
          </div>
          <div className="stack-list top-gap">
            {pricingPlans.map((plan) => (
              <article className="card" key={plan.name}>
                <strong>{plan.name}</strong>
                <div className="label">{plan.price}</div>
                <p className="detail">{plan.highlight}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="panel section-block nested-panel">
        <div className="section-heading-row">
          <h2 className="section-title">SaaS readiness checklist</h2>
          <span className="table-highlight">Go-live review</span>
        </div>
        <ul className="feature-list benefit-list top-gap">
          {readinessChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="cta-row top-gap">
        <a className="cta" href="/pricing">
          Review pricing strategy
        </a>
        <a className="ghost-cta" href="/">
          ← Back to landing page
        </a>
      </div>
    </PortalShell>
  );
}
