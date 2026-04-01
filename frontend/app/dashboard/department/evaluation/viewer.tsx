'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchWithSession } from '@/lib/auth';

export default function EvaluationEntry({ studentId, internshipId }: { studentId: string; internshipId: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ attendanceMarks: '0', skillMarks: '0', reportMarks: '0', vivaMarks: '0', disciplineMarks: '0' });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const total = useMemo(() => Object.values(form).reduce((sum, value) => sum + Number(value || 0), 0), [form]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage(null); setError(null);
    try {
      const res = await fetchWithSession<any>('/api/department/evaluation', { method: 'POST', body: JSON.stringify({ studentId, internshipId, ...form }) });
      setMessage(`Saved. Total: ${res.data?.total ?? total} Grade: ${res.data?.grade ?? '-'}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to save evaluation');
    } finally { setSaving(false); }
  }

  return <RoleDashboardShell allowedRoles={['DEPARTMENT_COORDINATOR', 'COORDINATOR']} title="Department Evaluation" subtitle="Attendance, technical, report, viva, discipline.">{() => (
    <Card className="rounded-[20px] p-5 text-slate-900">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Evaluation Entry</h2><Button variant="secondary" onClick={() => router.push('/dashboard/department')}>Close</Button></div>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
        <label className="grid gap-1 text-sm">Attendance / Participation<input type="number" min={0} max={20} value={form.attendanceMarks} onChange={(e) => setForm((p) => ({ ...p, attendanceMarks: e.target.value }))} /></label>
        <label className="grid gap-1 text-sm">Technical Skills<input type="number" min={0} max={20} value={form.skillMarks} onChange={(e) => setForm((p) => ({ ...p, skillMarks: e.target.value }))} /></label>
        <label className="grid gap-1 text-sm">Report Quality<input type="number" min={0} max={20} value={form.reportMarks} onChange={(e) => setForm((p) => ({ ...p, reportMarks: e.target.value }))} /></label>
        <label className="grid gap-1 text-sm">Viva / Presentation<input type="number" min={0} max={20} value={form.vivaMarks} onChange={(e) => setForm((p) => ({ ...p, vivaMarks: e.target.value }))} /></label>
        <label className="grid gap-1 text-sm md:col-span-2">Discipline<input type="number" min={0} max={20} value={form.disciplineMarks} onChange={(e) => setForm((p) => ({ ...p, disciplineMarks: e.target.value }))} /></label>
        <p className="text-sm md:col-span-2">Total: {total} / 100</p>
        {message ? <p className="text-sm text-emerald-700 md:col-span-2">{message}</p> : null}
        {error ? <p className="text-sm text-rose-700 md:col-span-2">{error}</p> : null}
        <div className="md:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Evaluation'}</Button></div>
      </form>
    </Card>
  )}</RoleDashboardShell>;
}
