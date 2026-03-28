'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { fetchWithSession, loadSession } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';
import type { DepartmentDashboard } from '@/lib/types';

type Industry = { id: string; name: string; is_linked?: number };
type ProgramOutcome = { id: string; type: 'PO' | 'PSO'; value: string };
type OutcomeDefinition = { id: string; code: string; description: string };
type DepartmentProgram = { id: string; name: string; program_outcomes: string | null; program_specific_outcomes: string | null };
type IndustryListing = { id: string; title: string; criteria?: string | null; vacancy?: number | null };
type IndustryDetails = { id: string; name: string; business_activity: string; category: string; is_linked?: number; listings: IndustryListing[] };
type InternshipType = 'FREE' | 'PAID' | 'STIPEND';
type StipendFrequency = 'DAY' | 'WEEK' | 'MONTH';
type ApplicableTo = 'INTERNAL' | 'EXTERNAL';

export default function DepartmentDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DepartmentDashboard | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [programs, setPrograms] = useState<DepartmentProgram[]>([]);
  const [programOutcomes, setProgramOutcomes] = useState<Record<string, ProgramOutcome[]>>({});
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [industryDetails, setIndustryDetails] = useState<IndustryDetails | null>(null);
  const [selectedProgramForIdea, setSelectedProgramForIdea] = useState<string>('');
  const [editingInternshipId, setEditingInternshipId] = useState<string | null>(null);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [editingOutcomeId, setEditingOutcomeId] = useState<string | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [ideasPage, setIdeasPage] = useState(1);
  const [expandedCard, setExpandedCard] = useState<Record<'external' | 'programmes' | 'ideas' | 'outcomes', boolean>>({
    external: true,
    programmes: false,
    ideas: false,
    outcomes: false,
  });
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [internshipType, setInternshipType] = useState<InternshipType>('FREE');
  const [stipendFrequency, setStipendFrequency] = useState<StipendFrequency>('MONTH');
  const [applicableTo, setApplicableTo] = useState<ApplicableTo>('EXTERNAL');
  const [selectedInternalIndustryId, setSelectedInternalIndustryId] = useState('');
  const [selectedInternalProgramId, setSelectedInternalProgramId] = useState('');
  const [internalMappings, setInternalMappings] = useState<{ po: string[]; pso: string[]; ipo: string[]; co: string[] }>({ po: [], pso: [], ipo: [], co: [] });
  const [markSection, setMarkSection] = useState<'CCA' | 'ESE' | 'FINAL'>('CCA');
  const [internshipCos, setInternshipCos] = useState<OutcomeDefinition[]>([]);
  const [internshipPos, setInternshipPos] = useState<OutcomeDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ideaSubmitting, setIdeaSubmitting] = useState(false);
  const [internshipSubmitting, setInternshipSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [advertisementDrafts, setAdvertisementDrafts] = useState<Record<string, { programId: string; mappedCo: string[]; mappedPo: string[]; mappedPso: string[] }>>({});
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [outcomeForm, setOutcomeForm] = useState<{ type: 'CO' | 'PO'; code: string; description: string }>({ type: 'CO', code: '', description: '' });
  const [markEntryModal, setMarkEntryModal] = useState<{ open: boolean; applicationId: string | null }>({ open: false, applicationId: null });
  const [markForm, setMarkForm] = useState({ attendanceMarks: '0', workRegisterMarks: '0', presentationMarks: '0', vivaMarks: '0', reportMarks: '0' });
  const [outcomeAssessmentModal, setOutcomeAssessmentModal] = useState<{ open: boolean; applicationId: string | null }>({ open: false, applicationId: null });
  const [outcomeAssessmentForm, setOutcomeAssessmentForm] = useState({ outcomeType: 'CO', outcomeId: '', studentScore: '0', supervisorScore: '0', coordinatorScore: '0' });
  const [documents, setDocuments] = useState<Array<{ id: string; type: string; internship_id: string; student_id?: string | null; generated_at: string }>>([]);
  const [docPreview, setDocPreview] = useState<string | null>(null);

  async function load() {
    const [internshipsRes, applicationsRes, requestsRes, industriesRes, programsRes, cosRes, posRes, docsRes] = await Promise.all([
      fetchWithSession<DepartmentDashboard['internships']>('/api/department/internships'),
      fetchWithSession<DepartmentDashboard['applications']>('/api/department/applications'),
      fetchWithSession<DepartmentDashboard['industryRequests']>('/api/department/industry-requests'),
      fetchWithSession<Industry[]>('/api/department/industries'),
      fetchWithSession<DepartmentProgram[]>('/api/department/programs'),
      fetchWithSession<OutcomeDefinition[]>('/api/department/internship-cos'),
      fetchWithSession<OutcomeDefinition[]>('/api/department/internship-pos'),
      fetchWithSession<Array<{ id: string; type: string; internship_id: string; student_id?: string | null; generated_at: string }>>('/api/documents/my'),
    ]);

    const loadedPrograms = (programsRes.data ?? []).map((item: any) => ({
      id: item.id,
      name: item.name,
      program_outcomes: item.program_outcomes ?? null,
      program_specific_outcomes: item.program_specific_outcomes ?? null,
    }));

    const outcomesEntries = await Promise.all(
      loadedPrograms.map(async (program) => {
        const res = await fetchWithSession<ProgramOutcome[]>(`/api/department/programs/${program.id}/outcomes`);
        return [program.id, res.data ?? []] as const;
      }),
    );

    setProgramOutcomes(Object.fromEntries(outcomesEntries));
    setDashboard({ internships: internshipsRes.data, applications: applicationsRes.data, industryRequests: requestsRes.data });
    setIndustries((industriesRes.data ?? []).map((item: any) => ({ id: item.id, name: item.name, is_linked: item.is_linked })));
    setPrograms(loadedPrograms);
    setInternshipCos(cosRes.data ?? []);
    setInternshipPos(posRes.data ?? []);
    setDocuments(docsRes.data ?? []);
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

  async function downloadStudentBundle(studentId: string) {
    const session = localStorage.getItem('internsuite.session');
    const token = session ? JSON.parse(session).token : '';
    const res = await fetch(`${API_BASE_URL}/api/documents/student-bundle?studentId=${encodeURIComponent(studentId)}`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `student-${studentId}-documents.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  useEffect(() => {
    const session = loadSession();
    if (session?.mustChangePassword) {
      router.replace('/dashboard/department/change-password');
      return;
    }
    load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard'));
  }, [router]);

  useEffect(() => {
    if (!selectedIndustry) {
      setIndustryDetails(null);
      return;
    }
    fetchWithSession<IndustryDetails>(`/api/department/industries/${selectedIndustry}`)
      .then((res) => setIndustryDetails((res.data ?? null) as IndustryDetails | null))
      .catch(() => setIndustryDetails(null));
  }, [selectedIndustry]);

  const selectedProgramOutcomes = useMemo(() => programOutcomes[selectedProgramForIdea] ?? [], [programOutcomes, selectedProgramForIdea]);
  const ideaPageSize = 5;
  const paginatedIdeas = useMemo(() => {
    const allIdeas = dashboard?.industryRequests ?? [];
    const totalPages = Math.max(1, Math.ceil(allIdeas.length / ideaPageSize));
    const safePage = Math.min(ideasPage, totalPages);
    const start = (safePage - 1) * ideaPageSize;
    return { rows: allIdeas.slice(start, start + ideaPageSize), totalPages, safePage };
  }, [dashboard?.industryRequests, ideasPage]);

  async function createInternship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const fee = Number(form.get('fee') || 0);
    const stipendAmount = Number(form.get('stipendAmount') || 0);
    const hourDuration = Number(form.get('hourDuration') || 0);
    const vacancy = Number(form.get('vacancy') || 0);
    setError(null);
    setSuccessMessage(null);

    try {
      if (hourDuration < 60) throw new Error('Duration must be at least 60 hours.');
      if (vacancy <= 0) throw new Error('Vacancy must be greater than zero.');
      if (internshipType === 'PAID' && stipendAmount > 0) throw new Error('Fee and stipend cannot coexist.');
      if (internshipType === 'STIPEND' && fee > 0) throw new Error('Fee and stipend cannot coexist.');
      if (applicableTo === 'INTERNAL' && !selectedInternalIndustryId) throw new Error('Please select a registered IPO.');
      if (applicableTo === 'INTERNAL' && !selectedInternalProgramId) throw new Error('Please select a programme.');

      setInternshipSubmitting(true);
      await fetchWithSession('/api/department/internships', {
        method: 'POST',
        body: JSON.stringify({
          title: form.get('title'),
          description: form.get('description'),
          applicableTo,
          fee: internshipType === 'PAID' ? fee : null,
          isPaid: internshipType === 'PAID',
          internshipCategory: internshipType,
          vacancy,
          stipendAmount: internshipType === 'STIPEND' ? stipendAmount : null,
          stipendDuration: internshipType === 'STIPEND' ? stipendFrequency : null,
          minimumDays: hourDuration > 0 ? hourDuration : null,
          genderPreference: form.get('genderPreference') || 'BOTH',
          isExternal: applicableTo === 'EXTERNAL',
          industryId: applicableTo === 'INTERNAL' ? selectedInternalIndustryId : null,
          programId: applicableTo === 'INTERNAL' ? selectedInternalProgramId : null,
          mappedPo: internalMappings.po,
          mappedPso: internalMappings.pso,
          mappedIpo: internalMappings.ipo,
          mappedCo: internalMappings.co,
          action: applicableTo === 'INTERNAL' ? 'send_to_industry' : 'publish',
        }),
      });
      formElement.reset();
      setInternshipType('FREE');
      setStipendFrequency('MONTH');
      setApplicableTo('EXTERNAL');
      setSelectedInternalIndustryId('');
      setSelectedInternalProgramId('');
      setInternalMappings({ po: [], pso: [], ipo: [], co: [] });
      setSuccessMessage(applicableTo === 'INTERNAL' ? 'Sent to Industry' : 'Published Successfully');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to create internship');
    } finally {
      setInternshipSubmitting(false);
    }
  }

  async function saveInternship(item: any) {
    const draft = drafts[item.id] ?? item;
    const fee = Number(draft.fee || 0);
    await fetchWithSession(`/api/department/internships/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: draft.title,
        description: draft.description,
        fee: fee > 0 ? fee : null,
        isPaid: draft.internship_category === 'PAID',
        internshipCategory: draft.internship_category || 'FREE',
        vacancy: Number(draft.vacancy ?? item.vacancy ?? 0),
      }),
    });
    setEditingInternshipId(null);
    await load();
  }

  async function deleteInternship(id: string) {
    await fetchWithSession(`/api/department/internships/${id}`, { method: 'DELETE' });
    await load();
  }

  async function submitDepartmentAdvertisement(internshipId: string) {
    const draft = advertisementDrafts[internshipId] ?? { programId: '', mappedCo: [], mappedPo: [], mappedPso: [] };
    await fetchWithSession(`/api/department/internships/${internshipId}/submit-advertisement`, {
      method: 'POST',
      body: JSON.stringify({
        programId: draft.programId || null,
        mappedCo: draft.mappedCo.join(', ') || null,
        mappedPo: draft.mappedPo.join(', ') || null,
        mappedPso: draft.mappedPso.join(', ') || null,
      }),
    });
    setEditingInternshipId(null);
    setSuccessMessage('Advertisement published for students.');
    await load();
  }

  async function createIndustryRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const mappedCo = form.getAll('mappedCo').join(', ');
    const mappedPo = [...form.getAll('mappedPo'), ...form.getAll('mappedProgramPo')].join(', ');
    const mappedPso = form.getAll('mappedPso').join(', ');
    setError(null);
    setSuccessMessage(null);

    try {
      setIdeaSubmitting(true);
      await fetchWithSession('/api/industry-requests', {
        method: 'POST',
        body: JSON.stringify({
          industryId: form.get('industryId'),
          internshipTitle: form.get('internshipTitle'),
          description: form.get('description'),
          programId: form.get('programId') || null,
          mappedCo: mappedCo || null,
          mappedPo: mappedPo || null,
          mappedPso: mappedPso || null,
        }),
      });
      formElement.reset();
      setSelectedProgramForIdea('');
      setSelectedIndustry('');
      setIdeasPage(1);
      setSuccessMessage('Idea submitted successfully.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to create industry request');
    } finally {
      setIdeaSubmitting(false);
    }
  }

  async function saveIdea(item: any) {
    const draft = drafts[item.id] ?? item;
    await fetchWithSession(`/api/department/industry-requests/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        internshipTitle: draft.internship_title,
        description: draft.description,
        programId: draft.program_id || null,
        mappedCo: draft.mapped_co || null,
        mappedPo: draft.mapped_po || null,
        mappedPso: draft.mapped_pso || null,
      }),
    });
    setEditingIdeaId(null);
    await load();
  }

  async function deleteIdea(id: string) {
    await fetchWithSession(`/api/department/industry-requests/${id}`, { method: 'DELETE' });
    await load();
  }

  async function addProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetchWithSession('/api/department/programs', { method: 'POST', body: JSON.stringify({ name: form.get('name') }) });
    event.currentTarget.reset();
    await load();
  }

  async function updateProgram(program: DepartmentProgram) {
    const draft = drafts[program.id] ?? program;
    await fetchWithSession(`/api/department/programs/${program.id}`, { method: 'PUT', body: JSON.stringify({ name: draft.name }) });
    setEditingProgramId(null);
    await load();
  }

  async function deleteProgram(id: string) {
    await fetchWithSession(`/api/department/programs/${id}`, { method: 'DELETE' });
    await load();
  }

  async function addProgramOutcome(programId: string, type: 'PO' | 'PSO') {
    const key = `${programId}-${type}-new`;
    const value = drafts[key];
    if (!value) return;
    await fetchWithSession(`/api/department/programs/${programId}/outcomes`, { method: 'POST', body: JSON.stringify({ type, value }) });
    setDrafts((prev) => ({ ...prev, [key]: '' }));
    await load();
  }

  async function saveProgramOutcome(programId: string, outcome: ProgramOutcome) {
    const draft = drafts[outcome.id] ?? outcome;
    await fetchWithSession(`/api/department/programs/${programId}/outcomes/${outcome.id}`, { method: 'PUT', body: JSON.stringify({ type: draft.type, value: draft.value }) });
    setEditingOutcomeId(null);
    await load();
  }

  async function deleteProgramOutcome(programId: string, outcomeId: string) {
    await fetchWithSession(`/api/department/programs/${programId}/outcomes/${outcomeId}`, { method: 'DELETE' });
    await load();
  }

  async function saveInternshipOutcomeDefinition() {
    if (!outcomeForm.code.trim() || !outcomeForm.description.trim()) return;
    const endpoint = outcomeForm.type === 'CO' ? '/api/department/internship-cos' : '/api/department/internship-pos';
    await fetchWithSession(endpoint, { method: 'POST', body: JSON.stringify({ code: outcomeForm.code.trim(), description: outcomeForm.description.trim() }) });
    setOutcomeModalOpen(false);
    setOutcomeForm({ type: 'CO', code: '', description: '' });
    await load();
  }

  async function acceptApplication(id: string) {
    await fetchWithSession(`/api/department/applications/${id}/accept`, { method: 'POST' });
    await load();
  }

  async function rejectApplication(id: string) {
    await fetchWithSession(`/api/department/applications/${id}/reject`, { method: 'POST' });
    await load();
  }

  async function completeApplication(id: string) {
    await fetchWithSession(`/api/department/applications/${id}/complete`, { method: 'POST' });
    await load();
  }

  async function saveEvaluationMarks() {
    if (!markEntryModal.applicationId) return;
    await fetchWithSession(`/api/department/applications/${markEntryModal.applicationId}/evaluation`, {
      method: 'POST',
      body: JSON.stringify({
        attendanceMarks: Number(markForm.attendanceMarks || 0),
        workRegisterMarks: Number(markForm.workRegisterMarks || 0),
        presentationMarks: Number(markForm.presentationMarks || 0),
        vivaMarks: Number(markForm.vivaMarks || 0),
        reportMarks: Number(markForm.reportMarks || 0),
      }),
    });
    setMarkEntryModal({ open: false, applicationId: null });
    setMarkForm({ attendanceMarks: '0', workRegisterMarks: '0', presentationMarks: '0', vivaMarks: '0', reportMarks: '0' });
    await load();
  }

  async function saveOutcomeAssessment() {
    if (!outcomeAssessmentModal.applicationId || !outcomeAssessmentForm.outcomeId.trim()) return;
    await fetchWithSession(`/api/department/applications/${outcomeAssessmentModal.applicationId}/outcome-assessment`, {
      method: 'POST',
      body: JSON.stringify({
        outcomeId: outcomeAssessmentForm.outcomeId.trim(),
        outcomeType: outcomeAssessmentForm.outcomeType,
        studentScore: Number(outcomeAssessmentForm.studentScore || 0),
        supervisorScore: Number(outcomeAssessmentForm.supervisorScore || 0),
        coordinatorScore: Number(outcomeAssessmentForm.coordinatorScore || 0),
      }),
    });
    setOutcomeAssessmentModal({ open: false, applicationId: null });
    setOutcomeAssessmentForm({ outcomeType: 'CO', outcomeId: '', studentScore: '0', supervisorScore: '0', coordinatorScore: '0' });
    await load();
  }

  const metrics = useMemo(() => ({ internships: dashboard?.internships.length ?? 0, pendingApplications: dashboard?.applications.filter((item) => item.status === 'pending').length ?? 0, industryIdeas: dashboard?.industryRequests.length ?? 0, programs: programs.length }), [dashboard, programs]);
  const session = loadSession();
  const dashboardTitle = `${session?.user?.email?.split('@')[0] ?? 'Department'} Dashboard`;
  const industryAdvertisements = (dashboard?.internships ?? []).filter((item: any) => item.status === 'SENT_TO_DEPARTMENT');
  const internalApps = (dashboard?.applications ?? []).filter((item: any) => item.is_internal_student === 1 && item.status !== 'rejected');
  const externalApps = (dashboard?.applications ?? []).filter((item: any) => {
    const differentCollege = item.is_external_by_college === 1;
    return (item.is_external === 1 || differentCollege) && item.status !== 'rejected';
  });
  const parseMappings = (value?: string | null) => value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];

  const toggleDraftSelection = (internshipId: string, field: 'mappedCo' | 'mappedPo' | 'mappedPso', value: string) => {
    setAdvertisementDrafts((prev) => {
      const current = prev[internshipId] ?? { programId: '', mappedCo: [], mappedPo: [], mappedPso: [] };
      const items = current[field];
      const nextItems = items.includes(value) ? items.filter((entry) => entry !== value) : [...items, value];
      return { ...prev, [internshipId]: { ...current, [field]: nextItems } };
    });
  };
  const toggleInternalMapping = (field: 'po' | 'pso' | 'ipo' | 'co', value: string) => {
    setInternalMappings((prev) => {
      const current = prev[field];
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  return (
    <RoleDashboardShell allowedRoles={['DEPARTMENT_COORDINATOR', 'COORDINATOR']} title={dashboardTitle} subtitle="Manage programs, PO/PSO mapping, internships, ideas and student applications.">
      {() => (
        <>
          {error ? <Card className="rounded-[20px] p-4 text-rose-800">{error}</Card> : null}
          {successMessage ? <Card className="rounded-[20px] p-4 text-emerald-800">{successMessage}</Card> : null}
          <section className="grid gap-4 md:grid-cols-4">
            <Card className="rounded-[20px] p-4">Internships: {metrics.internships}</Card>
            <Card className="rounded-[20px] p-4">Pending: {metrics.pendingApplications}</Card>
            <Card className="rounded-[20px] p-4">Ideas: {metrics.industryIdeas}</Card>
            <Card className="rounded-[20px] p-4">Programmes: {metrics.programs}</Card>
          </section>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-900">Reset Password</Link>
          </div>

          <section className="grid gap-4 md:grid-cols-4">
            <Card className="rounded-[20px] p-4">
              <button type="button" className="w-full text-left text-lg font-semibold" onClick={() => setExpandedCard((prev) => ({ ...prev, external: !prev.external }))}>
                Create Internship
              </button>
              {expandedCard.external ? (
                <form className="mt-3 grid gap-3" onSubmit={createInternship}>
                  <input name="title" placeholder="Internship title" required />
                  <textarea name="description" placeholder="Description" required />
                  <select name="applicableTo" value={applicableTo} onChange={(e) => setApplicableTo(e.target.value as ApplicableTo)}>
                    <option value="EXTERNAL">External Students</option>
                    <option value="INTERNAL">Internal Students</option>
                  </select>
                  {applicableTo === 'INTERNAL' ? (
                    <>
                      <select name="industryId" value={selectedInternalIndustryId} onChange={(e) => setSelectedInternalIndustryId(e.target.value)} required>
                        <option value="">Select Registered Industry (IPO)</option>
                        {industries.map((industry) => <option key={industry.id} value={industry.id}>{industry.name}</option>)}
                      </select>
                      <select name="programId" value={selectedInternalProgramId} onChange={(e) => setSelectedInternalProgramId(e.target.value)} required>
                        <option value="">Select Programme</option>
                        {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                      </select>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <p className="text-sm font-semibold">Program Outcomes (PO)</p>
                          {(programOutcomes[selectedInternalProgramId] ?? []).filter((entry) => entry.type === 'PO').map((entry) => (
                            <label key={`po-${entry.id}`} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={internalMappings.po.includes(entry.value)} onChange={() => toggleInternalMapping('po', entry.value)} />{entry.value}</label>
                          ))}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Program Specific Outcomes (PSO)</p>
                          {(programOutcomes[selectedInternalProgramId] ?? []).filter((entry) => entry.type === 'PSO').map((entry) => (
                            <label key={`pso-${entry.id}`} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={internalMappings.pso.includes(entry.value)} onChange={() => toggleInternalMapping('pso', entry.value)} />{entry.value}</label>
                          ))}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Internship Program Outcomes (IPO)</p>
                          {internshipPos.map((entry) => (
                            <label key={`ipo-${entry.id}`} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={internalMappings.ipo.includes(entry.code)} onChange={() => toggleInternalMapping('ipo', entry.code)} />{entry.code}</label>
                          ))}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Internship Course Outcomes (CO)</p>
                          {internshipCos.map((entry) => (
                            <label key={`co-${entry.id}`} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={internalMappings.co.includes(entry.code)} onChange={() => toggleInternalMapping('co', entry.code)} />{entry.code}</label>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}
                  {applicableTo === 'EXTERNAL' ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-semibold">Internship CO Mapping</p>
                        {internshipCos.map((entry) => (
                          <label key={`ext-co-${entry.id}`} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={internalMappings.co.includes(entry.code)} onChange={() => toggleInternalMapping('co', entry.code)} />{entry.code} — {entry.description}</label>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Internship PO Mapping</p>
                        {internshipPos.map((entry) => (
                          <label key={`ext-po-${entry.id}`} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={internalMappings.ipo.includes(entry.code)} onChange={() => toggleInternalMapping('ipo', entry.code)} />{entry.code} — {entry.description}</label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <select name="internshipCategory" value={internshipType} onChange={(e) => setInternshipType(e.target.value as InternshipType)}>
                    <option value="FREE">Free Internship</option>
                    <option value="PAID">Paid Internship</option>
                    <option value="STIPEND">Internship with Stipend</option>
                  </select>
                  {internshipType === 'PAID' ? <input name="fee" type="number" min={0} placeholder="Fee amount" required /> : null}
                  {internshipType === 'STIPEND' ? <input name="stipendAmount" type="number" min={0} placeholder="Stipend amount" required /> : null}
                  {internshipType === 'STIPEND' ? (
                    <select name="stipendDuration" value={stipendFrequency} onChange={(e) => setStipendFrequency(e.target.value as StipendFrequency)}>
                      <option value="DAY">Per day</option>
                      <option value="WEEK">Per week</option>
                      <option value="MONTH">Per month</option>
                    </select>
                  ) : null}
                  <select name="genderPreference" defaultValue="BOTH">
                    <option value="BOTH">Boys or Girls</option>
                    <option value="BOYS">Boys only</option>
                    <option value="GIRLS">Girls only</option>
                  </select>
                  <input name="hourDuration" type="number" min={60} placeholder="Duration in hours (minimum 60)" required />
                  <input name="vacancy" type="number" min={0} placeholder="Vacancy" required />
                  <Button disabled={internshipSubmitting}>{internshipSubmitting ? 'Submitting...' : applicableTo === 'INTERNAL' ? 'Send to Industry' : 'Publish'}</Button>
                </form>
              ) : <p className="mt-2 text-sm text-slate-700">Tap to expand and create internships for internal or external students.</p>}
            </Card>
            <Card className="rounded-[20px] p-4">
              <button type="button" className="w-full text-left text-lg font-semibold" onClick={() => setExpandedCard((prev) => ({ ...prev, programmes: !prev.programmes }))}>
                Department Programmes (with PO/PSO)
              </button>
              {expandedCard.programmes ? (
                <form className="mt-3 grid gap-2" onSubmit={addProgram}>
                  <input name="name" placeholder="Programme name (eg. BSc Physics)" required />
                  <Button>Add Programme</Button>
                </form>
              ) : <p className="mt-2 text-sm text-slate-700">Tap to expand and manage programme entries.</p>}
            </Card>
            <Card className="rounded-[20px] p-4">
              <button type="button" className="w-full text-left text-lg font-semibold" onClick={() => setExpandedCard((prev) => ({ ...prev, ideas: !prev.ideas }))}>
                Suggest Internship Idea to Internship Provider Organization (IPO)
              </button>
              {expandedCard.ideas ? (
                <form className="mt-3 grid gap-3" onSubmit={createIndustryRequest}>
                  <select name="industryId" value={selectedIndustry} onChange={(e) => setSelectedIndustry(e.target.value)} required>
                    <option value="">Select registered Internship Provider Organization (IPO)</option>
                    {industries.map((industry) => <option key={industry.id} value={industry.id}>{industry.name}{industry.is_linked ? '' : ' (auto-link on submit)'}</option>)}
                  </select>
                  {industryDetails ? (
                    <div className="rounded-lg border border-slate-200 p-2 text-sm text-slate-700">
                      <p>Activity: {industryDetails.business_activity}</p>
                      <p>Category: {industryDetails.category || '-'}</p>
                      {!industryDetails.is_linked ? <p className="mt-1 text-amber-200">This IPO is registered but not linked to your college yet. It will be linked automatically when you submit this idea.</p> : null}
                      <p className="mt-1 font-semibold">Internship Provider Organization (IPO) listings & vacancies:</p>
                      {industryDetails.listings.map((listing) => (
                        <p key={listing.id}>• {listing.title} ({listing.vacancy ?? 0} vacancy)</p>
                      ))}
                    </div>
                  ) : null}
                  <input name="internshipTitle" placeholder="Internship title" required />
                  <textarea name="description" placeholder="Idea description" required />
                  <select name="programId" value={selectedProgramForIdea} onChange={(e) => setSelectedProgramForIdea(e.target.value)}>
                    <option value="">Select programme</option>
                    {programs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  {selectedProgramForIdea ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-semibold">Map Internship CO</p>
                        {internshipCos.map((entry) => (
                          <label key={entry.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="mappedCo" value={entry.code} />{entry.code}</label>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Map Internship PO</p>
                        {internshipPos.map((entry) => (
                          <label key={entry.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="mappedPo" value={entry.code} />{entry.code}</label>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Map Programme PO</p>
                        {selectedProgramOutcomes.filter((entry) => entry.type === 'PO').map((entry) => (
                          <label key={entry.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="mappedProgramPo" value={entry.value} />{entry.value}</label>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Map Programme PSO</p>
                        {selectedProgramOutcomes.filter((entry) => entry.type === 'PSO').map((entry) => (
                          <label key={entry.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="mappedPso" value={entry.value} />{entry.value}</label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <Button disabled={ideaSubmitting}>{ideaSubmitting ? 'Submitting...' : 'Submit Idea'}</Button>
                </form>
              ) : <p className="mt-2 text-sm text-slate-700">Tap to expand and propose internships to Internship Provider Organizations (IPOs).</p>}
            </Card>
            <Card className="rounded-[20px] p-4">
              <button type="button" className="w-full text-left text-lg font-semibold" onClick={() => setExpandedCard((prev) => ({ ...prev, outcomes: !prev.outcomes }))}>
                Internship Outcomes Setup
              </button>
              {expandedCard.outcomes ? (
                <div className="mt-3 grid gap-2">
                  <Button onClick={() => { setOutcomeForm({ type: 'CO', code: '', description: '' }); setOutcomeModalOpen(true); }}>Add Internship CO (CO1–CO6)</Button>
                  <Button onClick={() => { setOutcomeForm({ type: 'PO', code: '', description: '' }); setOutcomeModalOpen(true); }}>Add Internship PO (PO1–PO10)</Button>
                  <p className="text-xs text-slate-700">COs: {internshipCos.map((entry) => entry.code).join(', ') || '-'}</p>
                  <p className="text-xs text-slate-700">POs: {internshipPos.map((entry) => entry.code).join(', ') || '-'}</p>
                </div>
              ) : <p className="mt-2 text-sm text-slate-700">Tap to expand and add CO/PO definitions.</p>}
            </Card>
          </section>

          {expandedCard.programmes ? (
            <Card className="rounded-[20px] p-5">
              <h2 className="mb-3 text-xl font-semibold">Department Programmes</h2>
              <div className="space-y-4">
                {programs.map((program) => (
                  <div key={program.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {editingProgramId === program.id ? (
                        <input value={drafts[program.id]?.name ?? program.name} onChange={(e) => setDrafts((prev) => ({ ...prev, [program.id]: { ...(prev[program.id] ?? program), name: e.target.value } }))} />
                      ) : <p className="font-semibold">{program.name}</p>}
                      <Button variant="secondary" onClick={() => setEditingProgramId(program.id)}>Edit</Button>
                      <Button variant="secondary" onClick={() => updateProgram(program)}>Save</Button>
                      <Button variant="secondary" onClick={() => deleteProgram(program.id)}>Delete</Button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {['PO', 'PSO'].map((type) => (
                        <div key={`${program.id}-${type}`} className="rounded-lg border border-slate-200 p-2">
                          <p className="mb-2 text-sm font-semibold">{type} entries</p>
                          {(programOutcomes[program.id] ?? []).filter((entry) => entry.type === type).map((entry) => (
                            <div key={entry.id} className="mb-2 flex gap-2">
                              <input value={drafts[entry.id]?.value ?? entry.value} onChange={(e) => setDrafts((prev) => ({ ...prev, [entry.id]: { ...(prev[entry.id] ?? entry), value: e.target.value, type } }))} />
                              {editingOutcomeId === entry.id ? (
                                <Button variant="secondary" onClick={() => saveProgramOutcome(program.id, entry)}>Save</Button>
                              ) : (
                                <Button variant="secondary" onClick={() => setEditingOutcomeId(entry.id)}>Edit</Button>
                              )}
                              <Button variant="secondary" onClick={() => deleteProgramOutcome(program.id, entry.id)}>Delete</Button>
                            </div>
                          ))}
                          <div className="mt-2 flex gap-2">
                            <input placeholder={`Add ${type}`} value={drafts[`${program.id}-${type}-new`] ?? ''} onChange={(e) => setDrafts((prev) => ({ ...prev, [`${program.id}-${type}-new`]: e.target.value }))} />
                            <Button onClick={() => addProgramOutcome(program.id, type as 'PO' | 'PSO')}>Add</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-[20px] p-5">
              <h2 className="mb-3 text-xl font-semibold">Linked Internship Provider Organizations (IPOs)</h2>
              <p className="mb-2 text-xs text-slate-700">These links come from your college. Selecting an IPO in “Submit Idea” will auto-link it when needed.</p>
              <div className="space-y-2">
                {industries.filter((item) => item.is_linked).length ? industries.filter((item) => item.is_linked).map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-2">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-emerald-800">Linked to your college</p>
                  </div>
                )) : <p className="text-sm text-slate-700">No IPO links are active for your college yet.</p>}
              </div>
            </Card>
            <Card className="rounded-[20px] p-5">
              <h2 className="mb-3 text-xl font-semibold">Internship Listings</h2>
              {dashboard?.internships?.map((item) => (
                <div key={item.id} className="mb-2 rounded-lg border border-slate-200 p-2">
                  {editingInternshipId === item.id ? (
                    <div className="grid gap-2">
                      <input value={drafts[item.id]?.title ?? item.title} onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? item), title: e.target.value } }))} />
                      <textarea value={drafts[item.id]?.description ?? item.description} onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? item), description: e.target.value } }))} />
                      <select value={drafts[item.id]?.internship_category ?? item.internship_category ?? 'FREE'} onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? item), internship_category: e.target.value } }))}>
                        <option value="FREE">Free Internship</option>
                        <option value="STIPEND">Internship with Stipend</option>
                        <option value="PAID">Paid Internship</option>
                      </select>
                      <input type="number" min={0} value={drafts[item.id]?.fee ?? item.fee ?? 0} onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? item), fee: e.target.value } }))} />
                      <input type="number" min={0} value={drafts[item.id]?.vacancy ?? item.vacancy ?? 0} onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? item), vacancy: e.target.value } }))} />
                    </div>
                  ) : (
                    <>
                      <p>{item.title}</p>
                      <p className="text-xs text-slate-700">{item.description}</p>
                      <p className="text-xs text-slate-400">Category: {item.internship_category || 'FREE'} • Vacancy: {item.vacancy ?? 0} • {item.status} {item.industry_id ? '(industry)' : '(internal)'}</p>
                    </>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button variant="secondary" onClick={() => setEditingInternshipId(item.id)}>Edit</Button>
                    <Button variant="secondary" onClick={() => saveInternship(item)}>Save</Button>
                    <Button variant="secondary" onClick={() => deleteInternship(item.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </Card>

          </section>

          <Card className="rounded-[20px] p-5">
            <h2 className="mb-3 text-xl font-semibold">Applications Submitted by Internal Students</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-700">
                    <th className="py-2 pr-3">Student</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Internship</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">IPO Feedback</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {internalApps.map((app) => (
                    <tr key={app.id} className="border-t border-slate-200">
                      <td className="py-2 pr-3">{app.student_name}</td>
                      <td className="py-2 pr-3">{app.student_email}</td>
                      <td className="py-2 pr-3">{app.internship_title}</td>
                      <td className="py-2 pr-3 uppercase">{app.status}</td>
                      <td className="py-2 pr-3">{(app as any).industry_feedback ? `${(app as any).industry_feedback} (${(app as any).industry_score ?? '-'}/10)` : '-'}</td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => acceptApplication(app.id)} disabled={app.status === 'accepted'}>Accept</Button>
                          {app.status !== 'accepted' ? <Button variant="secondary" onClick={() => rejectApplication(app.id)}>Reject</Button> : null}
                          <Button variant="secondary" onClick={() => completeApplication(app.id)} disabled={app.status !== 'accepted' || Boolean(app.completed_at)}>Mark Completed</Button>
                          <Button variant="secondary" onClick={() => setMarkEntryModal({ open: true, applicationId: app.id })} disabled={!Boolean(app.completed_at)}>Enter Evaluation</Button>
                          <Button variant="secondary" onClick={() => setOutcomeAssessmentModal({ open: true, applicationId: app.id })} disabled={!Boolean(app.completed_at)}>Outcome Assessment Engine</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="rounded-[20px] p-5">
            <h2 className="mb-3 text-xl font-semibold">Applications Received from External Students</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-700">
                    <th className="py-2 pr-3">Student</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Internship</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">IPO Feedback</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {externalApps.map((app) => (
                    <tr key={app.id} className="border-t border-slate-200">
                      <td className="py-2 pr-3">{app.student_name}</td>
                      <td className="py-2 pr-3">{app.student_email}</td>
                      <td className="py-2 pr-3">{app.internship_title}</td>
                      <td className="py-2 pr-3 uppercase">{app.status}</td>
                      <td className="py-2 pr-3">{(app as any).industry_feedback ? `${(app as any).industry_feedback} (${(app as any).industry_score ?? '-'}/10)` : '-'}</td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => acceptApplication(app.id)} disabled={app.status === 'accepted'}>Accept</Button>
                          {app.status !== 'accepted' ? <Button variant="secondary" onClick={() => rejectApplication(app.id)}>Reject</Button> : null}
                          <Button variant="secondary" onClick={() => completeApplication(app.id)} disabled={app.status !== 'accepted' || Boolean(app.completed_at)}>Mark Completed</Button>
                          <Button variant="secondary" onClick={() => setMarkEntryModal({ open: true, applicationId: app.id })} disabled={!Boolean(app.completed_at)}>Enter Evaluation</Button>
                          <Button variant="secondary" onClick={() => setOutcomeAssessmentModal({ open: true, applicationId: app.id })} disabled={!Boolean(app.completed_at)}>Outcome Assessment Engine</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="rounded-[20px] p-5">
            <h2 className="mb-3 text-xl font-semibold">Department Documents (Audit Ready)</h2>
            <p className="mb-3 text-sm text-slate-600">Approval letters, reply letters, allotments, and feedback forms.</p>
            <div className="space-y-2">
              {documents.length ? documents.map((doc) => (
                <div key={doc.id} className="flex flex-wrap items-center justify-between rounded-lg border border-slate-200 p-3">
                  <p className="text-sm text-slate-700">{doc.type.toUpperCase()} • Internship {doc.internship_id} • Student {doc.student_id ?? 'N/A'}</p>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => previewDocument(doc.id)}>Preview</Button>
                    <Button variant="secondary" onClick={() => downloadDocument(doc.id)}>Download PDF</Button>
                  </div>
                </div>
              )) : <p className="text-sm text-slate-700">No documents generated yet.</p>}
            </div>
            {docPreview ? <iframe title="Department Document Preview" className="mt-4 h-96 w-full rounded-lg border border-slate-200" srcDoc={docPreview} /> : null}
          </Card>

          <Card className="rounded-[20px] p-5">
            <h2 className="mb-3 text-xl font-semibold">Download All Documents (ZIP)</h2>
            <div className="space-y-2">
              {dashboard?.applications?.length ? dashboard.applications.map((app) => (
                <div key={`bundle-${app.id}`} className="flex flex-wrap items-center justify-between rounded-lg border border-slate-200 p-3">
                  <p className="text-sm text-slate-700">{app.student_name} • {app.internship_title}</p>
                  <Button variant="secondary" onClick={() => downloadStudentBundle((app as any).student_id)} disabled={!(app as any).student_id}>Download All Documents (ZIP)</Button>
                </div>
              )) : <p className="text-sm text-slate-700">No student records available for bundles.</p>}
            </div>
          </Card>

          <Modal
            open={outcomeModalOpen}
            title={`Add Internship ${outcomeForm.type}`}
            onClose={() => {
              setOutcomeModalOpen(false);
              setOutcomeForm({ type: 'CO', code: '', description: '' });
            }}
            footer={(
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => { setOutcomeModalOpen(false); setOutcomeForm({ type: 'CO', code: '', description: '' }); }}>Close</Button>
                <Button onClick={saveInternshipOutcomeDefinition}>Save</Button>
              </div>
            )}
          >
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm">
                Outcome Type
                <select value={outcomeForm.type} onChange={(e) => setOutcomeForm((prev) => ({ ...prev, type: e.target.value as 'CO' | 'PO' }))}>
                  <option value="CO">CO</option>
                  <option value="PO">PO</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Code
                <input value={outcomeForm.code} onChange={(e) => setOutcomeForm((prev) => ({ ...prev, code: e.target.value }))} placeholder="CO1 / PO1" />
              </label>
              <label className="grid gap-1 text-sm">
                Description
                <textarea value={outcomeForm.description} onChange={(e) => setOutcomeForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Outcome description" />
              </label>
            </div>
          </Modal>

          <Modal
            open={markEntryModal.open}
            title="Internship Evaluation Entry"
            onClose={() => {
              setMarkEntryModal({ open: false, applicationId: null });
              setMarkForm({ attendanceMarks: '0', workRegisterMarks: '0', presentationMarks: '0', vivaMarks: '0', reportMarks: '0' });
            }}
            footer={(
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setMarkEntryModal({ open: false, applicationId: null })}>Close</Button>
                <Button variant="secondary" onClick={() => setMarkSection('CCA')}>CCA Evaluation</Button>
                <Button variant="secondary" onClick={() => setMarkSection('ESE')}>ESE Evaluation</Button>
                <Button variant="secondary" onClick={() => setMarkSection('FINAL')}>Final Evaluation</Button>
                <Button onClick={saveEvaluationMarks}>Save All</Button>
              </div>
            )}
          >
            <div className="grid gap-3">
              {(markSection === 'CCA' || markSection === 'FINAL') ? (
                <div className="grid gap-3 md:grid-cols-2 rounded-lg border border-slate-200 p-3">
                  <p className="md:col-span-2 text-sm font-semibold">CCA (15): Attendance & Performance Feedback (9) + Work Register (6)</p>
                  <label className="grid gap-1 text-sm">Attendance & Performance Feedback (0-9)<input type="number" min={0} max={9} value={markForm.attendanceMarks} onChange={(e) => setMarkForm((prev) => ({ ...prev, attendanceMarks: e.target.value }))} /></label>
                  <label className="grid gap-1 text-sm">Work Register (0-6)<input type="number" min={0} max={6} value={markForm.workRegisterMarks} onChange={(e) => setMarkForm((prev) => ({ ...prev, workRegisterMarks: e.target.value }))} /></label>
                </div>
              ) : null}
              {(markSection === 'ESE' || markSection === 'FINAL') ? (
                <div className="grid gap-3 md:grid-cols-2 rounded-lg border border-slate-200 p-3">
                  <p className="md:col-span-2 text-sm font-semibold">ESE (35): Presentation (14) + Viva (14) + Report (7)</p>
                  <label className="grid gap-1 text-sm">Presentation (0-14)<input type="number" min={0} max={14} value={markForm.presentationMarks} onChange={(e) => setMarkForm((prev) => ({ ...prev, presentationMarks: e.target.value }))} /></label>
                  <label className="grid gap-1 text-sm">Viva Voce (0-14)<input type="number" min={0} max={14} value={markForm.vivaMarks} onChange={(e) => setMarkForm((prev) => ({ ...prev, vivaMarks: e.target.value }))} /></label>
                  <label className="grid gap-1 text-sm md:col-span-2">Internship Report (0-7)<input type="number" min={0} max={7} value={markForm.reportMarks} onChange={(e) => setMarkForm((prev) => ({ ...prev, reportMarks: e.target.value }))} /></label>
                </div>
              ) : null}
              <div className="rounded-lg border border-slate-200 p-3 text-sm">
                <p><strong>Final Evaluation</strong>: CCA + ESE = 50</p>
                <p>Current Total: {Number(markForm.attendanceMarks || 0) + Number(markForm.workRegisterMarks || 0) + Number(markForm.presentationMarks || 0) + Number(markForm.vivaMarks || 0) + Number(markForm.reportMarks || 0)} / 50</p>
              </div>
            </div>
          </Modal>

          <Modal
            open={outcomeAssessmentModal.open}
            title="Outcome Assessment Engine"
            onClose={() => {
              setOutcomeAssessmentModal({ open: false, applicationId: null });
              setOutcomeAssessmentForm({ outcomeType: 'CO', outcomeId: '', studentScore: '0', supervisorScore: '0', coordinatorScore: '0' });
            }}
            footer={(
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setOutcomeAssessmentModal({ open: false, applicationId: null })}>Close</Button>
                <Button onClick={saveOutcomeAssessment}>Save</Button>
              </div>
            )}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">Outcome Type
                <select value={outcomeAssessmentForm.outcomeType} onChange={(e) => setOutcomeAssessmentForm((prev) => ({ ...prev, outcomeType: e.target.value }))}>
                  <option value="CO">CO</option>
                  <option value="PO">PO</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">Outcome Code<input value={outcomeAssessmentForm.outcomeId} onChange={(e) => setOutcomeAssessmentForm((prev) => ({ ...prev, outcomeId: e.target.value }))} placeholder="CO1 / PO2" /></label>
              <label className="grid gap-1 text-sm">Student Score (0-5)<input type="number" min={0} max={5} value={outcomeAssessmentForm.studentScore} onChange={(e) => setOutcomeAssessmentForm((prev) => ({ ...prev, studentScore: e.target.value }))} /></label>
              <label className="grid gap-1 text-sm">Supervisor Score (0-5)<input type="number" min={0} max={5} value={outcomeAssessmentForm.supervisorScore} onChange={(e) => setOutcomeAssessmentForm((prev) => ({ ...prev, supervisorScore: e.target.value }))} /></label>
              <label className="grid gap-1 text-sm md:col-span-2">Coordinator Score (0-5)<input type="number" min={0} max={5} value={outcomeAssessmentForm.coordinatorScore} onChange={(e) => setOutcomeAssessmentForm((prev) => ({ ...prev, coordinatorScore: e.target.value }))} /></label>
            </div>
          </Modal>
        </>
      )}
    </RoleDashboardShell>
  );
}
