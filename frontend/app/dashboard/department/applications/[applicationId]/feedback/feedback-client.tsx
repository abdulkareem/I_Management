'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWithSession } from '@/lib/auth';

type FeedbackClientProps = {
  applicationId: string;
};

export default function FeedbackClient({ applicationId }: FeedbackClientProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) return;
    fetchWithSession(`/api/industry/applications/${applicationId}/feedback-form`)
      .then((res) => setFeedback(res.data ?? null))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load feedback form'));
  }, [applicationId]);

  return (
    <RoleDashboardShell
      allowedRoles={['DEPARTMENT_COORDINATOR', 'COORDINATOR']}
      title="IPO Feedback Form"
      subtitle="Submitted internship performance feedback."
    >
      {() => (
        <Card className="rounded-[20px] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">INTERNSHIP PERFORMANCE FEEDBACK FORM</h2>
          <Button variant="secondary" onClick={() => router.push('/dashboard/department')}>Close</Button>
        </div>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        {feedback ? (
          <div className="grid gap-1 text-sm">
            <p>Student Name: {feedback.student_name}</p>
            <p>Register Number: {feedback.register_number}</p>
            <p>Organization: {feedback.organization}</p>
            <p>Duration: {feedback.duration}</p>
            <p>Supervisor Name: {feedback.supervisor_name}</p>
            <p>A. Weekly / Final Evaluation</p>
            <p>Attendance & Punctuality: {feedback.attendance_punctuality}/5</p>
            <p>Technical Skills: {feedback.technical_skills}/5</p>
            <p>Problem Solving Ability: {feedback.problem_solving_ability}/5</p>
            <p>Communication Skills: {feedback.communication_skills}/5</p>
            <p>Teamwork: {feedback.teamwork}/5</p>
            <p>Professional Ethics: {feedback.professional_ethics}/5</p>
            <p>B. Overall Performance: {feedback.overall_performance}</p>
            <p>C. Remarks: {feedback.remarks || '-'}</p>
            <p>D. Recommendation: {feedback.recommendation || '-'}</p>
            <p>Supervisor Signature: {feedback.supervisor_signature || '-'}</p>
            <p>Date: {feedback.feedback_date}</p>
          </div>
        ) : <p className="text-sm text-slate-600">No feedback found.</p>}
        </Card>
      )}
    </RoleDashboardShell>
  );
}
