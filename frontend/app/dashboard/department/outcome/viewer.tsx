'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchWithSession } from '@/lib/auth';

export default function OutcomeViewer({ studentId, internshipId }: { studentId: string; internshipId: string }) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetchWithSession(`/api/department/outcome/${studentId}/${internshipId}`);
      setData(res.data ?? null);
    } catch {
      try {
        await fetchWithSession('/api/department/outcome-assessment', { method: 'POST', body: JSON.stringify({ studentId, internshipId }) });
        const res = await fetchWithSession(`/api/department/outcome/${studentId}/${internshipId}`);
        setData(res.data ?? null);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to load outcome data');
      }
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [studentId, internshipId]);

  return <RoleDashboardShell allowedRoles={['DEPARTMENT_COORDINATOR', 'COORDINATOR']} title="Outcome Assessment" subtitle="PO mapping and attainment.">{() => (
    <Card className="rounded-[20px] p-5 text-slate-900">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Outcome Assessment Engine</h2><Button variant="secondary" onClick={() => router.push('/dashboard/department')}>Close</Button></div>
      {loading ? <p className="text-sm">Loading outcome data...</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {!loading && !error && !data ? <p className="text-sm text-slate-600">No data available.</p> : null}
      {data ? <div className="space-y-1 text-sm">
        <p>PO1 (Technical Skills): {data.po1_score}%</p>
        <p>PO2 (Communication): {data.po2_score}%</p>
        <p>PO3 (Technical Depth): {data.po3_score}%</p>
        <p>PO4 (Report): {data.po4_score}%</p>
        <p><strong>Attainment Level:</strong> {data.attainment_level}</p>
        <pre className="mt-3 rounded border bg-slate-50 p-2 text-xs">{JSON.stringify(data.graph ?? [], null, 2)}</pre>
      </div> : null}
    </Card>
  )}</RoleDashboardShell>;
}
