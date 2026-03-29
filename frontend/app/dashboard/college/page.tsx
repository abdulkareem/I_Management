'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { StatusBadge } from '@/components/status-badge';
import { fetchWithSession } from '@/lib/auth';

type Summary = {
  totalInternships: number;
  activeInternships: number;
  totalStudentsApplied: number;
  studentsPlaced: number;
  pendingAllocations: number;
  externalApplicationsCount: number;
};

type DepartmentPerformance = {
  id: string;
  department_name: string;
  total_students: number;
  applications_submitted: number;
  students_selected: number;
  completion_rate: number;
  evaluation_status: string;
};

type InternshipItem = {
  id: string;
  title: string;
  created_by: string;
  target_department: string;
  vacancy: string;
  applications_count: number;
  status: string;
  alert: string;
};

type ApprovalQueueItem = { id: string; title: string; industry_name: string; assigned_department: string; status: string };
type ApplicationItem = { id: string; student_name: string; student_email: string; internship_title: string; status: string; created_at: string; application_type: 'INTERNAL' | 'EXTERNAL' };
type EvaluationItem = { department: string; students_evaluated: number; pending_evaluations: number; submission_status: string };
type ChartPoint = { label: string; value: number };
type IpoSummaryItem = { ipo_id: string; ipo_name: string; internship_count: number; active_engagements: number };

type DashboardData = {
  summary: Summary;
  approvalQueue: ApprovalQueueItem[];
  departmentPerformance: DepartmentPerformance[];
  internships: InternshipItem[];
  applications: { internal: ApplicationItem[]; external: ApplicationItem[] };
  evaluationStatus: EvaluationItem[];
  analytics: {
    departmentParticipation: ChartPoint[];
    internshipDistribution: ChartPoint[];
    completionRate: ChartPoint[];
    externalInternalRatio: { internal: number; external: number };
  };
  notifications: Array<{ message: string; level: string; created_at: string }>;
  ipoSummary: IpoSummaryItem[];
};

