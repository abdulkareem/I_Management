import { collegeNav } from '../../../content';
import { DataTable, PortalShell, SectionCard } from '../../../ui';

export default function CollegeInternshipsPage() {
  return (
    <PortalShell
      role="College Panel"
      title="Internship listings"
      lead="Review listings, share approved opportunities, and assign students to the right internships while keeping role boundaries intact."
      nav={collegeNav}
      actions={[{ label: 'Assign Internship', href: '/portal/college/internships' }]}
    >
      <SectionCard title="Approved listings" kicker="View • Share • Assign">
        <DataTable
          columns={['Listing', 'Industry', 'Visibility', 'Seats', 'Action']}
          rows={[
            ['Digital Support Intern', 'Malabar Smart Systems', 'Public', '18', 'Share / Assign'],
            ['Operations Analyst Intern', 'North Kerala FinServe', 'Selected colleges', '12', 'Share / Assign'],
            ['Production Planning Intern', 'Kerala Agro Works', 'Public', '10', 'Share / Assign'],
          ]}
        />
      </SectionCard>
    </PortalShell>
  );
}
