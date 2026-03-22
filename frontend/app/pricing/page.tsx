import { publicPlans } from "../content";
import { BulletList, PricingGrid, PublicShell, SectionCard } from "../ui";

export default function PricingPage() {
  return (
    <PublicShell
      title="InternSuite pricing for colleges"
      lead="Pricing includes ₹9,999 per year for up to 200 students, ₹5 per student per month below 150 students, and ₹4 per student per month above 200 students."
    >
      <PricingGrid plans={publicPlans} />
      <section className="section-grid two-col">
        <SectionCard
          title="What every college plan includes"
          kicker="Operational essentials"
        >
          <BulletList
            items={[
              "Separate login and signup for college, student, and industry users.",
              "Pricing options for annual and per-student monthly usage.",
              "Partner-college sharing controls and protected role-based access.",
              "Mobile-ready dashboards with quick actions and installable PWA support.",
            ]}
          />
        </SectionCard>
        <SectionCard
          title="What is intentionally not shown here"
          kicker="Public pricing guardrail"
        >
          <BulletList
            items={[
              "No internal cost breakdowns",
              "No profit or margin metrics",
              "No internal financial detail in the public experience",
            ]}
          />
        </SectionCard>
      </section>
    </PublicShell>
  );
}
