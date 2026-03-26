'use client';

import { useEffect, useMemo, useState } from 'react';
import type { StudentDashboard } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

type InternshipTab = 'college' | 'external';

export default function StudentDashboardPage() {
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<InternshipTab>('external');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    const response = await fetchWithSession<StudentDashboard>('/student/dashboard');
    setDashboard(response.data);
  };

  useEffect(() => {
    refresh()
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const availableSlots = useMemo(() => {
    const maxAllowed = dashboard?.maxSelectableApplications ?? 3;
    const activeCount = dashboard?.applications?.filter((item) => ['PENDING', 'ACCEPTED'].includes(item.status)).length ?? 0;
    return Math.max(0, maxAllowed - activeCount);
  }, [dashboard]);

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 3 || prev.length >= availableSlots) return prev;
      return [...prev, id];
    });
  }

  async function applySelected() {
    if (!selectedIds.length) return;
    setSubmitting(true);
    setError(null);
    try {
      for (const internshipId of selectedIds) {
        await fetchWithSession('/api/applications', {
          method: 'POST',
          body: JSON.stringify({ internshipId }),
        });
      }
      setSelectedIds([]);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to submit applications.');
    } finally {
      setSubmitting(false);
    }
  }

  const canApply = Boolean(dashboard?.canApplyForExternal) && availableSlots > 0;

  return (
    <RoleDashboardShell allowedRoles={['STUDENT']} title="Student Dashboard" subtitle="Apply only to external internships and track your application journey.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] p-4 text-rose-200">{error}</Card> : null}
          {loading ? <Card className="rounded-[28px] p-4">Loading student data...</Card> : null}

          <Card className="rounded-[30px] p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Application rules</p>
            <h2 className="mt-3 text-xl font-semibold text-white">Internship policy status</h2>
            <p className="mt-2 text-sm text-slate-300">{dashboard?.policyNote ?? 'University policy applies.'}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge className="bg-cyan-400/10 text-cyan-200">Max active applications: {dashboard?.maxSelectableApplications ?? 3}</Badge>
              <Badge className="bg-amber-400/10 text-amber-200">Available slots now: {availableSlots}</Badge>
              <Badge className={dashboard?.activeApplicationLock ? 'bg-rose-500/10 text-rose-200' : 'bg-emerald-400/10 text-emerald-200'}>
                {dashboard?.activeApplicationLock ? 'Locked until department marks completion' : 'Eligible to apply'}
              </Badge>
            </div>
          </Card>

          <section className="grid gap-4 md:grid-cols-2">
            <Button variant={selectedTab === 'college' ? 'primary' : 'secondary'} onClick={() => setSelectedTab('college')}>
              Internship from this college
            </Button>
            <Button variant={selectedTab === 'external' ? 'primary' : 'secondary'} onClick={() => setSelectedTab('external')}>
              Internship from External Organizations
            </Button>
          </section>

          {selectedTab === 'college' ? (
            <Card className="rounded-[30px] p-6">
              <h2 className="text-xl font-semibold text-white">Internships from this college</h2>
              <p className="mt-2 text-sm text-amber-200">You can view these internships, but cannot apply as per university rule (mother institute restriction).</p>
              <div className="mt-4 space-y-3">
                {dashboard?.collegeInternships?.length ? dashboard.collegeInternships.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-sm text-slate-300">{item.collegeName} • {item.departmentName}</p>
                    <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                    <Button className="mt-3" disabled>You cannot apply</Button>
                  </div>
                )) : <p className="text-slate-300">No college-hosted internships found.</p>}
              </div>
            </Card>
          ) : (
            <Card className="rounded-[30px] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-white">External internships</h2>
                <Button disabled={!canApply || submitting || selectedIds.length === 0} onClick={applySelected}>
                  {submitting ? 'Applying...' : `Apply (${selectedIds.length})`}
                </Button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/20 text-slate-300">
                      <th className="py-2 pr-2">Select</th>
                      <th className="py-2 pr-2">Internship</th>
                      <th className="py-2 pr-2">Industry</th>
                      <th className="py-2 pr-2">Department</th>
                      <th className="py-2 pr-2">Vacancy</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard?.externalInternships?.length ? dashboard.externalInternships.map((item) => {
                      const disabled = item.applied || !canApply;
                      return (
                        <tr key={item.id} className="border-b border-white/10">
                          <td className="py-3 pr-2">
                            <input type="checkbox" checked={selectedIds.includes(item.id)} disabled={disabled} onChange={() => toggleSelection(item.id)} />
                          </td>
                          <td className="py-3 pr-2">
                            <p className="font-medium text-white">{item.title}</p>
                            <p className="text-xs text-slate-400">{item.description}</p>
                          </td>
                          <td className="py-3 pr-2">{item.industryName}</td>
                          <td className="py-3 pr-2">{item.departmentName}</td>
                          <td className="py-3 pr-2">{item.vacancy ?? 0}</td>
                          <td className="py-3">
                            <Badge className={item.applied ? 'bg-emerald-400/10 text-emerald-200' : 'bg-white/10 text-slate-200'}>
                              {item.applied ? item.status ?? 'Applied' : 'Open'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td className="py-3 text-slate-300" colSpan={6}>No external internships available right now.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </RoleDashboardShell>
  );
}
