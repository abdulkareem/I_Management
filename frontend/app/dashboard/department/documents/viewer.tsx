'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/config';

export default function DocumentsViewer({ studentId, internshipId }: { studentId: string; internshipId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true); setError(null);
    try {
      const session = localStorage.getItem('internsuite.session');
      const token = session ? JSON.parse(session).token : '';
      const res = await fetch(`${API_BASE_URL}/api/department/documents/${studentId}/${internshipId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to generate document bundle');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `department-documents-${studentId}-${internshipId}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to download documents');
    } finally { setLoading(false); }
  }

  return <RoleDashboardShell allowedRoles={['DEPARTMENT_COORDINATOR']} title="Combined Documents" subtitle="Single consolidated PDF package.">{() => (
    <Card className="rounded-[20px] p-5 text-slate-900">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Documents</h2><Button variant="secondary" onClick={() => router.push('/dashboard/department')}>Close</Button></div>
      <ul className="mb-4 list-disc pl-5 text-sm text-slate-800">
        <li>Internship Approval Letter</li><li>Allotment Letter</li><li>Acceptance Letter</li><li>IPO Feedback</li><li>Department Evaluation Sheet</li><li>Outcome Assessment Report</li>
      </ul>
      {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
      <Button onClick={download} disabled={loading}>{loading ? 'Generating...' : 'Download Combined PDF'}</Button>
    </Card>
  )}</RoleDashboardShell>;
}
