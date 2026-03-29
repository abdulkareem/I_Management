'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { IPODashboard } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

type IPOIdea = {
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
  published_internship_id?: string | null;
  published_vacancy?: number | null;
  published_category?: InternshipCategory | null;
  gender_preference?: 'BOTH' | 'BOYS' | 'GIRLS' | null;
  suggested_vacancy?: number | null;
  suggested_internship_category?: InternshipCategory | null;
  suggested_fee?: number | null;
  suggested_stipend_amount?: number | null;
  suggested_stipend_duration?: StipendDuration | null;
  suggested_minimum_days?: number | null;
  suggested_maximum_days?: number | null;
};
type College = { id: string; name: string };
type Department = { id: string; name: string };
type Program = { id: string; name: string };
type InternshipCategory = 'FREE' | 'PAID' | 'STIPEND';
type StipendDuration = 'DAY' | 'WEEK' | 'MONTH';
type IpoProfile = { id: string; name: string; email: string; company_address?: string | null; contact_number?: string | null; registration_number?: string | null; registration_year?: number | null; supervisor_name?: string | null };
type IPOInternship = {
  id: string;
  internship_title: string;
  description?: string | null;
  college_id: string;
  college_name: string;
  department_id: string;
  department_name: string;
  programme?: string | null;
  category?: InternshipCategory | null;
  vacancy?: number | null;
  minimum_days?: number | null;
  maximum_days?: number | null;
  gender_preference?: 'BOTH' | 'BOYS' | 'GIRLS' | null;
  fee?: number | null;
  stipend_amount?: number | null;
  stipend_duration?: StipendDuration | null;
  status: string;
  student_visibility: number;
  created_at?: string | null;
};

