import {
  applicationTrend,
  archiveHighlights,
  categoryMix,
  partnerColleges,
  participationBars,
} from '../../content';
import { BarChart, LineChart, PieChart, PortalShell } from '../../ui';

const semesterCards = [
  {
    label: 'Active Semester Internships',
    value: '128',
    detail: 'Live opportunities mapped to Semester 4 and Semester 5 cycles.',
  },
  {
    label: 'Students in current billing',
    value: '486',
    detail: 'Only active semester students count toward subscription usage.',
  },
  {
    label: 'Industry partners this cycle',
    value: '38',
    detail: 'Industry remains free while colleges control access and approval.',
  },
  {
    label: 'Archive-ready students',
    value: '164',
    detail: 'Will move to read-only storage after semester closure.',
  },
];

const operationalActions = [
  'Review college-specific applications, mentor approvals, and duration validations.',
  'Recommend students to industry partners without exposing unrelated student records.',
  'Track archive usage before crossing the included retention allowance.',
  'Invite partner colleges for listing collaboration without sharing internal analytics.',
];

export default function CollegePortalPage() {
  return (
    <PortalShell
      badge="College dashboard"
      title="Run the active semester with billing clarity"
      lead="Your college workspace isolates student data, manages semester internship operations, and keeps completed students out of active billing once the semester closes."
    >
      <section className="stats stats-4 top-gap">
        {semesterCards.map((card) => (
          <article className="card" key={card.label}>
            <div className="metric">{card.value}</div>
            <div className="label">{card.label}</div>
            <p className="detail">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid-3 section-block">
        <LineChart values={applicationTrend} />
        <BarChart items={participationBars} />
        <PieChart items={categoryMix} />
      </section>

      <section className="grid-2 section-block">
        <article className="panel nested-panel">
          <div className="section-heading-row">
            <h2 className="section-title">Operational focus</h2>
            <span className="table-highlight">This semester</span>
          </div>
          <div className="stack-list top-gap">
            {operationalActions.map((item) => (
              <article className="card" key={item}>
                <p className="detail">{item}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel nested-panel">
          <div className="section-heading-row">
            <h2 className="section-title">Connected institutions</h2>
            <a className="ghost-cta inline-link" href="/portal/college/partners">
              Partner Colleges Page
            </a>
          </div>
          <div className="stack-list top-gap">
            {partnerColleges.map((college) => (
              <article className="card" key={college.name}>
                <strong>{college.name}</strong>
                <div className="label">{college.status}</div>
                <p className="detail">{college.shareRule}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="grid-2 section-block">
        <article className="panel nested-panel">
          <div className="section-heading-row">
            <h2 className="section-title">Past Internship Records</h2>
            <a className="ghost-cta inline-link" href="/portal/college/archive">
              Archive Page
            </a>
          </div>
          <ul className="feature-list benefit-list top-gap">
            {archiveHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel nested-panel">
          <div className="section-heading-row">
            <h2 className="section-title">Next actions</h2>
            <span className="table-highlight">Mobile-friendly queue</span>
          </div>
          <div className="action-pills top-gap">
            <span className="action-chip">Approve 23 pending applications</span>
            <span className="action-chip secondary">Archive 164 semester-complete students</span>
            <span className="action-chip">Renew 4 expiring MoUs</span>
            <span className="action-chip secondary">Invite 2 partner colleges</span>
          </div>
        </article>
      </section>

      <div className="cta-row top-gap">
        <a className="cta" href="/portal/student">
          Open student dashboard
        </a>
        <a className="ghost-cta" href="/pricing">
          Review plans and billing
        </a>
      </div>
    </PortalShell>
  );
}
