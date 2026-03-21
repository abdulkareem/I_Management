const studentActions = [
  "Browse approved internship opportunities",
  "Submit attendance, logbooks, and reports",
  "Track faculty approvals and compliance tasks",
];

export default function StudentPortalPage() {
  return (
    <main>
      <section className="panel section-block">
        <span className="badge">Student dashboard</span>
        <h1>Student internship workspace</h1>
        <p className="lead">
          Apply for internships, upload reports, track attendance, and monitor
          approvals through the same public PRISM website used by all other
          roles.
        </p>
        <div className="grid-3 top-gap">
          {studentActions.map((action) => (
            <article className="card" key={action}>
              <div className="label">Student task</div>
              <p className="detail">{action}</p>
            </article>
          ))}
        </div>
        <div className="cta-row top-gap">
          <a className="cta" href="/">
            ← Back to common homepage
          </a>
          <a className="ghost-cta" href="/portal/college">
            View college portal
          </a>
          <a className="ghost-cta" href="/portal/super-admin">
            View super admin portal
          </a>
        </div>
      </section>
    </main>
  );
}
