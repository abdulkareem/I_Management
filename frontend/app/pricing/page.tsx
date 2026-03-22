import { publicPlans } from '../content';
import { BulletList, PricingGrid, PublicShell, SectionCard } from '../ui';

export default function PricingPage() {
  return (
    <PublicShell
      title="Transparent pricing for college internship operations"
      lead="InternSuite pricing is built for public-facing evaluation by colleges. Students and industry partners can access the platform without subscription fees."
    >
      <PricingGrid plans={publicPlans} />
      <section className="section-grid two-col">
        <SectionCard title="What every college plan includes" kicker="Operational essentials">
          <BulletList
            items={[
              'Separate login and signup for college, student, and industry users.',
              'Semester-aware internship workflows, applications, and reporting.',
              'Partner-college sharing controls and protected role-based access.',
              'Mobile-ready dashboards with quick actions and installable PWA support.',
            ]}
          />
        </SectionCard>
        <SectionCard title="What is intentionally not shown here" kicker="Public pricing guardrail">
          <BulletList
            items={[
              'No internal cost breakdowns',
              'No profit or margin metrics',
              'No internal financial detail in the public experience',
            ]}
          />
        </SectionCard>
      </section>
    </PublicShell>
  );
}
