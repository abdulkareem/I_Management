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
    href: '/join/ipo',
    title: 'Join as IPO (IPO)',
    description: 'Request partnerships, publish internships in under 30 seconds, and accept students instantly.',
    icon: Factory,
  },
];

export function LandingPage() {
  const [stats, setStats] = useState<{ students: number; ipos: number; vacancies: number; applications: number } | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  useEffect(() => {
    apiRequest<{ students: number; ipos: number; vacancies: number; applications: number }>('/api/public/stats')
      .then((res) => {
        setStats(res.data);
        setStatsError(null);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Unable to load public statistics right now.';
        setStats(null);
        setStatsError(message);
      });
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-4 py-6 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[40px] border border-indigo-100/70 bg-white/80 px-5 py-7 shadow-[0_35px_120px_rgba(30,64,175,0.18)] sm:px-10 sm:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_30%)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-6">
            <Badge className="bg-indigo-50 text-indigo-700">Student-first internship platform</Badge>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
                Ultra-modern internship workspace for students, colleges, and ipo teams.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Designed with a clean Figma-style visual system: clear sections, friendly typography, and quick actions that feel great on mobile and desktop.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
              {roleCards.map((card) => {
                const Icon = card.icon;
                return (
                  <ButtonLink key={card.href} href={card.href} className="justify-between rounded-[18px] px-4 py-4 text-left text-sm sm:text-base">
                    <span className="flex items-center gap-3"><Icon className="h-5 w-5" /> {card.title}</span>
                    <ArrowRight className="h-4 w-4" />
                  </ButtonLink>
                );
              })}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['2 taps', 'from discovery to application'],
                ['100%', 'MoU-filtered internship feed'],
                ['Responsive', 'Android, iPhone, laptop and desktops'],
              ].map(([value, label]) => (
                <Card key={label} className="rounded-[24px] bg-white/85 p-4 sm:p-5">
                  <p className="text-xl font-semibold text-slate-900 sm:text-2xl">{value}</p>
                  <p className="mt-2 text-sm text-slate-600">{label}</p>
                </Card>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <Card className="rounded-[32px] border-indigo-100 bg-white/90 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-indigo-600">Your Internship Journey</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">Apply, get accepted, show up, level up.</h2>
                </div>
                <Sparkles className="h-6 w-6 text-sky-500" />
              </div>
              <div className="mt-6 space-y-4">
                {[
                  ['Profile ready', 'Completed', '100%'],
                  ['Applied to UI Design Intern', 'Under review', '66%'],
                  ['Offer letter unlocked', 'Pending acceptance', '33%'],
                ].map(([title, status, progress]) => (
                  <div key={title} className="rounded-[24px] border border-slate-100 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{title}</p>
                        <p className="text-sm text-slate-500">{status}</p>
                      </div>
                      <Sparkles className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500" style={{ width: progress }} />
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
              ['Registered IPOs', stats.ipos],
              ['Internship Vacancies', stats.vacancies],
              ['Applications Submitted', stats.applications],
            ].map(([label, value]) => (
              <Card key={String(label)} className="rounded-[28px] bg-white/85 p-5 sm:p-6">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{String(value)}</p>
              </Card>
            ))}
          </>
        ) : null}
        {statsError ? (
          <Card className="rounded-[28px] border border-amber-300 bg-amber-50 p-5 sm:p-6">
            <p className="text-sm font-medium text-amber-900">We could not load live platform statistics.</p>
            <p className="mt-2 text-sm text-amber-800">{statsError}</p>
          </Card>
        ) : null}
        {[
          { icon: HeartHandshake, title: 'Only approved internships', body: 'Students only see opportunities from ipos with accepted MoUs for their college.' },
          { icon: Zap, title: 'Fast approvals', body: 'Coordinators review requests, sign MoUs, and unlock student access in one tap.' },
          { icon: Sparkles, title: 'Minimal typing', body: 'Big buttons, card layouts, and tap-first flows make the app feel WhatsApp simple.' },
        ].map(({ icon: Icon, title, body }) => (
          <Card key={title} className="rounded-[28px] bg-white/85 p-5 sm:p-6">
            <Icon className="h-6 w-6 text-indigo-500" />
            <h3 className="mt-4 text-xl font-semibold text-slate-900">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
