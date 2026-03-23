'use client';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/ui/card';

export default function ProfilePage() {
  return (
    <AppShell title="Profile and identity">
      {({ session, summary }) => (
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-[30px] p-6">
            <h2 className="text-2xl font-semibold text-white">Account snapshot</h2>
            <div className="mt-5 space-y-3 text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Name: {session?.user.name}</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Email: {session?.user.email}</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Role: {session?.user.role}</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Tenant: {session?.tenant.name}</div>
            </div>
          </Card>
          <Card className="rounded-[30px] p-6">
            <h2 className="text-2xl font-semibold text-white">Workspace posture</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Plan: {summary?.tenant.plan ?? '—'}</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Status: {summary?.tenant.status ?? '—'}</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Total notifications: {summary?.stats.notifications ?? '—'}</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Unread notifications: {summary?.stats.unreadNotifications ?? '—'}</div>
            </div>
          </Card>
        </section>
      )}
    </AppShell>
  );
}
