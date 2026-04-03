'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchWithSession } from '@/lib/auth';

type Internship = {
  id: string;
  title: string;
  type: 'INTERNAL' | 'EXTERNAL';
  visibility: 'DEPARTMENT' | 'COLLEGE' | 'GLOBAL';
  status: string;
};

type Programme = { id: string; name: string; outcomes: Array<{ id: string; description: string }> };
type Outcome = { id: string; description: string; type: 'PROGRAM_OUTCOME' | 'COURSE_OUTCOME' };

type Props = { departmentId?: string; createdById?: string };

export function DepartmentDashboardSystem({ departmentId, createdById }: Props) {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [type, setType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [visibility, setVisibility] = useState<'DEPARTMENT' | 'COLLEGE'>('DEPARTMENT');
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  async function loadAll() {
    const [internshipRes, programmeRes, outcomeRes] = await Promise.all([
      fetchWithSession<Internship[]>('/api/internship/list'),
      fetchWithSession<Programme[]>(`/api/programme/list${departmentId ? `?departmentId=${departmentId}` : ''}`),
      fetchWithSession<Outcome[]>(`/api/outcome/list${departmentId ? `?departmentId=${departmentId}` : ''}`),
    ]);
    setInternships(internshipRes.data ?? []);
    setProgrammes(programmeRes.data ?? []);
    setOutcomes(outcomeRes.data ?? []);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const isInternal = type === 'INTERNAL';
  const isExternal = type === 'EXTERNAL';

  const mappableOutcomes = useMemo(
    () => outcomes.filter((item) => item.type === 'PROGRAM_OUTCOME' || item.type === 'COURSE_OUTCOME'),
    [outcomes],
  );

  async function handleCreateInternship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage('');
    const form = new FormData(event.currentTarget);

    try {
      await fetchWithSession('/api/internship/create', {
        method: 'POST',
        body: JSON.stringify({
          title: String(form.get('title') ?? ''),
          description: String(form.get('description') ?? ''),
          type,
          visibility: isInternal ? visibility : 'GLOBAL',
          departmentId,
          createdById,
          outcomeIds: selectedOutcomes,
        }),
      });
      setSelectedOutcomes([]);
      setMessage('Internship saved successfully.');
      event.currentTarget.reset();
      await loadAll();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to create internship');
    }
  }

  return (
    <Card className="mb-6 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Department Dashboard System</h2>
        {message ? <span className="text-sm text-emerald-600">{message}</span> : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <form onSubmit={handleCreateInternship} className="grid gap-3 md:grid-cols-2">
        <input name="title" placeholder="Internship title" className="rounded border px-3 py-2" required />
        <select value={type} onChange={(e) => setType(e.target.value as 'INTERNAL' | 'EXTERNAL')} className="rounded border px-3 py-2">
          <option value="INTERNAL">INTERNAL</option>
          <option value="EXTERNAL">EXTERNAL</option>
        </select>
        <textarea name="description" placeholder="Description" className="rounded border px-3 py-2 md:col-span-2" required />

        {isInternal ? (
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'DEPARTMENT' | 'COLLEGE')} className="rounded border px-3 py-2">
            <option value="DEPARTMENT">Department visibility</option>
            <option value="COLLEGE">College visibility</option>
          </select>
        ) : null}

        <div className="md:col-span-2 space-y-2">
          <p className="text-sm font-medium">Outcome mapping</p>
          <div className="grid gap-2 md:grid-cols-2">
            {mappableOutcomes.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedOutcomes.includes(item.id)}
                  onChange={(e) => {
                    setSelectedOutcomes((prev) => (e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)));
                  }}
                />
                {item.description}
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 flex gap-2">
          <Button type="submit">Create Internship</Button>
        </div>
      </form>

      <div className="grid gap-2 md:grid-cols-3">
        {internships.slice(0, 6).map((item) => (
          <Card key={item.id} className="p-3 space-y-2">
            <h3 className="font-medium">{item.title}</h3>
            <p className="text-xs text-slate-600">{item.type} · {item.visibility} · {item.status}</p>
            <div className="flex gap-2">
              <Button
               
                onClick={async () => {
                  await fetchWithSession('/api/internship/send-to-ipo', {
                    method: 'POST',
                    body: JSON.stringify({ internshipId: item.id }),
                  });
                  await loadAll();
                }}
              >
                Send to IPO
              </Button>
              {isExternal || item.type === 'EXTERNAL' ? (
                <Button
                 
                  variant="secondary"
                  onClick={async () => {
                    await fetchWithSession('/api/internship/publish', {
                      method: 'POST',
                      body: JSON.stringify({ internshipId: item.id }),
                    });
                    await loadAll();
                  }}
                >
                  Publish
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            await fetchWithSession('/api/programme/create', {
              method: 'POST',
              body: JSON.stringify({ name: String(form.get('name') ?? ''), departmentId }),
            });
            e.currentTarget.reset();
            await loadAll();
          }}
        >
          <p className="font-medium">Add Programme</p>
          <input name="name" className="w-full rounded border px-3 py-2" placeholder="Programme name" required />
          <Button type="submit">Save Programme</Button>
        </form>

        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            await fetchWithSession('/api/programme/add-outcome', {
              method: 'POST',
              body: JSON.stringify({
                programmeId: String(form.get('programmeId') ?? ''),
                description: String(form.get('description') ?? ''),
              }),
            });
            e.currentTarget.reset();
            await loadAll();
          }}
        >
          <p className="font-medium">Add Programme Outcome</p>
          <select name="programmeId" className="w-full rounded border px-3 py-2" required>
            <option value="">Select programme</option>
            {programmes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <input name="description" className="w-full rounded border px-3 py-2" placeholder="Outcome description" required />
          <Button type="submit">Add More / Save</Button>
        </form>
      </div>

      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          await fetchWithSession('/api/outcome/add', {
            method: 'POST',
            body: JSON.stringify({
              description: String(form.get('description') ?? ''),
              type: String(form.get('type') ?? 'PROGRAM_OUTCOME'),
              departmentId,
            }),
          });
          e.currentTarget.reset();
          await loadAll();
        }}
      >
        <p className="font-medium">Internship Outcome Setup</p>
        <div className="grid gap-2 md:grid-cols-2">
          <select name="type" className="rounded border px-3 py-2">
            <option value="PROGRAM_OUTCOME">Programme Outcome</option>
            <option value="COURSE_OUTCOME">Course Outcome</option>
          </select>
          <input name="description" className="rounded border px-3 py-2" placeholder="Outcome description" required />
        </div>
        <Button type="submit">Add More / Save Outcome</Button>
      </form>
    </Card>
  );
}
