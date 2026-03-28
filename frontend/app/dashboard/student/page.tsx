'use client';

import { useEffect, useState } from 'react';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchWithSession } from '@/lib/auth';

type Internship = { id: string; title: string; description: string; industry_name?: string | null; college_name?: string | null; department_name?: string | null; vacancy?: number | null; application_id?: string | null; application_status?: string | null };
type Application = { id: string; internship_title: string; status: string };

export default function StudentDashboardPage() {
  const [available, setAvailable] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetchWithSession<{ availableInternships: Internship[]; applications: Application[] }>('/api/dashboard/student/overview');
    setAvailable(res.data?.availableInternships ?? []);
    setApplications(res.data?.applications ?? []);
  };

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : 'Load failed')); }, []);

  async function apply(internshipId: string) {
    await fetchWithSession('/api/internship/apply', { method: 'POST', body: JSON.stringify({ internshipId }) });
    await load();
  }

  return (
    <RoleDashboardShell allowedRoles={['STUDENT']} title="Student Dashboard" subtitle="Browse internships, apply, and track application status.">
      {() => (
        <div className="space-y-4">
          {error ? <Card className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</Card> : null}
          <Card className="rounded-2xl p-4"><h2 className="font-semibold">Available Internships</h2>
            <div className="mt-3 space-y-2">{available.map((item) => <div key={item.id} className="rounded-xl border p-3 text-sm"><p className="font-medium">{item.title}</p><p className="text-slate-600">{item.description}</p><p className="mt-1 text-slate-500">{item.industry_name || 'Industry'} • {item.department_name || '-'} • Vacancy: {item.vacancy ?? 0}</p><Button className="mt-2" disabled={!!item.application_id} onClick={() => apply(item.id)}>{item.application_id ? `Applied (${item.application_status})` : 'Apply'}</Button></div>)}{available.length===0?<p className="text-sm text-slate-500">No internships available now.</p>:null}</div>
          </Card>
          <Card className="rounded-2xl p-4"><h2 className="font-semibold">Status Tracking</h2><div className="mt-2 space-y-2">{applications.map((app) => <div key={app.id} className="rounded border p-2 text-sm">{app.internship_title} • {app.status}</div>)}{applications.length===0?<p className="text-sm text-slate-500">No applications yet.</p>:null}</div></Card>
        </div>
      )}
    </RoleDashboardShell>
  );
}
