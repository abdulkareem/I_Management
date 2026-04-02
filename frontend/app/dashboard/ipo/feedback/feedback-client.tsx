'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { fetchWithSession } from '@/lib/auth';
import type { IPODashboard } from '@/lib/types';

type FeedbackForm = {
  studentName: string;
  registerNumber: string;
  organization: string;
  duration: string;
  supervisorName: string;
  attendancePunctuality: string;
  technicalSkills: string;
  problemSolvingAbility: string;
  communicationSkills: string;
  teamwork: string;
  professionalEthics: string;
  overallPerformance: 'Excellent' | 'Good' | 'Average' | 'Poor';
  remarks: string;
  recommendation: string;
  supervisorSignature: string;
  feedbackDate: string;
};

export default function IpoFeedbackFormPage({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!applicationId) return;
    Promise.all([
      fetchWithSession<IPODashboard>('/api/dashboard/ipo'),
      fetchWithSession<{ name: string; supervisor_name?: string | null }>('/api/ipo/profile'),
    ]).then(([dashboardRes, profileRes]) => {
      const application = (dashboardRes.data?.applications ?? []).find((item) => item.id === applicationId);
      if (!application) {
        setError('Application not found.');
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      setForm({
        studentName: application.studentName ?? '',
        registerNumber: '',
        organization: profileRes.data?.name ?? '',
        duration: '',
        supervisorName: profileRes.data?.supervisor_name ?? '',
        attendancePunctuality: '3',
        technicalSkills: '3',
        problemSolvingAbility: '3',
        communicationSkills: '3',
        teamwork: '3',
        professionalEthics: '3',
        overallPerformance: 'Good',
        remarks: '',
        recommendation: '',
        supervisorSignature: profileRes.data?.name ?? '',
        feedbackDate: today,
      });
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load application feedback form.'));
  }, [applicationId]);

  async function submit() {
    if (!form || !applicationId) return;
    setSubmitting(true);
    setError(null);
    try {
      await fetchWithSession(`/api/ipo/applications/${applicationId}/feedback`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      router.push('/dashboard/ipo');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save feedback form.');
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <Card className="m-6 rounded-[24px] p-4 text-rose-700">{error}</Card>;
  if (!form) return <Card className="m-6 rounded-[24px] p-4">Loading feedback form...</Card>;

  return (
    <Card className="m-6 rounded-[30px] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Internship Performance Feedback Form</h1>
        <Link href="/dashboard/ipo" className="text-sm text-indigo-700">Back to dashboard</Link>
      </div>
      <div className="grid gap-2">
        <Input placeholder="Student Name" value={form.studentName} onChange={(e) => setForm((prev) => prev ? ({ ...prev, studentName: e.target.value }) : prev)} />
        <Input placeholder="Register Number" value={form.registerNumber} onChange={(e) => setForm((prev) => prev ? ({ ...prev, registerNumber: e.target.value }) : prev)} />
        <Input placeholder="Organization" value={form.organization} onChange={(e) => setForm((prev) => prev ? ({ ...prev, organization: e.target.value }) : prev)} />
        <Input placeholder="Duration" value={form.duration} onChange={(e) => setForm((prev) => prev ? ({ ...prev, duration: e.target.value }) : prev)} />
        <Input placeholder="Supervisor Name" value={form.supervisorName} onChange={(e) => setForm((prev) => prev ? ({ ...prev, supervisorName: e.target.value }) : prev)} />
        {([
          ['attendancePunctuality', 'Attendance and punctuality (1-5)'],
          ['technicalSkills', 'Technical skills (1-5)'],
          ['problemSolvingAbility', 'Problem-solving ability (1-5)'],
          ['communicationSkills', 'Communication skills (1-5)'],
          ['teamwork', 'Teamwork and collaboration (1-5)'],
          ['professionalEthics', 'Professional ethics and discipline (1-5)'],
        ] as const).map(([key, label]) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium text-slate-700">{label}</label>
            <Input type="number" min={1} max={5} value={form[key]} onChange={(e) => setForm((prev) => prev ? ({ ...prev, [key]: e.target.value }) : prev)} />
          </div>
        ))}
        <select className="rounded-md border border-slate-300 bg-white px-3 py-2" value={form.overallPerformance} onChange={(e) => setForm((prev) => prev ? ({ ...prev, overallPerformance: e.target.value as FeedbackForm['overallPerformance'] }) : prev)}>
          <option>Excellent</option>
          <option>Good</option>
          <option>Average</option>
          <option>Poor</option>
        </select>
        <Input placeholder="Remarks" value={form.remarks} onChange={(e) => setForm((prev) => prev ? ({ ...prev, remarks: e.target.value }) : prev)} />
        <Input placeholder="Recommendation" value={form.recommendation} onChange={(e) => setForm((prev) => prev ? ({ ...prev, recommendation: e.target.value }) : prev)} />
        <Input placeholder="Supervisor Signature" value={form.supervisorSignature} onChange={(e) => setForm((prev) => prev ? ({ ...prev, supervisorSignature: e.target.value }) : prev)} />
        <Input type="date" value={form.feedbackDate} onChange={(e) => setForm((prev) => prev ? ({ ...prev, feedbackDate: e.target.value }) : prev)} />
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={() => router.push('/dashboard/ipo')}>Cancel</Button>
        <Button onClick={() => void submit()} disabled={submitting}>{submitting ? 'Saving...' : 'Submit Feedback'}</Button>
      </div>
    </Card>
  );
}
