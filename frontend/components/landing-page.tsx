'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArrowRight, Building2, Factory, GraduationCap, HeartHandshake, Sparkles, Zap } from 'lucide-react';
import { Badge } from './ui/badge';
import { ButtonLink } from './ui/button';
import { Card } from './ui/card';
import { apiRequest } from '@/lib/api';

const roleCards = [
  {
    href: '/login',
    title: 'Login',
    description: 'Use your email and password to open your dashboard instantly.',
    icon: ArrowRight,
  },
  {
    href: '/join/student',
    title: 'Join as Student',
    description: 'Discover only approved internships, apply in one tap, and track your journey like a game.',
    icon: GraduationCap,
  },
  {
    href: '/join/college',
    title: 'Register College',
    description: 'Approve MoUs, monitor student activity, and keep the whole internship cycle simple.',
    icon: Building2,
  },
  {
    href: '/join/industry',
    title: 'Join as Internship Providing Organization (IPO)',
    description: 'Request partnerships, publish internships in under 30 seconds, and accept students instantly.',
    icon: Factory,
  },
];

export function LandingPage() {
  const [stats, setStats] = useState<{ students: number; colleges: number; industries: number; vacancies: number; applied: number; completed: number } | null>(null);
  useEffect(() => {
    apiRequest<{ students: number; colleges: number; industries: number; vacancies: number; applied: number; completed: number }>('/api/public/stats')
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-4 py-6 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[40px] border border-white/10 bg-slate-950/70 px-6 py-8 shadow-[0_30px_120px_rgba(15,23,42,0.45)] sm:px-10 sm:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.18),transparent_28%)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-6">
            <Badge className="bg-emerald-400/10 text-emerald-200">Student-first internship platform</Badge>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                One internship platform. Three joyful journeys. Zero tenancy complexity.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                InternSuite helps students find approved internships fast, colleges approve MoUs in one click, and industries recruit without friction.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roleCards.map((card) => {
                const Icon = card.icon;
                return (
                  <ButtonLink key={card.href} href={card.href} className="justify-between rounded-[22px] px-5 py-4 text-left text-sm sm:text-base">
                    <span className="flex items-center gap-3"><Icon className="h-5 w-5" /> {card.title}</span>
                    <ArrowRight className="h-4 w-4" />
                  </ButtonLink>
                );
              })}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['2 clicks', 'from discovery to application'],
                ['100%', 'MoU-filtered internship feed'],
                ['PWA ready', 'installable on Android and iPhone'],
              ].map(([value, label]) => (
                <Card key={label} className="rounded-[24px] bg-white/5 p-5">
                  <p className="text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-2 text-sm text-slate-300">{label}</p>
                </Card>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <Card className="rounded-[32px] bg-slate-950/80 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Your Internship Journey</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Apply, get accepted, show up, level up.</h2>
                </div>
                <Sparkles className="h-6 w-6 text-cyan-300" />
              </div>
              <div className="mt-6 space-y-4">
                {[
                  ['Profile ready', 'Completed', '100%'],
                  ['Applied to UI Design Intern', 'Under review', '66%'],
                  ['Offer letter unlocked', 'Pending acceptance', '33%'],
                ].map(([title, status, progress]) => (
                  <div key={title} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{title}</p>
                        <p className="text-sm text-slate-300">{status}</p>
                      </div>
                      <Sparkles className="h-5 w-5 text-emerald-300" />
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: progress }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats ? (
          <>
            {[
              ['Registered Students', stats.students],
              ['Registered Colleges', stats.colleges],
              ['Registered Industries', stats.industries],
              ['Internship Vacancies', stats.vacancies],
              ['Applications Submitted', stats.applied],
              ['Internships Completed', stats.completed],
            ].map(([label, value]) => (
              <Card key={String(label)} className="rounded-[28px] p-6">
                <p className="text-sm text-slate-300">{label}</p>
                <p className="mt-2 text-3xl font-bold text-white">{String(value)}</p>
              </Card>
            ))}
          </>
        ) : null}
        {[
          { icon: HeartHandshake, title: 'Only approved internships', body: 'Students only see opportunities from industries with accepted MoUs for their college.' },
          { icon: Zap, title: 'Fast approvals', body: 'Coordinators review requests, sign MoUs, and unlock student access in one tap.' },
          { icon: Sparkles, title: 'Minimal typing', body: 'Big buttons, card layouts, and tap-first flows make the app feel WhatsApp simple.' },
        ].map(({ icon: Icon, title, body }) => (
          <Card key={title} className="rounded-[28px] p-6">
            <Icon className="h-6 w-6 text-cyan-300" />
            <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
