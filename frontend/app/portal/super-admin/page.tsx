import { adminNav, applicationTrend, categoryMix, participationBars } from '../../content';
import { BarChart, LineChart, PieChart, PortalShell, StatGrid } from '../../ui';

const stats = [
  { label: 'Total colleges', value: '48', detail: 'Registered colleges across all active subscription tiers.' },
  { label: 'Active students', value: '9,420', detail: 'Students currently within live semester cycles.' },
  { label: 'Revenue', value: '₹18.6L', detail: 'Platform subscription revenue visible only in the private admin area.' },
  { label: 'Payments pending', value: '6', detail: 'College renewals or invoices needing follow-up.' },
];

export default function SuperAdminDashboardPage() {
  return (
    <PortalShell
      role="Super Admin"
      title="Private platform dashboard"
      lead="Monitor colleges, revenue, payment health, and cross-platform analytics from a private control area that is never exposed in the public experience."
      nav={adminNav}
      actions={[
        { label: 'Activate College', href: '/portal/super-admin/colleges' },
        { label: 'View Payment Status', href: '/portal/super-admin/payments', tone: 'secondary' },
      ]}
    >
      <StatGrid items={stats} />
      <section className="chart-grid">
        <LineChart values={applicationTrend} />
        <PieChart items={categoryMix} />
        <BarChart items={participationBars} />
      </section>
    </PortalShell>
  );
}
