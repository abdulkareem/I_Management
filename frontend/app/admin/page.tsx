'use client';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/ui/card';

export default function AdminPage() {
  return (
    <AppShell title="Admin control plane">
      {({ summary }) => (
        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="rounded-[30px] p-6">
            <h2 className="text-2xl font-semibold text-white">Tenant configuration</h2>
            <p className="mt-4 text-slate-300">Plan: {summary?.tenant.plan ?? '—'}</p>
            <p className="mt-2 text-slate-300">Status: {summary?.tenant.status ?? '—'}</p>
            <p className="mt-2 text-slate-300">Slug: {summary?.tenant.slug ?? '—'}</p>
          </Card>
          <Card className="rounded-[30px] p-6">
            <h2 className="text-2xl font-semibold text-white">Role distribution</h2>
            <div className="mt-4 space-y-3 text-slate-300">
              <div>Admins: {summary?.stats.adminCount ?? '—'}</div>
              <div>Staff: {summary?.stats.staffCount ?? '—'}</div>
              <div>Users: {summary?.stats.endUserCount ?? '—'}</div>
            </div>
          </Card>
          <Card className="rounded-[30px] p-6">
            <h2 className="text-2xl font-semibold text-white">Readiness checklist</h2>
            <div className="mt-4 space-y-3 text-slate-300">
              <div>✅ Verification tokens persisted</div>
              <div>✅ Notification assignment API enabled</div>
              <div>✅ Audit trail active</div>
            </div>
          </Card>
        </section>
      )}
    </AppShell>
  );
}
