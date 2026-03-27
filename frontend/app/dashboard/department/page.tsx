'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWithSession, loadSession } from '@/lib/auth';
import type { DepartmentDashboard } from '@/lib/types';

type Industry = { id: string; name: string; is_linked?: number };
type ProgramOutcome = { id: string; type: 'PO' | 'PSO'; value: string };
type OutcomeDefinition = { id: string; code: string; description: string };
type DepartmentProgram = { id: string; name: string; program_outcomes: string | null; program_specific_outcomes: string | null };
type IndustryListing = { id: string; title: string; criteria?: string | null; vacancy?: number | null };
type IndustryDetails = { id: string; name: string; business_activity: string; category: string; is_linked?: number; listings: IndustryListing[] };
type InternshipType = 'FREE' | 'PAID' | 'STIPEND';
type StipendFrequency = 'DAY' | 'WEEK' | 'MONTH';

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
  const [internshipCos, setInternshipCos] = useState<OutcomeDefinition[]>([]);
  const [internshipPos, setInternshipPos] = useState<OutcomeDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ideaSubmitting, setIdeaSubmitting] = useState(false);
  const [internshipSubmitting, setInternshipSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function load() {
    const [internshipsRes, applicationsRes, requestsRes, industriesRes, programsRes, cosRes, posRes] = await Promise.all([
      fetchWithSession<DepartmentDashboard['internships']>('/api/department/internships'),
      fetchWithSession<DepartmentDashboard['applications']>('/api/department/applications'),
      fetchWithSession<DepartmentDashboard['industryRequests']>('/api/department/industry-requests'),
      fetchWithSession<Industry[]>('/api/department/industries'),
      fetchWithSession<DepartmentProgram[]>('/api/department/programs'),
      fetchWithSession<OutcomeDefinition[]>('/api/department/internship-cos'),
      fetchWithSession<OutcomeDefinition[]>('/api/department/internship-pos'),
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
    setError(null);
    setSuccessMessage(null);

    try {
      setInternshipSubmitting(true);
      await fetchWithSession('/api/department/internships', {
        method: 'POST',
        body: JSON.stringify({
          title: form.get('title'),
          description: form.get('description'),
          fee: internshipType === 'PAID' ? fee : null,
          isPaid: internshipType === 'PAID',
          internshipCategory: internshipType,
          vacancy: Number(form.get('vacancy') || 0),
          stipendAmount: internshipType === 'STIPEND' ? stipendAmount : null,
          stipendDuration: internshipType === 'STIPEND' ? stipendFrequency : null,
          minimumDays: hourDuration > 0 ? hourDuration : null,
          isExternal: true,
        }),
      });
      formElement.reset();
      setInternshipType('FREE');
      setStipendFrequency('MONTH');
      setSuccessMessage('Internship submitted successfully.');
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

  async function addInternshipOutcome(type: 'CO' | 'PO') {
    const code = window.prompt(`Enter ${type} code (eg. ${type}1)`);
    const description = window.prompt(`Enter ${type} description`);
    if (!code || !description) return;
    const endpoint = type === 'CO' ? '/api/department/internship-cos' : '/api/department/internship-pos';
    await fetchWithSession(endpoint, { method: 'POST', body: JSON.stringify({ code, description }) });
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

  async function enterEvaluation(applicationId: string) {
    const attendanceMarks = Number(window.prompt('Attendance marks (0-9)', '0') ?? '0');
    const workRegisterMarks = Number(window.prompt('Work register marks (0-6)', '0') ?? '0');
    const presentationMarks = Number(window.prompt('Presentation marks (0-14)', '0') ?? '0');
    const vivaMarks = Number(window.prompt('Viva marks (0-14)', '0') ?? '0');
    const reportMarks = Number(window.prompt('Report marks (0-7)', '0') ?? '0');
    await fetchWithSession(`/api/department/applications/${applicationId}/evaluation`, {
      method: 'POST',
      body: JSON.stringify({ attendanceMarks, workRegisterMarks, presentationMarks, vivaMarks, reportMarks }),
    });
    await load();
  }

  async function enterOutcomeAssessment(applicationId: string) {
    const outcomeType = (window.prompt('Outcome type: CO or PO', 'CO') ?? 'CO').toUpperCase();
    const outcomeId = window.prompt('Enter outcome code (example: CO1 or PO2)', '');
    const studentScore = Number(window.prompt('Student score (0-5)', '0') ?? '0');
    const supervisorScore = Number(window.prompt('Internship Provider Organization supervisor score (0-5)', '0') ?? '0');
    const coordinatorScore = Number(window.prompt('Department coordinator score (0-5)', '0') ?? '0');
    if (!outcomeId) return;
    await fetchWithSession(`/api/department/applications/${applicationId}/outcome-assessment`, {
      method: 'POST',
      body: JSON.stringify({ outcomeId, outcomeType, studentScore, supervisorScore, coordinatorScore }),
    });
    await load();
  }

  const metrics = useMemo(() => ({ internships: dashboard?.internships.length ?? 0, pendingApplications: dashboard?.applications.filter((item) => item.status === 'pending').length ?? 0, industryIdeas: dashboard?.industryRequests.length ?? 0, programs: programs.length }), [dashboard, programs]);
  const session = loadSession();
  const dashboardTitle = `${session?.user?.email?.split('@')[0] ?? 'Department'} Dashboard`;
  const internalApps = (dashboard?.applications ?? []).filter((item) => item.is_external !== 1 && item.status !== 'rejected');
  const externalApps = (dashboard?.applications ?? []).filter((item) => item.is_external === 1 && item.status !== 'rejected');

  return (
    <RoleDashboardShell allowedRoles={['DEPARTMENT_COORDINATOR', 'COORDINATOR']} title={dashboardTitle} subtitle="Manage programs, PO/PSO mapping, internships, ideas and student applications.">
      {() => (
        <>
          {error ? <Card className="rounded-[20px] p-4 text-rose-200">{error}</Card> : null}
          {successMessage ? <Card className="rounded-[20px] p-4 text-emerald-200">{successMessage}</Card> : null}
          <section className="grid gap-4 md:grid-cols-4">
            <Card className="rounded-[20px] p-4">Internships: {metrics.internships}</Card>
            <Card className="rounded-[20px] p-4">Pending: {metrics.pendingApplications}</Card>
            <Card className="rounded-[20px] p-4">Ideas: {metrics.industryIdeas}</Card>
            <Card className="rounded-[20px] p-4">Programmes: {metrics.programs}</Card>
          </section>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="rounded-full border border-white/20 px-4 py-2 text-sm text-white">Reset Password</Link>
          </div>

          <section className="grid gap-4 md:grid-cols-4">
            <Card className="rounded-[20px] p-4">
              <button type="button" className="w-full text-left text-lg font-semibold" onClick={() => setExpandedCard((prev) => ({ ...prev, external: !prev.external }))}>
                Create Internship for External Students
              </button>
              {expandedCard.external ? (
                <form className="mt-3 grid gap-3" onSubmit={createInternship}>
                  <input name="title" placeholder="Internship title" required />
                  <textarea name="description" placeholder="Description" required />
                  <select name="internshipCategory" value={internshipType} onChange={(e) => setInternshipType(e.target.value as InternshipType)}>
                    <option value="FREE">Free Internship</option>
                    <option value="PAID">Paid Internship</option>
                    <option value="STIPEND">Internship with Stipend</option>
                  </select>
                  {internshipType !== 'FREE' ? <input name="fee" type="number" min={0} placeholder={internshipType === 'PAID' ? 'Fee amount' : 'Stipend amount'} required /> : null}
                  {internshipType === 'STIPEND' ? (
                    <select name="stipendDuration" value={stipendFrequency} onChange={(e) => setStipendFrequency(e.target.value as StipendFrequency)}>
                      <option value="DAY">Per day</option>
                      <option value="WEEK">Per week</option>
                      <option value="MONTH">Per month</option>
                    </select>
                  ) : null}
                  <input name="hourDuration" type="number" min={0} placeholder="Duration in hours (e.g. 60 or 120)" />
                  <Button disabled={internshipSubmitting}>{internshipSubmitting ? 'Submitting...' : 'Create Internship'}</Button>
                </form>
              ) : <p className="mt-2 text-sm text-slate-300">Tap to expand and create internships for external students.</p>}
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
              ) : <p className="mt-2 text-sm text-slate-300">Tap to expand and manage programme entries.</p>}
            </Card>
            <Card className="rounded-[20px] p-4">
              <button type="button" className="w-full text-left text-lg font-semibold" onClick={() => setExpandedCard((prev) => ({ ...prev, ideas: !prev.ideas }))}>
                Suggest Internship Provider Organization (IPO) Internship Idea
              </button>
              {expandedCard.ideas ? (
                <form className="mt-3 grid gap-3" onSubmit={createIndustryRequest}>
                  <select name="industryId" value={selectedIndustry} onChange={(e) => setSelectedIndustry(e.target.value)} required>
                    <option value="">Select registered Internship Provider Organization (IPO)</option>
                    {industries.map((industry) => <option key={industry.id} value={industry.id}>{industry.name}{industry.is_linked ? '' : ' (auto-link on submit)'}</option>)}
                  </select>
                  {industryDetails ? (
                    <div className="rounded-lg border border-white/10 p-2 text-sm text-slate-300">
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
              ) : <p className="mt-2 text-sm text-slate-300">Tap to expand and propose internships to Internship Provider Organizations (IPOs).</p>}
            </Card>
            <Card className="rounded-[20px] p-4">
              <button type="button" className="w-full text-left text-lg font-semibold" onClick={() => setExpandedCard((prev) => ({ ...prev, outcomes: !prev.outcomes }))}>
                Internship Outcomes Setup
              </button>
              {expandedCard.outcomes ? (
                <div className="mt-3 grid gap-2">
                  <Button onClick={() => addInternshipOutcome('CO')}>Add Internship CO (CO1–CO6)</Button>
                  <Button onClick={() => addInternshipOutcome('PO')}>Add Internship PO (PO1–PO10)</Button>
                  <p className="text-xs text-slate-300">COs: {internshipCos.map((entry) => entry.code).join(', ') || '-'}</p>
                  <p className="text-xs text-slate-300">POs: {internshipPos.map((entry) => entry.code).join(', ') || '-'}</p>
                </div>
              ) : <p className="mt-2 text-sm text-slate-300">Tap to expand and add CO/PO definitions.</p>}
            </Card>
          </section>

          <Card className="rounded-[20px] p-5">
            <h2 className="mb-3 text-xl font-semibold">Department Programmes</h2>
            <div className="space-y-4">
              {programs.map((program) => (
                <div key={program.id} className="rounded-xl border border-white/10 p-3">
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
                      <div key={`${program.id}-${type}`} className="rounded-lg border border-white/10 p-2">
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

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-[20px] p-5">
              <h2 className="mb-3 text-xl font-semibold">Linked Internship Provider Organizations (IPOs)</h2>
              <p className="mb-2 text-xs text-slate-300">These links come from your college. Selecting an IPO in “Submit Idea” will auto-link it when needed.</p>
              <div className="space-y-2">
                {industries.filter((item) => item.is_linked).length ? industries.filter((item) => item.is_linked).map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 p-2">
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-xs text-emerald-200">Linked to your college</p>
                  </div>
                )) : <p className="text-sm text-slate-300">No IPO links are active for your college yet.</p>}
              </div>
            </Card>
            <Card className="rounded-[20px] p-5">
              <h2 className="mb-3 text-xl font-semibold">Internship Listings</h2>
              {dashboard?.internships?.map((item) => (
                <div key={item.id} className="mb-2 rounded-lg border border-white/10 p-2">
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
                      <p className="text-xs text-slate-300">{item.description}</p>
                      <p className="text-xs text-slate-400">Category: {item.internship_category || 'FREE'} • Vacancy: {item.vacancy ?? 0} • {item.status}</p>
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

            <Card className="rounded-[20px] p-5">
              <h2 className="mb-3 text-xl font-semibold">Suggested Internship Provider Organization (IPO) Ideas</h2>
              {paginatedIdeas.rows.map((item: any) => (
                <div key={item.id} className="mb-2 rounded-lg border border-white/10 p-2">
                  {editingIdeaId === item.id ? (
                    <div className="grid gap-2">
                      <input value={drafts[item.id]?.internship_title ?? item.internship_title} onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? item), internship_title: e.target.value } }))} />
                      <textarea value={drafts[item.id]?.description ?? item.description} onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? item), description: e.target.value } }))} />
                    </div>
                  ) : (
                    <>
                      <button type="button" className="w-full text-left" onClick={() => setSelectedIdeaId((prev) => prev === item.id ? null : item.id)}>
                        <p>{item.internship_title} • {item.industry_name}</p>
                        <p className="text-xs text-slate-300">Programme: {item.program_name || '-'} • {item.status}</p>
                      </button>
                      {selectedIdeaId === item.id ? (
                        <p className="mt-1 text-xs text-slate-300">CO Mapping: {item.mapped_co || '-'} • PO Mapping: {item.mapped_po || '-'} • PSO Mapping: {item.mapped_pso || '-'}</p>
                      ) : null}
                    </>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button variant="secondary" onClick={() => setEditingIdeaId(item.id)}>Edit</Button>
                    <Button variant="secondary" onClick={() => saveIdea(item)}>Save</Button>
                    <Button variant="secondary" onClick={() => deleteIdea(item.id)}>Delete</Button>
                  </div>
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                <span>Page {paginatedIdeas.safePage} of {paginatedIdeas.totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setIdeasPage((prev) => Math.max(1, prev - 1))} disabled={paginatedIdeas.safePage <= 1}>Previous</Button>
                  <Button variant="secondary" onClick={() => setIdeasPage((prev) => Math.min(paginatedIdeas.totalPages, prev + 1))} disabled={paginatedIdeas.safePage >= paginatedIdeas.totalPages}>Next</Button>
                </div>
              </div>
            </Card>
          </section>

          <Card className="rounded-[20px] p-5">
            <h2 className="mb-3 text-xl font-semibold">Internal Applications Submitted by Students</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-300">
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
                    <tr key={app.id} className="border-t border-white/10">
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
                          <Button variant="secondary" onClick={() => enterEvaluation(app.id)} disabled={!Boolean(app.completed_at)}>Enter Evaluation</Button>
                          <Button variant="secondary" onClick={() => enterOutcomeAssessment(app.id)} disabled={!Boolean(app.completed_at)}>Outcome Assessment Engine</Button>
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
                  <tr className="text-left text-slate-300">
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
                    <tr key={app.id} className="border-t border-white/10">
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
                          <Button variant="secondary" onClick={() => enterEvaluation(app.id)} disabled={!Boolean(app.completed_at)}>Enter Evaluation</Button>
                          <Button variant="secondary" onClick={() => enterOutcomeAssessment(app.id)} disabled={!Boolean(app.completed_at)}>Outcome Assessment Engine</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </RoleDashboardShell>
  );
}
