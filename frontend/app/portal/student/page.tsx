import { studentApplications, studentNav } from '../../content';
import { BulletList, PortalShell, SectionCard, SimpleGrid, StatGrid } from '../../ui';

const stats = [
  { label: 'Available internships', value: '24', detail: 'Approved opportunities visible for your college and semester.' },
  { label: 'My applications', value: '3', detail: 'Applications currently in review or shortlist stages.' },
  { label: 'Profile completion', value: '82%', detail: 'Resume, skills, and compliance details almost complete.' },
];

export default function StudentDashboardPage() {
  return (
    <PortalShell
      role="Student Panel"
      title="Student dashboard"
      lead="See available internships, follow application progress, and complete profile steps from a simple mobile-ready experience."
      nav={studentNav}
      actions={[
        { label: 'Apply Now', href: '/portal/student/internships' },
        { label: 'Update Profile', href: '/portal/student/profile', tone: 'secondary' },
        { label: 'Upload Resume', href: '/portal/student/profile', tone: 'secondary' },
      ]}
    >
      <StatGrid items={stats} />
      <section className="section-grid two-col">
        <SectionCard title="Application tracker" kicker="Current statuses">
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
        <SectionCard title="Student checklist" kicker="Before semester close">
          <BulletList
            items={[
              'Update your profile and core skills.',
              'Upload your latest resume.',
              'Complete report and certificate requirements on time.',
            ]}
          />
        </SectionCard>
      </section>
    </PortalShell>
  );
}
