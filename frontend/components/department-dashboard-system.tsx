'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWithSession } from '@/lib/auth';

type ProgrammeOutcome = { id: string; description: string; programmeId: string };
type Programme = { id: string; name: string; outcomes: ProgrammeOutcome[] };
type InternshipOutcome = { id: string; description: string; type: 'IPO' | 'CO' | 'PO' };
type Internship = {
  id: string;
  title: string;
  description: string | null;
  industryName: string;
  programmeId: string | null;
  programme?: { id: string; name: string } | null;
  targetType: 'INTERNAL' | 'EXTERNAL';
  gender: string | null;
  type: 'FREE' | 'PAID' | 'STIPEND';
  fee: number | null;
  stipend: number | null;
  duration: number;
  vacancy: number;
  status: string;
};
type Industry = { id: string; name: string };
type Application = {
  id: string;
  student_name: string;
  programme: string | null;
  status: 'APPLIED' | 'APPROVED' | 'REJECTED' | string;
};

type InternshipAction = 'SEND_TO_IPO' | 'PUBLISH' | 'SAVE_DRAFT';
type ActiveCard = 'programmes' | 'pos' | 'internship-outcomes' | null;
type InternshipFormState = {
  title: string;
  description: string;
  targetType: 'INTERNAL' | 'EXTERNAL';
  programmeId: string;
  industryMode: 'REGISTERED' | 'MANUAL';
  selectedIndustry: string;
  customIndustry: string;
  gender: 'BOYS' | 'GIRLS' | 'BOTH';
  type: 'FREE' | 'PAID' | 'STIPEND';
  fee: string;
  stipend: string;
  duration: number;
  vacancy: number;
  selectedProgrammeOutcomes: string[];
  selectedInternshipOutcomes: string[];
};

