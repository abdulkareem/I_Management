'use client';

import { useEffect, useState } from 'react';
import type { StudentDashboard } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

export default function ExternalStudentDashboardPage() {
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetchWithSession<StudentDashboard>('/api/dashboard/student');
    setDashboard(res.data);
  }

  useEffect(() => {
    load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.'));
  }, []);

  async function apply(internshipId: string) {
    await fetchWithSession(`/api/external/applications/${internshipId}`, { method: 'POST' });
    await load();
  }

  return (
    <RoleDashboardShell allowedRoles={['STUDENT']} title="External Student Dashboard" subtitle="Apply to internships and track live status.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] p-4 text-rose-800">{error}</Card> : null}
          <DataTable
            title="Available Internships"
            rows={(dashboard?.internships ?? []).map((i) => ({ ...i, id: i.id, action: i.applied ? (i.status ?? 'Applied') : 'Apply' }))}
            columns={[{ key: 'title', label: 'Title' }, { key: 'ipoName', label: 'IPO' }, { key: 'description', label: 'Description' }, { key: 'action', label: 'State' }]}
            actions={(row) => <Button disabled={row.applied} onClick={() => apply(row.id)}>{row.applied ? row.status ?? 'Applied' : 'Apply'}</Button>}
          />
          <DataTable title="My Applications" rows={(dashboard?.applications ?? []).map((a) => ({ ...a, id: a.id }))} columns={[{ key: 'internshipTitle', label: 'Internship' }, { key: 'ipoName', label: 'IPO' }, { key: 'status', label: 'Status' }]} />
        </>
      )}
    </RoleDashboardShell>
  );
}
