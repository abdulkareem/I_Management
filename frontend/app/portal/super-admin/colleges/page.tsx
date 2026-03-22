import { adminNav } from '../../../content';
import { DataTable, PortalShell, SectionCard } from '../../../ui';

export default function SuperAdminCollegesPage() {
  return (
    <PortalShell
      role="Super Admin"
      title="Manage colleges"
      lead="Activate, deactivate, and delete college tenants from the private platform administration workspace."
      nav={adminNav}
      actions={[
        { label: 'Activate College', href: '/portal/super-admin/colleges' },
        { label: 'Deactivate College', href: '/portal/super-admin/colleges', tone: 'secondary' },
        { label: 'Delete College', href: '/portal/super-admin/colleges', tone: 'secondary' },
      ]}
    >
      <SectionCard title="College management" kicker="Private only">
        <DataTable
          columns={['College', 'Plan', 'Status', 'Students', 'Action']}
          rows={[
            ['PSMO College', 'Foundation', 'Active', '486', 'Activate / Deactivate / Delete'],
            ['Calicut Arts & Science College', 'Growth', 'Active', '920', 'Activate / Deactivate / Delete'],
            ['Malabar Tech Campus', 'Growth', 'Review required', '1,860', 'Activate / Deactivate / Delete'],
          ]}
        />
      </SectionCard>
    </PortalShell>
  );
}
