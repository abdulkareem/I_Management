'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { IndustryDashboard } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

export default function IndustryDashboardPage() {
  const [dashboard, setDashboard] = useState<IndustryDashboard | null>(null);
  const [catalog, setCatalog] = useState<Array<{ id: string; name: string; departments: Array<{ id: string; name: string }> }>>([]);
  const [ideas, setIdeas] = useState<Array<{ id: string; title: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetchWithSession<IndustryDashboard>('/industry/dashboard');
    setDashboard(response.data);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.'));
    fetchWithSession<{ colleges: Array<{ id: string; name: string; departments: Array<{ id: string; name: string }> }> }>('/catalog/colleges')
      .then((response) => setCatalog(response.data.colleges))
      .catch(() => setCatalog([]));
  }, []);

  async function createOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetchWithSession('/internship/create', {
      method: 'POST',
      body: JSON.stringify({
        industryId: dashboard?.industry.id,
        collegeId: form.get('collegeId'),
        departmentId: form.get('departmentId'),
        ideaId: form.get('ideaId'),
      }),
    });
    event.currentTarget.reset();
    await load();
  }

  return (
    <RoleDashboardShell title="Industry Dashboard" subtitle="Create internships in seconds, review applications in cards, and accept students with auto-generated offer letters.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] p-4 text-rose-200">{error}</Card> : null}
          <section className="grid gap-4 md:grid-cols-4">
            {[
              ['Live internships', String(dashboard?.stats.liveOpportunities ?? 0)],
              ['Pending applications', String(dashboard?.stats.pendingApplications ?? 0)],
              ['Accepted', String(dashboard?.stats.acceptedApplications ?? 0)],
              ['Attendance today', String(dashboard?.stats.attendanceToday ?? 0)],
            ].map(([label, value]) => (
              <Card key={label} className="rounded-[28px] p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
              </Card>
            ))}
          </section>
          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="rounded-[30px] p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Create internship</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Launch in under 30 seconds</h2>
              <form className="mt-5 space-y-4" onSubmit={createOpportunity}>
                <div className="space-y-2">
                  <label htmlFor="collegeId">College</label>
                  <select id="collegeId" name="collegeId" required onChange={(event) => {
                    const college = catalog.find((item) => item.id === event.target.value);
                    const deptId = college?.departments[0]?.id;
                    if (!deptId) return;
                    fetchWithSession<Array<{ id: string; title: string }>>(`/ideas/${deptId}`).then((response) => setIdeas(response.data)).catch(() => setIdeas([]));
                  }}>
                    <option value="">Select college</option>
                    {catalog.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="departmentId">Department</label>
                  <select id="departmentId" name="departmentId" required onChange={(event) => {
                    fetchWithSession<Array<{ id: string; title: string }>>(`/ideas/${event.target.value}`).then((response) => setIdeas(response.data)).catch(() => setIdeas([]));
                  }}>
                    <option value="">Select department</option>
                    {catalog.flatMap((college) => college.departments).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="ideaId">Internship idea</label>
                  <select id="ideaId" name="ideaId" required>
                    <option value="">Select idea</option>
                    {ideas.map((idea) => <option key={idea.id} value={idea.id}>{idea.title}</option>)}
                  </select>
                </div>
                <Button className="w-full">Publish internship</Button>
              </form>
            </Card>
            <Card className="rounded-[30px] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Applications</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Card-based review queue</h2>
                </div>
                <Badge className="bg-emerald-400/10 text-emerald-200">Tap to decide</Badge>
              </div>
              <div className="mt-5 space-y-3">
                {dashboard?.applications.map((application) => (
                  <div key={application.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="font-semibold text-white">{application.studentName}</p>
                    <p className="mt-1 text-sm text-slate-300">{application.collegeName} • {application.opportunityTitle}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Badge className={application.status === 'APPROVED' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-200'}>{application.status}</Badge>
                      {application.status !== 'APPROVED' ? (
                        <Button variant="secondary" onClick={async () => { await fetchWithSession(`/industry/applications/${application.id}/accept`, { method: 'POST' }); await load(); }}>
                          Accept + offer letter
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )) ?? <p className="text-slate-300">No applications yet.</p>}
              </div>
            </Card>
          </section>
        </>
      )}
    </RoleDashboardShell>
  );
}