const EMPTY_CONNECT = {
  departmentId: '',
  programme: '',
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

export default function IPODashboardPage() {
  const [dashboard, setDashboard] = useState<IPODashboard | null>(null);
  const [ideas, setIdeas] = useState<IPOIdea[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [ipoInternships, setIPOInternships] = useState<IPOInternship[]>([]);
  const [selectedCollege, setSelectedCollege] = useState('');
  const [connectForm, setConnectForm] = useState(EMPTY_CONNECT);
  const [error, setError] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { vacancy: string; internshipCategory: InternshipCategory; fee: string; stipendAmount: string; stipendDuration: StipendDuration; minimumDays: string; maximumDays: string; genderPreference: 'BOTH' | 'BOYS' | 'GIRLS' }>>({});
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [ipoProfile, setIpoProfile] = useState<IpoProfile | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, {
    studentName: string;
    registerNumber: string;
    organization: string;
    duration: string;
    supervisorName: string;
    attendancePunctuality: string;
    technicalSkills: string;
    problemSolvingAbility: string;
    communicationSkills: string;
    teamwork: string;
    professionalEthics: string;
    overallPerformance: 'Excellent' | 'Good' | 'Average' | 'Poor';
    remarks: string;
    recommendation: string;
    supervisorSignature: string;
    feedbackDate: string;
  }>>({});
  const [ideasPage, setIdeasPage] = useState(1);
  const [connectSubmitting, setConnectSubmitting] = useState(false);
  const [connectSubmitted, setConnectSubmitted] = useState(false);
  const [ideaActionSubmitting, setIdeaActionSubmitting] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [internshipForms, setInternshipForms] = useState<Record<string, { title: string; description: string; vacancy: string; internshipCategory: InternshipCategory; fee: string; stipendAmount: string; stipendDuration: StipendDuration; minimumDays: string; maximumDays: string; genderPreference: 'BOTH' | 'BOYS' | 'GIRLS' }>>({});
  const [documents, setDocuments] = useState<Array<{ id: string; type: string; internship_id: string; student_id?: string | null; generated_at: string }>>([]);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [feedbackEditorOpenFor, setFeedbackEditorOpenFor] = useState<string | null>(null);
  const [feedbackSubmittingFor, setFeedbackSubmittingFor] = useState<string | null>(null);
  const [vacancyEditFor, setVacancyEditFor] = useState<string | null>(null);
  const [internshipsPage, setInternshipsPage] = useState(1);
  const [internshipsSort, setInternshipsSort] = useState<{ key: 'internship_title' | 'college_name' | 'department_name' | 'programme' | 'category' | 'vacancy' | 'status' | 'student_visibility' | 'created_at'; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  const connectFormRef = useRef<HTMLFormElement | null>(null);

  async function load() {
    const [dashboardRes, ideasRes, collegeRes, profileRes, internshipsRes, docRes] = await Promise.all([
      fetchWithSession<IPODashboard>('/api/dashboard/ipo'),
      fetchWithSession<IPOIdea[]>('/api/ipo/ideas'),
      fetchWithSession<College[]>('/api/ipo/colleges'),
      fetchWithSession<IpoProfile>('/api/ipo/profile'),
      fetchWithSession<IPOInternship[]>('/api/ipo/internships'),
      fetchWithSession<Array<{ id: string; type: string; internship_id: string; student_id?: string | null; generated_at: string }>>('/api/documents/my'),
    ]);
    setDashboard(dashboardRes.data);
    setIdeas(ideasRes.data);
    setColleges(collegeRes.data ?? []);
    const profile = profileRes.data as (IpoProfile & { address?: string | null }) | null;
    setIpoProfile(profile ? { ...profile, company_address: profile.company_address ?? profile.address ?? null } : null);
    setIPOInternships(internshipsRes.data ?? []);
    setDocuments(docRes.data ?? []);
  }

  async function downloadDocument(documentId: string) {
    const session = localStorage.getItem('internsuite.session');
    const token = session ? JSON.parse(session).token : '';
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/download`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `document-${documentId}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function previewDocument(documentId: string) {
    const payload = await fetchWithSession<{ html: string }>(`/api/documents/${documentId}/preview`);
    setDocPreview(payload.data?.html ?? null);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.'));
  }, []);

  useEffect(() => {
    if (!selectedCollege) {
      setDepartments([]);
      setPrograms([]);
      return;
    }
    fetchWithSession<Department[]>(`/api/ipo/colleges/${selectedCollege}/departments`)
      .then((res) => setDepartments(res.data ?? []))
      .catch(() => setDepartments([]));
  }, [selectedCollege]);

  useEffect(() => {
    if (!connectForm.departmentId) {
      setPrograms([]);
      return;
    }
    fetchWithSession<Program[]>(`/api/programs?departmentId=${connectForm.departmentId}`)
      .then((res) => setPrograms(res.data ?? []))
      .catch(() => setPrograms([]));
  }, [connectForm.departmentId]);

  async function submitConnectRequest() {
    if (!selectedCollege) {
      setError('Please select a college before sending.');
      return;
    }
    if (!connectForm.departmentId) {
      setError('Please select a department before sending.');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setConnectSubmitted(false);
    setConnectSubmitting(true);
    try {
      const payload = {
        college: selectedCollege,
        department: connectForm.departmentId || null,
        internshipTitle: connectForm.internshipTitle,
        natureOfWork: connectForm.natureOfWork,
        category: connectForm.internshipCategory,
        vacancy: Number(connectForm.vacancy || 0),
        genderPreference: connectForm.genderPreference,
        programme: connectForm.departmentId ? connectForm.programme || null : null,
        hourDuration: Number(connectForm.hourDuration || 0),
        fee: connectForm.internshipCategory === 'PAID' ? Number(connectForm.fee || 0) : null,
        stipendAmount: connectForm.internshipCategory === 'STIPEND' ? Number(connectForm.stipendAmount || 0) : null,
        stipendDuration: connectForm.internshipCategory === 'STIPEND' ? connectForm.stipendDuration : null,
      };
      console.log('SEND TO DEPT PAYLOAD:', payload);
      if (connectForm.departmentId && !connectForm.programme) {
        throw new Error('Please select a programme when a department is selected.');
      }
      const response = await fetchWithSession('/api/ipo/send-to-department', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      console.log('API RESPONSE:', response);
      setSelectedCollege('');
      setConnectForm(EMPTY_CONNECT);
      setDepartments([]);
      setPrograms([]);
      connectFormRef.current?.reset();
      setConnectSubmitted(true);
      setSuccessMessage('Sent to Department');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to send request to department.');
    } finally {
      setConnectSubmitting(false);
    }
  }

  async function updateIdea(ideaId: string, title: string, description: string, payload?: { vacancy: string; internshipCategory: InternshipCategory; fee: string; stipendAmount: string; stipendDuration: StipendDuration; minimumDays: string; maximumDays: string; genderPreference: 'BOTH' | 'BOYS' | 'GIRLS' }) {
    await fetchWithSession(`/api/ipo-requests/${ideaId}/update`, {
      method: 'PUT',
      body: JSON.stringify({
        internshipTitle: title,
        description,
        suggestedVacancy: payload ? Number(payload.vacancy || 0) : undefined,
        suggestedInternshipCategory: payload?.internshipCategory,
        suggestedFee: payload?.internshipCategory === 'PAID' ? Number(payload.fee || 0) : null,
        suggestedStipendAmount: payload?.internshipCategory === 'STIPEND' ? Number(payload.stipendAmount || 0) : null,
        suggestedStipendDuration: payload?.internshipCategory === 'STIPEND' ? payload.stipendDuration : null,
        suggestedMinimumDays: payload ? Number(payload.minimumDays || 0) : undefined,
        suggestedMaximumDays: payload ? Number(payload.maximumDays || 0) : undefined,
        genderPreference: payload?.genderPreference,
      }),
    });
  }

  async function saveIdea(idea: IPOIdea) {
    const payload = forms[idea.id] ?? {
      vacancy: String(idea.suggested_vacancy ?? 1),
      internshipCategory: idea.suggested_internship_category ?? 'FREE',
      fee: idea.suggested_fee ? String(idea.suggested_fee) : '',
      stipendAmount: idea.suggested_stipend_amount ? String(idea.suggested_stipend_amount) : '',
      stipendDuration: idea.suggested_stipend_duration ?? 'MONTH',
      minimumDays: idea.suggested_minimum_days ? String(idea.suggested_minimum_days) : '7',
      maximumDays: idea.suggested_maximum_days ? String(idea.suggested_maximum_days) : '30',
      genderPreference: idea.gender_preference ?? 'BOTH',
    };
    setIdeaActionSubmitting(idea.id);
    setError(null);
    setSuccessMessage(null);
    try {
      await updateIdea(idea.id, idea.internship_title, idea.description, payload);
      setEditingIdeaId(null);
      setSuccessMessage('Idea details saved.');
      await load();
    } finally {
      setIdeaActionSubmitting(null);
    }
  }

  async function acceptAndPublishIdea(idea: IPOIdea) {
    const payload = forms[idea.id] ?? { vacancy: String(idea.suggested_vacancy ?? 1), internshipCategory: idea.suggested_internship_category ?? 'FREE' as InternshipCategory, fee: idea.suggested_fee ? String(idea.suggested_fee) : '', stipendAmount: idea.suggested_stipend_amount ? String(idea.suggested_stipend_amount) : '', stipendDuration: idea.suggested_stipend_duration ?? 'MONTH' as StipendDuration, minimumDays: String(idea.suggested_minimum_days ?? 7), maximumDays: String(idea.suggested_maximum_days ?? 30), genderPreference: idea.gender_preference ?? 'BOTH' };
    setError(null);
    setSuccessMessage(null);
    setIdeaActionSubmitting(idea.id);
    try {
      await updateIdea(idea.id, idea.internship_title, idea.description, payload);
      await fetchWithSession(`/api/ipo-requests/${idea.id}/respond`, { method: 'POST', body: JSON.stringify({ status: 'ACCEPTED' }) });
      await fetchWithSession(`/api/ipo/ideas/${idea.id}/publish`, {
        method: 'POST',
        body: JSON.stringify({
          vacancy: Number(payload.vacancy || 0),
          internshipCategory: payload.internshipCategory,
          fee: payload.internshipCategory === 'PAID' ? Number(payload.fee || 0) : null,
          stipendAmount: payload.internshipCategory === 'STIPEND' ? Number(payload.stipendAmount || 0) : null,
          stipendDuration: payload.internshipCategory === 'STIPEND' ? payload.stipendDuration : null,
          minimumDays: Number(payload.minimumDays || 0),
          maximumDays: Number(payload.maximumDays || 0),
          genderPreference: payload.genderPreference,
        }),
      });
      setEditingIdeaId(null);
      setSuccessMessage('Idea accepted and published for student applications.');
      await load();
    } finally {
      setIdeaActionSubmitting(null);
    }
  }

  async function rejectIdea(ideaId: string) {
    setError(null);
    setSuccessMessage(null);
    setIdeaActionSubmitting(ideaId);
    try {
      await fetchWithSession(`/api/ipo-requests/${ideaId}/respond`, { method: 'POST', body: JSON.stringify({ status: 'REJECTED' }) });
      setSuccessMessage('Idea rejected.');
      await load();
    } finally {
      setIdeaActionSubmitting(null);
    }
  }

  async function acceptApplication(applicationId: string) {
    await fetchWithSession(`/api/ipo/applications/${applicationId}/accept`, { method: 'POST' });
    await load();
  }

  async function rejectApplication(applicationId: string) {
    await fetchWithSession(`/api/ipo/applications/${applicationId}/reject`, { method: 'POST' });
    await load();
  }

  async function completeApplication(applicationId: string) {
    await fetchWithSession(`/api/industry/applications/${applicationId}/complete`, { method: 'POST' });
    await load();
  }

  async function submitFeedback(applicationId: string) {
    const data = feedbackDraft[applicationId];
    if (!data) return;
    setFeedbackSubmittingFor(applicationId);
    setError(null);
    setSuccessMessage(null);
    try {
      await fetchWithSession(`/api/industry/applications/${applicationId}/feedback`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setFeedbackEditorOpenFor(null);
      setSuccessMessage('Feedback form saved.');
      await load();
    } finally {
      setFeedbackSubmittingFor(null);
    }
  }

  async function saveProfile() {
    if (!ipoProfile) return;
    await fetchWithSession('/api/ipo/profile', {
      method: 'PUT',
      body: JSON.stringify({
        companyAddress: ipoProfile.company_address,
        contactNumber: ipoProfile.contact_number,
        email: ipoProfile.email,
        registrationNumber: ipoProfile.registration_number,
        registrationYear: ipoProfile.registration_year,
        supervisorName: ipoProfile.supervisor_name,
      }),
    });
    setProfileOpen(false);
    await load();
  }

  async function publishInternship(internshipId: string) {
    setError(null);
    setSuccessMessage(null);
    setIdeaActionSubmitting(internshipId);
    try {
      const payload = internshipForms[internshipId];
      const response = await fetchWithSession('/api/industry/publish', {
        method: 'POST',
        body: JSON.stringify({
          id: internshipId,
          vacancy: payload ? Number(payload.vacancy || 0) : undefined,
          internshipCategory: payload?.internshipCategory,
          fee: payload?.internshipCategory === 'PAID' ? Number(payload.fee || 0) : null,
          stipendAmount: payload?.internshipCategory === 'STIPEND' ? Number(payload.stipendAmount || 0) : null,
          stipendDuration: payload?.internshipCategory === 'STIPEND' ? payload.stipendDuration : null,
          hourDuration: payload ? Number(payload.minimumDays || 0) : undefined,
          maximumDays: payload ? Number(payload.maximumDays || 0) : undefined,
          genderPreference: payload?.genderPreference,
        }),
      });
      console.log('API RESPONSE:', response);
      setSuccessMessage('Published for students.');
      await load();
    } finally {
      setIdeaActionSubmitting(null);
    }
  }

  async function saveDepartmentSuggestedInternship(internshipId: string, options?: { reload?: boolean }) {
    const payload = internshipForms[internshipId];
    if (!payload) return;
    setError(null);
    setSuccessMessage(null);
    setIdeaActionSubmitting(internshipId);
    try {
      await fetchWithSession(`/api/industry/internships/${internshipId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          vacancy: Number(payload.vacancy || 0),
          internshipCategory: payload.internshipCategory,
          fee: payload.internshipCategory === 'PAID' ? Number(payload.fee || 0) : null,
          stipendAmount: payload.internshipCategory === 'STIPEND' ? Number(payload.stipendAmount || 0) : null,
          stipendDuration: payload.internshipCategory === 'STIPEND' ? payload.stipendDuration : null,
          minimumDays: Number(payload.minimumDays || 0),
          maximumDays: Number(payload.maximumDays || 0),
          genderPreference: payload.genderPreference,
        }),
      });
      setSuccessMessage('Department suggested internship updated.');
      if (options?.reload !== false) {
        await load();
      }
    } finally {
      setIdeaActionSubmitting(null);
    }
  }

  async function saveVacancyAndRefresh(internshipId: string) {
    await saveDepartmentSuggestedInternship(internshipId, { reload: false });
    setVacancyEditFor(null);
    await load();
  }

  async function closeInternship(internshipId: string) {
    setIdeaActionSubmitting(internshipId);
    setError(null);
    setSuccessMessage(null);
    try {
      await fetchWithSession(`/api/industry/internships/${internshipId}/close`, { method: 'POST' });
      setSuccessMessage('Internship closed.');
      await load();
    } finally {
      setIdeaActionSubmitting(null);
    }
  }

  async function republishInternship(internshipId: string) {
    setIdeaActionSubmitting(internshipId);
    setError(null);
    setSuccessMessage(null);
    try {
      await fetchWithSession(`/api/industry/internships/${internshipId}/republish`, { method: 'POST' });
      setSuccessMessage('Internship published again.');
      await load();
    } finally {
      setIdeaActionSubmitting(null);
    }
  }

  async function removeInternship(internshipId: string) {
    setIdeaActionSubmitting(internshipId);
    setError(null);
    setSuccessMessage(null);
    try {
      await fetchWithSession(`/api/industry/internships/${internshipId}`, { method: 'DELETE' });
      setSuccessMessage('Internship removed.');
      await load();
    } finally {
      setIdeaActionSubmitting(null);
    }
  }

  async function generateAndSendLetters(applicationId: string) {
    setIdeaActionSubmitting(applicationId);
    setError(null);
    setSuccessMessage(null);
    try {
      await fetchWithSession(`/api/industry/applications/${applicationId}/generate-letters`, { method: 'POST' });
      setSuccessMessage('Acceptance and invitation letters generated and shared.');
      await load();
    } finally {
      setIdeaActionSubmitting(null);
    }
  }

  const pendingApplications = useMemo(() => dashboard?.applications?.filter((application) => application.status === 'PENDING') ?? [], [dashboard]);
  const acceptedApplications = useMemo(() => dashboard?.applications?.filter((application) => application.status === 'ACCEPTED') ?? [], [dashboard]);
  const departmentSuggestedInternships = useMemo(
    () => ipoInternships.filter((item) => item.status === 'SENT_TO_INDUSTRY'),
    [ipoInternships],
  );
  const ideaPageSize = 5;
  const sortedInternships = useMemo(() => {
    const rows = [...ipoInternships];
    const sign = internshipsSort.direction === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[internshipsSort.key];
      const bv = b[internshipsSort.key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign;
      return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * sign;
    });
    return rows;
  }, [ipoInternships, internshipsSort]);
  const internshipPageSize = 10;
  const paginatedInternships = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(sortedInternships.length / internshipPageSize));
    const safePage = Math.min(internshipsPage, totalPages);
    const start = (safePage - 1) * internshipPageSize;
    return { rows: sortedInternships.slice(start, start + internshipPageSize), totalPages, safePage };
  }, [sortedInternships, internshipsPage]);
  const paginatedIdeas = useMemo(() => {
    const visibleIdeas = ideas.filter((idea) => idea.status === 'PENDING');
    const totalPages = Math.max(1, Math.ceil(visibleIdeas.length / ideaPageSize));
    const safePage = Math.min(ideasPage, totalPages);
    const start = (safePage - 1) * ideaPageSize;
    return { rows: visibleIdeas.slice(start, start + ideaPageSize), totalPages, safePage };
  }, [ideas, ideasPage]);

  return (
    <RoleDashboardShell allowedRoles={['INDUSTRY']} title="IPO Dashboard" subtitle="Review department ideas, connect with colleges, publish student vacancies, and track applications.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] p-4 text-rose-800">{error}</Card> : null}
          {successMessage ? <Card className="rounded-[28px] p-4 text-emerald-800">{successMessage}</Card> : null}
          {!dashboard ? <Card className="rounded-[28px] p-4">Loading IPO data...</Card> : null}

          <Card className="rounded-[28px] p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-indigo-700">IPO details</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{ipoProfile?.name ?? dashboard?.ipo?.name ?? 'IPO'}</h2>
            <p className="mt-2 text-sm text-slate-600">Address: {ipoProfile?.company_address || '-'}</p>
          </Card>

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-[28px] p-5">Published Internships: {dashboard?.stats.liveOpportunities ?? 0}</Card>
            <Card className="rounded-[28px] p-5">Pending applications: {dashboard?.stats.pendingApplications ?? 0}</Card>
            <Card className="rounded-[28px] p-5">Accepted applications: {dashboard?.stats.acceptedApplications ?? 0}</Card>
          </section>

          <div className="flex justify-end gap-3">
            <Link href="/forgot-password" className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-900">Reset Password</Link>
            <Button variant="secondary" onClick={() => setProfileOpen((value) => !value)}>IPO Profile</Button>
          </div>

          {profileOpen && ipoProfile ? (
            <Card className="rounded-[30px] p-6">
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{ipoProfile.name}</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Input placeholder="Company address" value={ipoProfile.company_address ?? ''} onChange={(event) => setIpoProfile((prev) => (prev ? { ...prev, company_address: event.target.value } : prev))} />
                <Input placeholder="Contact number" value={ipoProfile.contact_number ?? ''} onChange={(event) => setIpoProfile((prev) => (prev ? { ...prev, contact_number: event.target.value } : prev))} />
                <Input placeholder="Email" value={ipoProfile.email ?? ''} onChange={(event) => setIpoProfile((prev) => (prev ? { ...prev, email: event.target.value } : prev))} />
                <Input placeholder="Registration number" value={ipoProfile.registration_number ?? ''} onChange={(event) => setIpoProfile((prev) => (prev ? { ...prev, registration_number: event.target.value } : prev))} />
                <Input placeholder="Registration year" value={ipoProfile.registration_year ? String(ipoProfile.registration_year) : ''} onChange={(event) => setIpoProfile((prev) => (prev ? { ...prev, registration_year: Number(event.target.value || 0) || null } : prev))} />
                <Input placeholder="Supervisor name" value={ipoProfile.supervisor_name ?? ''} onChange={(event) => setIpoProfile((prev) => (prev ? { ...prev, supervisor_name: event.target.value } : prev))} />
              </div>
              <div className="mt-4"><Button onClick={saveProfile}>Save IPO Profile</Button></div>
            </Card>
          ) : null}

          <Card className="rounded-[30px] p-6">
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Connect to College</h2>
            <form ref={connectFormRef} className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void submitConnectRequest(); }}>
              <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={selectedCollege} onChange={(e) => { setSelectedCollege(e.target.value); setConnectForm((prev) => ({ ...prev, departmentId: '', programme: '' })); }}>
                <option value="">Select college</option>
                {colleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}
              </select>
              <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={connectForm.departmentId} onChange={(e) => setConnectForm((prev) => ({ ...prev, departmentId: e.target.value, programme: '' }))}>
                <option value="">Select department</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
              <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={connectForm.programme} disabled={!connectForm.departmentId} onChange={(e) => setConnectForm((prev) => ({ ...prev, programme: e.target.value }))}>
                <option value="">{connectForm.departmentId ? 'Select programme' : 'No preference'}</option>
                {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
              </select>
              <Input placeholder="Internship title" value={connectForm.internshipTitle} onChange={(e) => setConnectForm((prev) => ({ ...prev, internshipTitle: e.target.value }))} />
              <Input placeholder="Nature of internship work" value={connectForm.natureOfWork} onChange={(e) => setConnectForm((prev) => ({ ...prev, natureOfWork: e.target.value }))} />
              <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={connectForm.genderPreference} onChange={(e) => setConnectForm((prev) => ({ ...prev, genderPreference: e.target.value }))}>
                <option value="BOTH">Girls and Boys</option>
                <option value="GIRLS">Girls only</option>
                <option value="BOYS">Boys only</option>
              </select>
              <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={connectForm.internshipCategory} onChange={(e) => setConnectForm((prev) => ({ ...prev, internshipCategory: e.target.value as InternshipCategory }))}>
                <option value="FREE">Free internship</option>
                <option value="PAID">Paid internship</option>
                <option value="STIPEND">Internship with stipend</option>
              </select>
              {connectForm.internshipCategory === 'PAID' ? <Input placeholder="Fee amount" value={connectForm.fee} onChange={(e) => setConnectForm((prev) => ({ ...prev, fee: e.target.value }))} /> : null}
              {connectForm.internshipCategory === 'STIPEND' ? <Input placeholder="Stipend amount" value={connectForm.stipendAmount} onChange={(e) => setConnectForm((prev) => ({ ...prev, stipendAmount: e.target.value }))} /> : null}
              {connectForm.internshipCategory === 'STIPEND' ? (
                <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={connectForm.stipendDuration} onChange={(e) => setConnectForm((prev) => ({ ...prev, stipendDuration: e.target.value as StipendDuration }))}>
                  <option value="DAY">Per day</option>
                  <option value="WEEK">Per week</option>
                  <option value="MONTH">Per month</option>
                </select>
              ) : null}
              <Input placeholder="Duration in hours (e.g. 60/120)" value={connectForm.hourDuration} onChange={(e) => setConnectForm((prev) => ({ ...prev, hourDuration: e.target.value }))} />
              <Input type="number" min={1} placeholder="Vacancies" value={connectForm.vacancy} onChange={(e) => setConnectForm((prev) => ({ ...prev, vacancy: e.target.value }))} />
              <Button type="submit" disabled={connectSubmitting}>
                {connectSubmitting ? 'Submitting...' : connectSubmitted ? 'Submitted' : 'Send to Department'}
              </Button>
            </form>
          </Card>

          <Card className="rounded-[30px] p-6">
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Department Suggested Ideas</h2>
            <div className="mt-5 space-y-3">
              {departmentSuggestedInternships.length ? (
                <div className="space-y-3">
                  {departmentSuggestedInternships.map((item) => {
                    const form = internshipForms[item.id] ?? {
                      title: item.internship_title ?? '',
                      description: item.description ?? '',
                      vacancy: String(item.vacancy ?? 1),
                      internshipCategory: item.category ?? 'FREE',
                      fee: item.fee ? String(item.fee) : '',
                      stipendAmount: item.stipend_amount ? String(item.stipend_amount) : '',
                      stipendDuration: item.stipend_duration ?? 'MONTH',
                      minimumDays: String(item.minimum_days ?? 60),
                      maximumDays: String(item.maximum_days ?? 90),
                      genderPreference: item.gender_preference ?? 'BOTH',
                    };
                    return (
                      <div key={item.id} className="rounded-[24px] border border-indigo-200 bg-indigo-50/40 p-4">
                        <p className="text-sm font-semibold text-indigo-700">Sent from department for ipo publish</p>
                        <p className="mt-1 text-sm text-slate-700">{item.college_name} • {item.department_name} • {item.programme || '-'}</p>
                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          <Input placeholder="Internship title" value={form.title} onChange={(e) => setInternshipForms((prev) => ({ ...prev, [item.id]: { ...form, title: e.target.value } }))} />
                          <Input type="number" min={1} placeholder="Vacancies" value={form.vacancy} onChange={(e) => setInternshipForms((prev) => ({ ...prev, [item.id]: { ...form, vacancy: e.target.value } }))} />
                          <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={form.internshipCategory} onChange={(e) => setInternshipForms((prev) => ({ ...prev, [item.id]: { ...form, internshipCategory: e.target.value as InternshipCategory } }))}>
                            <option value="FREE">Free</option>
                            <option value="PAID">Paid</option>
                            <option value="STIPEND">With Stipend</option>
                          </select>
                          <Input placeholder="Description" value={form.description} onChange={(e) => setInternshipForms((prev) => ({ ...prev, [item.id]: { ...form, description: e.target.value } }))} />
                          <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={form.genderPreference} onChange={(e) => setInternshipForms((prev) => ({ ...prev, [item.id]: { ...form, genderPreference: e.target.value as 'BOTH' | 'BOYS' | 'GIRLS' } }))}>
                            <option value="BOTH">Girls and Boys</option>
                            <option value="GIRLS">Girls only</option>
                            <option value="BOYS">Boys only</option>
                          </select>
                          <Input placeholder="Minimum hours/days" value={form.minimumDays} onChange={(e) => setInternshipForms((prev) => ({ ...prev, [item.id]: { ...form, minimumDays: e.target.value } }))} />
                          <Input placeholder="Maximum days" value={form.maximumDays} onChange={(e) => setInternshipForms((prev) => ({ ...prev, [item.id]: { ...form, maximumDays: e.target.value } }))} />
                          {form.internshipCategory === 'PAID' ? <Input placeholder="Fee" value={form.fee} onChange={(e) => setInternshipForms((prev) => ({ ...prev, [item.id]: { ...form, fee: e.target.value } }))} /> : null}
                          {form.internshipCategory === 'STIPEND' ? <Input placeholder="Stipend amount" value={form.stipendAmount} onChange={(e) => setInternshipForms((prev) => ({ ...prev, [item.id]: { ...form, stipendAmount: e.target.value } }))} /> : null}
                          {form.internshipCategory === 'STIPEND' ? (
                            <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={form.stipendDuration} onChange={(e) => setInternshipForms((prev) => ({ ...prev, [item.id]: { ...form, stipendDuration: e.target.value as StipendDuration } }))}>
                              <option value="DAY">Per day</option>
                              <option value="WEEK">Per week</option>
                              <option value="MONTH">Per month</option>
                            </select>
                          ) : null}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button variant="secondary" disabled={ideaActionSubmitting === item.id} onClick={() => void saveDepartmentSuggestedInternship(item.id)}>
                            {ideaActionSubmitting === item.id ? 'Saving...' : 'Save'}
                          </Button>
                          <Button variant="secondary" disabled={ideaActionSubmitting === item.id} onClick={() => void publishInternship(item.id)}>
                            {ideaActionSubmitting === item.id ? 'Publishing...' : 'Publish'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {paginatedIdeas.rows.length ? paginatedIdeas.rows.map((idea) => {
                const form = forms[idea.id] ?? { vacancy: String(idea.suggested_vacancy ?? 1), internshipCategory: idea.suggested_internship_category ?? 'FREE' as InternshipCategory, fee: idea.suggested_fee ? String(idea.suggested_fee) : '', stipendAmount: idea.suggested_stipend_amount ? String(idea.suggested_stipend_amount) : '', stipendDuration: idea.suggested_stipend_duration ?? 'MONTH' as StipendDuration, minimumDays: String(idea.suggested_minimum_days ?? 7), maximumDays: String(idea.suggested_maximum_days ?? 30), genderPreference: idea.gender_preference ?? 'BOTH' };
                const isEditing = editingIdeaId === idea.id;
                return (
                  <div key={idea.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <Input className="mb-2" value={idea.internship_title} disabled={!isEditing} onChange={(event) => setIdeas((prev) => prev.map((item) => (item.id === idea.id ? { ...item, internship_title: event.target.value } : item)))} />
                    <p className="mt-1 text-sm text-slate-700">{idea.college_name} • {idea.department_name}</p>
                    <p className="mt-1 text-xs text-slate-700">Programme: {idea.program_name || '-'} • CO: {idea.mapped_co || '-'} • PO: {idea.mapped_po || '-'} • PSO: {idea.mapped_pso || '-'}</p>
                    <Input className="mt-2" value={idea.description} disabled={!isEditing} onChange={(event) => setIdeas((prev) => prev.map((item) => (item.id === idea.id ? { ...item, description: event.target.value } : item)))} />
                    <Badge className="mt-2">{idea.status}</Badge>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" disabled={ideaActionSubmitting === idea.id} onClick={() => { if (isEditing) { void saveIdea(idea); return; } setEditingIdeaId(idea.id); }}>{isEditing ? (ideaActionSubmitting === idea.id ? 'Saving...' : 'Save') : 'Edit'}</Button>
                      <Button variant="secondary" disabled={ideaActionSubmitting === idea.id} onClick={() => acceptAndPublishIdea(idea)}>{ideaActionSubmitting === idea.id ? 'Submitting...' : 'Accept Idea'}</Button>
                      <Button variant="secondary" disabled={ideaActionSubmitting === idea.id} onClick={() => rejectIdea(idea.id)}>{ideaActionSubmitting === idea.id ? 'Submitting...' : 'Reject Idea'}</Button>
                    </div>
                    {isEditing ? (
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <Input type="number" min={1} placeholder="Vacancies" value={form.vacancy} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, vacancy: e.target.value } }))} />
                        <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={form.internshipCategory} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, internshipCategory: e.target.value as InternshipCategory } }))}>
                          <option value="FREE">Free</option>
                          <option value="PAID">Paid</option>
                          <option value="STIPEND">With Stipend</option>
                        </select>
                        {form.internshipCategory === 'PAID' ? <Input placeholder="Fee" value={form.fee} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, fee: e.target.value } }))} /> : null}
                        {form.internshipCategory === 'STIPEND' ? <Input placeholder="Stipend amount" value={form.stipendAmount} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, stipendAmount: e.target.value } }))} /> : null}
                        {form.internshipCategory === 'STIPEND' ? (
                          <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={form.stipendDuration} onChange={(e) => setForms((p) => ({ ...p, [idea.id]: { ...form, stipendDuration: e.target.value as StipendDuration } }))}>
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
              }) : <p className="text-slate-700">No suggested ideas found</p>}
              <div className="mt-3 flex items-center justify-between text-sm text-slate-700">
                <span>Page {paginatedIdeas.safePage} of {paginatedIdeas.totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setIdeasPage((prev) => Math.max(1, prev - 1))} disabled={paginatedIdeas.safePage <= 1}>Previous</Button>
                  <Button variant="secondary" onClick={() => setIdeasPage((prev) => Math.min(paginatedIdeas.totalPages, prev + 1))} disabled={paginatedIdeas.safePage >= paginatedIdeas.totalPages}>Next</Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[30px] p-6">
            <div className="mt-2 flex items-center justify-between gap-2">
              <h2 className="text-2xl font-semibold text-slate-900">Accepted Ideas (Published for Students)</h2>
              <Button variant="secondary" onClick={() => window.location.reload()}>Refresh</Button>
            </div>
            {docPreview ? <iframe title="Document Preview" className="mt-4 h-96 w-full rounded-lg border border-slate-200" srcDoc={docPreview} /> : null}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-700">
                    {([
                      ['internship_title', 'Internship'],
                      ['college_name', 'College'],
                      ['department_name', 'Department'],
                      ['programme', 'Programme'],
                      ['category', 'Category'],
                      ['vacancy', 'Vacancy'],
                      ['status', 'Status'],
                      ['student_visibility', 'Student visibility'],
                      ['created_at', 'Created date'],
                    ] as const).map(([key, label]) => (
                      <th key={key} className="py-2 pr-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={() => setInternshipsSort((prev) => ({
                            key,
                            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
                          }))}
                        >
                          {label}
                          <span>{internshipsSort.key === key ? (internshipsSort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
                        </button>
                      </th>
                    ))}
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInternships.rows.length ? paginatedInternships.rows.map((item) => {
                    const form = internshipForms[item.id] ?? {
                      title: item.internship_title ?? '',
                      description: item.description ?? '',
                      vacancy: String(item.vacancy ?? 1),
                      internshipCategory: item.category ?? 'FREE',
                      fee: item.fee ? String(item.fee) : '',
                      stipendAmount: item.stipend_amount ? String(item.stipend_amount) : '',
                      stipendDuration: item.stipend_duration ?? 'MONTH',
                      minimumDays: String(item.minimum_days ?? 60),
                      maximumDays: String(item.maximum_days ?? 90),
                      genderPreference: item.gender_preference ?? 'BOTH',
                    };
                    return (
                    <tr key={item.id} className="border-b border-slate-200">
                      <td className="py-3 pr-2">{item.internship_title || '-'}</td>
                      <td className="py-3 pr-2">{item.college_name || '-'}</td>
                      <td className="py-3 pr-2">{item.department_name || '-'}</td>
                      <td className="py-3 pr-2">{item.programme || '-'}</td>
                      <td className="py-3 pr-2">{item.category || '-'}</td>
                      <td className="py-3 pr-2">{item.vacancy ?? '-'}</td>
                      <td className="py-3 pr-2">
                        <Badge className={item.status === 'DRAFT' ? 'bg-slate-600' : item.status === 'SENT_TO_DEPARTMENT' ? 'bg-blue-600' : item.status === 'PUBLISHED' ? 'bg-purple-600' : item.status === 'ACCEPTED' ? (item.student_visibility ? 'bg-purple-600' : 'bg-green-600') : 'bg-slate-600'}>{item.status}</Badge>
                      </td>
                      <td className="py-3">{item.student_visibility ? 'Visible in student dashboard' : 'Not published yet'}</td>
                      <td className="py-3 pr-2">{item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {vacancyEditFor === item.id ? (
                            <>
                              <Input className="max-w-[100px]" type="number" min={0} value={form.vacancy} onChange={(e) => setInternshipForms((prev) => ({ ...prev, [item.id]: { ...form, vacancy: e.target.value } }))} />
                              <Button variant="secondary" disabled={ideaActionSubmitting === item.id} onClick={() => void saveVacancyAndRefresh(item.id)}>{ideaActionSubmitting === item.id ? 'Saving...' : 'Save Vacancy'}</Button>
                            </>
                          ) : (
                            <Button variant="secondary" disabled={ideaActionSubmitting === item.id} onClick={() => setVacancyEditFor(item.id)}>Edit Vacancy</Button>
                          )}
                          <Button
                            variant="secondary"
                            disabled={ideaActionSubmitting === item.id}
                            onClick={() => (item.status === 'CLOSED' ? void republishInternship(item.id) : void closeInternship(item.id))}
                          >
                            {ideaActionSubmitting === item.id ? (item.status === 'CLOSED' ? 'Publishing...' : 'Closing...') : (item.status === 'CLOSED' ? 'Publish Again' : 'Close')}
                          </Button>
                          <Button variant="secondary" disabled={ideaActionSubmitting === item.id} onClick={() => void removeInternship(item.id)}>{ideaActionSubmitting === item.id ? 'Removing...' : 'Remove'}</Button>
                        </div>
                      </td>
                    </tr>
                    );
                  }) : (
                    <tr>
                      <td className="py-3 text-slate-700" colSpan={10}>No internships yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-700">
              <span>Page {paginatedInternships.safePage} of {paginatedInternships.totalPages}</span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setInternshipsPage((prev) => Math.max(1, prev - 1))} disabled={paginatedInternships.safePage <= 1}>←</Button>
                <Button variant="secondary" onClick={() => setInternshipsPage((prev) => Math.min(paginatedInternships.totalPages, prev + 1))} disabled={paginatedInternships.safePage >= paginatedInternships.totalPages}>→</Button>
              </div>
            </div>
          </Card>

          <Card className="rounded-[30px] p-6">
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Received applications from students</h2>
            <div className="mt-5 space-y-3">
              {pendingApplications.length ? pendingApplications.map((application) => (
                <div key={application.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <p className="font-semibold text-slate-900">{application.studentName}</p>
                  <p className="mt-1 text-sm text-slate-700">{application.studentEmail ?? '-'} • {application.collegeName}</p>
                  <p className="mt-1 text-sm text-slate-700">{application.opportunityTitle}</p>
                  <p className="mt-1 text-xs text-slate-400">Applied: {application.createdAt ?? '-'}</p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" onClick={() => acceptApplication(application.id)}>Accept</Button>
                    <Button variant="secondary" disabled={ideaActionSubmitting === application.id} onClick={() => void generateAndSendLetters(application.id)}>
                      {ideaActionSubmitting === application.id ? 'Generating...' : 'Generate & Send Acceptance/Invitation'}
                    </Button>
                    <Button variant="secondary" onClick={() => rejectApplication(application.id)}>Reject</Button>
                  </div>
                </div>
              )) : <p className="text-slate-700">No received applications found.</p>}
            </div>
          </Card>

          <Card className="rounded-[30px] p-6">
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Accepted Applications (Approved)</h2>
            <div className="mt-5 space-y-3">
              {acceptedApplications.length ? acceptedApplications.map((application) => (
                <div key={application.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                  {(() => {
                    const approvalDocument = documents.find((doc) => doc.type === 'approval' && doc.internship_id === application.internshipId && (application.studentId ? doc.student_id === application.studentId : true));
                    return (
                      <>
                  <p className="font-semibold text-slate-900">{application.studentName}</p>
                  <p className="mt-1 text-sm text-slate-700">{application.studentEmail ?? '-'} • {application.collegeName}</p>
                  <p className="mt-1 text-sm text-slate-700">{application.opportunityTitle}</p>
                  <p className="mt-1 text-xs text-slate-400">Completed: {application.completedAt ?? 'Not completed'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => completeApplication(application.id)} disabled={Boolean(application.completedAt)}>Completed</Button>
                    <Button variant="secondary" disabled={!approvalDocument} onClick={() => approvalDocument && previewDocument(approvalDocument.id)}>Preview Approval Letter</Button>
                    <Button variant="secondary" disabled={!approvalDocument} onClick={() => approvalDocument && downloadDocument(approvalDocument.id)}>Download Approval Letter</Button>
                    <Button variant="secondary" disabled={ideaActionSubmitting === application.id} onClick={() => void generateAndSendLetters(application.id)}>
                      {ideaActionSubmitting === application.id ? 'Generating...' : 'Generate & Send Acceptance/Invitation'}
                    </Button>
                    <Button variant="secondary" onClick={() => {
                      const today = new Date().toISOString().slice(0, 10);
                      setFeedbackDraft((prev) => ({
                        ...prev,
                        [application.id]: prev[application.id] ?? {
                          studentName: application.studentName ?? '',
                          registerNumber: '',
                          organization: ipoProfile?.name ?? dashboard?.ipo?.name ?? '',
                          duration: application.opportunityTitle ?? '',
                          supervisorName: ipoProfile?.name ?? '',
                          attendancePunctuality: '3',
                          technicalSkills: '3',
                          problemSolvingAbility: '3',
                          communicationSkills: '3',
                          teamwork: '3',
                          professionalEthics: '3',
                          overallPerformance: 'Good',
                          remarks: '',
                          recommendation: '',
                          supervisorSignature: ipoProfile?.name ?? '',
                          feedbackDate: today,
                        },
                      }));
                      setFeedbackEditorOpenFor(application.id);
                    }}>
                      Open Feedback Form
                    </Button>
                  </div>
                  </>
                    );
                  })()}
                </div>
              )) : <p className="text-slate-700">No accepted applications found.</p>}
            </div>
          </Card>
          <Modal
            open={Boolean(feedbackEditorOpenFor)}
            title="INTERNSHIP PERFORMANCE FEEDBACK FORM"
            onClose={() => setFeedbackEditorOpenFor(null)}
            footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setFeedbackEditorOpenFor(null)} disabled={Boolean(feedbackEditorOpenFor && feedbackSubmittingFor === feedbackEditorOpenFor)}>Close</Button><Button disabled={Boolean(feedbackEditorOpenFor && feedbackSubmittingFor === feedbackEditorOpenFor)} onClick={() => feedbackEditorOpenFor && submitFeedback(feedbackEditorOpenFor)}>{feedbackEditorOpenFor && feedbackSubmittingFor === feedbackEditorOpenFor ? 'Saving...' : 'Submit'}</Button></div>}
          >
            {feedbackEditorOpenFor ? (
              <div className="grid gap-2 text-sm">
                {(() => { const f = feedbackDraft[feedbackEditorOpenFor]; if (!f) return null; return (
                  <>
                    <Input placeholder="Student Name" value={f.studentName} onChange={(e) => setFeedbackDraft((p) => ({ ...p, [feedbackEditorOpenFor]: { ...f, studentName: e.target.value } }))} />
                    <Input placeholder="Register Number" value={f.registerNumber} onChange={(e) => setFeedbackDraft((p) => ({ ...p, [feedbackEditorOpenFor]: { ...f, registerNumber: e.target.value } }))} />
                    <Input placeholder="Organization" value={f.organization} onChange={(e) => setFeedbackDraft((p) => ({ ...p, [feedbackEditorOpenFor]: { ...f, organization: e.target.value } }))} />
                    <Input placeholder="Duration" value={f.duration} onChange={(e) => setFeedbackDraft((p) => ({ ...p, [feedbackEditorOpenFor]: { ...f, duration: e.target.value } }))} />
                    <Input placeholder="Supervisor Name" value={f.supervisorName} onChange={(e) => setFeedbackDraft((p) => ({ ...p, [feedbackEditorOpenFor]: { ...f, supervisorName: e.target.value } }))} />
                    {([
                      ['attendancePunctuality', '1. Attendance and punctuality (1-5)'],
                      ['technicalSkills', '2. Technical skills (1-5)'],
                      ['problemSolvingAbility', '3. Problem-solving ability (1-5)'],
                      ['communicationSkills', '4. Communication skills (1-5)'],
                      ['teamwork', '5. Teamwork and collaboration (1-5)'],
                      ['professionalEthics', '6. Professional ethics and discipline (1-5)'],
                    ] as const).map(([key, label]) => (
                      <div key={key} className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">{label}</label>
                        <Input type="number" min={1} max={5} value={f[key]} onChange={(e) => setFeedbackDraft((p) => ({ ...p, [feedbackEditorOpenFor]: { ...f, [key]: e.target.value } }))} />
                      </div>
                    ))}
                    <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={f.overallPerformance} onChange={(e) => setFeedbackDraft((p) => ({ ...p, [feedbackEditorOpenFor]: { ...f, overallPerformance: e.target.value as 'Excellent' | 'Good' | 'Average' | 'Poor' } }))}>
                      <option>Excellent</option><option>Good</option><option>Average</option><option>Poor</option>
                    </select>
                    <Input placeholder="Remarks" value={f.remarks} onChange={(e) => setFeedbackDraft((p) => ({ ...p, [feedbackEditorOpenFor]: { ...f, remarks: e.target.value } }))} />
                    <Input placeholder="Recommendation" value={f.recommendation} onChange={(e) => setFeedbackDraft((p) => ({ ...p, [feedbackEditorOpenFor]: { ...f, recommendation: e.target.value } }))} />
                    <Input placeholder="Supervisor Signature" value={f.supervisorSignature} onChange={(e) => setFeedbackDraft((p) => ({ ...p, [feedbackEditorOpenFor]: { ...f, supervisorSignature: e.target.value } }))} />
                    <Input type="date" value={f.feedbackDate} onChange={(e) => setFeedbackDraft((p) => ({ ...p, [feedbackEditorOpenFor]: { ...f, feedbackDate: e.target.value } }))} />
                  </>
                ); })()}
              </div>
            ) : null}
          </Modal>

        </>
      )}
    </RoleDashboardShell>
  );
}
