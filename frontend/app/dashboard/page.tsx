'use client';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard overview">
      {({ summary }) => (
        <>
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Users', String(summary?.stats.totalUsers ?? '—')],
              ['Admins', String(summary?.stats.adminCount ?? '—')],
              ['Staff', String(summary?.stats.staffCount ?? '—')],
              ['Unread notifications', String(summary?.stats.unreadNotifications ?? '—')],
            ].map(([label, value]) => (
              <Card key={label} className="rounded-[28px] p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{label}</p>
                <p className="mt-3 text-4xl font-semibold text-white">{value}</p>
              </Card>
            ))}
          </section>
          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="rounded-[30px] p-6">
              <h2 className="text-2xl font-semibold text-white">Recent audit trail</h2>
              <div className="mt-5 space-y-3">
                {summary?.recentAuditLogs.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="font-medium text-white">{item.action}</p>
                    <p className="mt-1 text-slate-300">{item.description}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                )) ?? <p className="text-slate-400">Loading audit logs…</p>}
              </div>
            </Card>
            <Card className="rounded-[30px] p-6">
              <h2 className="text-2xl font-semibold text-white">Latest users</h2>
              <div className="mt-5 space-y-3">
                {summary?.latestUsers.map((user) => (
                  <div key={user.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="mt-1 text-sm text-slate-300">{user.email}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.24em] text-cyan-300">{user.role}</p>
                  </div>
                )) ?? <p className="text-slate-400">Loading users…</p>}
              </div>
            </Card>
          </section>
        </>
      )}
    </AppShell>
  );
}
