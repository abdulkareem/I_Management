const usageCards = [
  { title: 'Colleges onboarded', value: '48', description: 'Active institutions using the shared public entry website.' },
  { title: 'Students tracked', value: '18,240', description: 'Student data included in storage-based billing.' },
  { title: 'Industries linked', value: '326', description: 'Industry partners contributing operational and document storage.' },
  { title: 'Billable storage', value: '412 GB', description: 'Combined student records, industry data, and uploaded files.' },
];

export default function SuperAdminPortalPage() {
  return (
    <main>
      <section className="panel section-block">
        <span className="badge">Super admin dashboard</span>
        <h1>Platform billing and memory usage</h1>
        <p className="lead">
          Track per-college memory usage for students, industries, and uploaded documents so you can price each tenant
          based on actual storage consumption.
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
        <div className="cta-row top-gap">
          <a className="cta" href="/">
            ← Back to common homepage
          </a>
          <a className="ghost-cta" href="http://localhost:4000/api/super-admin/storage-usage">
            View backend storage API
          </a>
        </div>
      </section>
    </main>
  );
}