function MiniBars({ title, data }: { title: string; data: ChartPoint[] }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <Card className="rounded-[24px] p-4">
      <h3 className="mb-3 font-semibold text-slate-900">{title}</h3>
      <div className="space-y-2">
        {data.length === 0 ? <p className="text-sm text-slate-500">No data – Create / Assign Internship</p> : null}
        {data.slice(0, 6).map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-xs text-slate-600"><span>{item.label}</span><span>{item.value}</span></div>
            <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-sky-500" style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function CollegeDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInternal, setSelectedInternal] = useState<string[]>([]);
  const [selectedExternal, setSelectedExternal] = useState<string[]>([]);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithSession<DashboardData>('/api/dashboard/college/control-center');
      setData(response.data ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load college control center.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function updateInternship(id: string, action: 'approve' | 'reject' | 'force-close') {
    await fetchWithSession(`/api/college/internships/${id}/${action}`, { method: 'PUT' });
    await loadDashboard();
  }

  async function bulkAction(ids: string[], action: 'accept' | 'reject') {
    if (!ids.length) return;
    await fetchWithSession('/api/college/applications/bulk-status', {
      method: 'PUT',
      body: JSON.stringify({ application_ids: ids, action }),
    });
    await loadDashboard();
  }

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Total Internships', value: data.summary.totalInternships },
      { label: 'Active Internships', value: data.summary.activeInternships },
      { label: 'Total Students Applied', value: data.summary.totalStudentsApplied },
      { label: 'Students Placed', value: data.summary.studentsPlaced },
      { label: 'Pending Allocations', value: data.summary.pendingAllocations },
      { label: 'External Applications', value: data.summary.externalApplicationsCount },
    ];
  }, [data]);

  const managementMenus = [
    { title: 'Internship Governance', description: 'Approve, reject, and close internships across all departments.' },
    { title: 'Application Control', description: 'Process internal/external applications and bulk decisions.' },
    { title: 'Department Analytics', description: 'Track participation, completion, and evaluation submissions.' },
    { title: 'Industry Partnership (IPO)', description: 'Monitor active industry collaborations and engagement load.' },
    { title: 'Compliance & Alerts', description: 'Review notifications, pending evaluations, and risk signals.' },
    { title: 'Capacity Planning', description: 'Watch vacancy fill ratios and prioritize department demand.' },
  ];

  return (
    <RoleDashboardShell allowedRoles={['COLLEGE', 'COLLEGE_ADMIN', 'COLLEGE_COORDINATOR']} title="College Internship Control System" subtitle="Approval, routing, applications, compliance, monitoring and reports.">
      {() => (
        <>
          {error ? <Card className="rounded-[24px] p-4 text-rose-700">{error}</Card> : null}
          {loading ? <Card className="rounded-[24px] p-6 text-slate-600">Loading dashboard...</Card> : null}

          {data ? (
            <>
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                {cards.map((card) => (
                  <Card key={card.label} className="rounded-[24px] p-4">
                    <p className="text-xs text-slate-500">{card.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                  </Card>
                ))}
              </div>

              <Card className="rounded-[24px] p-4">
                <h3 className="mb-3 text-lg font-semibold text-slate-900">College Top-Level Internship Management Menus</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {managementMenus.map((menu) => (
                    <div key={menu.title} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-sm font-semibold text-slate-900">{menu.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{menu.description}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <DataTable
                title="Internship Approval Queue"
                rows={data.approvalQueue.map((item) => ({ ...item, id: item.id }))}
                columns={[{ key: 'title', label: 'Internship' }, { key: 'industry_name', label: 'Industry' }, { key: 'assigned_department', label: 'Assigned Dept' }, { key: 'status', label: 'Status' }]}
                actions={(row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => updateInternship(row.id, 'approve')}>Approve</Button>
                    <Button variant="secondary" onClick={() => updateInternship(row.id, 'reject')}>Reject</Button>
                  </div>
                )}
              />

              <DataTable
                title="Department Internship Performance"
                rows={data.departmentPerformance.map((row) => ({ ...row, id: row.id, completion: `${row.completion_rate}%` })) as any}
                columns={[{ key: 'department_name', label: 'Department Name' }, { key: 'total_students', label: 'Total Students' }, { key: 'applications_submitted', label: 'Applications Submitted' }, { key: 'students_selected', label: 'Students Selected' }, { key: 'completion', label: 'Completion Rate' }, { key: 'evaluation_status', label: 'Evaluation Status' }] as any}
              />

              <DataTable
                title="All Internships (College View)"
                rows={data.internships.map((row) => ({ ...row, created_by: row.created_by === 'INDUSTRY' ? 'Industry' : 'Dept/College' })) as any}
                columns={[{ key: 'title', label: 'Internship Title' }, { key: 'created_by', label: 'Created By' }, { key: 'target_department', label: 'Target Department' }, { key: 'vacancy', label: 'Vacancy (Filled/Total)' }, { key: 'applications_count', label: 'Applications' }, { key: 'status', label: 'Status' }, { key: 'alert', label: 'Alert' }] as any}
                actions={(row: any) => (
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={row.status} />
                    <Button variant="secondary" onClick={() => updateInternship(row.id, 'force-close')}>Force Close</Button>
                  </div>
                )}
              />

              <Card className="rounded-[24px] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Internal Applications</h3>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => bulkAction(selectedInternal, 'accept')}>Approve Selected</Button>
                    <Button variant="secondary" onClick={() => bulkAction(selectedInternal, 'reject')}>Reject Selected</Button>
                  </div>
                </div>
                {data.applications.internal.length === 0 ? <p className="text-sm text-slate-500">No data – Create / Assign Internship</p> : null}
                <div className="space-y-2">
                  {data.applications.internal.map((item) => (
                    <label key={item.id} className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm">
                      <div>
                        <p className="font-medium">{item.student_name} • {item.internship_title}</p>
                        <p className="text-slate-500">{item.student_email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status.toUpperCase()} />
                        <input type="checkbox" checked={selectedInternal.includes(item.id)} onChange={(event) => setSelectedInternal((prev) => event.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id))} />
                      </div>
                    </label>
                  ))}
                </div>
              </Card>

              <Card className="rounded-[24px] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">External Applications</h3>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => bulkAction(selectedExternal, 'accept')}>Approve Selected</Button>
                    <Button variant="secondary" onClick={() => bulkAction(selectedExternal, 'reject')}>Reject Selected</Button>
                  </div>
                </div>
                {data.applications.external.length === 0 ? <p className="text-sm text-slate-500">No data – Create / Assign Internship</p> : null}
                <div className="space-y-2">
                  {data.applications.external.map((item) => (
                    <label key={item.id} className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm">
                      <div>
                        <p className="font-medium">{item.student_name} • {item.internship_title}</p>
                        <p className="text-slate-500">{item.student_email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status.toUpperCase()} />
                        <input type="checkbox" checked={selectedExternal.includes(item.id)} onChange={(event) => setSelectedExternal((prev) => event.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id))} />
                      </div>
                    </label>
                  ))}
                </div>
              </Card>

              <DataTable
                title="Evaluation Monitoring"
                rows={data.evaluationStatus.map((row) => ({ ...row, id: row.department }))}
                columns={[{ key: 'department', label: 'Department' }, { key: 'students_evaluated', label: 'Students Evaluated' }, { key: 'pending_evaluations', label: 'Pending Evaluations' }, { key: 'submission_status', label: 'Submission Status' }]}
              />

              <div className="grid gap-3 md:grid-cols-2">
                <MiniBars title="Department-wise Participation" data={data.analytics.departmentParticipation} />
                <MiniBars title="Internship Distribution" data={data.analytics.internshipDistribution} />
                <MiniBars title="Completion Rate" data={data.analytics.completionRate} />
                <Card className="rounded-[24px] p-4">
                  <h3 className="mb-3 font-semibold text-slate-900">External vs Internal Ratio</h3>
                  <p className="text-sm text-slate-600">Internal: {data.analytics.externalInternalRatio.internal}</p>
                  <p className="text-sm text-slate-600">External: {data.analytics.externalInternalRatio.external}</p>
                </Card>
              </div>

              <DataTable
                title="IPO Management"
                rows={data.ipoSummary.map((row) => ({ ...row, id: row.ipo_id }))}
                columns={[{ key: 'ipo_name', label: 'IPO Name' }, { key: 'internship_count', label: 'Internship Count' }, { key: 'active_engagements', label: 'Active Engagements' }]}
              />

              <Card className="rounded-[24px] p-4">
                <h3 className="mb-3 text-lg font-semibold text-slate-900">Notification Center</h3>
                <ul className="space-y-2 text-sm">
                  {data.notifications.length === 0 ? <li className="text-slate-500">No alerts available.</li> : data.notifications.map((item, index) => (
                    <li key={`${item.created_at}-${index}`} className="rounded border border-slate-200 p-2">
                      <p className="font-medium">{item.level}: {item.message}</p>
                      <p className="text-xs text-slate-500">{item.created_at}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          ) : null}
        </>
      )}
    </RoleDashboardShell>
  );
}
