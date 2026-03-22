import { publicInternships, studentNav } from '../../../content';
import { PortalShell, SimpleGrid } from '../../../ui';

export default function StudentInternshipsPage() {
  return (
    <PortalShell
      role="Student Panel"
      title="Internship listings"
      lead="Browse internships approved for your college and semester, then apply with a complete student profile."
      nav={studentNav}
      actions={[{ label: 'Apply Now', href: '/portal/student/internships' }]}
    >
      <SimpleGrid>
        {publicInternships.map((item) => (
          <article key={item.title} className="card-surface listing-card">
            <span className="chip">{item.category}</span>
            <h3>{item.title}</h3>
            <p>{item.organization}</p>
            <p>{item.deadline}</p>
            <a className="button primary" href="/portal/student/applications">
              Apply Now
            </a>
          </article>
        ))}
      </SimpleGrid>
    </PortalShell>
  );
}
