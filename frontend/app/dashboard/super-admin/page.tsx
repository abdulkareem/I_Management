'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

type Entity = { id: string; [key: string]: string | number | null | undefined };

export default function SuperAdminDashboardPage() {
  const [colleges, setColleges] = useState<Entity[]>([]);
  const [industries, setIndustries] = useState<Entity[]>([]);
  const [departments, setDepartments] = useState<Entity[]>([]);
  const [students, setStudents] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [collegesRes, industriesRes, departmentsRes, studentsRes] = await Promise.all([
        fetchWithSession<Entity[]>('/api/admin/colleges'),
        fetchWithSession<Entity[]>('/api/admin/industries'),
        fetchWithSession<Entity[]>('/api/admin/departments'),
        fetchWithSession<Entity[]>('/api/admin/students'),
      ]);
      setColleges(collegesRes.data);
      setIndustries(industriesRes.data);
      setDepartments(departmentsRes.data);
      setStudents(studentsRes.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load superadmin data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function performAction(entity: 'college' | 'industry' | 'department' | 'student', id: string, action: 'approve' | 'reject' | 'delete') {
    await fetchWithSession(`/api/admin/${entity}/${id}/${action}`, { method: 'POST' });
    await loadAll();
  }

  async function editEntity(entity: 'college' | 'industry' | 'department' | 'student', id: string, currentName: string) {
    const name = prompt('Edit name', currentName);
    if (!name || name.trim() === currentName) return;
    await fetchWithSession(`/api/admin/${entity}/${id}/edit`, { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
    await loadAll();
  }

  const actionButtons = (entity: 'college' | 'industry' | 'department' | 'student') => (row: Entity) => (
    <div className="space-x-2">
      <Button variant="secondary" onClick={() => performAction(entity, row.id, 'approve')}>Approve</Button>
      <Button variant="secondary" onClick={() => performAction(entity, row.id, 'reject')}>Reject</Button>
      <Button variant="secondary" onClick={() => editEntity(entity, row.id, String(row.name ?? ''))}>Edit</Button>
      <Button variant="secondary" onClick={() => performAction(entity, row.id, 'delete')}>Delete</Button>
    </div>
  );

  return (
    <RoleDashboardShell allowedRoles={['SUPER_ADMIN', 'ADMIN']} title="Super Admin Dashboard" subtitle="Manage all entities from D1 with full CRUD and approvals.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] p-4 text-rose-200">{error}</Card> : null}
          {loading ? <Card className="rounded-[28px] p-4">Loading dashboard data...</Card> : null}
          <DataTable title="Colleges" rows={colleges} columns={[{ key: 'name', label: 'Name' }, { key: 'coordinator_name', label: 'Coordinator' }, { key: 'coordinator_email', label: 'Email' }, { key: 'status', label: 'Status' }]} actions={actionButtons('college')} />
          <DataTable title="Industries" rows={industries} columns={[{ key: 'name', label: 'Name' }, { key: 'industry_type_name', label: 'Type' }, { key: 'email', label: 'Email' }, { key: 'status', label: 'Status' }]} actions={actionButtons('industry')} />
          <DataTable title="Departments" rows={departments} columns={[{ key: 'name', label: 'Name' }, { key: 'coordinator_name', label: 'Coordinator' }, { key: 'coordinator_email', label: 'Email' }, { key: 'college_name', label: 'College' }]} actions={actionButtons('department')} />
          <DataTable title="Students" rows={students} columns={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'college_name', label: 'College' }, { key: 'department_name', label: 'Department' }]} actions={actionButtons('student')} />
        </>
      )}
    </RoleDashboardShell>
  );
}
