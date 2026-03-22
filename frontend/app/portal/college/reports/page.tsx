import { applicationTrend, categoryMix, collegeNav, participationBars } from '../../../content';
import { BarChart, LineChart, PieChart, PortalShell } from '../../../ui';

export default function CollegeReportsPage() {
  return (
    <PortalShell
      role="College Panel"
      title="Reports"
      lead="Measure internship performance through clear charts that support semester reviews, placement analysis, and accreditation evidence."
      nav={collegeNav}
    >
      <section className="chart-grid">
        <LineChart values={applicationTrend} />
        <PieChart items={categoryMix} />
        <BarChart items={participationBars} />
      </section>
    </PortalShell>
  );
}
