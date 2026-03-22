import { partnerColleges } from '../../../content';
import { PortalShell } from '../../../ui';

export default function PartnerCollegesPage() {
  return (
    <PortalShell
      badge="Partner colleges"
      title="Connected Institutions"
      lead="Partner colleges can share internship opportunities and seat intelligence, but they never gain access to your student database or internal analytics."
    >
      <section className="grid-3 top-gap">
        {partnerColleges.map((college) => (
          <article className="card" key={college.name}>
            <strong>{college.name}</strong>
            <div className="label">{college.status}</div>
            <p className="detail">{college.shareRule}</p>
          </article>
        ))}
      </section>

      <section className="grid-2 section-block">
        <article className="panel nested-panel">
          <div className="section-heading-row">
            <h2 className="section-title">What can be shared</h2>
            <span className="table-highlight">Controlled sharing</span>
          </div>
          <ul className="feature-list benefit-list top-gap">
            <li>Public internship listings and selected partner-college opportunities.</li>
            <li>Approved seat availability and deadline alerts.</li>
            <li>MoU-backed collaboration signals between institutions.</li>
          </ul>
        </article>

        <article className="panel nested-panel">
          <div className="section-heading-row">
            <h2 className="section-title">What is never shared</h2>
            <span className="table-highlight">Hard boundary</span>
          </div>
          <ul className="feature-list benefit-list top-gap">
            <li>Student databases and personal records.</li>
            <li>Internal college analytics, billing, and archive intelligence.</li>
            <li>Unapplied student data for industry or external colleges.</li>
          </ul>
        </article>
      </section>

      <div className="cta-row top-gap">
        <a className="cta" href="/portal/college">
          Return to college dashboard
        </a>
        <a className="ghost-cta" href="/portal/industry">
          View industry panel
        </a>
      </div>
    </PortalShell>
  );
}
