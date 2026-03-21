const usageCards = [
  {
    title: "Colleges onboarded",
    value: "48",
    description: "Active institutions using the shared public entry website.",
  },
  {
    title: "Students tracked",
    value: "18,240",
    description: "Student data included in storage-based billing.",
  },
  {
    title: "Industries linked",
    value: "326",
    description:
      "Industry partners contributing operational and document storage.",
  },
  {
    title: "Billable storage",
    value: "412 GB",
    description: "Combined student records, industry data, and uploaded files.",
  },
];

const superAdminActions = [
  "Review static deployment status for Cloudflare Pages",
  "Track tenant memory usage and pricing metrics",
  "Verify onboarding progress across all colleges and partners",
];

export default function SuperAdminPortalPage() {
  return (
    <main>
      <section className="panel section-block">
        <span className="badge">Super admin dashboard</span>
        <h1>Platform billing and memory usage</h1>
        <p className="lead">
          Track per-college memory usage for students, industries, and uploaded
          documents so you can price each tenant based on actual storage
          consumption.
        </p>
        <div className="stats stats-4 top-gap">
          {usageCards.map((card) => (
            <article className="card" key={card.title}>
              <div className="metric">{card.value}</div>
              <div className="label">{card.title}</div>
              <p className="detail">{card.description}</p>
            </article>
          ))}
        </div>
        <div className="grid-3 top-gap">
          {superAdminActions.map((item) => (
            <article className="card" key={item}>
              <div className="label">Super admin action</div>
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
          <a className="ghost-cta" href="/portal/college">
            View college portal
          </a>
        </div>
      </section>
    </main>
  );
}
