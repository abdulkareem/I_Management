'use client';

import { useEffect, useState } from 'react';
import type { IndustryDashboard } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

export default function IndustryDashboardPage() {
  const [dashboard, setDashboard] = useState<IndustryDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetchWithSession<IndustryDashboard>('/industry/dashboard');
    console.log('API response:', response.data);
    setDashboard(response.data);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.'));
  }, []);

  async function acceptApplication(applicationId: string) {
    await fetchWithSession(`/industry/applications/${applicationId}/accept`, { method: 'POST' });
    await load();
  }

  return (
    <RoleDashboardShell allowedRoles={['INDUSTRY']} title="Industry Dashboard" subtitle="Applications and opportunities are loaded from D1-backed APIs.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] p-4 text-rose-200">{error}</Card> : null}
          {!dashboard ? <Card className="rounded-[28px] p-4">Loading industry data...</Card> : null}

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-[28px] p-5">Live internships: {dashboard?.stats.liveOpportunities ?? 0}</Card>
            <Card className="rounded-[28px] p-5">Pending applications: {dashboard?.stats.pendingApplications ?? 0}</Card>
            <Card className="rounded-[28px] p-5">Accepted applications: {dashboard?.stats.acceptedApplications ?? 0}</Card>
          </section>

          <Card className="rounded-[30px] p-6">
            <h2 className="mt-2 text-2xl font-semibold text-white">Applications</h2>
            <div className="mt-5 space-y-3">
              {dashboard?.applications?.length ? dashboard.applications.map((application) => (
                <div key={application.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold text-white">{application.studentName}</p>
                  <p className="mt-1 text-sm text-slate-300">{application.collegeName} • {application.opportunityTitle}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Badge>{application.status}</Badge>
                    {application.status !== 'ACCEPTED' ? (
                      <Button variant="secondary" onClick={() => acceptApplication(application.id)}>
                        Accept
                      </Button>
                    ) : null}
                  </div>
                </div>
              )) : <p className="text-slate-300">No data found</p>}
            </div>
          </Card>
        </>
      )}
    </RoleDashboardShell>
  );
}
