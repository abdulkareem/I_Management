'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { Input } from '@/components/ui/input';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { StatusBadge } from '@/components/status-badge';
import { fetchWithSession } from '@/lib/auth';

type Summary = { totalInternships: number; activeInternships: number; totalStudentsApplied: number; studentsPlaced: number; pendingAllocations: number; externalApplicationsCount: number };
type DepartmentPerformance = { id: string; department_name: string; total_students: number; applications_submitted: number; students_selected: number; completion_rate: number; evaluation_status: string };
type InternshipItem = { id: string; title: string; created_by: string; target_department: string; vacancy: string; applications_count: number; status: string; alert: string };
type ApprovalQueueItem = { id: string; title: string; industry_name: string; assigned_department: string; status: string };
type ApplicationItem = { id: string; student_name: string; student_email: string; internship_title: string; status: string; application_type: 'INTERNAL' | 'EXTERNAL' };
type EvaluationItem = { department: string; students_evaluated: number; pending_evaluations: number; submission_status: string };
type ChartPoint = { label: string; value: number };
type IpoSummaryItem = { ipo_id: string; ipo_name: string; internship_count: number; active_engagements: number };
type Department = { id: string; name: string; coordinator_name: string; coordinator_email: string; college_id: string };

type DashboardData = {
  summary: Summary;
  approvalQueue: ApprovalQueueItem[];
  departmentPerformance: DepartmentPerformance[];
  internships: InternshipItem[];
  applications: { internal: ApplicationItem[]; external: ApplicationItem[] };
  evaluationStatus: EvaluationItem[];
  analytics: { departmentParticipation: ChartPoint[]; internshipDistribution: ChartPoint[]; completionRate: ChartPoint[]; externalInternalRatio: { internal: number; external: number } };
  notifications: Array<{ message: string; level: string; created_at: string }>;
  ipoSummary: IpoSummaryItem[];
};

