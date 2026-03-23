import { MarketingShell } from '@/components/marketing-shell';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const plans = [
  {
    name: 'Free',
    price: '$0',
    subtitle: 'Best for pilots and internal teams',
    features: ['Single tenant workspace', 'Email verification + password reset', 'Notifications and audit logs'],
  },
  {
    name: 'Pro',
    price: '$79',
    subtitle: 'For fast-growing SaaS operations',
    features: ['Unlimited users across ADMIN/STAFF/USER roles', 'Priority onboarding and tenant controls', 'Billing-ready plan metadata and analytics'],
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <Badge>Transparent pricing</Badge>
          <h1 className="mt-5 text-5xl font-semibold text-white">Start for free, then unlock the operational depth your workspace deserves.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">Tenant plan is stored directly in Prisma, making Stripe, metered billing, trials, and entitlements easy follow-on additions.</p>
          <div className="mt-8 flex gap-4">
            <ButtonLink href="/register">Create a workspace</ButtonLink>
            <ButtonLink variant="secondary" href="/login">Use the demo</ButtonLink>
          </div>
        </div>
        <div className="grid gap-6">
          {plans.map((plan) => (
            <Card key={plan.name} className="rounded-[34px] p-8">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-3xl font-semibold text-white">{plan.name}</h2>
                  <p className="mt-2 text-slate-400">{plan.subtitle}</p>
                </div>
                <p className="text-4xl font-semibold text-white">{plan.price}<span className="text-base text-slate-500"> / month</span></p>
              </div>
              <div className="mt-6 grid gap-3 text-slate-300">
                {plan.features.map((feature) => (
                  <div key={feature} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">{feature}</div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
