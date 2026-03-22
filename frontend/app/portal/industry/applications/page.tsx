import { industryNav } from '../../../content';
import { DataTable, PortalShell, SectionCard } from '../../../ui';

export default function IndustryApplicationsPage() {
  return (
    <PortalShell
      role="Industry Panel"
      title="Manage applications"
      lead="Review applicants, shortlist candidates, and reject applications with clear next-step actions."
      nav={industryNav}
      actions={[
        { label: 'Shortlist Candidate', href: '/portal/industry/applications' },
        { label: 'Reject Application', href: '/portal/industry/applications', tone: 'secondary' },
      ]}
    >
      <SectionCard title="Applicants" kicker="Manage applications">
        <DataTable
          columns={['Candidate', 'Role', 'College', 'Status', 'Action']}
          rows={[
            ['Aisha Kareem', 'Digital Support Intern', 'PSMO College', 'Ready for review', 'Shortlist / Reject'],
            ['Muhammed Rafi', 'Operations Analyst Intern', 'Calicut Arts & Science College', 'Interview pending', 'Shortlist / Reject'],
            ['Nimisha Jose', 'Community Research Fellow', 'Malabar Tech Campus', 'New application', 'Shortlist / Reject'],
          ]}
        />
      </SectionCard>
    </PortalShell>
  );
}
