'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

type CollegeRow = { id: string; name: string; coordinatorName: string; email: string; phone: string; status: string; studentsCount: number };
type IndustryRow = { id: string; name: string; category: string; email: string; phone: string; status: string };
type StudentRow = { id: string; name: string; email: string; phone: string };
type IndustryType = { id: string; name: string };

type DashboardData = {
  colleges: CollegeRow[];
  industries: IndustryRow[];
  analytics: { totalApplications: number; totalInternships: number };
};

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [types, setTypes] = useState<IndustryType[]>([]);
  const [typeName, setTypeName] = useState('');
  const [activeLabel, setActiveLabel] = useState('');

  async function loadDashboard() {
    const [dashboardRes, typesRes] = await Promise.all([
      fetchWithSession<DashboardData>('/super-admin/dashboard'),
      fetchWithSession<IndustryType[]>('/industry-type/list'),
    ]);
    setData(dashboardRes.data);
    setTypes(typesRes.data);
  }

  useEffect(() => {
    loadDashboard().catch(() => {
      setData(null);
      setTypes([]);
    });
  }, []);

  async function updateCollege(id: string, payload: Record<string, unknown>) {
    await fetchWithSession(`/super-admin/college/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    await loadDashboard();
  }

  async function updateIndustry(id: string, payload: Record<string, unknown>) {
    await fetchWithSession(`/super-admin/industry/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    await loadDashboard();
  }

  async function deleteCollege(id: string) {
    await fetchWithSession(`/super-admin/college/${id}`, { method: 'DELETE' });
    await loadDashboard();
  }

  async function deleteIndustry(id: string) {
    await fetchWithSession(`/super-admin/industry/${id}`, { method: 'DELETE' });
    await loadDashboard();
  }

  async function openCollegeStudents(college: CollegeRow) {
    const response = await fetchWithSession<StudentRow[]>(`/super-admin/college/${college.id}/students`);
    setStudents(response.data);
    setActiveLabel(`Students from ${college.name}`);
  }

  async function createType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!typeName.trim()) return;
    await fetchWithSession('/industry-type/create', { method: 'POST', body: JSON.stringify({ name: typeName }) });
    setTypeName('');
    await loadDashboard();
  }

  async function renameType(id: string, name: string) {
    const nextName = prompt('Edit industry type', name);
    if (!nextName || nextName === name) return;
    await fetchWithSession(`/industry-type/${id}`, { method: 'PUT', body: JSON.stringify({ name: nextName }) });
    await loadDashboard();
  }

  async function removeType(id: string) {
    await fetchWithSession(`/industry-type/${id}`, { method: 'DELETE' });
    await loadDashboard();
  }

  return (
    <RoleDashboardShell allowedRoles={['SUPER_ADMIN', 'ADMIN']} title="Super Admin Dashboard" subtitle="Approve, reject, edit, and delete colleges and industries with role-based access control.">
      {() => (
        <>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              'Manage Colleges',
              'Manage Users',
              'Analytics',
              'Login Logs',
            ].map((item) => (
              <Card key={item} className="rounded-[28px] p-5">{item}</Card>
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-[28px] p-5">Colleges: {data?.colleges?.length ?? 0}</Card>
            <Card className="rounded-[28px] p-5">Industries: {data?.industries?.length ?? 0}</Card>
            <Card className="rounded-[28px] p-5">Applications: {data?.analytics?.totalApplications ?? 0}</Card>
          </section>

          <Card className="rounded-[28px] p-5">
            <h2 className="text-xl font-semibold text-white">Manage Industry Types</h2>
            <form className="mt-3 flex gap-2" onSubmit={createType}>
              <input value={typeName} onChange={(event) => setTypeName(event.target.value)} placeholder="New category" />
              <Button>Add</Button>
            </form>
            <div className="mt-4 space-y-2">
              {types.map((type) => (
                <div key={type.id} className="flex items-center justify-between rounded-[16px] border border-white/10 px-3 py-2">
                  <span>{type.name}</span>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => renameType(type.id, type.name)}>Edit</Button>
                    <Button variant="secondary" onClick={() => removeType(type.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[28px] p-5 overflow-x-auto">
            <h2 className="mb-3 text-xl font-semibold text-white">Colleges</h2>
            <table className="w-full text-sm">
              <thead><tr><th>Name</th><th>Coordinator</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {data?.colleges.map((college) => (
                  <tr key={college.id} className="border-t border-white/10 cursor-pointer" onClick={() => openCollegeStudents(college)}>
                    <td>{college.name}</td><td>{college.coordinatorName}</td><td>{college.email}</td><td>{college.phone}</td><td>{college.status}</td>
                    <td className="space-x-2 py-2" onClick={(event) => event.stopPropagation()}>
                      <Button variant="secondary" onClick={() => updateCollege(college.id, { action: 'APPROVED' })}>Approve</Button>
                      <Button variant="secondary" onClick={() => updateCollege(college.id, { action: 'REJECTED' })}>Reject</Button>
                      <Button variant="secondary" onClick={() => {
                        const name = prompt('College name', college.name);
                        if (name) updateCollege(college.id, { name });
                      }}>Edit</Button>
                      <Button variant="secondary" onClick={() => deleteCollege(college.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="rounded-[28px] p-5 overflow-x-auto">
            <h2 className="mb-3 text-xl font-semibold text-white">Industries</h2>
            <table className="w-full text-sm">
              <thead><tr><th>Name</th><th>Category</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {data?.industries.map((industry) => (
                  <tr key={industry.id} className="border-t border-white/10">
                    <td>{industry.name}</td><td>{industry.category}</td><td>{industry.email}</td><td>{industry.phone}</td><td>{industry.status}</td>
                    <td className="space-x-2 py-2">
                      <Button variant="secondary" onClick={() => updateIndustry(industry.id, { action: 'APPROVED' })}>Approve</Button>
                      <Button variant="secondary" onClick={() => updateIndustry(industry.id, { action: 'REJECTED' })}>Reject</Button>
                      <Button variant="secondary" onClick={() => {
                        const name = prompt('Industry name', industry.name);
                        if (name) updateIndustry(industry.id, { name });
                      }}>Edit</Button>
                      <Button variant="secondary" onClick={() => deleteIndustry(industry.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="rounded-[28px] p-5 overflow-x-auto">
            <h2 className="text-xl font-semibold text-white">{activeLabel || 'Students'}</h2>
            <table className="mt-3 w-full text-sm">
              <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={student.id} className="border-t border-white/10"><td>{index + 1}</td><td>{student.name}</td><td>{student.email}</td><td>{student.phone}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </RoleDashboardShell>
  );
}
