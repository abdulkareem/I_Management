'use client';

import { useEffect, useState } from 'react';
import type { CollegeDashboard } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

export default function CollegeDashboardPage() {
  const [dashboard, setDashboard] = useState<CollegeDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetchWithSession<CollegeDashboard>('/college/dashboard');
    setDashboard(response.data);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.'));
  }, []);

  async function approveMou(mouId: string) {
    await fetchWithSession(`/college/mous/${mouId}/approve`, { method: 'POST' });
    await load();
  }

  return (
    <RoleDashboardShell title="College Dashboard" subtitle="Approve MoUs, see which industries are unlocked, and watch student activity without digging through menus.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] p-4 text-rose-200">{error}</Card> : null}
          <section className="grid gap-4 md:grid-cols-4">
            {[
              ['Pending MoUs', String(dashboard?.stats.pendingMous ?? 0)],
              ['Approved industries', String(dashboard?.stats.approvedIndustries ?? 0)],
              ['Active students', String(dashboard?.stats.activeStudents ?? 0)],
              ['Applications', String(dashboard?.stats.applicationsSubmitted ?? 0)],
            ].map(([label, value]) => (
              <Card key={label} className="rounded-[28px] p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
              </Card>
            ))}
          </section>
          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-[30px] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">MoU inbox</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Pending partnership requests</h2>
                </div>
                <Badge className="bg-amber-400/10 text-amber-200">1-tap approval</Badge>
              </div>
              <div className="mt-5 space-y-3">
                {dashboard?.pendingMous.map((mou) => (
                  <div key={mou.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="font-semibold text-white">{mou.industryName}</p>
                    <p className="mt-1 text-sm text-slate-300">{mou.industryDescription}</p>
                    <Button className="mt-4 w-full" onClick={() => approveMou(mou.id)}>Approve and generate PDF</Button>
                  </div>
                )) ?? <p className="text-slate-300">No pending requests.</p>}
              </div>
            </Card>
            <Card className="rounded-[30px] p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Unlocked network</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Approved industries</h2>
              <div className="mt-5 space-y-3">
                {dashboard?.approvedIndustries.map((industry) => (
                  <div key={industry.id} className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-white">{industry.name}</div>
                )) ?? <p className="text-slate-300">No industries approved yet.</p>}
              </div>
            </Card>
          </section>
        </>
      )}
    </RoleDashboardShell>
  );
}
