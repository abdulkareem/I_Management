'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWithSession } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export default function DepartmentApplicationDocumentsPage() {
  const router = useRouter();
  const params = useParams<{ applicationId: string }>();
  const [hasFeedback, setHasFeedback] = useState(false);
  const [hasEvaluation, setHasEvaluation] = useState(false);
  const [hasOutcomes, setHasOutcomes] = useState(false);

  useEffect(() => {
    if (!params.applicationId) return;
    fetchWithSession(`/api/industry/applications/${params.applicationId}/feedback-form`)
      .then((res) => setHasFeedback(Boolean(res.data)))
      .catch(() => setHasFeedback(false));
    fetchWithSession(`/api/department/applications/${params.applicationId}/marksheet`)
      .then((res: any) => {
        setHasEvaluation(Boolean(res.data?.evaluation));
        setHasOutcomes(Boolean((res.data?.outcomes ?? []).length));
      })
      .catch(() => {
        setHasEvaluation(false);
        setHasOutcomes(false);
      });
  }, [params.applicationId]);

  async function downloadBundle() {
    const session = localStorage.getItem('internsuite.session');
    const token = session ? JSON.parse(session).token : '';
    const res = await fetch(`${API_BASE_URL}/api/department/applications/${params.applicationId}/documents/pdf`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `application-${params.applicationId}-documents.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <RoleDashboardShell
      allowedRoles={['DEPARTMENT_COORDINATOR', 'COORDINATOR']}
      title="Application Documents"
      subtitle="All related application documents in one place."
    >
      {() => (
        <Card className="rounded-[20px] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Documents</h2>
          <Button variant="secondary" onClick={() => router.push('/dashboard/department')}>Close</Button>
        </div>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-slate-800">
          <li>Internship Approval Letter</li>
          <li>Internship Acceptance / Invitation Letter</li>
          <li>Feedback Form Submitted by IPO {hasFeedback ? '(Available)' : '(Not submitted yet)'}</li>
          <li>Evaluation Result {hasEvaluation ? '(Available)' : '(Not entered yet)'}</li>
          <li>Outcome Result {hasOutcomes ? '(Available)' : '(Not entered yet)'}</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button onClick={downloadBundle}>Download Document Pack</Button>
          <Button variant="secondary" onClick={() => router.push(`/dashboard/department/applications/${params.applicationId}/feedback`)} disabled={!hasFeedback}>Open Feedback</Button>
          <Button variant="secondary" onClick={() => router.push(`/dashboard/department/applications/${params.applicationId}/evaluation`)}>Open Evaluation</Button>
          <Button variant="secondary" onClick={() => router.push(`/dashboard/department/applications/${params.applicationId}/outcome-assessment`)}>Open Outcome</Button>
        </div>
        </Card>
      )}
    </RoleDashboardShell>
  );
}
