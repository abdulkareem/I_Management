'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchWithSession } from '@/lib/auth';

export default function FeedbackViewer({ studentId, internshipId }: { studentId: string; internshipId: string }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWithSession(`/api/department/feedback/${studentId}/${internshipId}`).then((res) => {
      setFeedback(res.data ?? null);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load feedback')).finally(() => setLoading(false));
  }, [studentId, internshipId]);

  return <RoleDashboardShell allowedRoles={['DEPARTMENT_COORDINATOR', 'COORDINATOR']} title="IPO Feedback" subtitle="Structured internship feedback.">{() => (
    <Card className="rounded-[20px] p-5 text-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Feedback</h2>
        <Button variant="secondary" onClick={() => router.push('/dashboard/department')}>Back</Button>
      </div>
      {loading ? <p className="text-sm">Loading feedback...</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {!loading && !error && !feedback ? <p className="text-sm text-slate-600">No data available.</p> : null}
      {feedback ? <div className="space-y-2 text-sm">
        <p><strong>Rating:</strong> {feedback.rating}</p>
        <p><strong>Skill-wise Evaluation:</strong></p>
        <pre className="rounded border bg-slate-50 p-2 text-xs">{feedback.skills_assessed || '-'}</pre>
        <p><strong>Comments:</strong> {feedback.comments || '-'}</p>
        <Button onClick={() => router.push(`/dashboard/department/documents/${studentId}/${internshipId}`)}>Download as PDF</Button>
      </div> : null}
    </Card>
  )}</RoleDashboardShell>;
}
