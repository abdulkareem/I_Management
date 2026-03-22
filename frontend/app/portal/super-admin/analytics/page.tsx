import { adminNav, applicationTrend, categoryMix, participationBars } from '../../../content';
import { BarChart, LineChart, PieChart, PortalShell } from '../../../ui';

export default function SuperAdminAnalyticsPage() {
  return (
    <PortalShell
      role="Super Admin"
      title="Platform analytics"
      lead="Review tenant growth, semester application patterns, and participation trends while keeping role boundaries and public/private separation intact."
      nav={adminNav}
    >
      <section className="chart-grid">
        <LineChart values={applicationTrend} />
        <PieChart items={categoryMix} />
        <BarChart items={participationBars} />
      </section>
    </PortalShell>
  );
}
