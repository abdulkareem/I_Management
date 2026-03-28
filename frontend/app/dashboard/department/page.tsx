'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

type Internship = { id: string; title: string; status: string; vacancy: number; industry_id?: string | null };
type Application = { id: string; status: string; internship_title: string; student_name?: string | null };

export default function DepartmentDashboardPage() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    const res = await fetchWithSession<{ internships: Internship[]; applications: Application[] }>('/api/dashboard/department/overview');
    setInternships(res.data?.internships ?? []);
    setApplications(res.data?.applications ?? []);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load')).finally(() => setLoading(false));
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setCreating(true);
    try {
      await fetchWithSession('/api/internship/create', {
        method: 'POST',
        body: JSON.stringify({
          title: form.get('title'),
          description: form.get('description'),
          type: form.get('type'),
          industryId: form.get('industryId') || null,
          vacancy: Number(form.get('vacancy') || 0),
          internshipType: form.get('internshipType'),
          feeAmount: Number(form.get('feeAmount') || 0) || null,
          stipendAmount: Number(form.get('stipendAmount') || 0) || null,
          stipendFrequency: form.get('stipendFrequency') || null,
          durationHours: Number(form.get('durationHours') || 0) || null,
          gender: form.get('gender') || 'BOTH',
        }),
      });
      event.currentTarget.reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Creation failed');
    } finally {
      setCreating(false);
    }
  }

  const grouped = useMemo(() => ({
    sent: internships.filter((item) => item.status === 'SENT'),
    published: internships.filter((item) => item.status === 'PUBLISHED'),
  }), [internships]);

  return (
    <RoleDashboardShell allowedRoles={['DEPARTMENT_COORDINATOR', 'COORDINATOR']} title="Department Dashboard" subtitle="Create, route, publish and track internships.">
      {() => (
        <div className="space-y-4">
          {error ? <Card className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</Card> : null}
          {loading ? <Card className="rounded-2xl p-4">Loading...</Card> : null}

          <Card className="rounded-2xl p-4">
            <h2 className="text-lg font-semibold">Create Internship</h2>
            <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onCreate}>
              <Input name="title" placeholder="Title" required />
              <Input name="description" placeholder="Description" required />
              <select name="type" className="rounded-xl border p-2"><option value="EXTERNAL">External</option><option value="INTERNAL">Internal</option></select>
              <Input name="industryId" placeholder="Industry ID (required for internal)" />
              <Input name="vacancy" type="number" min={1} placeholder="Vacancy" required />
              <select name="internshipType" className="rounded-xl border p-2"><option value="FREE">FREE</option><option value="PAID">PAID</option><option value="STIPEND">STIPEND</option></select>
              <Input name="feeAmount" type="number" min={0} placeholder="Fee Amount" />
              <Input name="stipendAmount" type="number" min={0} placeholder="Stipend Amount" />
              <select name="stipendFrequency" className="rounded-xl border p-2"><option value="MONTH">MONTH</option><option value="WEEK">WEEK</option><option value="DAY">DAY</option></select>
              <Input name="durationHours" type="number" min={1} placeholder="Duration Hours" />
              <select name="gender" className="rounded-xl border p-2"><option value="BOTH">BOTH</option><option value="BOYS">BOYS</option><option value="GIRLS">GIRLS</option></select>
              <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Internship'}</Button>
            </form>
          </Card>

          <Card className="rounded-2xl p-4"><h3 className="font-semibold">Sent to Industry</h3><p className="text-sm text-slate-600">{grouped.sent.length} internships</p></Card>
          <Card className="rounded-2xl p-4"><h3 className="font-semibold">Published Internships</h3><p className="text-sm text-slate-600">{grouped.published.length} internships</p></Card>
          <Card className="rounded-2xl p-4">
            <h3 className="font-semibold">Student Applications</h3>
            <div className="mt-2 space-y-2">{applications.map((item) => <div key={item.id} className="rounded-lg border p-2 text-sm">{item.student_name || 'Student'} • {item.internship_title} • {item.status}</div>)}{applications.length===0?<p className="text-sm text-slate-500">No applications yet.</p>:null}</div>
          </Card>
        </div>
      )}
    </RoleDashboardShell>
  );
}
