'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWithSession } from '@/lib/auth';

type Programme = { id: string; name: string; outcomes: Array<{ id: string; description: string }> };
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
  outcomeMappings: Array<{ id: string; outcome: InternshipOutcome }>;
};

export function DepartmentDashboardSystem({ departmentId }: { departmentId?: string }) {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [internshipOutcomes, setInternshipOutcomes] = useState<InternshipOutcome[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [programmeOutcomeDrafts, setProgrammeOutcomeDrafts] = useState<string[]>(['']);
  const [internshipOutcomeDrafts, setInternshipOutcomeDrafts] = useState<Array<{ type: 'PO' | 'IPO' | 'CO'; description: string }>>([{ type: 'PO', description: '' }]);
  const [selectedProgramme, setSelectedProgramme] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Internship>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [programmeRes, outcomeRes, internshipRes] = await Promise.all([
      fetchWithSession<Programme[]>(`/api/programme/list${departmentId ? `?departmentId=${departmentId}` : ''}`),
      fetchWithSession<InternshipOutcome[]>(`/api/outcome/list${departmentId ? `?departmentId=${departmentId}` : ''}`),
      fetchWithSession<Internship[]>(`/api/internship/list${departmentId ? `?departmentId=${departmentId}` : ''}`),
    ]);
    setProgrammes(programmeRes.data ?? []);
    setInternshipOutcomes(outcomeRes.data ?? []);
    setInternships(internshipRes.data ?? []);
  };

  useEffect(() => {
    void load();
  }, [departmentId]);

  const groupedInternshipOutcomes = useMemo(() => ({
    PO: internshipOutcomes.filter((item) => item.type === 'PO'),
    IPO: internshipOutcomes.filter((item) => item.type === 'IPO'),
    CO: internshipOutcomes.filter((item) => item.type === 'CO'),
  }), [internshipOutcomes]);

  const programmeOutcomesByProgramme = useMemo(() => Object.fromEntries(programmes.map((programme) => [programme.id, programme.outcomes ?? []])), [programmes]);

  const resetNotice = () => {
    setError('');
    setMessage('');
  };

  async function addProgramme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetNotice();
    const form = new FormData(event.currentTarget);
    try {
      await fetchWithSession('/api/programme/create', {
        method: 'POST',
        body: JSON.stringify({
          name: String(form.get('name') ?? ''),
          departmentId,
        }),
      });
      event.currentTarget.reset();
      setMessage('Programme saved.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to save programme');
    }
  }

  async function saveProgrammeOutcomes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetNotice();
    try {
      await fetchWithSession('/api/programme-outcome/create', {
        method: 'POST',
        body: JSON.stringify({
          programmeId: selectedProgramme,
          outcomes: programmeOutcomeDrafts.map((item) => item.trim()).filter(Boolean),
        }),
      });
      setProgrammeOutcomeDrafts(['']);
      setMessage('Programme outcomes saved.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to save programme outcomes');
    }
  }

  async function saveInternshipOutcomes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetNotice();
    try {
      await fetchWithSession('/api/internship-outcome/create', {
        method: 'POST',
        body: JSON.stringify({
          departmentId,
          outcomes: internshipOutcomeDrafts.filter((item) => item.description.trim()).map((item) => ({ ...item, description: item.description.trim() })),
        }),
      });
      setInternshipOutcomeDrafts([{ type: 'PO', description: '' }]);
      setMessage('Internship outcomes saved.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to save internship outcomes');
    }
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

    const outcomeIds = form.getAll('outcomeIds').map((entry) => String(entry));
    try {
      await fetchWithSession('/api/internship/create', {
        method: 'POST',
        body: JSON.stringify({
          title: String(form.get('title') ?? ''),
          description: String(form.get('description') ?? ''),
          isInternal: Boolean(form.get('isInternal')),
          industryName: String(form.get('industryName') ?? ''),
          programmeId: String(form.get('programmeId') ?? ''),
          isFree: Boolean(form.get('isFree')),
          gender: String(form.get('gender') ?? 'BOTH'),
          duration,
          vacancy: Number(form.get('vacancy') ?? 1),
          departmentId,
          outcomeIds,
        }),
      });
      event.currentTarget.reset();
      setMessage('Internship sent to IPO.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to create internship');
    }
  }

  async function saveInternshipChanges(id: string) {
    resetNotice();
    try {
      await fetchWithSession('/api/internship/update', {
        method: 'PUT',
        body: JSON.stringify({
          id,
          title: editDraft.title,
          description: editDraft.description,
          industryName: editDraft.industryName,
          programmeId: editDraft.programmeId,
          status: editDraft.status,
          vacancy: editDraft.vacancy ? Number(editDraft.vacancy) : undefined,
          duration: editDraft.duration ? Number(editDraft.duration) : undefined,
        }),
      });
      setEditingId(null);
      setEditDraft({});
      setMessage('Internship updated.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to update internship');
    }
  }

  return (
    <div className="space-y-4">
      {(message || error) ? <p className={`text-sm ${error ? 'text-red-600' : 'text-emerald-700'}`}>{error || message}</p> : null}

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Add Programme</h2>
        <form className="space-y-2" onSubmit={addProgramme}>
          <input name="name" className="w-full rounded border px-3 py-2" placeholder="Programme Name (e.g., BSc Physics)" required />
          <Button type="submit">Save Programme</Button>
        </form>
        <div>
          <p className="text-sm font-medium">Programs Conducted by this Department</p>
          <ul className="list-disc pl-5 text-sm">
            {programmes.map((item) => <li key={item.id}>{item.name}</li>)}
          </ul>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Add Programme Outcome</h2>
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
        <div>
          <p className="text-sm font-medium">Programme Outcomes (PO)</p>
          <ul className="list-disc pl-5 text-sm">
            {(selectedProgramme ? programmeOutcomesByProgramme[selectedProgramme] ?? [] : programmes.flatMap((item) => item.outcomes ?? []) ).map((item) => (
              <li key={item.id}>{item.description}</li>
            ))}
          </ul>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Internship Outcome Setup</h2>
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
          <div><p className="font-medium">Programme Outcomes</p>{groupedInternshipOutcomes.PO.map((item) => <p key={item.id}>{item.description}</p>)}</div>
          <div><p className="font-medium">Internship Program Outcomes</p>{groupedInternshipOutcomes.IPO.map((item) => <p key={item.id}>{item.description}</p>)}</div>
          <div><p className="font-medium">Internship Course Outcomes</p>{groupedInternshipOutcomes.CO.map((item) => <p key={item.id}>{item.description}</p>)}</div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Create Internship</h2>
        <form className="grid gap-2 md:grid-cols-2" onSubmit={createInternship}>
          <input name="title" className="rounded border px-3 py-2" placeholder="Internship Title" required />
          <input name="industryName" className="rounded border px-3 py-2" placeholder="Industry Name" required />
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
            <div>
              <p className="font-medium">Program Outcomes (PO)</p>
              {groupedInternshipOutcomes.PO.map((item) => <label key={item.id} className="block"><input type="checkbox" name="outcomeIds" value={item.id} className="mr-2" />{item.description}</label>)}
            </div>
            <div>
              <p className="font-medium">Program Specific Outcomes (PSO)</p>
              {groupedInternshipOutcomes.PO.map((item) => <label key={`pso-${item.id}`} className="block"><input type="checkbox" name="outcomeIds" value={item.id} className="mr-2" />{item.description}</label>)}
            </div>
            <div>
              <p className="font-medium">Internship Program Outcomes (IPO)</p>
              {groupedInternshipOutcomes.IPO.map((item) => <label key={item.id} className="block"><input type="checkbox" name="outcomeIds" value={item.id} className="mr-2" />{item.description}</label>)}
            </div>
            <div>
              <p className="font-medium">Internship Course Outcomes (CO)</p>
              {groupedInternshipOutcomes.CO.map((item) => <label key={item.id} className="block"><input type="checkbox" name="outcomeIds" value={item.id} className="mr-2" />{item.description}</label>)}
            </div>
          </div>

          <Button type="submit" className="md:col-span-2">Send to IPO</Button>
        </form>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Internship Listings</h2>
        <div className="space-y-2">
          {internships.map((item) => {
            const draft = editingId === item.id ? (editDraft as Internship) : item;
            return (
              <div key={item.id} className="rounded border p-3 text-sm space-y-2">
                <p><strong>Internship Title:</strong> {item.title}</p>
                <p><strong>Programme:</strong> {item.programme?.name ?? '-'}</p>
                {editingId === item.id ? (
                  <select value={String(draft.status ?? item.status)} onChange={(e) => setEditDraft((prev) => ({ ...prev, status: e.target.value }))} className="rounded border px-2 py-1">
                    <option value="IPO_SENT">IPO_SENT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                  </select>
                ) : <p><strong>Status:</strong> {item.status}</p>}
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => { setEditingId(item.id); setEditDraft(item); }}>Edit</Button>
                  {editingId === item.id ? <Button onClick={() => saveInternshipChanges(item.id)}>Save Changes</Button> : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
