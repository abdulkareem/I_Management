import { publicPlans } from '../content';
import { BulletList, PricingGrid, PublicShell, SectionCard } from '../ui';

export default function PricingPage() {
  return (
    <PublicShell
      title="InternSuite pricing for colleges"
      lead="Choose Foundation at ₹12,000/year for up to 500 students or Growth at ₹25,000/year for up to 2000 students with advanced analytics."
    >
      <PricingGrid plans={publicPlans} />
      <section className="section-grid two-col">
        <SectionCard title="What every plan includes" kicker="Core SaaS delivery">
          <BulletList
            items={[
              'College, student, and industry dashboards.',
              'OTP + password authentication with role-based access control.',
              'Internship approvals, attendance tracking, evaluation, and generated PDFs.',
              'Mobile-first PWA-ready user experience.',
            ]}
          />
        </SectionCard>
        <SectionCard title="Best-fit guidance" kicker="Plan selection">
          <BulletList
            items={[
              'Foundation is ideal for colleges with up to 500 students and essential workflow automation.',
              'Growth supports up to 2000 students with advanced analytics and larger internship operations.',
              'Both plans include the Register Your College onboarding CTA and industry participation at no extra charge.',
            ]}
          />
        </SectionCard>
      </section>
    </PublicShell>
  );
}
