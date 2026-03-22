import { studentApplications } from '../../content';
import { PortalShell } from '../../ui';

const summaryCards = [
  {
    label: 'My Internship Applications',
    value: '3',
    detail: 'Applications across approved listings for this semester cycle.',
  },
  {
    label: 'Logbook completion',
    value: '82%',
    detail: 'Entries approved by faculty mentor and industry supervisor.',
  },
  {
    label: 'Compliance tasks left',
    value: '2',
    detail: 'Upload final report and verify certificate status before closure.',
  },
];

export default function StudentPortalPage() {
  return (
    <PortalShell
      badge="Student dashboard"
      title="Track every application and task in one place"
      lead="Students only see internships published for their college, internships they applied to, or assignments made by the college internship cell."
    >
      <section className="grid-3 top-gap">
        {summaryCards.map((card) => (
          <article className="card" key={card.label}>
            <div className="metric">{card.value}</div>
            <div className="label">{card.label}</div>
            <p className="detail">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="panel section-block nested-panel">
        <div className="section-heading-row">
          <h2 className="section-title">My Internship Applications</h2>
          <span className="table-highlight">Semester 5 cycle</span>
        </div>
        <div className="stack-list top-gap">
          {studentApplications.map((item) => (
            <article className="card" key={`${item.title}-${item.company}`}>
              <strong>{item.title}</strong>
              <div className="label">{item.company}</div>
              <p className="detail">{item.status}</p>
              <p className="detail">{item.timeline}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid-2 section-block">
        <article className="panel nested-panel">
          <div className="section-heading-row">
            <h2 className="section-title">Student workflow</h2>
            <span className="table-highlight">Protected access</span>
          </div>
          <ul className="feature-list benefit-list top-gap">
            <li>Browse approved internships for your college and semester only.</li>
            <li>Submit attendance, logbooks, reports, and certificate requests.</li>
            <li>Track faculty review, department approval, and industry status in one timeline.</li>
          </ul>
        </article>

        <article className="panel nested-panel">
          <div className="section-heading-row">
            <h2 className="section-title">Semester alert</h2>
            <span className="table-highlight">Archive rule</span>
          </div>
          <p className="detail top-gap">
            When your semester cycle closes, your completed internship record becomes read-only. It stays available for report history and evaluation review, but it is no longer counted in the college’s active billing.
          </p>
        </article>
      </section>

      <div className="cta-row top-gap">
        <a className="cta" href="/">
          Explore public opportunities
        </a>
        <a className="ghost-cta" href="/portal/college">
          College dashboard
        </a>
      </div>
    </PortalShell>
  );
}
