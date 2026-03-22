import { collegeNav } from '../../../content';
import { BulletList, PortalShell, SectionCard } from '../../../ui';

export default function CollegeSettingsPage() {
  return (
    <PortalShell
      role="College Panel"
      title="Settings"
      lead="Maintain your college profile, communication preferences, and subscription overview without exposing internal platform-owner controls."
      nav={collegeNav}
      actions={[{ label: 'Upgrade Plan', href: '/pricing' }]}
    >
      <section className="section-grid two-col">
        <SectionCard title="Profile" kicker="Institution details">
          <BulletList
            items={[
              'College profile and branding details',
              'Primary internship coordinator contact',
              'Department mapping and notification preferences',
            ]}
          />
        </SectionCard>
        <SectionCard title="Subscription status" kicker="Current plan">
          <BulletList
            items={[
              'Plan: Foundation',
              'Renewal date: 30 June 2026',
              'Active students in cycle: 486 of 500 included',
            ]}
          />
        </SectionCard>
      </section>
    </PortalShell>
  );
}
