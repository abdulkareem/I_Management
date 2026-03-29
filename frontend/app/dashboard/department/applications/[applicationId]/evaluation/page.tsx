'use client';

import { FormEvent, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWithSession } from '@/lib/auth';

export default function DepartmentApplicationEvaluationPage() {
  const router = useRouter();
  const params = useParams<{ applicationId: string }>();
  const [markForm, setMarkForm] = useState({ attendanceMarks: '0', workRegisterMarks: '0', presentationMarks: '0', vivaMarks: '0', reportMarks: '0' });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    try {
      await fetchWithSession(`/api/department/applications/${params.applicationId}/evaluation`, {
        method: 'POST',
        body: JSON.stringify({
          attendanceMarks: Number(markForm.attendanceMarks || 0),
          workRegisterMarks: Number(markForm.workRegisterMarks || 0),
          presentationMarks: Number(markForm.presentationMarks || 0),
          vivaMarks: Number(markForm.vivaMarks || 0),
          reportMarks: Number(markForm.reportMarks || 0),
        }),
      });
      setMessage('Evaluation saved successfully.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save evaluation');
    }
  }

  const total = Number(markForm.attendanceMarks || 0) + Number(markForm.workRegisterMarks || 0) + Number(markForm.presentationMarks || 0) + Number(markForm.vivaMarks || 0) + Number(markForm.reportMarks || 0);

  return (
    <RoleDashboardShell
      allowedRoles={['DEPARTMENT_COORDINATOR', 'COORDINATOR']}
      title="Internship Evaluation Entry"
      subtitle="Enter CCA and ESE marks."
    >
      {() => (
        <Card className="rounded-[20px] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Evaluation Options</h2>
          <Button variant="secondary" onClick={() => router.push('/dashboard/department')}>Close</Button>
        </div>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <div className="grid gap-3 md:grid-cols-2 rounded-lg border border-slate-200 p-3">
            <p className="md:col-span-2 text-sm font-semibold">CCA (15): Attendance & Performance Feedback (9) + Work Register (6)</p>
            <label className="grid gap-1 text-sm">Attendance & Performance Feedback (0-9)<input type="number" min={0} max={9} value={markForm.attendanceMarks} onChange={(e) => setMarkForm((prev) => ({ ...prev, attendanceMarks: e.target.value }))} /></label>
            <label className="grid gap-1 text-sm">Work Register (0-6)<input type="number" min={0} max={6} value={markForm.workRegisterMarks} onChange={(e) => setMarkForm((prev) => ({ ...prev, workRegisterMarks: e.target.value }))} /></label>
          </div>
          <div className="grid gap-3 md:grid-cols-2 rounded-lg border border-slate-200 p-3">
            <p className="md:col-span-2 text-sm font-semibold">ESE (35): Presentation (14) + Viva (14) + Report (7)</p>
            <label className="grid gap-1 text-sm">Presentation (0-14)<input type="number" min={0} max={14} value={markForm.presentationMarks} onChange={(e) => setMarkForm((prev) => ({ ...prev, presentationMarks: e.target.value }))} /></label>
            <label className="grid gap-1 text-sm">Viva Voce (0-14)<input type="number" min={0} max={14} value={markForm.vivaMarks} onChange={(e) => setMarkForm((prev) => ({ ...prev, vivaMarks: e.target.value }))} /></label>
            <label className="grid gap-1 text-sm md:col-span-2">Internship Report (0-7)<input type="number" min={0} max={7} value={markForm.reportMarks} onChange={(e) => setMarkForm((prev) => ({ ...prev, reportMarks: e.target.value }))} /></label>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 text-sm">
            <p><strong>Final Evaluation</strong>: CCA + ESE = 50</p>
            <p>Current Total: {total} / 50</p>
          </div>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <div><Button type="submit">Save All</Button></div>
        </form>
        </Card>
      )}
    </RoleDashboardShell>
  );
}
