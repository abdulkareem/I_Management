'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

type Department = { id: string; name: string; coordinator_name: string; coordinator_email: string; coordinator_mobile?: string; is_active: number; is_first_login: number };
type IndustryLink = { link_id: string; name: string; email: string; business_activity: string; status: string };
type Application = { id: string; student_name: string; student_email: string; internship_title: string; status: string; created_at: string };
type Allocation = { id: string; student_name: string; industry_name: string; internship_title: string; status: string; project_details?: string };

export default function CollegeDashboardPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [industries, setIndustries] = useState<IndustryLink[]>([]);
  const [internalApps, setInternalApps] = useState<Application[]>([]);
  const [externalApps, setExternalApps] = useState<Application[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    const [d, i, ia, ea, al] = await Promise.all([
      fetchWithSession<Department[]>('/api/department/list'),
      fetchWithSession<IndustryLink[]>('/api/college/industries'),
      fetchWithSession<Application[]>('/api/applications/internal'),
      fetchWithSession<Application[]>('/api/applications/external'),
      fetchWithSession<Allocation[]>('/api/internships/allocated'),
    ]);
    setDepartments(d.data);
    setIndustries(i.data);
    setInternalApps(ia.data);
    setExternalApps(ea.data);
    setAllocations(al.data);
  }

  useEffect(() => {
    loadAll().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.'));
  }, []);

  async function addDepartment() {
    const name = prompt('Department name');
    const coordinator_name = prompt('Coordinator name');
    const coordinator_email = prompt('Coordinator email');
    if (!name || !coordinator_name || !coordinator_email) return;
    await fetchWithSession('/api/department/create', { method: 'POST', body: JSON.stringify({ name, coordinator_name, coordinator_email }) });
    await loadAll();
  }

  async function editDepartment(row: Department) {
    const name = prompt('Department name', row.name) ?? row.name;
    await fetchWithSession('/api/department/update', { method: 'PUT', body: JSON.stringify({ id: row.id, name }) });
    await loadAll();
  }

  async function deleteDepartment(id: string) {
    await fetchWithSession(`/api/department/delete?id=${id}`, { method: 'DELETE' });
    await loadAll();
  }

  async function removeIndustry(linkId: string) {
    await fetchWithSession(`/api/college/industries?link_id=${linkId}`, { method: 'DELETE' });
    await loadAll();
  }

  return (
    <RoleDashboardShell allowedRoles={['COLLEGE', 'COLLEGE_ADMIN', 'COLLEGE_COORDINATOR']} title="College Dashboard" subtitle="Departments, industries, applications, and allocations are fully connected to D1.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] p-4 text-rose-200">{error}</Card> : null}

          <Card className="rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Department Module</h2>
              <Button onClick={addDepartment}>Create Department</Button>
            </div>
          </Card>

          <DataTable title="Departments" rows={departments} columns={[{ key: 'name', label: 'Department' }, { key: 'coordinator_name', label: 'Coordinator' }, { key: 'coordinator_email', label: 'Email' }, { key: 'is_first_login', label: 'First Login' }, { key: 'is_active', label: 'Active' }]} actions={(row) => <div className="space-x-2"><Button variant="secondary" onClick={() => editDepartment(row)}>Edit</Button><Button variant="secondary" onClick={() => deleteDepartment(row.id)}>Delete</Button></div>} />

          <DataTable title="Linked Industries" rows={industries.map((r) => ({ ...r, id: r.link_id }))} columns={[{ key: 'name', label: 'Industry' }, { key: 'email', label: 'Email' }, { key: 'business_activity', label: 'Business' }, { key: 'status', label: 'Status' }]} actions={(row) => <Button variant="secondary" onClick={() => removeIndustry(row.id)}>Remove</Button>} />

          <DataTable title="Internal Applications" rows={internalApps} columns={[{ key: 'student_name', label: 'Student' }, { key: 'student_email', label: 'Email' }, { key: 'internship_title', label: 'Internship' }, { key: 'status', label: 'Status' }, { key: 'created_at', label: 'Applied At' }]} />

          <DataTable title="External Applications" rows={externalApps} columns={[{ key: 'student_name', label: 'Student' }, { key: 'student_email', label: 'Email' }, { key: 'internship_title', label: 'Internship' }, { key: 'status', label: 'Status' }, { key: 'created_at', label: 'Applied At' }]} />

          <DataTable title="Internship Allocations" rows={allocations} columns={[{ key: 'student_name', label: 'Student' }, { key: 'industry_name', label: 'Industry' }, { key: 'internship_title', label: 'Internship' }, { key: 'project_details', label: 'Project' }, { key: 'status', label: 'Status' }]} />
        </>
      )}
    </RoleDashboardShell>
  );
}
