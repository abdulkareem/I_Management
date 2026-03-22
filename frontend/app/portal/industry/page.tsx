import { industryPostingChecklist } from '../../content';
import { PortalShell } from '../../ui';

const postingCards = [
  {
    label: 'Post Internship Opportunity',
    value: 'New listing',
    detail: 'Publish a role for all colleges or only your selected partner institutions.',
  },
  {
    label: 'Visible colleges',
    value: '12',
    detail: 'Selected colleges can review and recommend students for matching positions.',
  },
  {
    label: 'Applications to review',
    value: '26',
    detail: 'Only applied or assigned students become visible to your team.',
  },
];

export default function IndustryPortalPage() {
  return (
    <PortalShell
      badge="Industry panel"
      title="Post internship opportunities for colleges at zero subscription cost"
      lead="Industry partners join for free, publish roles, choose visibility, and interact only with students who applied or were recommended by an authorized college."
    >
      <section className="grid-3 top-gap">
        {postingCards.map((card) => (
          <article className="card" key={card.label}>
            <div className="metric small">{card.value}</div>
            <div className="label">{card.label}</div>
            <p className="detail">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid-2 section-block">
        <article className="panel nested-panel">
          <div className="section-heading-row">
            <h2 className="section-title">Post Internship Opportunity</h2>
            <span className="table-highlight">Free industry access</span>
          </div>
          <div className="stack-list top-gap">
            {industryPostingChecklist.map((item) => (
              <article className="card" key={item}>
                <p className="detail">{item}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel nested-panel">
          <div className="section-heading-row">
            <h2 className="section-title">Controlled data sharing</h2>
            <span className="table-highlight">Strict boundaries</span>
          </div>
          <ul className="feature-list benefit-list top-gap">
            <li>Industry cannot browse college student databases.</li>
            <li>Industry gets student visibility only after application, recommendation, or assignment.</li>
            <li>College internal analytics and unrelated student records remain private.</li>
          </ul>
        </article>
      </section>

      <div className="cta-row top-gap">
        <a className="cta" href="/portal/college">
          View college operations
        </a>
        <a className="ghost-cta" href="/">
          ← Back to landing page
        </a>
      </div>
    </PortalShell>
  );
}
