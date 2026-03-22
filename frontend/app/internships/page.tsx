import { publicInternships } from '../content';
import { PublicShell, SectionCard, SimpleGrid } from '../ui';

export default function InternshipsPage() {
  return (
    <PublicShell
      title="Explore approved internship opportunities"
      lead="Browse public-facing internship opportunities shared through InternSuite. Students will see listings relevant to their college and semester after login."
    >
      <SimpleGrid>
        {publicInternships.map((item) => (
          <article key={item.title + item.organization} className="card-surface listing-card">
            <span className="chip">{item.category}</span>
            <h3>{item.title}</h3>
            <p>{item.organization}</p>
            <div className="listing-meta">
              <span>{item.mode}</span>
              <span>{item.seats}</span>
            </div>
            <p>{item.deadline}</p>
            <a className="button secondary" href="/login/student">
              Student Login to Apply
            </a>
          </article>
        ))}
      </SimpleGrid>
      <SectionCard title="How visibility works" kicker="Controlled access">
        <p>
          Public listings can be explored by anyone, but full application access
          remains protected. Students can only apply through verified student
          accounts linked to their college.
        </p>
      </SectionCard>
    </PublicShell>
  );
}
