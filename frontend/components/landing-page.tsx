'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, BellRing, Building2, CheckCircle2, LockKeyhole, UsersRound } from 'lucide-react';
import { MarketingShell } from './marketing-shell';
import { Badge } from './ui/badge';
import { ButtonLink } from './ui/button';
import { Card } from './ui/card';

const features = [
  {
    title: 'Strict tenant isolation',
    body: 'Every record, query, session, notification, and audit event is scoped by tenantId so workspaces remain fully separated.',
    icon: Building2,
  },
  {
    title: 'Verification + RBAC',
    body: 'Email verification, password resets, persisted sessions, and ADMIN/STAFF/USER permissions are wired directly into the platform shell.',
    icon: LockKeyhole,
  },
  {
    title: 'Operational command center',
    body: 'Dashboards, profile experiences, user management, billing-ready plans, and notification streams are production-minded from day one.',
    icon: BarChart3,
  },
];

const testimonials = [
  ['Head of IT, Radian Health', 'The tenant-aware architecture is refreshingly clean, and the product polish looks like it came straight from our design team.'],
  ['COO, Northstar University', 'We finally have onboarding, verification, admin controls, and notifications in one coherent SaaS operating system.'],
  ['Founder, LatticeWorks', 'The platform feels investor-ready while still being pragmatic for engineering handoff and deployment.'],
];

const stats = [
  ['99.99%', 'availability target'],
  ['3 roles', 'admin, staff, end-user'],
  ['1 schema', 'tenant-safe Prisma data model'],
  ['Resend', 'verification + reset delivery'],
];

export function LandingPage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden rounded-[40px] border border-white/10 bg-white/5 px-8 py-12 shadow-[0_40px_120px_rgba(2,6,23,0.5)] lg:px-12 lg:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.25),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.22),transparent_28%)]" />
        <div className="relative grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-8">
            <Badge>Production-grade SaaS foundation</Badge>
            <div className="space-y-6">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white md:text-7xl">
                Build a premium multi-tenant platform without compromising backend rigor.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Prism combines a glassmorphism-first landing experience, tenant-safe authentication, Prisma-powered persistence,
                Resend email verification, auditability, and role-based dashboards in one cohesive stack.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <ButtonLink href="/register">Create a tenant</ButtonLink>
              <ButtonLink variant="secondary" href="/pricing">View pricing</ButtonLink>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(([value, label]) => (
                <Card key={label} className="rounded-3xl border-white/10 bg-slate-950/40 p-5">
                  <p className="text-3xl font-semibold text-white">{value}</p>
                  <p className="mt-2 text-sm text-slate-400">{label}</p>
                </Card>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <Card className="relative overflow-hidden rounded-[32px] p-0">
              <div className="border-b border-white/10 px-6 py-4 text-sm text-slate-300">Tenant workspace preview</div>
              <div className="grid gap-4 p-6">
                <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                  <Card className="bg-slate-950/50 p-5">
                    <p className="text-sm text-slate-400">Workspace</p>
                    <p className="mt-3 text-2xl font-semibold text-white">Northstar University</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-300">
                      <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                        <span>Plan</span>
                        <span className="text-cyan-300">Pro</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                        <span>Status</span>
                        <span className="text-emerald-300">Active</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                        <span>Unread notifications</span>
                        <span className="text-fuchsia-300">08</span>
                      </div>
                    </div>
                  </Card>
                  <Card className="bg-slate-950/50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-400">Today’s command center</p>
                        <p className="mt-2 text-xl font-semibold text-white">Assign onboarding tasks, review activity, and manage roles.</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-cyan-300" />
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {[
                        ['Admins', '02'],
                        ['Staff', '07'],
                        ['Users', '128'],
                        ['Audit events', '284'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="text-sm text-slate-400">{label}</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      <section id="features" className="grid gap-6 lg:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: index * 0.1 }}>
              <Card className="h-full rounded-[30px] p-8">
                <div className="mb-5 inline-flex rounded-2xl border border-white/10 bg-white/5 p-3"><Icon className="h-6 w-6 text-cyan-300" /></div>
                <h2 className="text-2xl font-semibold text-white">{feature.title}</h2>
                <p className="mt-4 leading-7 text-slate-300">{feature.body}</p>
              </Card>
            </motion.div>
          );
        })}
      </section>

      <section id="security" className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[34px] p-8">
          <Badge>Secure by design</Badge>
          <h2 className="mt-5 text-4xl font-semibold text-white">Auth flows that respect tenants, plans, and real production controls.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              'Tenant-aware login using tenant slug + email + password.',
              'Verification tokens and reset links stored in Prisma with expiration and single-use semantics.',
              'Persisted sessions with token hashing and revocation-friendly server checks.',
              'Audit logs for registration, login, tenant changes, user management, and notifications.',
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-white/10 bg-white/5 p-5 text-slate-300">
                <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-300" />
                {item}
              </div>
            ))}
          </div>
        </Card>
        <Card className="rounded-[34px] p-8">
          <h3 className="text-2xl font-semibold text-white">Designed for go-to-market velocity</h3>
          <div className="mt-6 space-y-4">
            {[
              ['White-label-ready tenant metadata', 'Plan, status, workspace slug, notifications, and user roster available for future billing workflows.'],
              ['Role-based dashboards', 'Admins manage tenant operations, staff handle tasks, and end-users focus on their profile and alerts.'],
              ['PWA-ready shell', 'Manifest support and responsive patterns make the application deployment-ready across devices.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-2 text-slate-300">{body}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section id="testimonials" className="grid gap-6 lg:grid-cols-3">
        {testimonials.map(([author, quote]) => (
          <Card key={author} className="rounded-[30px] p-7">
            <BellRing className="h-6 w-6 text-fuchsia-300" />
            <p className="mt-5 text-lg leading-8 text-slate-200">“{quote}”</p>
            <p className="mt-5 text-sm uppercase tracking-[0.2em] text-slate-500">{author}</p>
          </Card>
        ))}
      </section>

      <section id="pricing" className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-[34px] p-8">
          <Badge>Billing-ready foundation</Badge>
          <h2 className="mt-4 text-4xl font-semibold text-white">Launch on Free, expand on Pro, and keep your data model ready for subscriptions.</h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">Plans are encoded at the tenant level so you can add Stripe, entitlements, seat management, and feature gating without reshaping your core schema.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <ButtonLink href="/pricing">See pricing details</ButtonLink>
            <ButtonLink variant="secondary" href="/register">Start a workspace</ButtonLink>
          </div>
        </Card>
        <div className="grid gap-6">
          {[
            ['Free', 'Perfect for pilots and internal teams', '$0 / month', ['1 tenant workspace', 'Core auth + verification', 'Notifications + audit trail']],
            ['Pro', 'For growing operations teams', '$79 / month', ['Unlimited team members', 'Priority onboarding', 'Billing-ready tenant controls']],
          ].map(([title, subtitle, price, bullets]) => (
            <Card key={title} className="rounded-[34px] p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-slate-400">{subtitle}</p>
                </div>
                <p className="text-3xl font-semibold text-white">{price}</p>
              </div>
              <div className="mt-6 space-y-3 text-slate-300">
                {(bullets as string[]).map((bullet) => (
                  <div key={bullet} className="flex items-center gap-3"><UsersRound className="h-4 w-4 text-cyan-300" /> {bullet}</div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
