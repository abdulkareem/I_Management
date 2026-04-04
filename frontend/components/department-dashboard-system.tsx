'use client';

import { FormEvent, Fragment, useEffect, useMemo, useState } from 'react';
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
  outcomeMappings?: Array<{ outcomeId: string; outcome?: InternshipOutcome }>;
};
type Industry = { id: string; name: string };
type Application = {
  id: string;
  internship_id?: string;
  internship_title?: string;
  student_id?: string;
  external_student_id?: string;
  user_id?: string;
  student_name: string;
  student_email?: string | null;
  student_mobile?: string | null;
  student_college?: string | null;
  student_department?: string | null;
  programme: string | null;
  status: 'APPLIED' | 'APPROVED' | 'REJECTED' | string;
};

type ApplicationDetail = Application & {
  duration?: number | null;
  department_name?: string | null;
};

type ApplicationInsights = {
  feedbackSubmitted: boolean | null;
  firstEvaluation: number | null;
  secondEvaluation: number | null;
  totalMarks: number | null;
  outcomeEvaluation: number | null;
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
  const [editDraft, setEditDraft] = useState<Partial<Internship> & { selectedOutcomeIds?: string[] }>({});

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [applicationInsights, setApplicationInsights] = useState<Record<string, ApplicationInsights>>({});
  const [applicationLoading, setApplicationLoading] = useState<Record<string, boolean>>({});
  const [expandedApplications, setExpandedApplications] = useState<Record<string, boolean>>({});
  const [applicationDetails, setApplicationDetails] = useState<Record<string, ApplicationDetail>>({});

  const load = async () => {
    const [programmeRes, outcomeRes, internshipRes, internalRes, externalRes, industryRes] = await Promise.all([
      fetchWithSession<Programme[]>(`/api/programme/list${departmentId ? `?departmentId=${departmentId}` : ''}`),
      fetchWithSession<InternshipOutcome[]>(`/api/internship-outcome/list${departmentId ? `?departmentId=${departmentId}` : ''}`),
      fetchWithSession<Internship[]>(`/api/internship/list${departmentId ? `?departmentId=${departmentId}` : ''}`),
      fetchWithSession<Application[]>('/api/application/list?type=INTERNAL').catch(() => ({ data: [] })),
      fetchWithSession<Application[]>('/api/application/list?type=EXTERNAL').catch(() => ({ data: [] })),
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

  useEffect(() => {
    const applications = [...internalApplications, ...externalApplications].filter((application) => expandedApplications[application.id]);
    if (!applications.length) return;
    let cancelled = false;
    applications.forEach((application) => {
      if (!application?.id || applicationInsights[application.id] || applicationLoading[application.id]) return;
      setApplicationLoading((prev) => ({ ...prev, [application.id]: true }));
      Promise.allSettled([
        fetchWithSession(`/api/department/applications/${application.id}/feedback-form`),
        fetchWithSession<{ evaluation?: { cca_total?: number; ese_total?: number; final_total?: number }; outcomes?: Array<{ percentage?: number }> }>(`/api/department/applications/${application.id}/marksheet`),
      ]).then((results) => {
        if (cancelled) return;
        const feedbackResult = results[0].status === 'fulfilled' ? results[0].value.data : null;
        const marksheetResult = results[1].status === 'fulfilled' ? results[1].value.data : null;
        const evaluation = marksheetResult?.evaluation ?? null;
        const firstEvaluation = evaluation?.cca_total !== undefined ? Number(evaluation.cca_total ?? 0) : null;
        const secondEvaluation = evaluation?.ese_total !== undefined ? Number(evaluation.ese_total ?? 0) : null;
        const totalMarks = evaluation?.final_total !== undefined ? Number(evaluation.final_total ?? 0) : null;
        const outcomes = Array.isArray(marksheetResult?.outcomes) ? marksheetResult.outcomes : [];
        const outcomeEvaluation = outcomes.length
          ? outcomes.reduce((sum: number, item: any) => sum + Number(item?.percentage ?? 0), 0) / outcomes.length
          : null;

        setApplicationInsights((prev) => ({
          ...prev,
          [application.id]: {
            feedbackSubmitted: Boolean(feedbackResult),
            firstEvaluation,
            secondEvaluation,
            totalMarks,
            outcomeEvaluation,
          },
        }));
      }).finally(() => {
        if (cancelled) return;
        setApplicationLoading((prev) => ({ ...prev, [application.id]: false }));
      });
    });
    return () => {
      cancelled = true;
    };
  }, [internalApplications, externalApplications, applicationInsights, applicationLoading, expandedApplications]);

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
  const internshipStatuses = useMemo(
    () => Array.from(new Set(internships.map((item) => item.status))).sort(),
    [internships],
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

  async function approveApplication(app: Application) {
    await runAction(async () => {
      await fetchWithSession('/api/application/update-status', {
        method: 'PUT',
        body: JSON.stringify({ applicationId: app.id, status: 'APPROVED' }),
      });
      await fetchWithSession('/api/letters/generate', {
        method: 'POST',
        body: JSON.stringify({ applicationId: app.id }),
      });
    }, 'Application approved and letters generated.');
  }

  async function rejectApplication(app: Application) {
    await runAction(async () => {
      await fetchWithSession('/api/application/update-status', {
        method: 'PUT',
        body: JSON.stringify({ applicationId: app.id, status: 'REJECTED' }),
      });
    }, `Application rejected for ${app.student_name}.`);
  }

  async function downloadLetters(applicationId: string) {
    await runAction(async () => {
      const sessionRaw = localStorage.getItem('internsuite.session');
      const token = sessionRaw ? JSON.parse(sessionRaw).token : '';
      const response = await fetch(`${window.location.origin}/api/letters/download?applicationId=${encodeURIComponent(applicationId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Letters are not available yet.');
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `letters-${applicationId}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    }, 'Letters downloaded.');
  }

  async function toggleApplicationDetails(applicationId: string) {
    setExpandedApplications((prev) => {
      const next = !prev[applicationId];
      return { ...prev, [applicationId]: next };
    });
    if (applicationDetails[applicationId]) return;
    const payload = await fetchWithSession<ApplicationDetail>(`/api/application/list?applicationId=${encodeURIComponent(applicationId)}`);
    if (payload.data) {
      setApplicationDetails((prev) => ({ ...prev, [applicationId]: payload.data as ApplicationDetail }));
    }
  }

  async function downloadMarkStatement(applicationId: string) {
    await runAction(async () => {
      const payload = await fetchWithSession<Record<string, unknown>>(`/api/department/applications/${applicationId}/marksheet`);
      const blob = new Blob([JSON.stringify(payload.data ?? {}, null, 2)], { type: 'application/json;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `mark-statement-${applicationId}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    }, 'Mark statement downloaded.');
  }

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
      SEND_TO_IPO: 'SENT_IPO',
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
            const selectedOutcomeIds = editDraft.selectedOutcomeIds ?? item.outcomeMappings?.map((mapping) => mapping.outcomeId) ?? [];
            return (
              <div key={item.id} className="rounded border p-3 space-y-2">
                {editingInternshipId === item.id ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    <input className="rounded border px-2 py-1" value={String(draft.title ?? '')} onChange={(e) => setEditDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title" />
                    <input
                      className="rounded border px-2 py-1"
                      value={String(draft.industryName ?? '')}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, industryName: e.target.value }))}
                      placeholder="Industry"
                      disabled={item.status === 'IPO_SENT'}
                    />
                    <textarea className="rounded border px-2 py-1 md:col-span-2" value={String(draft.description ?? '')} onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" />
                    <select className="rounded border px-2 py-1" value={String(draft.programmeId ?? '')} onChange={(e) => setEditDraft((prev) => ({ ...prev, programmeId: e.target.value || null }))}>
                      <option value="">Select Programme</option>
                      {programmes.map((programme) => <option key={programme.id} value={programme.id}>{programme.name}</option>)}
                    </select>
                    <select className="rounded border px-2 py-1" value={String(draft.targetType ?? item.targetType)} onChange={(e) => setEditDraft((prev) => ({ ...prev, targetType: e.target.value as 'INTERNAL' | 'EXTERNAL' }))}>
                      <option value="INTERNAL">INTERNAL</option>
                      <option value="EXTERNAL">EXTERNAL</option>
                    </select>
                    <select className="rounded border px-2 py-1" value={String(draft.type ?? item.type)} onChange={(e) => setEditDraft((prev) => ({ ...prev, type: e.target.value as 'FREE' | 'PAID' | 'STIPEND' }))}>
                      <option value="FREE">FREE</option>
                      <option value="PAID">PAID</option>
                      <option value="STIPEND">STIPEND</option>
                    </select>
                    <select className="rounded border px-2 py-1" value={String(draft.gender ?? item.gender ?? 'BOTH')} onChange={(e) => setEditDraft((prev) => ({ ...prev, gender: e.target.value }))}>
                      <option value="BOTH">BOTH</option>
                      <option value="BOYS">BOYS</option>
                      <option value="GIRLS">GIRLS</option>
                    </select>
                    <input type="number" min={60} className="rounded border px-2 py-1" value={String(draft.duration ?? item.duration)} onChange={(e) => setEditDraft((prev) => ({ ...prev, duration: Number(e.target.value) || 60 }))} placeholder="Duration (hours)" />
                    <input type="number" min={1} className="rounded border px-2 py-1" value={String(draft.vacancy ?? item.vacancy)} onChange={(e) => setEditDraft((prev) => ({ ...prev, vacancy: Number(e.target.value) || 1 }))} placeholder="Vacancy" />
                    {(draft.type ?? item.type) === 'PAID' ? <input type="number" min={0} className="rounded border px-2 py-1" value={String(draft.fee ?? item.fee ?? 0)} onChange={(e) => setEditDraft((prev) => ({ ...prev, fee: Number(e.target.value) || 0, stipend: null }))} placeholder="Fee" /> : null}
                    {(draft.type ?? item.type) === 'STIPEND' ? <input type="number" min={0} className="rounded border px-2 py-1" value={String(draft.stipend ?? item.stipend ?? 0)} onChange={(e) => setEditDraft((prev) => ({ ...prev, stipend: Number(e.target.value) || 0, fee: null }))} placeholder="Stipend" /> : null}
                    <div className="rounded border p-2 text-xs md:col-span-2">
                      <p className="mb-1 font-medium">Internship Outcomes (PO/IPO/CO)</p>
                      <div className="grid gap-1 md:grid-cols-2">
                        {internshipOutcomes.map((outcome) => (
                          <label key={outcome.id} className="block">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={selectedOutcomeIds.includes(outcome.id)}
                              onChange={() => {
                                const nextIds = selectedOutcomeIds.includes(outcome.id)
                                  ? selectedOutcomeIds.filter((id) => id !== outcome.id)
                                  : [...selectedOutcomeIds, outcome.id];
                                setEditDraft((prev) => ({ ...prev, selectedOutcomeIds: nextIds }));
                              }}
                            />
                            {outcome.type}: {outcome.description}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p><strong>Title:</strong> {item.title}</p>
                    <p><strong>Type:</strong> {item.targetType}</p>
                    <p><strong>Industry:</strong> {item.industryName || '-'}</p>
                    <p><strong>Status:</strong> {item.status}</p>
                    <p><strong>Duration:</strong> {item.duration} hours</p>
                    <p><strong>Vacancy:</strong> {item.vacancy}</p>
                  </>
                )}
                <div className="flex gap-2 items-center">
                  {editingInternshipId === item.id ? (
                    <select value={String(draft.status ?? item.status)} onChange={(e) => setEditDraft((prev) => ({ ...prev, status: e.target.value }))} className="rounded border px-2 py-1">
                      {internshipStatuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  ) : null}
                  <Button variant="secondary" onClick={() => { setEditingInternshipId(item.id); setEditDraft({ ...item, selectedOutcomeIds: item.outcomeMappings?.map((mapping) => mapping.outcomeId) ?? [] }); }}>Edit</Button>
                  {editingInternshipId === item.id ? (
                    <Button onClick={() => void runAction(() => fetchWithSession(`/api/internship/update/${item.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({ ...editDraft, outcomeIds: selectedOutcomeIds }),
                    }).then(() => { setEditingInternshipId(null); setEditDraft({}); }), 'Internship updated.')}>Update Status</Button>
                  ) : null}
                  <Button variant="secondary" onClick={() => void runAction(() => fetchWithSession(`/api/internship/delete/${item.id}`, { method: 'DELETE' }).then(() => undefined), 'Internship deleted.')}>Delete</Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {[
          { title: 'Internal Applications', items: internalApplications },
          { title: 'External Applications', items: externalApplications },
        ].map(({ title, items }) => (
          <Card key={title} className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 p-0 shadow-[0_14px_54px_-28px_rgba(15,23,42,0.45)]">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold">{title}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100/80 text-left text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">College</th>
                    <th className="px-4 py-3">Internship</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((app) => (
                    <Fragment key={app.id}>
                      <tr className="border-t border-slate-100 hover:bg-indigo-50/40">
                        <td className="px-4 py-3">{app.student_name}</td>
                        <td className="px-4 py-3">{app.student_college ?? '-'}</td>
                        <td className="px-4 py-3">{app.internship_title ?? '-'}</td>
                        <td className="px-4 py-3">{app.status}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="secondary" onClick={() => void approveApplication(app)}>Approve</Button>
                            <Button type="button" variant="secondary" onClick={() => void rejectApplication(app)}>Reject</Button>
                            <Button type="button" variant="secondary" onClick={() => void toggleApplicationDetails(app.id)}>
                              {expandedApplications[app.id] ? 'Hide Details' : 'View Details'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedApplications[app.id] ? (
                        <tr className="border-t border-slate-100 bg-slate-50/80">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="grid gap-2 md:grid-cols-2">
                              <p><strong>Email:</strong> {applicationDetails[app.id]?.student_email ?? app.student_email ?? '-'}</p>
                              <p><strong>Mobile:</strong> {applicationDetails[app.id]?.student_mobile ?? app.student_mobile ?? '-'}</p>
                              <p><strong>Department:</strong> {applicationDetails[app.id]?.student_department ?? '-'}</p>
                              <p><strong>Programme:</strong> {applicationDetails[app.id]?.programme ?? app.programme ?? '-'}</p>
                            </div>
                            <div className="mt-2 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-3">
                              <p><strong>Feedback:</strong> {applicationLoading[app.id] ? 'Loading...' : (applicationInsights[app.id]?.feedbackSubmitted ? 'Submitted' : 'Pending')}</p>
                              <p><strong>Evaluation-I:</strong> {applicationInsights[app.id]?.firstEvaluation ?? 'Pending'}</p>
                              <p><strong>Evaluation-II:</strong> {applicationInsights[app.id]?.secondEvaluation ?? 'Pending'}</p>
                              <p><strong>Total Marks:</strong> {applicationInsights[app.id]?.totalMarks ?? 'Pending'}</p>
                              <p><strong>Outcome Eval:</strong> {applicationInsights[app.id]?.outcomeEvaluation ?? 'Pending'}</p>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button type="button" variant="secondary" onClick={() => void downloadLetters(app.id)}>Download Letters</Button>
                              <Button type="button" variant="secondary" onClick={() => void downloadMarkStatement(app.id)}>Download Mark Statement</Button>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
