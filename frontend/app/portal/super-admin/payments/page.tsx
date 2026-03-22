import { adminNav } from '../../../content';
import { DataTable, PortalShell, SectionCard } from '../../../ui';

export default function SuperAdminPaymentsPage() {
  return (
    <PortalShell
      role="Super Admin"
      title="Payment monitoring"
      lead="Track subscription invoices, renewals, and payment status for college accounts from the private administration area."
      nav={adminNav}
      actions={[{ label: 'View Payment Status', href: '/portal/super-admin/payments' }]}
    >
      <SectionCard title="Payment status" kicker="Finance overview">
        <DataTable
          columns={['College', 'Plan', 'Renewal date', 'Status', 'Action']}
          rows={[
            ['PSMO College', 'Foundation', '30 June 2026', 'Paid', 'View Payment Status'],
            ['Calicut Arts & Science College', 'Growth', '15 July 2026', 'Pending', 'View Payment Status'],
            ['Malabar Tech Campus', 'Growth', '01 August 2026', 'Overdue', 'View Payment Status'],
          ]}
        />
      </SectionCard>
    </PortalShell>
  );
}