export default function CollegeDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedInternal, setSelectedInternal] = useState<string[]>([]);
  const [selectedExternal, setSelectedExternal] = useState<string[]>([]);
  const [form, setForm] = useState({ id: '', name: '', coordinator_name: '', coordinator_email: '' });

  const loadDashboard = async () => {
    const response = await fetchWithSession<DashboardData>('/api/dashboard/college/control-center');
    setData(response.data ?? null);
    const deptRes = await fetchWithSession<Department[]>('/api/departments');
    setDepartments(deptRes.data ?? []);
  };

  useEffect(() => { loadDashboard(); }, []);

  const updateInternship = async (id: string, action: 'approve' | 'reject' | 'force-close') => { await fetchWithSession(`/api/college/internships/${id}/${action}`, { method: 'PUT' }); await loadDashboard(); };
  const bulkAction = async (ids: string[], action: 'accept' | 'reject') => { if (!ids.length) return; await fetchWithSession('/api/college/applications/bulk-status', { method: 'PUT', body: JSON.stringify({ application_ids: ids, action }) }); await loadDashboard(); };
  const saveDepartment = async () => {
    if (form.id) {
      await fetchWithSession(`/api/departments/${form.id}`, { method: 'PATCH', body: JSON.stringify(form) });
    } else {
      await fetchWithSession('/api/departments', { method: 'POST', body: JSON.stringify(form) });
    }
    setForm({ id: '', name: '', coordinator_name: '', coordinator_email: '' });
    await loadDashboard();
  };
  const deleteDepartment = async (id: string) => { await fetchWithSession(`/api/departments/${id}`, { method: 'DELETE' }); await loadDashboard(); };
  const downloadReport = async () => {
    const session = localStorage.getItem('internsuite.session');
    const token = session ? JSON.parse(session).token : '';
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://i-management-production.up.railway.app'}/api/college/report/pdf`, { headers: { Authorization: token ? `Bearer ${token}` : '' }, cache: 'no-store' });
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'college-dashboard-report.pdf';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const cards = useMemo(() => data ? [
    { label: 'Total Internships', value: data.summary.totalInternships },
    { label: 'Active Internships', value: data.summary.activeInternships },
    { label: 'Total Students Applied', value: data.summary.totalStudentsApplied },
    { label: 'Students Placed', value: data.summary.studentsPlaced },
    { label: 'Pending Allocations', value: data.summary.pendingAllocations },
    { label: 'External Applications', value: data.summary.externalApplicationsCount },
  ] : [], [data]);

  const managementMenus = [
    { title: 'Internship Governance', description: 'Approve, reject, and close internships across all departments.', href: '/dashboard/college/internships' },
    { title: 'Application Control', description: 'Process internal/external applications and bulk decisions.', href: '/dashboard/college/applications' },
    { title: 'Department Analytics', description: 'Track participation, completion, and evaluation submissions.', href: '/dashboard/college/analytics' },
    { title: 'IPO Partnership (IPO)', description: 'Monitor active ipo collaborations and engagement load.', href: '/dashboard/college/ipos' },
    { title: 'Compliance & Alerts', description: 'Review notifications, pending evaluations, and risk signals.', href: '/dashboard/college/compliance' },
    { title: 'Capacity Planning', description: 'Watch vacancy fill ratios and prioritize department demand.', href: '/dashboard/college/capacity' },
  ];

  return <RoleDashboardShell allowedRoles={['COLLEGE', 'COLLEGE_ADMIN', 'COLLEGE_COORDINATOR']} title="College Internship Control System" subtitle="Approval, routing, applications, compliance, monitoring and reports.">{() => <>
    <div className="flex justify-end"><Button onClick={downloadReport}>Download Report</Button></div>
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{cards.map((card) => <Card key={card.label} className="rounded-[24px] p-4"><p className="text-xs text-slate-500">{card.label}</p><p className="text-2xl font-bold">{card.value}</p></Card>)}</div>

    <Card className="rounded-[24px] p-4"><h3 className="mb-3 text-lg font-semibold">College Top-Level Internship Management Menus</h3><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{managementMenus.map((menu) => <Link key={menu.title} href={menu.href} className="rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"><p className="text-sm font-semibold">{menu.title}</p><p className="mt-1 text-xs text-slate-600">{menu.description}</p></Link>)}</div></Card>

    <Card className="rounded-[24px] p-4"><h3 className="mb-3 text-lg font-semibold">Department Management Panel</h3>
      <div className="grid gap-2 md:grid-cols-4"><Input placeholder="Department" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /><Input placeholder="Coordinator" value={form.coordinator_name} onChange={(e) => setForm((p) => ({ ...p, coordinator_name: e.target.value }))} /><Input placeholder="Coordinator Email" value={form.coordinator_email} onChange={(e) => setForm((p) => ({ ...p, coordinator_email: e.target.value }))} /><Button onClick={saveDepartment}>{form.id ? 'Update Department' : 'Add Department'}</Button></div>
      <DataTable title="Departments" rows={departments as any} columns={[{ key: 'name', label: 'Name' }, { key: 'coordinator_name', label: 'Coordinator' }, { key: 'coordinator_email', label: 'Coordinator Email' }]} actions={(row: any) => <div className="flex gap-2"><Button variant="secondary" onClick={() => setForm(row)}>Edit</Button><Button variant="secondary" onClick={() => deleteDepartment(row.id)}>Delete</Button></div>} />
    </Card>

    {data && <>
      <DataTable title="Internship Approval Queue" rows={data.approvalQueue as any} columns={[{ key: 'title', label: 'Internship' }, { key: 'industry_name', label: 'IPO' }, { key: 'assigned_department', label: 'Assigned Dept' }, { key: 'status', label: 'Status' }]} actions={(row: any) => <div className="flex gap-2"><Button variant="secondary" onClick={() => updateInternship(row.id, 'approve')}>Approve</Button><Button variant="secondary" onClick={() => updateInternship(row.id, 'reject')}>Reject</Button></div>} />
      <DataTable title="All Internships (College View)" rows={data.internships as any} columns={[{ key: 'title', label: 'Internship' }, { key: 'target_department', label: 'Department' }, { key: 'vacancy', label: 'Vacancy' }, { key: 'applications_count', label: 'Applications' }, { key: 'status', label: 'Status' }, { key: 'alert', label: 'Alert' }]} actions={(row: any) => <div className="flex gap-2"><StatusBadge status={row.status} /><Button variant="secondary" onClick={() => updateInternship(row.id, 'force-close')}>Force Close</Button></div>} />
      <Card className="rounded-[24px] p-4"><h3 className="mb-2 font-semibold">Internal Applications</h3><div className="mb-2 flex gap-2"><Button variant="secondary" onClick={() => bulkAction(selectedInternal, 'accept')}>Approve Selected</Button><Button variant="secondary" onClick={() => bulkAction(selectedInternal, 'reject')}>Reject Selected</Button></div>{data.applications.internal.map((item) => <label key={item.id} className="mb-2 flex items-center justify-between rounded border p-2"><span>{item.student_name} • {item.internship_title}</span><input type="checkbox" checked={selectedInternal.includes(item.id)} onChange={(e) => setSelectedInternal((prev) => e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id))} /></label>)}</Card>
      <Card className="rounded-[24px] p-4"><h3 className="mb-2 font-semibold">External Applications</h3><div className="mb-2 flex gap-2"><Button variant="secondary" onClick={() => bulkAction(selectedExternal, 'accept')}>Approve Selected</Button><Button variant="secondary" onClick={() => bulkAction(selectedExternal, 'reject')}>Reject Selected</Button></div>{data.applications.external.map((item) => <label key={item.id} className="mb-2 flex items-center justify-between rounded border p-2"><span>{item.student_name} • {item.internship_title}</span><input type="checkbox" checked={selectedExternal.includes(item.id)} onChange={(e) => setSelectedExternal((prev) => e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id))} /></label>)}</Card>
    </>}
  </>}</RoleDashboardShell>;
}
