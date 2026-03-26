'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWithSession, loadSession } from '@/lib/auth';
import type { DepartmentDashboard } from '@/lib/types';

type Industry = { id: string; name: string };
type ProgramOutcome = { id: string; type: 'PO' | 'PSO'; value: string };
type DepartmentProgram = { id: string; name: string; program_outcomes: string | null; program_specific_outcomes: string | null };
type IndustryListing = { id: string; title: string; criteria?: string | null; vacancy?: number | null };
type IndustryDetails = { id: string; name: string; business_activity: string; category: string; listings: IndustryListing[] };

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
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [internshipsRes, applicationsRes, requestsRes, industriesRes, programsRes] = await Promise.all([
      fetchWithSession<DepartmentDashboard['internships']>('/api/department/internships'),
      fetchWithSession<DepartmentDashboard['applications']>('/api/department/applications'),
      fetchWithSession<DepartmentDashboard['industryRequests']>('/api/department/industry-requests'),
      fetchWithSession<Industry[]>('/api/department/industries'),
      fetchWithSession<DepartmentProgram[]>('/api/department/programs'),
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
    setIndustries((industriesRes.data ?? []).map((item: any) => ({ id: item.id, name: item.name })));
    setPrograms(loadedPrograms);
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

  async function createInternship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fee = Number(form.get('fee') || 0);
    setError(null);
    try {
      await fetchWithSession('/api/department/internships', {
        method: 'POST',
        body: JSON.stringify({
          title: form.get('title'),
          description: form.get('description'),
          fee: fee > 0 ? fee : null,
          isPaid: fee > 0,
          isExternal: true,
        }),
      });
      event.currentTarget.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to create internship');
    }
  }

  async function saveInternship(item: any) {
    const draft = drafts[item.id] ?? item;
    await fetchWithSession(`/api/department/internships/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title: draft.title, description: draft.description, fee: Number(draft.fee || 0) || null }),
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
    const form = new FormData(event.currentTarget);
    const mappedPo = form.getAll('mappedPo').join(', ');
    const mappedPso = form.getAll('mappedPso').join(', ');
    setError(null);

    try {
      await fetchWithSession('/api/industry-requests', {
        method: 'POST',
        body: JSON.stringify({
          industryId: form.get('industryId'),
          internshipTitle: form.get('internshipTitle'),
          description: form.get('description'),
          programId: form.get('programId') || null,
          mappedPo: mappedPo || null,
          mappedPso: mappedPso || null,
        }),
      });
      event.currentTarget.reset();
      setSelectedProgramForIdea('');
      setSelectedIndustry('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to create industry request');
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
    await load();
  }

  async function deleteProgramOutcome(programId: string, outcomeId: string) {
    await fetchWithSession(`/api/department/programs/${programId}/outcomes/${outcomeId}`, { method: 'DELETE' });
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

  const metrics = useMemo(() => ({ internships: dashboard?.internships.length ?? 0, pendingApplications: dashboard?.applications.filter((item) => item.status === 'pending').length ?? 0, industryIdeas: dashboard?.industryRequests.length ?? 0, programs: programs.length }), [dashboard, programs]);

  return (
    <RoleDashboardShell allowedRoles={['DEPARTMENT_COORDINATOR', 'COORDINATOR']} title="Department Dashboard" subtitle="Manage programs, PO/PSO mapping, internships, ideas and student applications.">
      {() => (
        <>
          {error ? <Card className="rounded-[20px] p-4 text-rose-200">{error}</Card> : null}
          <section className="grid gap-4 md:grid-cols-4">
            <Card className="rounded-[20px] p-4">Internships: {metrics.internships}</Card>
            <Card className="rounded-[20px] p-4">Pending: {metrics.pendingApplications}</Card>
            <Card className="rounded-[20px] p-4">Ideas: {metrics.industryIdeas}</Card>
            <Card className="rounded-[20px] p-4">Programmes: {metrics.programs}</Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-[20px] p-5">
              <h2 className="mb-3 text-xl font-semibold">Create External Internship</h2>
              <form className="grid gap-3" onSubmit={createInternship}>
                <input name="title" placeholder="Internship title" required />
                <textarea name="description" placeholder="Description" required />
                <input name="fee" type="number" min={0} placeholder="Fee (leave empty or 0 for free course)" />
                <Button>Create Internship</Button>
              </form>
            </Card>

            <Card className="rounded-[20px] p-5">
              <h2 className="mb-3 text-xl font-semibold">Programme Menu</h2>
              <form className="grid gap-2" onSubmit={addProgram}>
                <input name="name" placeholder="Programme name (eg. BSc Physics)" required />
                <Button>Add Programme</Button>
              </form>
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
                            <Button variant="secondary" onClick={() => saveProgramOutcome(program.id, entry)}>Save</Button>
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

          <Card className="rounded-[20px] p-5">
            <h2 className="mb-3 text-xl font-semibold">Suggest Industry Internship Idea</h2>
            <form className="grid gap-3" onSubmit={createIndustryRequest}>
              <select name="industryId" value={selectedIndustry} onChange={(e) => setSelectedIndustry(e.target.value)} required>
                <option value="">Select industry</option>
                {industries.map((industry) => <option key={industry.id} value={industry.id}>{industry.name}</option>)}
              </select>
              {industryDetails ? (
                <div className="rounded-lg border border-white/10 p-2 text-sm text-slate-300">
                  <p>Activity: {industryDetails.business_activity}</p>
                  <p>Category: {industryDetails.category || '-'}</p>
                  <p className="mt-1 font-semibold">Internship listings & vacancies:</p>
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
                    <p className="text-sm font-semibold">Map PO</p>
                    {selectedProgramOutcomes.filter((entry) => entry.type === 'PO').map((entry) => (
                      <label key={entry.id} className="block text-sm"><input type="checkbox" name="mappedPo" value={entry.value} className="mr-2" />{entry.value}</label>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Map PSO</p>
                    {selectedProgramOutcomes.filter((entry) => entry.type === 'PSO').map((entry) => (
                      <label key={entry.id} className="block text-sm"><input type="checkbox" name="mappedPso" value={entry.value} className="mr-2" />{entry.value}</label>
                    ))}
                  </div>
                </div>
              ) : null}
              <Button>Submit Idea</Button>
            </form>
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-[20px] p-5">
              <h2 className="mb-3 text-xl font-semibold">Internship Listings</h2>
              {dashboard?.internships?.map((item) => (
                <div key={item.id} className="mb-2 rounded-lg border border-white/10 p-2">
                  {editingInternshipId === item.id ? (
                    <div className="grid gap-2">
                      <input value={drafts[item.id]?.title ?? item.title} onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? item), title: e.target.value } }))} />
                      <textarea value={drafts[item.id]?.description ?? item.description} onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? item), description: e.target.value } }))} />
                      <input type="number" min={0} value={drafts[item.id]?.fee ?? item.fee ?? 0} onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? item), fee: e.target.value } }))} />
                    </div>
                  ) : (
                    <>
                      <p>{item.title}</p>
                      <p className="text-xs text-slate-300">{item.description}</p>
                      <p className="text-xs text-slate-400">{item.is_paid ? `Paid • ₹${item.fee ?? 0}` : 'Free'} • {item.status}</p>
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
              <h2 className="mb-3 text-xl font-semibold">Suggested Internship Ideas</h2>
              {dashboard?.industryRequests?.map((item: any) => (
                <div key={item.id} className="mb-2 rounded-lg border border-white/10 p-2">
                  {editingIdeaId === item.id ? (
                    <div className="grid gap-2">
                      <input value={drafts[item.id]?.internship_title ?? item.internship_title} onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? item), internship_title: e.target.value } }))} />
                      <textarea value={drafts[item.id]?.description ?? item.description} onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? item), description: e.target.value } }))} />
                    </div>
                  ) : (
                    <>
                      <p>{item.internship_title} • {item.industry_name}</p>
                      <p className="text-xs text-slate-300">Programme: {item.program_name || '-'} • PO: {item.mapped_po || '-'} • PSO: {item.mapped_pso || '-'} • {item.status}</p>
                    </>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button variant="secondary" onClick={() => setEditingIdeaId(item.id)}>Edit</Button>
                    <Button variant="secondary" onClick={() => saveIdea(item)}>Save</Button>
                    <Button variant="secondary" onClick={() => deleteIdea(item.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </Card>
          </section>

          <Card className="rounded-[20px] p-5">
            <h2 className="mb-3 text-xl font-semibold">Internal Applications Submitted by Students</h2>
            <div className="space-y-2">
              {dashboard?.applications?.map((app) => (
                <div key={app.id} className="rounded-lg border border-white/10 p-3">
                  <p className="font-medium">{app.student_name} • {app.internship_title}</p>
                  <p className="text-xs text-slate-300">{app.student_email} • {app.status}</p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="secondary" onClick={() => acceptApplication(app.id)} disabled={app.status === 'accepted'}>Accept</Button>
                    <Button variant="secondary" onClick={() => rejectApplication(app.id)} disabled={app.status === 'rejected'}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </RoleDashboardShell>
  );
}
