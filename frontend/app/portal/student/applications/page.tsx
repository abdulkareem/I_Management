import { studentApplications, studentNav } from '../../../content';
import { PortalShell, SectionCard } from '../../../ui';

export default function StudentApplicationsPage() {
  return (
    <PortalShell
      role="Student Panel"
      title="Application tracker"
      lead="Monitor each application through review, shortlist, interview, and final decision states."
      nav={studentNav}
    >
      <SectionCard title="My applications" kicker="Status tracking">
        <div className="card-list compact-list">
          {studentApplications.map((item) => (
            <article key={item.title} className="mini-card">
              <strong>{item.title}</strong>
              <p>{item.company}</p>
              <p>{item.status}</p>
              <p>{item.timeline}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </PortalShell>
  );
}
