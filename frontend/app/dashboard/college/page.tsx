'use client';

import { useEffect, useState } from 'react';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Card } from '@/components/ui/card';
import { fetchWithSession } from '@/lib/auth';

type Department = { id: string; name: string };
type ActiveInternship = { id: string; title: string; status: string; vacancy: number };
type CollegeOverview = {
  departments: Department[];
  internshipStats: { total: number; published: number };
  activeInternships: ActiveInternship[];
  studentParticipation: { participatingStudents: number; applications: number };
};

export default function CollegeDashboardPage() {
  const [data, setData] = useState<CollegeOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWithSession<CollegeOverview>('/api/dashboard/college/overview')
      .then((res) => setData(res.data ?? null))
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'));
  }, []);

  return (
    <RoleDashboardShell allowedRoles={['COLLEGE', 'COLLEGE_ADMIN', 'COLLEGE_COORDINATOR']} title="College Dashboard" subtitle="Departments, internship stats, active internships and participation.">
      {() => (
        <div className="space-y-4">
          {error ? <Card className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</Card> : null}
          <div className="grid gap-3 md:grid-cols-4">
            <Card className="rounded-2xl p-4"><p className="text-xs text-slate-500">Departments</p><p className="text-2xl font-bold">{data?.departments.length ?? 0}</p></Card>
            <Card className="rounded-2xl p-4"><p className="text-xs text-slate-500">Total Internships</p><p className="text-2xl font-bold">{data?.internshipStats.total ?? 0}</p></Card>
            <Card className="rounded-2xl p-4"><p className="text-xs text-slate-500">Active Internships</p><p className="text-2xl font-bold">{data?.internshipStats.published ?? 0}</p></Card>
            <Card className="rounded-2xl p-4"><p className="text-xs text-slate-500">Student Participation</p><p className="text-2xl font-bold">{data?.studentParticipation.participatingStudents ?? 0}</p></Card>
          </div>
          <Card className="rounded-2xl p-4"><h2 className="font-semibold">All Departments</h2><div className="mt-2 grid gap-2 md:grid-cols-2">{data?.departments.map((d) => <div key={d.id} className="rounded border p-2 text-sm">{d.name}</div>)}{!data?.departments?.length?<p className="text-sm text-slate-500">No departments found.</p>:null}</div></Card>
          <Card className="rounded-2xl p-4"><h2 className="font-semibold">Active Internships</h2><div className="mt-2 space-y-2">{data?.activeInternships.map((i) => <div key={i.id} className="rounded border p-2 text-sm">{i.title} • Vacancy: {i.vacancy}</div>)}{!data?.activeInternships?.length?<p className="text-sm text-slate-500">No active internships.</p>:null}</div></Card>
        </div>
      )}
    </RoleDashboardShell>
  );
}
