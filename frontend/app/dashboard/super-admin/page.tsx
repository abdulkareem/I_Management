'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

type College = {
  id: string;
  name: string;
  coordinator_name: string;
  coordinator_email: string;
  mobile: string;
  status: string;
  created_at: string;
};

type Industry = {
  id: string;
  name: string;
  email: string;
  business_activity: string;
  industry_type_name: string;
  status: string;
};

type Department = {
  id: string;
  name: string;
  coordinator_name: string;
  coordinator_email: string;
  college_name: string;
  is_active: number;
};

type Student = {
  id: string;
  name: string;
  email: string;
  phone: string;
  college_name: string;
  department_name: string;
  program_name: string;
  is_active: number;
};

export default function SuperAdminDashboardPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [collegesRes, industriesRes, departmentsRes, studentsRes] = await Promise.all([
        fetchWithSession<College[]>('/api/admin/colleges'),
        fetchWithSession<Industry[]>('/api/admin/industries'),
        fetchWithSession<Department[]>('/api/admin/departments'),
        fetchWithSession<Student[]>('/api/admin/students'),
      ]);

      console.log('API response:', {
        colleges: collegesRes.data,
        industries: industriesRes.data,
        departments: departmentsRes.data,
        students: studentsRes.data,
      });

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

  useEffect(() => {
    loadAll();
  }, []);

  async function performAction(entity: 'college' | 'industry' | 'department' | 'student', id: string, action: 'approve' | 'reject' | 'delete') {
    await fetchWithSession(`/api/admin/${entity}/${id}/${action}`, { method: 'POST' });
    await loadAll();
  }

  async function editEntity(entity: 'college' | 'industry' | 'department' | 'student', id: string, currentName: string) {
    const name = prompt('Edit name', currentName);
    if (!name || name.trim() === currentName) return;
    await fetchWithSession(`/api/admin/${entity}/${id}/edit`, {
      method: 'POST',
      body: JSON.stringify({ name: name.trim() }),
    });
    await loadAll();
  }

  return (
    <RoleDashboardShell allowedRoles={['SUPER_ADMIN', 'ADMIN']} title="Super Admin Dashboard" subtitle="Manage all entities from D1 with full CRUD and approvals.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] p-4 text-rose-200">{error}</Card> : null}
          {loading ? <Card className="rounded-[28px] p-4">Loading dashboard data...</Card> : null}

          <section className="grid gap-4 md:grid-cols-4">
            <Card className="rounded-[28px] p-5">Colleges: {colleges.length}</Card>
            <Card className="rounded-[28px] p-5">Industries: {industries.length}</Card>
            <Card className="rounded-[28px] p-5">Departments: {departments.length}</Card>
            <Card className="rounded-[28px] p-5">Students: {students.length}</Card>
          </section>

          <EntityTable
            title="Colleges"
            emptyLabel="No colleges found"
            rows={colleges}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'coordinator_name', label: 'Coordinator' },
              { key: 'coordinator_email', label: 'Email' },
              { key: 'mobile', label: 'Phone' },
              { key: 'status', label: 'Status' },
            ]}
            onApprove={(id) => performAction('college', id, 'approve')}
            onReject={(id) => performAction('college', id, 'reject')}
            onDelete={(id) => performAction('college', id, 'delete')}
            onEdit={(id, row) => editEntity('college', id, row.name)}
          />

          <EntityTable
            title="Industries"
            emptyLabel="No industries found"
            rows={industries}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'industry_type_name', label: 'Type' },
              { key: 'email', label: 'Email' },
              { key: 'business_activity', label: 'Business' },
              { key: 'status', label: 'Status' },
            ]}
            onApprove={(id) => performAction('industry', id, 'approve')}
            onReject={(id) => performAction('industry', id, 'reject')}
            onDelete={(id) => performAction('industry', id, 'delete')}
            onEdit={(id, row) => editEntity('industry', id, row.name)}
          />

          <EntityTable
            title="Departments"
            emptyLabel="No departments found"
            rows={departments}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'coordinator_name', label: 'Coordinator' },
              { key: 'coordinator_email', label: 'Email' },
              { key: 'college_name', label: 'College' },
              { key: 'is_active', label: 'Active' },
            ]}
            onApprove={(id) => performAction('department', id, 'approve')}
            onReject={(id) => performAction('department', id, 'reject')}
            onDelete={(id) => performAction('department', id, 'delete')}
            onEdit={(id, row) => editEntity('department', id, row.name)}
          />

          <EntityTable
            title="Students"
            emptyLabel="No students found"
            rows={students}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'college_name', label: 'College' },
              { key: 'department_name', label: 'Department' },
            ]}
            onApprove={(id) => performAction('student', id, 'approve')}
            onReject={(id) => performAction('student', id, 'reject')}
            onDelete={(id) => performAction('student', id, 'delete')}
            onEdit={(id, row) => editEntity('student', id, row.name)}
          />
        </>
      )}
    </RoleDashboardShell>
  );
}

function EntityTable<T extends { id: string }>(props: {
  title: string;
  emptyLabel: string;
  rows: T[];
  columns: Array<{ key: keyof T; label: string }>;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, row: T) => Promise<void>;
}) {
  return (
    <Card className="rounded-[28px] p-5 overflow-x-auto">
      <h2 className="mb-3 text-xl font-semibold text-white">{props.title}</h2>
      {props.rows.length === 0 ? <p className="text-slate-300">{props.emptyLabel}</p> : null}
      {props.rows.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr>
              {props.columns.map((column) => <th key={String(column.key)}>{column.label}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                {props.columns.map((column) => <td key={String(column.key)}>{String(row[column.key] ?? '')}</td>)}
                <td className="space-x-2 py-2">
                  <Button variant="secondary" onClick={() => props.onApprove(row.id)}>Approve</Button>
                  <Button variant="secondary" onClick={() => props.onReject(row.id)}>Reject</Button>
                  <Button variant="secondary" onClick={() => props.onEdit(row.id, row)}>Edit</Button>
                  <Button variant="secondary" onClick={() => props.onDelete(row.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Card>
  );
}