const initialInternshipFormState: InternshipFormState = {
  title: '',
  description: '',
  targetType: 'INTERNAL',
  programmeId: '',
  industryMode: 'REGISTERED',
  selectedIndustry: '',
  customIndustry: '',
  gender: 'BOTH',
  type: 'FREE',
  fee: '',
  stipend: '',
  duration: 60,
  vacancy: 1,
  selectedProgrammeOutcomes: [],
  selectedInternshipOutcomes: [],
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
  const [internshipOutcomeDrafts, setInternshipOutcomeDrafts] = useState<Array<{ type: 'IPO' | 'CO'; description: string }>>([{ type: 'IPO', description: '' }]);
  const [internshipForm, setInternshipForm] = useState<InternshipFormState>(initialInternshipFormState);
  const [activeCard, setActiveCard] = useState<ActiveCard>(null);
  const [editingProgrammeOutcomeId, setEditingProgrammeOutcomeId] = useState<string | null>(null);
  const [editingProgrammeOutcomeDescription, setEditingProgrammeOutcomeDescription] = useState('');
  const [editingInternshipOutcomeId, setEditingInternshipOutcomeId] = useState<string | null>(null);
  const [editingInternshipOutcomeDescription, setEditingInternshipOutcomeDescription] = useState('');
  const [editingInternshipOutcomeType, setEditingInternshipOutcomeType] = useState<'IPO' | 'CO'>('IPO');

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
    IPO: internshipOutcomes.filter((item) => item.type === 'IPO'),
    CO: internshipOutcomes.filter((item) => item.type === 'CO'),
  }), [internshipOutcomes]);

  const selectedProgrammeOutcomes = useMemo(
    () => programmes.find((programme) => programme.id === internshipForm.programmeId)?.outcomes ?? [],
    [programmes, internshipForm.programmeId],
  );

  const displayedProgrammeOutcomes = useMemo(
    () => programmes.find((programme) => programme.id === selectedProgramme)?.outcomes ?? [],
    [programmes, selectedProgramme],
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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await runAction(async () => {
      await fetchWithSession('/api/programme/create', {
        method: 'POST',
        body: JSON.stringify({ name: String(form.get('name') ?? ''), departmentId }),
      });
      formElement?.reset();
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
      setInternshipOutcomeDrafts([{ type: 'IPO', description: '' }]);
    }, 'Internship outcomes saved.');
  }

  const toggleProgrammeOutcome = (outcomeId: string) => {
    setInternshipForm((prev) => ({
      ...prev,
      selectedProgrammeOutcomes: prev.selectedProgrammeOutcomes.includes(outcomeId)
        ? prev.selectedProgrammeOutcomes.filter((id) => id !== outcomeId)
        : [...prev.selectedProgrammeOutcomes, outcomeId],
    }));
  };

  const toggleInternshipOutcome = (outcomeId: string) => {
    setInternshipForm((prev) => ({
      ...prev,
      selectedInternshipOutcomes: prev.selectedInternshipOutcomes.includes(outcomeId)
        ? prev.selectedInternshipOutcomes.filter((id) => id !== outcomeId)
        : [...prev.selectedInternshipOutcomes, outcomeId],
    }));
  };

  const resetInternshipForm = () => {
    setInternshipForm(initialInternshipFormState);
  };

  async function submitInternship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetNotice();
    const duration = Number(internshipForm.duration);
    if (duration < 60) {
      setError('Duration must be at least 60 hours.');
      return;
    }

    if (internshipForm.targetType === 'INTERNAL' && !internshipForm.programmeId) {
      setError('Please select a programme for internal internships.');
      return;
    }

    if (internshipForm.selectedInternshipOutcomes.length === 0) {
      setError('Please select at least one internship outcome.');
      return;
    }

    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') as InternshipAction | null;
    const resolvedIndustry = internshipForm.industryMode === 'REGISTERED'
      ? internshipForm.selectedIndustry
      : internshipForm.customIndustry.trim();
    if (internshipForm.targetType === 'INTERNAL' && !resolvedIndustry) {
      setError('Please choose or enter an industry.');
      return;
    }

    const statusMap: Record<InternshipAction, string> = {
      SEND_TO_IPO: 'IPO_SENT',
      PUBLISH: 'PUBLISHED',
      SAVE_DRAFT: 'DRAFT',
    };

    const status = action ? statusMap[action] : 'DRAFT';

    await runAction(async () => {
      const createRes = await fetchWithSession<{ id: string }>('/api/internship/create', {
        method: 'POST',
        body: JSON.stringify({
          title: internshipForm.title.trim(),
          description: internshipForm.description.trim(),
          targetType: internshipForm.targetType,
          programmeId: internshipForm.targetType === 'INTERNAL' ? internshipForm.programmeId : null,
          industryName: internshipForm.targetType === 'INTERNAL' ? resolvedIndustry : null,
          isRegistered: internshipForm.industryMode === 'REGISTERED',
          gender: internshipForm.targetType === 'EXTERNAL' ? internshipForm.gender : 'BOTH',
          type: internshipForm.type,
          fee: internshipForm.targetType === 'EXTERNAL' && internshipForm.type === 'PAID' ? Number(internshipForm.fee || 0) : null,
          stipend: internshipForm.targetType === 'EXTERNAL' && internshipForm.type === 'STIPEND' ? Number(internshipForm.stipend || 0) : null,
          duration,
          vacancy: Number(internshipForm.vacancy ?? 1),
          departmentId,
          status,
          outcomeIds: internshipForm.selectedInternshipOutcomes,
        }),
      });

      if (action === 'SEND_TO_IPO') {
        await fetchWithSession('/api/internship/send-to-ipo', {
          method: 'POST',
          body: JSON.stringify({ internshipId: createRes.data?.id }),
        });
      }

      resetInternshipForm();
    }, 'Internship workflow completed successfully.');
  }

  return (
    <div className="space-y-4">
      {(message || error) ? <p className={`text-sm ${error ? 'text-red-600' : 'text-emerald-700'}`}>{error || message}</p> : null}

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Department Actions</h2>
        <div className="grid gap-2 md:grid-cols-3 text-sm">
          <button type="button" className="rounded border p-3 text-left" onClick={() => setActiveCard(activeCard === 'programmes' ? null : 'programmes')}>
            <p className="font-medium">Edit Programmes</p><p className="text-xs text-slate-600">Manage programme records and naming.</p>
          </button>
          <button type="button" className="rounded border p-3 text-left" onClick={() => setActiveCard(activeCard === 'pos' ? null : 'pos')}>
            <p className="font-medium">Edit POs</p><p className="text-xs text-slate-600">Maintain programme outcomes for each programme.</p>
          </button>
          <button type="button" className="rounded border p-3 text-left" onClick={() => setActiveCard(activeCard === 'internship-outcomes' ? null : 'internship-outcomes')}>
            <p className="font-medium">Edit Internship CO / IPO</p><p className="text-xs text-slate-600">Define internship outcome libraries.</p>
          </button>
        </div>
      </Card>

      {activeCard === 'programmes' ? <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Edit Programmes</h2>
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
      </Card> : null}

      {activeCard === 'pos' ? <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Edit POs</h2>
        <form className="space-y-2" onSubmit={saveProgrammeOutcomes}>
          <select className="w-full rounded border px-3 py-2" value={selectedProgramme} onChange={(e) => setSelectedProgramme(e.target.value)} required>
            <option value="">Select Programme</option>
            {programmes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {programmeOutcomeDrafts.map((value, index) => (
            <input key={index} className="w-full rounded border px-3 py-2" placeholder="Outcome Description" value={value} onChange={(e) => setProgrammeOutcomeDrafts((prev) => prev.map((entry, idx) => (idx === index ? e.target.value : entry)))} required />
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setProgrammeOutcomeDrafts((prev) => [...prev, ''])}>Add More</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
        {selectedProgramme ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium">Programme Outcomes</p>
            {displayedProgrammeOutcomes.length === 0 ? <p className="text-slate-600">No outcomes found for this programme.</p> : null}
            {displayedProgrammeOutcomes.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                {editingProgrammeOutcomeId === item.id ? (
                  <input
                    className="min-w-[18rem] flex-1 rounded border px-2 py-1"
                    value={editingProgrammeOutcomeDescription}
                    onChange={(e) => setEditingProgrammeOutcomeDescription(e.target.value)}
                  />
                ) : (
                  <span>{item.description}</span>
                )}
                <div className="flex gap-2">
                  {editingProgrammeOutcomeId === item.id ? (
                    <Button
                      type="button"
                      onClick={() => void runAction(async () => {
                        await fetchWithSession(`/api/programme-outcome/update/${item.id}`, {
                          method: 'PUT',
                          body: JSON.stringify({ description: editingProgrammeOutcomeDescription }),
                        });
                        setEditingProgrammeOutcomeId(null);
                        setEditingProgrammeOutcomeDescription('');
                      }, 'Programme outcome updated.')}
                    >
                      Save
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setEditingProgrammeOutcomeId(item.id);
                        setEditingProgrammeOutcomeDescription(item.description);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void runAction(
                      () => fetchWithSession(`/api/programme-outcome/delete/${item.id}`, { method: 'DELETE' }).then(() => undefined),
                      'Programme outcome deleted.',
                    )}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card> : null}

      {activeCard === 'internship-outcomes' ? <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Edit Internship CO / IPO</h2>
        <form className="space-y-2" onSubmit={saveInternshipOutcomes}>
          {internshipOutcomeDrafts.map((draft, index) => (
            <div key={index} className="grid gap-2 md:grid-cols-2">
              <select className="rounded border px-3 py-2" value={draft.type} onChange={(e) => setInternshipOutcomeDrafts((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, type: e.target.value as 'IPO' | 'CO' } : entry)))}>
                <option value="IPO">Internship Program Outcome (IPO)</option>
                <option value="CO">Internship Course Outcome (CO)</option>
              </select>
              <input className="rounded border px-3 py-2" placeholder="Description" value={draft.description} onChange={(e) => setInternshipOutcomeDrafts((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, description: e.target.value } : entry)))} required />
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setInternshipOutcomeDrafts((prev) => [...prev, { type: 'IPO', description: '' }])}>Add More</Button>
            <Button type="submit">Save Outcome</Button>
          </div>
        </form>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Internship Outcomes</p>
          {internshipOutcomes.length === 0 ? <p className="text-slate-600">No IPO / CO outcomes saved.</p> : null}
          {internshipOutcomes.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
              {editingInternshipOutcomeId === item.id ? (
                <div className="flex min-w-[18rem] flex-1 gap-2">
                  <select
                    className="rounded border px-2 py-1"
                    value={editingInternshipOutcomeType}
                    onChange={(e) => setEditingInternshipOutcomeType(e.target.value as 'IPO' | 'CO')}
                  >
                    <option value="IPO">IPO</option>
                    <option value="CO">CO</option>
                  </select>
                  <input
                    className="flex-1 rounded border px-2 py-1"
                    value={editingInternshipOutcomeDescription}
                    onChange={(e) => setEditingInternshipOutcomeDescription(e.target.value)}
                  />
                </div>
              ) : (
                <span>{item.type}: {item.description}</span>
              )}
              <div className="flex gap-2">
                {editingInternshipOutcomeId === item.id ? (
                  <Button
                    type="button"
                    onClick={() => void runAction(async () => {
                      await fetchWithSession(`/api/internship-outcome/update/${item.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                          description: editingInternshipOutcomeDescription,
                          type: editingInternshipOutcomeType,
                        }),
                      });
                      setEditingInternshipOutcomeId(null);
                      setEditingInternshipOutcomeDescription('');
                      setEditingInternshipOutcomeType('IPO');
                    }, 'Internship outcome updated.')}
                  >
                    Save
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditingInternshipOutcomeId(item.id);
                      setEditingInternshipOutcomeDescription(item.description);
                      setEditingInternshipOutcomeType(item.type === 'CO' ? 'CO' : 'IPO');
                    }}
                  >
                    Edit
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void runAction(
                    () => fetchWithSession(`/api/internship-outcome/delete/${item.id}`, { method: 'DELETE' }).then(() => undefined),
                    'Internship outcome deleted.',
                  )}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card> : null}

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Create Internship</h2>
        <form className="grid gap-2 md:grid-cols-2" onSubmit={submitInternship}>
          <input
            name="title"
            className="rounded border px-3 py-2"
            placeholder="Internship Title"
            value={internshipForm.title}
            onChange={(e) => setInternshipForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
          <select
            className="rounded border px-3 py-2"
            value={internshipForm.targetType}
            onChange={(e) => setInternshipForm((prev) => ({
              ...prev,
              targetType: e.target.value as 'INTERNAL' | 'EXTERNAL',
              selectedProgrammeOutcomes: [],
              selectedInternshipOutcomes: [],
            }))}
          >
            <option value="INTERNAL">Internal Students</option>
            <option value="EXTERNAL">External Students</option>
          </select>
          <textarea
            name="description"
            className="rounded border px-3 py-2 md:col-span-2"
            placeholder="Description"
            value={internshipForm.description}
            onChange={(e) => setInternshipForm((prev) => ({ ...prev, description: e.target.value }))}
            required
          />

          {internshipForm.targetType === 'INTERNAL' ? (
            <>
              <select
                className="rounded border px-3 py-2"
                value={internshipForm.programmeId}
                onChange={(e) => setInternshipForm((prev) => ({
                  ...prev,
                  programmeId: e.target.value,
                  selectedProgrammeOutcomes: [],
                  selectedInternshipOutcomes: [],
                }))}
              >
                <option value="">Select Programme</option>
                {programmes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select
                className="rounded border px-3 py-2"
                value={internshipForm.industryMode}
                onChange={(e) => setInternshipForm((prev) => ({ ...prev, industryMode: e.target.value as 'REGISTERED' | 'MANUAL', selectedIndustry: '', customIndustry: '' }))}
              >
                <option value="REGISTERED">Registered Industry</option>
                <option value="MANUAL">Not Registered (Manual Entry)</option>
              </select>
              {internshipForm.industryMode === 'REGISTERED' ? (
                <select
                  className="rounded border px-3 py-2 md:col-span-2"
                  value={internshipForm.selectedIndustry}
                  onChange={(e) => setInternshipForm((prev) => ({ ...prev, selectedIndustry: e.target.value }))}
                >
                  <option value="">Select Registered Industry</option>
                  {industries.map((industry) => <option key={industry.id} value={industry.name}>{industry.name}</option>)}
                </select>
              ) : (
                <input
                  className="rounded border px-3 py-2 md:col-span-2"
                  placeholder="Industry name"
                  value={internshipForm.customIndustry}
                  onChange={(e) => setInternshipForm((prev) => ({ ...prev, customIndustry: e.target.value }))}
                />
              )}
              <div className="md:col-span-2 grid gap-2 md:grid-cols-2 text-sm">
                <div>
                  <p className="font-medium">Programme Outcomes (PO)</p>
                  {selectedProgrammeOutcomes.map((item) => <label key={item.id} className="block"><input type="checkbox" checked={internshipForm.selectedProgrammeOutcomes.includes(item.id)} onChange={() => toggleProgrammeOutcome(item.id)} className="mr-2" />{item.description}</label>)}
                </div>
                <div>
                  <p className="font-medium">Internship Outcomes (IPO + CO)</p>
                  {[...groupedInternshipOutcomes.IPO, ...groupedInternshipOutcomes.CO].map((item) => <label key={item.id} className="block"><input type="checkbox" checked={internshipForm.selectedInternshipOutcomes.includes(item.id)} onChange={() => toggleInternshipOutcome(item.id)} className="mr-2" />{item.description}</label>)}
                </div>
              </div>
            </>
          ) : (
            <>
              <select
                name="gender"
                className="rounded border px-3 py-2"
                value={internshipForm.gender}
                onChange={(e) => setInternshipForm((prev) => ({ ...prev, gender: e.target.value as 'BOYS' | 'GIRLS' | 'BOTH' }))}
              >
                <option value="BOYS">Boys</option>
                <option value="GIRLS">Girls</option>
                <option value="BOTH">Both</option>
              </select>
              <select
                className="rounded border px-3 py-2"
                value={internshipForm.type}
                onChange={(e) => setInternshipForm((prev) => ({ ...prev, type: e.target.value as 'FREE' | 'PAID' | 'STIPEND', fee: '', stipend: '' }))}
              >
                <option value="FREE">Free</option>
                <option value="PAID">Paid</option>
                <option value="STIPEND">With Stipend</option>
              </select>
              {internshipForm.type === 'PAID' ? <input name="fee" type="number" min={0} step="0.01" className="rounded border px-3 py-2" placeholder="Fee" value={internshipForm.fee} onChange={(e) => setInternshipForm((prev) => ({ ...prev, fee: e.target.value }))} required /> : null}
              {internshipForm.type === 'STIPEND' ? <input name="stipend" type="number" min={0} step="0.01" className="rounded border px-3 py-2" placeholder="Stipend per month" value={internshipForm.stipend} onChange={(e) => setInternshipForm((prev) => ({ ...prev, stipend: e.target.value }))} required /> : null}
              <div className="md:col-span-2 text-sm">
                <p className="font-medium">Internship Outcomes (IPO + CO)</p>
                {[...groupedInternshipOutcomes.IPO, ...groupedInternshipOutcomes.CO].map((item) => <label key={item.id} className="block"><input type="checkbox" checked={internshipForm.selectedInternshipOutcomes.includes(item.id)} onChange={() => toggleInternshipOutcome(item.id)} className="mr-2" />{item.description}</label>)}
              </div>
            </>
          )}

          <input name="duration" type="number" min={60} value={internshipForm.duration} onChange={(e) => setInternshipForm((prev) => ({ ...prev, duration: Number(e.target.value) || 0 }))} className="rounded border px-3 py-2" placeholder="Duration (hours)" required />
          <input name="vacancy" type="number" min={1} value={internshipForm.vacancy} onChange={(e) => setInternshipForm((prev) => ({ ...prev, vacancy: Number(e.target.value) || 1 }))} className="rounded border px-3 py-2" placeholder="Vacancy" required />

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button type="submit" value="SAVE_DRAFT" variant="secondary">Save Draft</Button>
            {internshipForm.targetType === 'INTERNAL' && internshipForm.industryMode === 'REGISTERED' ? (
              <Button type="submit" value="SEND_TO_IPO">Send to IPO</Button>
            ) : (
              <Button type="submit" value="PUBLISH">Publish</Button>
            )}
            {/* 
              Internal: Registered -> Send to IPO
              Internal: Manual/Not Registered -> Publish
              External -> Publish 
            */}
          </div>
        </form>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Internship Listings</h2>
        <div className="space-y-2 text-sm">
          {internships.map((item) => {
            const draft = editingInternshipId === item.id ? (editDraft as Internship) : item;
            return (
              <div key={item.id} className="rounded border p-3 space-y-2">
                <p><strong>Title:</strong> {item.title}</p>
                <p><strong>Type:</strong> {item.targetType}</p>
                <p><strong>Industry:</strong> {item.industryName || '-'}</p>
                <p><strong>Status:</strong> {item.status}</p>
                <p><strong>Duration:</strong> {item.duration} hours</p>
                <p><strong>Vacancy:</strong> {item.vacancy}</p>
                <div className="flex gap-2 items-center">
                  {editingInternshipId === item.id ? (
                    <select value={String(draft.status ?? item.status)} onChange={(e) => setEditDraft((prev) => ({ ...prev, status: e.target.value }))} className="rounded border px-2 py-1">
                      <option value="DRAFT">DRAFT</option>
                      <option value="IPO_SENT">IPO_SENT</option>
                      <option value="PUBLISHED">PUBLISHED</option>
                    </select>
                  ) : null}
                  <Button variant="secondary" onClick={() => { setEditingInternshipId(item.id); setEditDraft(item); }}>Edit</Button>
                  {editingInternshipId === item.id ? (
                    <Button onClick={() => void runAction(() => fetchWithSession(`/api/internship/update/${item.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({ ...editDraft }),
                    }).then(() => { setEditingInternshipId(null); setEditDraft({}); }), 'Internship updated.')}>Update Status</Button>
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
