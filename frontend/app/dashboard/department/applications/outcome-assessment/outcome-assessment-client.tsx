'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWithSession } from '@/lib/auth';

type OutcomeAssessmentClientProps = {
  applicationId: string;
};

export default function OutcomeAssessmentClient({ applicationId }: OutcomeAssessmentClientProps) {
  const router = useRouter();
  const [form, setForm] = useState({ outcomeType: 'CO', outcomeId: '', studentScore: '0', supervisorScore: '0', coordinatorScore: '0' });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      await fetchWithSession(`/api/department/applications/${applicationId}/outcome-assessment`, {
        method: 'POST',
        body: JSON.stringify({
          outcomeId: form.outcomeId.trim(),
          outcomeType: form.outcomeType,
          studentScore: Number(form.studentScore || 0),
          supervisorScore: Number(form.supervisorScore || 0),
          coordinatorScore: Number(form.coordinatorScore || 0),
        }),
      });
      setMessage('Outcome assessment saved successfully.');
      setForm({ outcomeType: 'CO', outcomeId: '', studentScore: '0', supervisorScore: '0', coordinatorScore: '0' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save outcome assessment');
    }
  }

  return (
    <RoleDashboardShell
      allowedRoles={['DEPARTMENT_COORDINATOR', 'COORDINATOR']}
      title="Outcome Assessment Engine"
      subtitle="Submit outcome evaluation options."
    >
      {() => (
        <Card className="rounded-[20px] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Outcome Evaluation Options</h2>
          <Button variant="secondary" onClick={() => router.push('/dashboard/department')}>Close</Button>
        </div>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <label className="grid gap-1 text-sm">Outcome Type
            <select value={form.outcomeType} onChange={(e) => setForm((prev) => ({ ...prev, outcomeType: e.target.value }))}>
              <option value="CO">CO</option>
              <option value="PO">PO</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">Outcome Code<input value={form.outcomeId} onChange={(e) => setForm((prev) => ({ ...prev, outcomeId: e.target.value }))} placeholder="CO1 / PO2" /></label>
          <label className="grid gap-1 text-sm">Student Score (0-5)<input type="number" min={0} max={5} value={form.studentScore} onChange={(e) => setForm((prev) => ({ ...prev, studentScore: e.target.value }))} /></label>
          <label className="grid gap-1 text-sm">Supervisor Score (0-5)<input type="number" min={0} max={5} value={form.supervisorScore} onChange={(e) => setForm((prev) => ({ ...prev, supervisorScore: e.target.value }))} /></label>
          <label className="grid gap-1 text-sm md:col-span-2">Coordinator Score (0-5)<input type="number" min={0} max={5} value={form.coordinatorScore} onChange={(e) => setForm((prev) => ({ ...prev, coordinatorScore: e.target.value }))} /></label>
          {message ? <p className="text-sm text-emerald-700 md:col-span-2">{message}</p> : null}
          {error ? <p className="text-sm text-rose-700 md:col-span-2">{error}</p> : null}
          <div className="md:col-span-2"><Button type="submit">Save</Button></div>
        </form>
        </Card>
      )}
    </RoleDashboardShell>
  );
}
