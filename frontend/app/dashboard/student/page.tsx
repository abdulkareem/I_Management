'use client';

import { useEffect, useMemo, useState } from 'react';
import type { StudentDashboard } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InternshipProgressTracker } from '@/components/internship-progress-tracker';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { StatusBadge } from '@/components/status-badge';
import { fetchWithSession } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

type InternshipTab = 'college' | 'external';

export default function StudentDashboardPage() {
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<InternshipTab>('external');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [emailingId, setEmailingId] = useState<string | null>(null);
  const [ipoDetails, setIpoDetails] = useState<any | null>(null);
  const [documents, setDocuments] = useState<Array<{ id: string; type: string; internship_id: string; generated_at: string }>>([]);
  const [docPreview, setDocPreview] = useState<string | null>(null);

  const refresh = async () => {
    const [response, docRes] = await Promise.all([
      fetchWithSession<StudentDashboard>('/student/dashboard'),
      fetchWithSession<Array<{ id: string; type: string; internship_id: string; generated_at: string }>>('/api/documents/my'),
    ]);
    setDashboard(response.data);
    setDocuments(docRes.data ?? []);
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
    setNotice(null);
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

  async function openIpoProfile(ipoId?: string | null) {
    if (!ipoId) return;
    const response = await fetchWithSession(`/api/ipo/${ipoId}`);
    setIpoDetails(response.data ?? null);
  }

  function downloadMarksheet(item: NonNullable<StudentDashboard['externalInternships']>[number]) {
    const status = item.status ?? 'PENDING';
    const feedback = item.ipoFeedback ?? 'Not provided yet';
    const evaluationMarks = item.evaluationMarks ?? 'Not available';
    const outcomeMarks = item.outcomeMarks ?? 'Not available';
    const html = `
      <html>
        <head><title>Internship Marksheet</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h1>Internship Marksheet</h1>
          <p><strong>Internship:</strong> ${item.title}</p>
          <p><strong>IPO:</strong> ${item.ipoName}</p>
          <p><strong>Department:</strong> ${item.departmentName}</p>
          <p><strong>College:</strong> ${item.collegeName ?? '-'}</p>
          <p><strong>Application status:</strong> ${status}</p>
          <p><strong>IPO feedback:</strong> ${feedback}</p>
          <p><strong>Evaluation marks:</strong> ${evaluationMarks}</p>
          <p><strong>Outcome marks:</strong> ${outcomeMarks}</p>
          <p style="margin-top: 20px; font-size: 12px;">Generated from the student dashboard.</p>
        </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `internship-marksheet-${item.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    setNotice('Marksheet downloaded as HTML. You can open and print/save as PDF.');
  }

  async function emailMarksheet(item: NonNullable<StudentDashboard['externalInternships']>[number]) {
    if (!item.applicationId) return;
    setError(null);
    setNotice(null);
    setEmailingId(item.applicationId);
    try {
      await fetchWithSession(`/api/student/applications/${item.applicationId}/marksheet/email`, {
        method: 'POST',
      });
      setNotice('Marksheet summary emailed successfully.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to send marksheet email.');
    } finally {
      setEmailingId(null);
    }
  }

  async function downloadDocument(documentId: string) {
    const session = localStorage.getItem('internsuite.session');
    const token = session ? JSON.parse(session).token : '';
    const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `document-${documentId}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function previewDocument(documentId: string) {
    const payload = await fetchWithSession<{ html: string }>(`/api/documents/${documentId}/preview`);
    setDocPreview(payload.data?.html ?? null);
  }

  return (
    <RoleDashboardShell allowedRoles={['STUDENT']} title="Student Dashboard" subtitle="Your selected college/department is internal. Apply to opportunities from other colleges.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</Card> : null}
          {notice ? <Card className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{notice}</Card> : null}
          {loading ? <Card className="rounded-[28px] p-4 text-slate-700">Loading student data...</Card> : null}

          <Card className="rounded-[30px] p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-indigo-700">Student profile</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{dashboard?.studentName ?? 'Student'}</h2>
            <p className="mt-2 text-sm text-slate-600">University Registration No: {dashboard?.studentUniversityRegNumber || '-'}</p>
            <p className="text-sm text-slate-600">College: {dashboard?.studentCollegeName || '-'}</p>
          </Card>

          <Card className="rounded-[30px] p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-indigo-700">Application rules</p>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">Internship policy status</h2>
            <p className="mt-2 text-sm text-slate-600">{dashboard?.policyNote ?? 'University policy applies.'}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge className="bg-cyan-100 text-cyan-800">Max active applications: {dashboard?.maxSelectableApplications ?? 3}</Badge>
              <Badge className="bg-amber-100 text-amber-800">Available slots now: {availableSlots}</Badge>
              <Badge className={dashboard?.activeApplicationLock ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}>
                {dashboard?.activeApplicationLock ? 'Locked until department marks completion' : 'Eligible to apply'}
              </Badge>
            </div>
          </Card>

          <section className="grid gap-4 md:grid-cols-2">
            <Button variant={selectedTab === 'college' ? 'primary' : 'secondary'} onClick={() => setSelectedTab('college')}>
              Internship from {dashboard?.studentCollegeName ?? 'your college'}
            </Button>
            <Button variant={selectedTab === 'external' ? 'primary' : 'secondary'} onClick={() => setSelectedTab('external')}>
              Internship from other organizations
            </Button>
          </section>

          {selectedTab === 'college' ? (
            <Card className="rounded-[30px] p-6">
              <h2 className="text-xl font-semibold text-slate-900">Internships from {dashboard?.studentCollegeName ?? 'your college'}</h2>
              <p className="mt-2 text-sm text-slate-600">Internal and ipo internships are visible here. External-only postings from your own college are blocked.</p>
              <div className="mt-4 space-y-3">
                {dashboard?.collegeInternships?.length ? dashboard.collegeInternships.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white/80 p-4">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-600">{item.collegeName} • {item.departmentName}</p>
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    <Button className="mt-3" disabled>View on External tab for apply status</Button>
                  </div>
                )) : <p className="text-slate-600">No college-hosted internships found.</p>}
              </div>
            </Card>
          ) : (
            <Card className="rounded-[30px] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-900">Internships from other organizations</h2>
                <Button disabled={!canApply || submitting || selectedIds.length === 0} onClick={applySelected}>
                  {submitting ? 'Applying...' : `Apply (${selectedIds.length})`}
                </Button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[1260px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      <th className="py-2 pr-2">Select</th>
                      <th className="py-2 pr-2">Internship</th>
                      <th className="py-2 pr-2">IPO</th>
                      <th className="py-2 pr-2">Department</th>
                      <th className="py-2 pr-2">College</th>
                      <th className="py-2 pr-2">Total Seats</th>
                      <th className="py-2 pr-2">Filled Seats</th>
                      <th className="py-2 pr-2">Available Seats</th>
                      <th className="py-2 pr-2">Status</th>
                      <th className="py-2 pr-2">IPO feedback</th>
                      <th className="py-2 pr-2">Evaluation marks</th>
                      <th className="py-2 pr-2">Outcome marks</th>
                      <th className="py-2 pr-2">Apply</th>
                      <th className="py-2">Marksheet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard?.externalInternships?.length ? dashboard.externalInternships.map((item) => {
                      const disabledByRule = item.eligible === false;
                      const noVacancy = Number(item.availableVacancy ?? 0) <= 0;
                      const disabled = item.applied || !canApply || disabledByRule || noVacancy;
                      return (
                        <tr key={item.id} className="border-b border-slate-200">
                          <td className="py-3 pr-2">
                            <input type="checkbox" checked={selectedIds.includes(item.id)} disabled={disabled} onChange={() => toggleSelection(item.id)} />
                          </td>
                          <td className="py-3 pr-2">
                            <p className="font-medium text-slate-900">{item.title}</p>
                            <p className="text-xs text-slate-500">{item.description}</p>
                          </td>
                          <td className="py-3 pr-2"><button type="button" className="text-indigo-700 underline" onClick={() => openIpoProfile(item.ipoId)}>{item.ipoName}</button></td>
                          <td className="py-3 pr-2">{item.departmentName}</td>
                          <td className="py-3 pr-2">{item.collegeName ?? '-'}</td>
                          <td className="py-3 pr-2">{item.totalVacancy ?? 0}</td>
                          <td className="py-3 pr-2">{item.filledVacancy ?? 0}</td>
                          <td className="py-3 pr-2">{item.availableVacancy ?? 0}</td>
                          <td className="py-3">
                            <StatusBadge status={noVacancy ? 'FULL' : (item.applied ? item.status ?? 'PUBLISHED' : 'PUBLISHED')} />
                            <p className={`mt-1 text-xs ${disabledByRule ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {item.eligibilityMessage ?? (noVacancy ? 'No vacancies available' : (disabled ? 'Application limit reached' : 'You are eligible'))}
                            </p>
                          </td>
                          <td className="py-3 pr-2 text-slate-600">{item.ipoFeedback ?? (item.applied ? 'Pending feedback' : '-')}</td>
                          <td className="py-3 pr-2">{item.evaluationMarks ?? (item.applied ? 'Pending' : '-')}</td>
                          <td className="py-3 pr-2">{item.outcomeMarks ?? (item.applied ? 'Pending' : '-')}</td>
                          <td className="py-3 pr-2">
                            {item.applied ? (
                              <Button variant="secondary" disabled>Applied</Button>
                            ) : (
                              <Button
                                variant="secondary"
                                disabled={disabled || submitting}
                                onClick={() => toggleSelection(item.id)}
                              >
                                {selectedIds.includes(item.id) ? 'Selected' : 'Apply'}
                              </Button>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" disabled={!item.applied} onClick={() => downloadMarksheet(item)}>Download PDF</Button>
                              <Button variant="secondary" disabled={!item.applicationId || emailingId === item.applicationId} onClick={() => emailMarksheet(item)}>
                                {emailingId === item.applicationId ? 'Sending...' : 'Send to Email'}
                              </Button>
                            </div>
                            {item.applied ? <div className="mt-2"><InternshipProgressTracker status={item.status ?? 'PUBLISHED'} /></div> : null}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td className="py-3 text-slate-600" colSpan={14}>No internships from other organizations available right now.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {ipoDetails ? (
            <Card className="rounded-[30px] p-6">
              <h2 className="text-xl font-semibold text-slate-900">{ipoDetails.name}</h2>
              <p className="mt-2 text-sm text-slate-600">Address: {ipoDetails.company_address || '-'}</p>
              <p className="text-sm text-slate-600">Contact: {ipoDetails.contact_number || '-'}</p>
              <p className="text-sm text-slate-600">Email: {ipoDetails.email || '-'}</p>
              <p className="text-sm text-slate-600">Registration No: {ipoDetails.registration_number || '-'}</p>
              <p className="text-sm text-slate-600">Registration Year: {ipoDetails.registration_year || '-'}</p>
              <div className="mt-3"><Button variant="secondary" onClick={() => setIpoDetails(null)}>Close IPO Profile</Button></div>
            </Card>
          ) : null}
          <Card className="rounded-[30px] p-6">
            <h2 className="text-xl font-semibold text-slate-900">System Generated Documents</h2>
            <p className="mt-2 text-sm text-slate-600">Download your allotment letter and feedback summary.</p>
            <div className="mt-4 space-y-2">
              {documents.length ? documents.map((doc) => (
                <div key={doc.id} className="flex flex-wrap items-center justify-between rounded-xl border border-slate-200 p-3">
                  <p className="text-sm text-slate-700">{doc.type.toUpperCase()} • Internship {doc.internship_id} • {new Date(doc.generated_at).toLocaleString()}</p>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => previewDocument(doc.id)}>Preview</Button>
                    <Button variant="secondary" onClick={() => downloadDocument(doc.id)}>Download PDF</Button>
                  </div>
                </div>
              )) : <p className="text-sm text-slate-600">No student documents available yet.</p>}
            </div>
            {docPreview ? <iframe title="Document Preview" className="mt-4 h-96 w-full rounded-lg border border-slate-200" srcDoc={docPreview} /> : null}
          </Card>
        </>
      )}
    </RoleDashboardShell>
  );
}
