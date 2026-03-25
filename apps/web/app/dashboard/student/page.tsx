'use client';

import { useEffect, useState } from 'react';
import type { StudentDashboard } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

export default function StudentDashboardPage() {
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWithSession<StudentDashboard>('/student/dashboard')
      .then((response) => setDashboard(response.data))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.'));
  }, []);

  async function apply(opportunityId: string) {
    await fetchWithSession(`/student/applications/${opportunityId}`, { method: 'POST' });
    const refreshed = await fetchWithSession<StudentDashboard>('/student/dashboard');
    setDashboard(refreshed.data);
  }

  return (
    <RoleDashboardShell allowedRoles={['STUDENT']} title="Student Dashboard" subtitle="Find approved internships, tap once to apply, and keep your journey moving with visible progress.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] p-4 text-rose-200">{error}</Card> : null}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {['My Internships', 'Apply Internship', 'Upload Reports', 'Certificates'].map((item) => (
              <Card key={item} className="rounded-[28px] p-5">{item}</Card>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <Card className="rounded-[30px] p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Your Internship Journey</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{dashboard?.journeyCompletion ?? 0}% complete</h2>
              <div className="mt-4 h-3 rounded-full bg-white/10"><div className="h-3 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${dashboard?.journeyCompletion ?? 0}%` }} /></div>
              <div className="mt-5 space-y-3">
                {dashboard?.journeySteps?.map((step) => (
                  <div key={step.label} className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-sm text-white">{step.label}</span>
                    <Badge className={step.done ? 'bg-emerald-400/10 text-emerald-200' : 'bg-white/10 text-slate-200'}>{step.done ? 'Done' : 'Pending'}</Badge>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="rounded-[30px] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Status tracker</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">Applications</h2>
                </div>
                <Badge className="bg-cyan-400/10 text-cyan-200">2-click experience</Badge>
              </div>
              <div className="mt-5 space-y-3">
                {dashboard?.applications?.map((application) => (
                  <div key={application.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{application.internshipTitle}</p>
                        <p className="text-sm text-slate-300">{application.industryName}</p>
                      </div>
                      <Badge className={application.status === 'APPROVED' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-200'}>{application.status}</Badge>
                    </div>
                    {application.acceptanceUrl ? <a className="mt-3 inline-flex text-sm text-cyan-300" href={application.acceptanceUrl} target="_blank">Download offer letter</a> : null}
                  </div>
                )) ?? <p className="text-slate-300">No applications yet.</p>}
              </div>
            </Card>
          </section>
          <section className="grid gap-4">
            <h2 className="text-2xl font-semibold text-white">Available internships</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {dashboard?.internships.map((internship) => (
                <Card key={internship.id} className="rounded-[30px] p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold text-white">{internship.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{internship.industryName}</p>
                    </div>
                    <Badge className="bg-emerald-400/10 text-emerald-200">MoU approved</Badge>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-300">{internship.description}</p>
                  <Button className="mt-5 w-full" disabled={internship.applied} onClick={() => apply(internship.id)}>
                    {internship.applied ? internship.status ?? 'Applied' : 'Apply in 1 click'}
                  </Button>
                </Card>
              )) ?? <Card className="rounded-[30px] p-6 text-slate-300">Loading opportunities…</Card>}
            </div>
          </section>
        </>
      )}
    </RoleDashboardShell>
  );
}
