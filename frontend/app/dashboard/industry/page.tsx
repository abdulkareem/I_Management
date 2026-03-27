'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { IndustryDashboard } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

type IndustryIdea = {
  id: string;
  internship_title: string;
  description: string;
  status: string;
  department_name: string;
  college_name: string;
  mapped_co?: string | null;
  mapped_po?: string | null;
  mapped_pso?: string | null;
  program_name?: string | null;
};
type College = { id: string; name: string };
type Department = { id: string; name: string };
type InternshipCategory = 'FREE' | 'PAID' | 'STIPEND';
type StipendDuration = 'DAY' | 'WEEK' | 'MONTH';
type IpoProfile = { id: string; name: string; email: string; company_address?: string | null; contact_number?: string | null; registration_number?: string | null; registration_year?: number | null };

const EMPTY_CONNECT = {
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
};

export default function IndustryDashboardPage() {
  const [dashboard, setDashboard] = useState<IndustryDashboard | null>(null);
  const [ideas, setIdeas] = useState<IndustryIdea[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedCollege, setSelectedCollege] = useState('');
  const [connectForm, setConnectForm] = useState(EMPTY_CONNECT);
  const [error, setError] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { vacancy: string; internshipCategory: InternshipCategory; fee: string; stipendAmount: string; stipendDuration: StipendDuration; minimumDays: string; maximumDays: string }>>({});
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [ipoProfile, setIpoProfile] = useState<IpoProfile | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, { feedback: string; score: string }>>({});
  const [ideasPage, setIdeasPage] = useState(1);

  async function load() {
    const [dashboardRes, ideasRes, collegeRes, profileRes] = await Promise.all([
      fetchWithSession<IndustryDashboard>('/industry/dashboard'),
      fetchWithSession<IndustryIdea[]>('/api/industry/ideas'),
      fetchWithSession<College[]>('/api/industry/colleges'),
      fetchWithSession<IpoProfile>('/api/industry/profile'),
    ]);
    setDashboard(dashboardRes.data);
    setIdeas(ideasRes.data);
    setColleges(collegeRes.data ?? []);
    setIpoProfile(profileRes.data ?? null);
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
    if (!selectedCollege) {
      setError('Please select a college before sending.');
      return;
    }
    await fetchWithSession('/api/industry/connect-request', {
      method: 'POST',
      body: JSON.stringify({
        collegeId: selectedCollege,
        departmentId: connectForm.departmentId || null,
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
    setSelectedCollege('');
    setConnectForm(EMPTY_CONNECT);
    setDepartments([]);
    await load();
  }

  async function updateIdea(ideaId: string, title: string, description: string) {
    await fetchWithSession(`/api/industry-requests/${ideaId}/update`, {
      method: 'PUT',
      body: JSON.stringify({ internshipTitle: title, description }),
    });
  }

  async function acceptAndPublishIdea(idea: IndustryIdea) {
    const payload = forms[idea.id] ?? { vacancy: '1', internshipCategory: 'FREE' as InternshipCategory, fee: '', stipendAmount: '', stipendDuration: 'MONTH' as StipendDuration, minimumDays: '7', maximumDays: '30' };
    await updateIdea(idea.id, idea.internship_title, idea.description);
    await fetchWithSession(`/api/industry-requests/${idea.id}/respond`, { method: 'POST', body: JSON.stringify({ status: 'ACCEPTED' }) });
    await fetchWithSession(`/api/industry/ideas/${idea.id}/publish`, {
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
    setEditingIdeaId(null);
    await load();
  }

  async function rejectIdea(ideaId: string) {
    await fetchWithSession(`/api/industry-requests/${ideaId}/respond`, { method: 'POST', body: JSON.stringify({ status: 'REJECTED' }) });
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

  async function completeApplication(applicationId: string) {
    await fetchWithSession(`/api/industry/applications/${applicationId}/complete`, { method: 'POST' });
    await load();
  }

  async function submitFeedback(applicationId: string) {
    const data = feedbackDraft[applicationId];
    if (!data?.feedback || !data?.score) return;
    await fetchWithSession(`/api/industry/applications/${applicationId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback: data.feedback, score: Number(data.score) }),
    });
    await load();
  }

  async function saveProfile() {
    if (!ipoProfile) return;
    await fetchWithSession('/api/industry/profile', {
      method: 'PUT',
      body: JSON.stringify({
        companyAddress: ipoProfile.company_address,
        contactNumber: ipoProfile.contact_number,
        email: ipoProfile.email,
        registrationNumber: ipoProfile.registration_number,
        registrationYear: ipoProfile.registration_year,
      }),
    });
    setProfileOpen(false);
    await load();
  }

  const pendingApplications = useMemo(() => dashboard?.applications?.filter((application) => application.status === 'PENDING') ?? [], [dashboard]);
  const acceptedApplications = useMemo(() => dashboard?.applications?.filter((application) => application.status === 'ACCEPTED') ?? [], [dashboard]);
  const ideaPageSize = 5;
  const paginatedIdeas = useMemo(() => {
    const visibleIdeas = ideas.filter((idea) => idea.status !== 'REJECTED');
    const totalPages = Math.max(1, Math.ceil(visibleIdeas.length / ideaPageSize));
    const safePage = Math.min(ideasPage, totalPages);
    const start = (safePage - 1) * ideaPageSize;
    return { rows: visibleIdeas.slice(start, start + ideaPageSize), totalPages, safePage };
  }, [ideas, ideasPage]);

  return (
    <RoleDashboardShell allowedRoles={['INDUSTRY']} title="Internship Providing Organization Dashboard" subtitle="Review department ideas, connect with colleges, publish student vacancies, and track applications.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] p-4 text-rose-200">{error}</Card> : null}
          {!dashboard ? <Card className="rounded-[28px] p-4">Loading IPO data...</Card> : null}

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-[28px] p-5">e internships: {dashboard?.stats.liveOpportunities ?? 0}</Card>
            <Card className="rounded-[28px] p-5">Pending applications: {dashboard?.stats.pendingApplications ?? 0}</Card>
            <Card className="rounded-[28px] p-5">Accepted applications: {dashboard?.stats.acceptedApplications ?? 0}</Card>
          </section>

          <div className="flex justify-end gap-3">
            <Link href="/forgot-password" className="rounded-full border border-white/20 px-4 py-2 text-sm text-white">Reset Password</Link>
            <Button variant="secondary" onClick={() => setProfileOpen((value) => !value)}>IPO Profile</Button>
          </div>

          {profileOpen && ipoProfile ? (
            <Card className="rounded-[30px] p-6">
              <h2 className="mt-2 text-2xl font-semibold text-white">{ipoProfile.name}</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Input placeholder="Company address" value={ipoProfile.company_address ?? ''} onChange={(event) => setIpoProfile((prev) => (prev ? { ...prev, company_address: event.target.value } : prev))} />
                <Input placeholder="Contact number" value={ipoProfile.contact_number ?? ''} onChange={(event) => setIpoProfile((prev) => (prev ? { ...prev, contact_number: event.target.value } : prev))} />
                <Input placeholder="Email" value={ipoProfile.email ?? ''} onChange={(event) => setIpoProfile((prev) => (prev ? { ...prev, email: event.target.value } : prev))} />
                <Input placeholder="Registration number" value={ipoProfile.registration_number ?? ''} onChange={(event) => setIpoProfile((prev) => (prev ? { ...prev, registration_number: event.target.value } : prev))} />
                <Input placeholder="Registration year" value={ipoProfile.registration_year ? String(ipoProfile.registration_year) : ''} onChange={(event) => setIpoProfile((prev) => (prev ? { ...prev, registration_year: Number(event.target.value || 0) || null } : prev))} />
              </div>
              <div className="mt-4"><Button onClick={saveProfile}>Save IPO Profile</Button></div>
            </Card>
          ) : null}

          <Card className="rounded-[30px] p-6">
            <h2 className="mt-2 text-2xl font-semibold text-white">Connect to College</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <select className="rounded-md border border-white/20 bg-slate-900 px-3 py-2" value={selectedCollege} onChange={(e) => { setSelectedCollege(e.target.value); setConnectForm((prev) => ({ ...prev, departmentId: '' })); }}>
                <option value="">Select college</option>
                {colleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}
              </select>
              <select className="rounded-md border border-white/20 bg-slate-900 px-3 py-2" value={connectForm.departmentId} onChange={(e) => setConnectForm((prev) => ({ ...prev, departmentId: e.target.value }))}>
                <option value="">No preference (all departments)</option>
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
              {paginatedIdeas.rows.length ? paginatedIdeas.rows.map((idea) => {
                const form = forms[idea.id] ?? { vacancy: '1', internshipCategory: 'FREE' as InternshipCategory, fee: '', stipendAmount: '', stipendDuration: 'MONTH' as StipendDuration, minimumDays: '7', maximumDays: '30' };
                const isEditing = editingIdeaId === idea.id;
                return (
                  <div key={idea.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <Input className="mb-2" value={idea.internship_title} disabled={!isEditing} onChange={(event) => setIdeas((prev) => prev.map((item) => (item.id === idea.id ? { ...item, internship_title: event.target.value } : item)))} />
                    <p className="mt-1 text-sm text-slate-300">{idea.college_name} • {idea.department_name}</p>
                    <p className="mt-1 text-xs text-slate-300">Programme: {idea.program_name || '-'} • CO: {idea.mapped_co || '-'} • PO: {idea.mapped_po || '-'} • PSO: {idea.mapped_pso || '-'}</p>
                    <Input className="mt-2" value={idea.description} disabled={!isEditing} onChange={(event) => setIdeas((prev) => prev.map((item) => (item.id === idea.id ? { ...item, description: event.target.value } : item)))} />
                    <Badge className="mt-2">{idea.status}</Badge>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setEditingIdeaId(isEditing ? null : idea.id)}>{isEditing ? 'Close Edit' : 'Edit'}</Button>
                      <Button variant="secondary" onClick={() => acceptAndPublishIdea(idea)}>Accept Idea</Button>
                      <Button variant="secondary" onClick={() => rejectIdea(idea.id)}>Reject Idea</Button>
                    </div>
                    {isEditing ? (
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
                      </div>
                    ) : null}
                  </div>
                );
              }) : <p className="text-slate-300">No suggested ideas found</p>}
              <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                <span>Page {paginatedIdeas.safePage} of {paginatedIdeas.totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setIdeasPage((prev) => Math.max(1, prev - 1))} disabled={paginatedIdeas.safePage <= 1}>Previous</Button>
                  <Button variant="secondary" onClick={() => setIdeasPage((prev) => Math.min(paginatedIdeas.totalPages, prev + 1))} disabled={paginatedIdeas.safePage >= paginatedIdeas.totalPages}>Next</Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[30px] p-6">
            <h2 className="mt-2 text-2xl font-semibold text-white">Received applications from students</h2>
            <div className="mt-5 space-y-3">
              {pendingApplications.length ? pendingApplications.map((application) => (
                <div key={application.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold text-white">{application.studentName}</p>
                  <p className="mt-1 text-sm text-slate-300">{application.studentEmail ?? '-'} • {application.collegeName}</p>
                  <p className="mt-1 text-sm text-slate-300">{application.opportunityTitle}</p>
                  <p className="mt-1 text-xs text-slate-400">Applied: {application.createdAt ?? '-'}</p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" onClick={() => acceptApplication(application.id)}>Accept</Button>
                    <Button variant="secondary" onClick={() => rejectApplication(application.id)}>Reject</Button>
                  </div>
                </div>
              )) : <p className="text-slate-300">No received applications found.</p>}
            </div>
          </Card>

          <Card className="rounded-[30px] p-6">
            <h2 className="mt-2 text-2xl font-semibold text-white">Accepted Applications (Approved)</h2>
            <div className="mt-5 space-y-3">
              {acceptedApplications.length ? acceptedApplications.map((application) => (
                <div key={application.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold text-white">{application.studentName}</p>
                  <p className="mt-1 text-sm text-slate-300">{application.studentEmail ?? '-'} • {application.collegeName}</p>
                  <p className="mt-1 text-sm text-slate-300">{application.opportunityTitle}</p>
                  <p className="mt-1 text-xs text-slate-400">Completed: {application.completedAt ?? 'Not completed'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => completeApplication(application.id)} disabled={Boolean(application.completedAt)}>Completed</Button>
                    <Input placeholder="Feedback" value={feedbackDraft[application.id]?.feedback ?? application.industryFeedback ?? ''} onChange={(event) => setFeedbackDraft((prev) => ({ ...prev, [application.id]: { feedback: event.target.value, score: prev[application.id]?.score ?? String(application.industryScore ?? '') } }))} />
                    <Input placeholder="Score /10" value={feedbackDraft[application.id]?.score ?? String(application.industryScore ?? '')} onChange={(event) => setFeedbackDraft((prev) => ({ ...prev, [application.id]: { feedback: prev[application.id]?.feedback ?? application.industryFeedback ?? '', score: event.target.value } }))} />
                    <Button variant="secondary" onClick={() => submitFeedback(application.id)}>Save Feedback</Button>
                  </div>
                </div>
              )) : <p className="text-slate-300">No accepted applications found.</p>}
            </div>
          </Card>
        </>
      )}
    </RoleDashboardShell>
  );
}
