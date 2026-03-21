const collegeResponsibilities = [
  "Approve internship workflows and compliance exceptions",
  "Monitor student submissions and mentor reviews",
  "Track subscription and storage usage for the institution",
];

export default function CollegePortalPage() {
  return (
    <main>
      <section className="panel section-block">
        <span className="badge">College dashboard</span>
        <h1>College operations portal</h1>
        <p className="lead">
          Manage registered students, approve internship workflows, monitor
          compliance exceptions, and review tenant storage and billing for your
          institution.
        </p>
        <div className="grid-3 top-gap">
          {collegeResponsibilities.map((item) => (
            <article className="card" key={item}>
              <div className="label">Operations focus</div>
              <p className="detail">{item}</p>
            </article>
          ))}
        </div>
        <div className="cta-row top-gap">
          <a className="cta" href="/">
            ← Back to common homepage
          </a>
          <a className="ghost-cta" href="/portal/student">
            View student portal
          </a>
          <a className="ghost-cta" href="/portal/super-admin">
            View super admin portal
          </a>
        </div>
      </section>
    </main>
  );
}
