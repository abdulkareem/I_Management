import {
  applicationTrend,
  archiveHighlights,
  categoryMix,
  collegeNav,
  participationBars,
  partnerColleges,
} from '../../content';
import { BarChart, BulletList, LineChart, PieChart, PortalShell, SectionCard, SimpleGrid, StatGrid } from '../../ui';

const stats = [
  { label: 'Active internships', value: '128', detail: 'Live opportunities approved for the current semester cycle.' },
  { label: 'Student applications', value: '342', detail: 'Applications awaiting review, assignment, or industry action.' },
  { label: 'Students managed', value: '486', detail: 'Students currently active in this college subscription period.' },
  { label: 'Partner colleges', value: '3', detail: 'Connected institutions sharing approved internship visibility.' },
];

export default function CollegeDashboardPage() {
  return (
    <PortalShell
      role="College Panel"
      title="College dashboard"
      lead="Manage students, assignments, applications, reports, and subscription health from a clear semester-focused workspace."
      nav={collegeNav}
      actions={[
        { label: 'Add Student', href: '/portal/college/students' },
        { label: 'Assign Internship', href: '/portal/college/internships', tone: 'secondary' },
        { label: 'View Applications', href: '/portal/college/applications', tone: 'secondary' },
        { label: 'Upgrade Plan', href: '/pricing', tone: 'secondary' },
      ]}
    >
      <StatGrid items={stats} />
      <section className="chart-grid">
        <LineChart values={applicationTrend} />
        <BarChart items={participationBars} />
        <PieChart items={categoryMix} />
      </section>
      <section className="section-grid two-col">
        <SectionCard title="Quick operational focus" kicker="This week">
          <BulletList
            items={[
              'Approve pending internship applications and mentor reviews.',
              'Share verified listings with partner colleges.',
              'Track semester completion and archive readiness.',
              'Monitor subscription usage before the active student cap is reached.',
            ]}
          />
        </SectionCard>
        <SectionCard title="Partner colleges" kicker="Controlled sharing">
          <div className="card-list compact-list">
            {partnerColleges.map((college) => (
              <article key={college.name} className="mini-card">
                <strong>{college.name}</strong>
                <p>{college.status}</p>
                <p>{college.shareRule}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>
      <SectionCard title="Archive readiness" kicker="Retention overview">
        <BulletList items={archiveHighlights} />
      </SectionCard>
    </PortalShell>
  );
}
