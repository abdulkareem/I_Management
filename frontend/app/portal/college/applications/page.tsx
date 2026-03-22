import { collegeNav } from '../../../content';
import { DataTable, PortalShell, SectionCard } from '../../../ui';

export default function CollegeApplicationsPage() {
  return (
    <PortalShell
      role="College Panel"
      title="Applications"
      lead="Track student applications, review statuses, and move candidates through approval and assignment steps."
      nav={collegeNav}
      actions={[{ label: 'View Applications', href: '/portal/college/applications' }]}
    >
      <SectionCard title="Student applications list" kicker="Review queue">
        <DataTable
          columns={['Student', 'Internship', 'Company', 'Status', 'Next step']}
          rows={[
            ['Aisha Kareem', 'Digital Support Intern', 'Malabar Smart Systems', 'Faculty review', 'Approve'],
            ['Muhammed Rafi', 'Operations Analyst Intern', 'North Kerala FinServe', 'Shortlisted', 'Schedule interview'],
            ['Shahin A', 'Community Research Fellow', 'Coastal Development Forum', 'Submitted', 'Verify documents'],
          ]}
        />
      </SectionCard>
    </PortalShell>
  );
}
