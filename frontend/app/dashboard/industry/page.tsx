'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { IndustryDashboard } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

type IndustryIdea = { id: string; internship_title: string; description: string; status: string; department_name: string; college_name: string };
type College = { id: string; name: string };
type Department = { id: string; name: string };
type InternshipCategory = 'FREE' | 'PAID' | 'STIPEND';
type StipendDuration = 'DAY' | 'WEEK' | 'MONTH';

export default function IndustryDashboardPage() {
  const [dashboard, setDashboard] = useState<IndustryDashboard | null>(null);
  const [ideas, setIdeas] = useState<IndustryIdea[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedCollege, setSelectedCollege] = useState('');
  const [connectForm, setConnectForm] = useState({
    departmentId: '',
    internshipTitle: '',
    natureOfWork: '',
    genderPreference: 'BOTH',
    internshipCategory: 'FREE' as InternshipCategory,
    fee: '',
    stipendAmount: '',
    stipendDuration: 'MONTH' as StipendDuration,
    hourDuration: '60',
    vacancy: '1',
  });
  const [error, setError] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { vacancy: string; internshipCategory: InternshipCategory; fee: string; stipendAmount: string; stipendDuration: StipendDuration; minimumDays: string; maximumDays: string }>>({});

  async function load() {
    const [dashboardRes, ideasRes, collegeRes] = await Promise.all([
      fetchWithSession<IndustryDashboard>('/industry/dashboard'),
      fetchWithSession<IndustryIdea[]>('/api/industry/ideas'),
      fetchWithSession<College[]>('/api/industry/colleges'),
    ]);
    setDashboard(dashboardRes.data);
    setIdeas(ideasRes.data);
    setColleges(collegeRes.data ?? []);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.'));
  }, []);

  useEffect(() => {
    if (!selectedCollege) {
      setDepartments([]);
      return;
    }
    fetchWithSession<Department[]>(`/api/industry/colleges/${selectedCollege}/departments`)
      .then((res) => setDepartments(res.data ?? []))
      .catch(() => setDepartments([]));
  }, [selectedCollege]);

  async function submitConnectRequest() {
    if (!selectedCollege || !connectForm.departmentId) {
      setError('Please select both college and department before sending.');
      return;
    }
    await fetchWithSession('/api/industry/connect-request', {
      method: 'POST',
      body: JSON.stringify({
        collegeId: selectedCollege,
        departmentId: connectForm.departmentId,
        internshipTitle: connectForm.internshipTitle,
        natureOfWork: connectForm.natureOfWork,
        genderPreference: connectForm.genderPreference,
        internshipCategory: connectForm.internshipCategory,
        fee: connectForm.internshipCategory === 'PAID' ? Number(connectForm.fee || 0) : null,
        stipendAmount: connectForm.internshipCategory === 'STIPEND' ? Number(connectForm.stipendAmount || 0) : null,
        stipendDuration: connectForm.internshipCategory === 'STIPEND' ? connectForm.stipendDuration : null,
        durationLabel: `${Number(connectForm.hourDuration || 0)} hours`,
        hourDuration: Number(connectForm.hourDuration || 0),
        vacancy: Number(connectForm.vacancy || 0),
      }),
    });
    setConnectForm({ ...connectForm, internshipTitle: '', natureOfWork: '', fee: '', stipendAmount: '', vacancy: '1' });
    await load();
  }

  async function publishIdea(ideaId: string) {
    const payload = forms[ideaId] ?? { vacancy: '1', internshipCategory: 'FREE' as InternshipCategory, fee: '', stipendAmount: '', stipendDuration: 'MONTH' as StipendDuration, minimumDays: '7', maximumDays: '30' };
    await fetchWithSession(`/api/industry/ideas/${ideaId}/publish`, {
      method: 'POST',
      body: JSON.stringify({
        vacancy: Number(payload.vacancy || 0),
        internshipCategory: payload.internshipCategory,
        fee: payload.internshipCategory === 'PAID' ? Number(payload.fee || 0) : null,
        stipendAmount: payload.internshipCategory === 'STIPEND' ? Number(payload.stipendAmount || 0) : null,
        stipendDuration: payload.internshipCategory === 'STIPEND' ? payload.stipendDuration : null,
        minimumDays: Number(payload.minimumDays || 0),
        maximumDays: Number(payload.maximumDays || 0),
      }),
    });
    await load();
  }

  async function respondIdea(ideaId: string, status: 'ACCEPTED' | 'REJECTED') {
    await fetchWithSession(`/api/industry-requests/${ideaId}/respond`, { method: 'POST', body: JSON.stringify({ status }) });
    await load();
  }

  async function acceptApplication(applicationId: string) {
    await fetchWithSession(`/api/industry/applications/${applicationId}/accept`, { method: 'POST' });
    await load();
  }

  async function rejectApplication(applicationId: string) {
    await fetchWithSession(`/api/industry/applications/${applicationId}/reject`, { method: 'POST' });
    await load();
  }

  return (
    <RoleDashboardShell allowedRoles={['INDUSTRY']} title="Industry Dashboard" subtitle="Review department ideas, connect with colleges and publish student vacancies.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] p-4 text-rose-200">{error}</Card> : null}
          {!dashboard ? <Card className="rounded-[28px] p-4">Loading industry data...</Card> : null}

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-[28px] p-5">Live internships: {dashboard?.stats.liveOpportunities ?? 0}</Card>
            <Card className="rounded-[28px] p-5">Pending applications: {dashboard?.stats.pendingApplications ?? 0}</Card>
            <Card className="rounded-[28px] p-5">Accepted applications: {dashboard?.stats.acceptedApplications ?? 0}</Card>
          </section>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="rounded-full border border-white/20 px-4 py-2 text-sm text-white">Reset Password</Link>
          </div>

          <Card className="rounded-[30px] p-6">
            <h2 className="mt-2 text-2xl font-semibold text-white">Connect to College</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <select className="rounded-md border border-white/20 bg-slate-900 px-3 py-2" value={selectedCollege} onChange={(e) => { setSelectedCollege(e.target.value); setConnectForm((prev) => ({ ...prev, departmentId: '' })); }}>
                <option value="">Select college</option>
                {colleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}
              </select>
              <select className="rounded-md border border-white/20 bg-slate-900 px-3 py-2" value={connectForm.departmentId} onChange={(e) => setConnectForm((prev) => ({ ...prev, departmentId: e.target.value }))}>
                <option value="">Select department</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
              <Input placeholder="Internship title" value={connectForm.internshipTitle} onChange={(e) => setConnectForm((prev) => ({ ...prev, internshipTitle: e.target.value }))} />
              <Input placeholder="Nature of internship work" value={connectForm.natureOfWork} onChange={(e) => setConnectForm((prev) => ({ ...prev, natureOfWork: e.target.value }))} />
              <select className="rounded-md border border-white/20 bg-slate-900 px-3 py-2" value={connectForm.genderPreference} onChange={(e) => setConnectForm((prev) => ({ ...prev, genderPreference: e.target.value }))}>
                <option value="BOTH">Girls and Boys</option>
                <option value="GIRLS">Girls only</option>
                <option value="BOYS">Boys only</option>
              </select>
              <select className="rounded-md border border-white/20 bg-slate-900 px-3 py-2" value={connectForm.internshipCategory} onChange={(e) => setConnectForm((prev) => ({ ...prev, internshipCategory: e.target.value as InternshipCategory }))}>
                <option value="FREE">Free internship</option>
                <option value="PAID">Paid internship</option>
                <option value="STIPEND">Internship with stipend</option>
              </select>
              {connectForm.internshipCategory === 'PAID' ? <Input placeholder="Fee amount" value={connectForm.fee} onChange={(e) => setConnectForm((prev) => ({ ...prev, fee: e.target.value }))} /> : null}
              {connectForm.internshipCategory === 'STIPEND' ? <Input placeholder="Stipend amount" value={connectForm.stipendAmount} onChange={(e) => setConnectForm((prev) => ({ ...prev, stipendAmount: e.target.value }))} /> : null}
              {connectForm.internshipCategory === 'STIPEND' ? (
                <select className="rounded-md border border-white/20 bg-slate-900 px-3 py-2" value={connectForm.stipendDuration} onChange={(e) => setConnectForm((prev) => ({ ...prev, stipendDuration: e.target.value as StipendDuration }))}>
                  <option value="DAY">Per day</option>
                  <option value="WEEK">Per week</option>
                  <option value="MONTH">Per month</option>
                </select>
              ) : null}
              <Input placeholder="Duration in hours (e.g. 60/120)" value={connectForm.hourDuration} onChange={(e) => setConnectForm((prev) => ({ ...prev, hourDuration: e.target.value }))} />
              <Input placeholder="Vacancies" value={connectForm.vacancy} onChange={(e) => setConnectForm((prev) => ({ ...prev, vacancy: e.target.value }))} />
              <Button onClick={submitConnectRequest}>Send to Department</Button>
            </div>
          </Card>

          <Card className="rounded-[30px] p-6">
            <h2 className="mt-2 text-2xl font-semibold text-white">Department Suggested Ideas</h2>
            <div className="mt-5 space-y-3">
              {ideas.length ? ideas.filter((idea) => idea.status !== 'REJECTED').map((idea) => {
                const form = forms[idea.id] ?? { vacancy: '1', internshipCategory: 'FREE' as InternshipCategory, fee: '', stipendAmount: '', stipendDuration: 'MONTH' as StipendDuration, minimumDays: '7', maximumDays: '30' };
                return (
                  <div key={idea.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="font-semibold text-white">{idea.internship_title}</p>
                    <p className="mt-1 text-sm text-slate-300">{idea.college_name} • {idea.department_name}</p>
                    <p className="mt-2 text-sm text-slate-300">{idea.description}</p>
                    <Badge className="mt-2">{idea.status}</Badge>
                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" onClick={() => respondIdea(idea.id, 'ACCEPTED')} disabled={idea.status === 'ACCEPTED'}>Accept</Button>
                      {idea.status !== 'ACCEPTED' ? <Button variant="secondary" onClick={() => respondIdea(idea.id, 'REJECTED')}>Reject</Button> : null}
                    </div>
                    {idea.status === 'ACCEPTED' ? (
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <Input placeholder="Vacancies" value={form.vacancy} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, vacancy: e.target.value } }))} />
                        <select className="rounded-md border border-white/20 bg-slate-900 px-3 py-2" value={form.internshipCategory} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, internshipCategory: e.target.value as InternshipCategory } }))}>
                          <option value="FREE">Free</option>
                          <option value="PAID">Paid</option>
                          <option value="STIPEND">With Stipend</option>
                        </select>
                        {form.internshipCategory === 'PAID' ? <Input placeholder="Fee" value={form.fee} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, fee: e.target.value } }))} /> : null}
                        {form.internshipCategory === 'STIPEND' ? <Input placeholder="Stipend amount" value={form.stipendAmount} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, stipendAmount: e.target.value } }))} /> : null}
                        {form.internshipCategory === 'STIPEND' ? (
                          <select className="rounded-md border border-white/20 bg-slate-900 px-3 py-2" value={form.stipendDuration} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, stipendDuration: e.target.value as StipendDuration } }))}>
                            <option value="DAY">Per day</option>
                            <option value="WEEK">Per week</option>
                            <option value="MONTH">Per month</option>
                          </select>
                        ) : null}
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
              {dashboard?.applications?.filter((app) => app.status !== 'REJECTED').length ? dashboard.applications.filter((app) => app.status !== 'REJECTED').map((application) => (
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
