'use client';

import { useEffect, useState } from 'react';
import type { IndustryDashboard } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

type IndustryIdea = { id: string; internship_title: string; description: string; status: string; department_name: string; college_name: string };

export default function IndustryDashboardPage() {
  const [dashboard, setDashboard] = useState<IndustryDashboard | null>(null);
  const [ideas, setIdeas] = useState<IndustryIdea[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { vacancy: string; internshipCategory: 'FREE' | 'PAID' | 'STIPEND'; fee: string; stipendAmount: string; stipendDuration: string; minimumDays: string; maximumDays: string }>>({});

  async function load() {
    const [dashboardRes, ideasRes] = await Promise.all([
      fetchWithSession<IndustryDashboard>('/industry/dashboard'),
      fetchWithSession<IndustryIdea[]>('/api/industry/ideas'),
    ]);
    setDashboard(dashboardRes.data);
    setIdeas(ideasRes.data);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.'));
  }, []);

  async function publishIdea(ideaId: string) {
    const payload = forms[ideaId] ?? { vacancy: '1', internshipCategory: 'FREE', fee: '', stipendAmount: '', stipendDuration: 'week', minimumDays: '7', maximumDays: '30' };
    await fetchWithSession(`/api/industry/ideas/${ideaId}/publish`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await load();
  }

  async function acceptApplication(applicationId: string) {
    await fetchWithSession(`/industry/applications/${applicationId}/accept`, { method: 'POST' });
    await load();
  }

  async function rejectApplication(applicationId: string) {
    await fetchWithSession(`/industry/applications/${applicationId}/reject`, { method: 'POST' });
    await load();
  }

  return (
    <RoleDashboardShell allowedRoles={['INDUSTRY']} title="Industry Dashboard" subtitle="Review accepted ideas and publish internship vacancies for students.">
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
            <h2 className="mt-2 text-2xl font-semibold text-white">Department Suggested Ideas</h2>
            <div className="mt-5 space-y-3">
              {ideas.length ? ideas.map((idea) => {
                const form = forms[idea.id] ?? { vacancy: '1', internshipCategory: 'FREE', fee: '', stipendAmount: '', stipendDuration: 'week', minimumDays: '7', maximumDays: '30' };
                return (
                  <div key={idea.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="font-semibold text-white">{idea.internship_title}</p>
                    <p className="mt-1 text-sm text-slate-300">{idea.college_name} • {idea.department_name}</p>
                    <p className="mt-2 text-sm text-slate-300">{idea.description}</p>
                    <Badge className="mt-2">{idea.status}</Badge>
                    {idea.status === 'ACCEPTED' ? (
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <Input placeholder="Vacancies" value={form.vacancy} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, vacancy: e.target.value } }))} />
                        <select className="rounded-md border border-white/20 bg-slate-900 px-3 py-2" value={form.internshipCategory} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, internshipCategory: e.target.value as 'FREE' | 'PAID' | 'STIPEND' } }))}>
                          <option value="FREE">Free</option>
                          <option value="PAID">Paid</option>
                          <option value="STIPEND">With Stipend</option>
                        </select>
                        {form.internshipCategory === 'PAID' ? <Input placeholder="Fee" value={form.fee} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, fee: e.target.value } }))} /> : null}
                        {form.internshipCategory === 'STIPEND' ? <Input placeholder="Stipend amount" value={form.stipendAmount} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, stipendAmount: e.target.value } }))} /> : null}
                        {form.internshipCategory === 'STIPEND' ? <Input placeholder="Stipend period (week/month/day)" value={form.stipendDuration} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, stipendDuration: e.target.value } }))} /> : null}
                        <Input placeholder="Minimum days" value={form.minimumDays} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, minimumDays: e.target.value } }))} />
                        <Input placeholder="Maximum days" value={form.maximumDays} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, maximumDays: e.target.value } }))} />
                        <Button onClick={() => publishIdea(idea.id)}>Publish Vacancy</Button>
                      </div>
                    ) : null}
                  </div>
                );
              }) : <p className="text-slate-300">No suggested ideas found</p>}
            </div>
          </Card>

          <Card className="rounded-[30px] p-6">
            <h2 className="mt-2 text-2xl font-semibold text-white">Accepted Applications (Approve/Reject)</h2>
            <div className="mt-5 space-y-3">
              {dashboard?.applications?.length ? dashboard.applications.map((application) => (
                <div key={application.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold text-white">{application.studentName}</p>
                  <p className="mt-1 text-sm text-slate-300">{application.collegeName} • {application.opportunityTitle}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Badge>{application.status}</Badge>
                    {application.status !== 'ACCEPTED' ? (
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => acceptApplication(application.id)}>Approve</Button>
                        <Button variant="secondary" onClick={() => rejectApplication(application.id)}>Reject</Button>
                      </div>
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
