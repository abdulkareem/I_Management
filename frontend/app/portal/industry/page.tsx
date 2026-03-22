import { industryNav } from '../../content';
import { BulletList, PortalShell, SectionCard, StatGrid } from '../../ui';

const stats = [
  { label: 'Posted internships', value: '14', detail: 'Live listings open for college review and student applications.' },
  { label: 'Applicants', value: '26', detail: 'Candidates currently visible based on application or assignment.' },
  { label: 'Shortlist ready', value: '8', detail: 'Candidates ready for interview or final review.' },
];

export default function IndustryDashboardPage() {
  return (
    <PortalShell
      role="Industry Panel"
      title="Industry dashboard"
      lead="Publish opportunities, manage applicants, and move shortlisted candidates forward without paying a platform subscription."
      nav={industryNav}
      actions={[
        { label: 'Post Internship', href: '/portal/industry/postings' },
        { label: 'Shortlist Candidate', href: '/portal/industry/applications', tone: 'secondary' },
        { label: 'Reject Application', href: '/portal/industry/applications', tone: 'secondary' },
      ]}
    >
      <StatGrid items={stats} />
      <section className="section-grid two-col">
        <SectionCard title="Posting checklist" kicker="Free industry access">
          <BulletList
            items={[
              'Choose public visibility or selected-college access.',
              'Define seats, mode, category, and application deadline.',
              'Upload MoU details when private-placement rules apply.',
            ]}
          />
        </SectionCard>
        <SectionCard title="Applicant visibility" kicker="Protected sharing">
          <BulletList
            items={[
              'Only applied or assigned students are visible.',
              'Unrelated student records remain hidden.',
              'College analytics and subscription details are never shared.',
            ]}
          />
        </SectionCard>
      </section>
    </PortalShell>
  );
}
