'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWithSession } from '@/lib/auth';

type ProgrammeOutcome = { id: string; description: string; programmeId: string };
type Programme = { id: string; name: string; outcomes: ProgrammeOutcome[] };
type InternshipOutcome = { id: string; description: string; type: 'PO' | 'IPO' | 'CO' };
type Internship = {
  id: string;
  title: string;
  description: string | null;
  industryName: string | null;
  programmeId: string | null;
  programme?: { id: string; name: string } | null;
  isInternal: boolean;
  isFree: boolean;
  gender: string | null;
  duration: number | null;
  vacancy: number | null;
  status: string;
};
type Industry = { id: string; name: string };
type Application = {
  id: string;
  student_name: string;
  programme: string | null;
  status: 'APPLIED' | 'APPROVED' | 'REJECTED' | string;
};

export function DepartmentDashboardSystem({ departmentId }: { departmentId?: string }) {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [internshipOutcomes, setInternshipOutcomes] = useState<InternshipOutcome[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [internalApplications, setInternalApplications] = useState<Application[]>([]);
  const [externalApplications, setExternalApplications] = useState<Application[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);

  const [selectedProgramme, setSelectedProgramme] = useState('');
  const [programmeOutcomeDrafts, setProgrammeOutcomeDrafts] = useState<string[]>(['']);
  const [internshipOutcomeDrafts, setInternshipOutcomeDrafts] = useState<Array<{ type: 'PO' | 'IPO' | 'CO'; description: string }>>([{ type: 'PO', description: '' }]);

  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');

  const [editingInternshipId, setEditingInternshipId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Internship>>({});

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [programmeRes, outcomeRes, internshipRes, internalRes, externalRes, industryRes] = await Promise.all([
      fetchWithSession<Programme[]>(`/api/programme/list${departmentId ? `?departmentId=${departmentId}` : ''}`),
      fetchWithSession<InternshipOutcome[]>(`/api/internship-outcome/list${departmentId ? `?departmentId=${departmentId}` : ''}`),
      fetchWithSession<Internship[]>(`/api/internship/list${departmentId ? `?departmentId=${departmentId}` : ''}`),
      fetchWithSession<Application[]>('/api/applications/internal').catch(() => ({ data: [] })),
      fetchWithSession<Application[]>('/api/applications/external').catch(() => ({ data: [] })),
      fetchWithSession<Industry[]>('/api/industry/list').catch(() => ({ data: [] })),
    ]);
    setProgrammes(programmeRes.data ?? []);
    setInternshipOutcomes(outcomeRes.data ?? []);
    setInternships(internshipRes.data ?? []);
    setInternalApplications(internalRes.data ?? []);
    setExternalApplications(externalRes.data ?? []);
    setIndustries(industryRes.data ?? []);
  };

  useEffect(() => {
    void load();
  }, [departmentId]);

  const groupedInternshipOutcomes = useMemo(() => ({
    PO: internshipOutcomes.filter((item) => item.type === 'PO'),
    IPO: internshipOutcomes.filter((item) => item.type === 'IPO'),
    CO: internshipOutcomes.filter((item) => item.type === 'CO'),
  }), [internshipOutcomes]);

  const programmeOutcomesByProgramme = useMemo(
    () => Object.fromEntries(programmes.map((programme) => [programme.id, programme.outcomes ?? []])),
    [programmes],
  );

  const resetNotice = () => {
    setError('');
    setMessage('');
  };

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    try {
      resetNotice();
      await action();
      setMessage(successMessage);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Request failed');
    }
  };

  async function addProgramme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runAction(async () => {
      await fetchWithSession('/api/programme/create', {
        method: 'POST',
        body: JSON.stringify({ name: String(form.get('name') ?? ''), departmentId }),
      });
      event.currentTarget.reset();
    }, 'Programme saved.');
  }

  async function saveProgrammeOutcomes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      await fetchWithSession('/api/programme-outcome/create', {
        method: 'POST',
        body: JSON.stringify({
          programmeId: selectedProgramme,
          outcomes: programmeOutcomeDrafts.map((item) => item.trim()).filter(Boolean),
        }),
      });
      setProgrammeOutcomeDrafts(['']);
    }, 'Programme outcomes saved.');
  }

  async function saveInternshipOutcomes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      await fetchWithSession('/api/internship-outcome/create', {
        method: 'POST',
        body: JSON.stringify({
          departmentId,
          outcomes: internshipOutcomeDrafts
            .filter((item) => item.description.trim())
            .map((item) => ({ ...item, description: item.description.trim() })),
        }),
      });
      setInternshipOutcomeDrafts([{ type: 'PO', description: '' }]);
    }, 'Internship outcomes saved.');
  }

  async function createInternship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetNotice();
    const form = new FormData(event.currentTarget);
    const duration = Number(form.get('duration') ?? 0);
    if (duration < 60) {
      setError('Duration must be at least 60 hours.');
      return;
    }

    const submittedBy = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = submittedBy?.value ?? 'IPO_SENT';
    await runAction(async () => {
      await fetchWithSession('/api/internship/create', {
        method: 'POST',
        body: JSON.stringify({
          title: String(form.get('title') ?? ''),
          description: String(form.get('description') ?? ''),
          isInternal: Boolean(form.get('isInternal')),
          industryName: selectedIndustry || customIndustry,
          programmeId: String(form.get('programmeId') ?? ''),
          isFree: Boolean(form.get('isFree')),
          gender: String(form.get('gender') ?? 'BOTH'),
          duration,
          vacancy: Number(form.get('vacancy') ?? 1),
          departmentId,
          status,
          outcomeIds: form.getAll('outcomeIds').map((entry) => String(entry)),
        }),
      });
      event.currentTarget.reset();
      setSelectedIndustry('');
      setCustomIndustry('');
    }, `Internship ${status.toLowerCase()} successfully.`);
  }

  return (
    <div className="space-y-4">
      {(message || error) ? <p className={`text-sm ${error ? 'text-red-600' : 'text-emerald-700'}`}>{error || message}</p> : null}

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Programme CRUD</h2>
        <form className="space-y-2" onSubmit={addProgramme}>
          <input name="name" className="w-full rounded border px-3 py-2" placeholder="Programme Name" required />
          <Button type="submit">Create Programme</Button>
        </form>
        <div className="space-y-2 text-sm">
          {programmes.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded border p-2">
              <span>{item.name}</span>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => {
                  const name = window.prompt('Update programme name', item.name);
                  if (!name?.trim()) return;
                  void runAction(() => fetchWithSession(`/api/programme/update/${item.id}`, { method: 'PUT', body: JSON.stringify({ name }) }).then(() => undefined), 'Programme updated.');
                }}>Edit</Button>
                <Button type="button" variant="secondary" onClick={() => void runAction(() => fetchWithSession(`/api/programme/delete/${item.id}`, { method: 'DELETE' }).then(() => undefined), 'Programme deleted.')}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Programme Outcome (PO) CRUD</h2>
        <form className="space-y-2" onSubmit={saveProgrammeOutcomes}>
          <select className="w-full rounded border px-3 py-2" value={selectedProgramme} onChange={(e) => setSelectedProgramme(e.target.value)} required>
            <option value="">Select Programme</option>
            {programmes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {programmeOutcomeDrafts.map((value, index) => (
            <input key={index} className="w-full rounded border px-3 py-2" placeholder="Outcome Description" value={value} onChange={(e) => setProgrammeOutcomeDrafts((prev) => prev.map((entry, idx) => idx === index ? e.target.value : entry))} required />
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setProgrammeOutcomeDrafts((prev) => [...prev, ''])}>Add More</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
        <ul className="list-disc pl-5 text-sm">
          {(selectedProgramme ? programmeOutcomesByProgramme[selectedProgramme] ?? [] : programmes.flatMap((item) => item.outcomes ?? [])).map((item) => (
            <li key={item.id} className="mb-1">
              {item.description}
              <Button type="button" variant="secondary" className="ml-2" onClick={() => {
                const description = window.prompt('Update PO description', item.description);
                if (!description?.trim()) return;
                void runAction(() => fetchWithSession(`/api/programme-outcome/update/${item.id}`, { method: 'PUT', body: JSON.stringify({ description }) }).then(() => undefined), 'Programme outcome updated.');
              }}>Edit</Button>
              <Button type="button" variant="secondary" className="ml-2" onClick={() => void runAction(() => fetchWithSession(`/api/programme-outcome/delete/${item.id}`, { method: 'DELETE' }).then(() => undefined), 'Programme outcome deleted.')}>Delete</Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Internship Outcome (CO / IPO / PO) CRUD</h2>
        <form className="space-y-2" onSubmit={saveInternshipOutcomes}>
          {internshipOutcomeDrafts.map((draft, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-2">
              <select className="rounded border px-3 py-2" value={draft.type} onChange={(e) => setInternshipOutcomeDrafts((prev) => prev.map((entry, idx) => idx === index ? { ...entry, type: e.target.value as 'PO' | 'IPO' | 'CO' } : entry))}>
                <option value="PO">Programme Outcome (PO)</option>
                <option value="IPO">Internship Program Outcome (IPO)</option>
                <option value="CO">Internship Course Outcome (CO)</option>
              </select>
              <input className="rounded border px-3 py-2" placeholder="Description" value={draft.description} onChange={(e) => setInternshipOutcomeDrafts((prev) => prev.map((entry, idx) => idx === index ? { ...entry, description: e.target.value } : entry))} required />
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setInternshipOutcomeDrafts((prev) => [...prev, { type: 'PO', description: '' }])}>Add More</Button>
            <Button type="submit">Save Outcome</Button>
          </div>
        </form>
        <div className="grid gap-2 md:grid-cols-3 text-sm">
          {(['PO', 'IPO', 'CO'] as const).map((type) => (
            <div key={type}>
              <p className="font-medium">{type} Outcomes</p>
              {(groupedInternshipOutcomes[type] ?? []).map((item) => (
                <p key={item.id}>
                  {item.description}
                  <Button type="button" variant="secondary" className="ml-2" onClick={() => {
                    const description = window.prompt('Update outcome description', item.description);
                    if (!description?.trim()) return;
                    void runAction(() => fetchWithSession(`/api/internship-outcome/update/${item.id}`, { method: 'PUT', body: JSON.stringify({ description, type: item.type }) }).then(() => undefined), 'Internship outcome updated.');
                  }}>Edit</Button>
                  <Button type="button" variant="secondary" className="ml-2" onClick={() => void runAction(() => fetchWithSession(`/api/internship-outcome/delete/${item.id}`, { method: 'DELETE' }).then(() => undefined), 'Internship outcome deleted.')}>Delete</Button>
                </p>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Create Internship (Advanced)</h2>
        <form className="grid gap-2 md:grid-cols-2" onSubmit={createInternship}>
          <input name="title" className="rounded border px-3 py-2" placeholder="Internship Title" required />
          <select className="rounded border px-3 py-2" value={selectedIndustry} onChange={(e) => setSelectedIndustry(e.target.value)}>
            <option value="">Select Registered Industry</option>
            {industries.map((industry) => <option key={industry.id} value={industry.name}>{industry.name}</option>)}
          </select>
          <input className="rounded border px-3 py-2 md:col-span-2" placeholder="Or enter industry manually" value={customIndustry} onChange={(e) => setCustomIndustry(e.target.value)} />
          <textarea name="description" className="rounded border px-3 py-2 md:col-span-2" placeholder="Description" required />
          <label className="text-sm"><input type="checkbox" name="isInternal" className="mr-2" />Internal Students</label>
          <label className="text-sm"><input type="checkbox" name="isFree" defaultChecked className="mr-2" />Free Internship</label>
          <select name="programmeId" className="rounded border px-3 py-2" required>
            <option value="">Select Programme</option>
            {programmes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select name="gender" className="rounded border px-3 py-2" defaultValue="BOTH">
            <option value="BOYS">Boys</option>
            <option value="GIRLS">Girls</option>
            <option value="BOTH">Both</option>
          </select>
          <input name="duration" type="number" min={60} defaultValue={60} className="rounded border px-3 py-2" placeholder="Duration (hours)" required />
          <input name="vacancy" type="number" min={1} defaultValue={1} className="rounded border px-3 py-2" placeholder="Vacancy" required />

          <div className="md:col-span-2 grid gap-2 md:grid-cols-2 text-sm">
            <div><p className="font-medium">Program Outcomes (PO)</p>{groupedInternshipOutcomes.PO.map((item) => <label key={item.id} className="block"><input type="checkbox" name="outcomeIds" value={item.id} className="mr-2" />{item.description}</label>)}</div>
            <div><p className="font-medium">Program Specific Outcomes (PSO)</p>{groupedInternshipOutcomes.PO.map((item) => <label key={`pso-${item.id}`} className="block"><input type="checkbox" name="outcomeIds" value={item.id} className="mr-2" />{item.description}</label>)}</div>
            <div><p className="font-medium">Internship Program Outcomes (IPO)</p>{groupedInternshipOutcomes.IPO.map((item) => <label key={item.id} className="block"><input type="checkbox" name="outcomeIds" value={item.id} className="mr-2" />{item.description}</label>)}</div>
            <div><p className="font-medium">Internship Course Outcomes (CO)</p>{groupedInternshipOutcomes.CO.map((item) => <label key={item.id} className="block"><input type="checkbox" name="outcomeIds" value={item.id} className="mr-2" />{item.description}</label>)}</div>
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button type="submit" name="status" value="DRAFT" variant="secondary">Save Draft</Button>
            <Button type="submit" name="status" value="IPO_SENT" variant="secondary">Send to IPO</Button>
            <Button type="submit" name="status" value="PUBLISHED">Publish</Button>
          </div>
        </form>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Internship Listing (Enhanced)</h2>
        <div className="space-y-2 text-sm">
          {internships.map((item) => {
            const draft = editingInternshipId === item.id ? (editDraft as Internship) : item;
            return (
              <div key={item.id} className="rounded border p-3 space-y-2">
                <p><strong>Title:</strong> {item.title}</p>
                <p><strong>Industry:</strong> {item.industryName ?? '-'}</p>
                <p><strong>Programme:</strong> {item.programme?.name ?? '-'}</p>
                <p><strong>Gender:</strong> {item.gender ?? '-'}</p>
                <p><strong>Duration:</strong> {item.duration ?? '-'} hours</p>
                <p><strong>Vacancy:</strong> {item.vacancy ?? '-'}</p>
                {editingInternshipId === item.id ? (
                  <select value={String(draft.status ?? item.status)} onChange={(e) => setEditDraft((prev) => ({ ...prev, status: e.target.value }))} className="rounded border px-2 py-1">
                    <option value="DRAFT">DRAFT</option>
                    <option value="IPO_SENT">IPO_SENT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                  </select>
                ) : <p><strong>Status:</strong> {item.status}</p>}
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => { setEditingInternshipId(item.id); setEditDraft(item); }}>Edit</Button>
                  {editingInternshipId === item.id ? (
                    <Button onClick={() => void runAction(() => fetchWithSession(`/api/internship/update/${item.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({ ...editDraft, duration: Number(editDraft.duration), vacancy: Number(editDraft.vacancy) }),
                    }).then(() => { setEditingInternshipId(null); setEditDraft({}); }), 'Internship updated.')}>Save</Button>
                  ) : null}
                  <Button variant="secondary" onClick={() => void runAction(() => fetchWithSession(`/api/internship/delete/${item.id}`, { method: 'DELETE' }).then(() => undefined), 'Internship deleted.')}>Delete</Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Internal Applications</h2>
          {internalApplications.map((app) => (
            <div key={app.id} className="rounded border p-2 text-sm">
              <p><strong>Student Name:</strong> {app.student_name}</p>
              <p><strong>Programme:</strong> {app.programme ?? '-'}</p>
              <select className="mt-2 rounded border px-2 py-1" value={app.status} onChange={(e) => void runAction(() => fetchWithSession(`/api/applications/update-status/${app.id}`, { method: 'PUT', body: JSON.stringify({ status: e.target.value }) }).then(() => undefined), 'Application status updated.')}>
                <option value="APPLIED">APPLIED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          ))}
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">External Applications</h2>
          {externalApplications.map((app) => (
            <div key={app.id} className="rounded border p-2 text-sm">
              <p><strong>Student Name:</strong> {app.student_name}</p>
              <p><strong>Programme:</strong> {app.programme ?? '-'}</p>
              <select className="mt-2 rounded border px-2 py-1" value={app.status} onChange={(e) => void runAction(() => fetchWithSession(`/api/applications/update-status/${app.id}`, { method: 'PUT', body: JSON.stringify({ status: e.target.value }) }).then(() => undefined), 'Application status updated.')}>
                <option value="APPLIED">APPLIED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
