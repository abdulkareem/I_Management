import { collegeNav } from '../../../content';
import { DataTable, PortalShell, SectionCard } from '../../../ui';

export default function CollegeStudentsPage() {
  return (
    <PortalShell
      role="College Panel"
      title="Manage students"
      lead="Add, edit, remove, and monitor student records without losing semester context or compliance visibility."
      nav={collegeNav}
      actions={[{ label: 'Add Student', href: '/portal/college/students' }]}
    >
      <SectionCard title="Student roster" kicker="Current semester">
        <DataTable
          columns={['Student', 'Program', 'Department', 'Status', 'Action']}
          rows={[
            ['Aisha Kareem', 'BCA', 'Computer Science', 'Active', 'Edit / Remove'],
            ['Muhammed Rafi', 'BBA', 'Management', 'At risk', 'Edit / Remove'],
            ['Nimisha Jose', 'BSc', 'Physics', 'Ready to archive', 'Edit / Remove'],
            ['Shahin A', 'BA', 'Economics', 'Active', 'Edit / Remove'],
          ]}
        />
      </SectionCard>
    </PortalShell>
  );
}
