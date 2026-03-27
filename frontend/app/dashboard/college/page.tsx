'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/data-table';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

type Department = { id: string; name: string; coordinator_name: string; coordinator_email: string; coordinator_mobile?: string; is_active: number; is_first_login: number };
type IndustryLink = { link_id: string; industry_id: string; name: string; email: string; business_activity: string; status: string };
type Application = { id: string; student_name: string; student_email: string; internship_title: string; status: string; created_at: string };

export default function CollegeDashboardPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [industries, setIndustries] = useState<IndustryLink[]>([]);
  const [internalApps, setInternalApps] = useState<Application[]>([]);
  const [externalApps, setExternalApps] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [ipoDetails, setIpoDetails] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    coordinator_name: '',
    coordinator_email: '',
    coordinator_mobile: '',
  });

  async function loadAll() {
    setError(null);
    const [d, i, ia, ea] = await Promise.all([
      fetchWithSession<Department[]>('/api/department/list'),
      fetchWithSession<IndustryLink[]>('/api/college/industries'),
      fetchWithSession<Application[]>('/api/applications/internal'),
      fetchWithSession<Application[]>('/api/applications/external'),
    ]);
    setDepartments(d.data ?? []);
    setIndustries(i.data ?? []);
    setInternalApps(ia.data ?? []);
    setExternalApps(ea.data ?? []);
  }

  useEffect(() => {
    loadAll().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.'));
  }, []);

  async function addDepartment() {
    setFormError(null);
    if (!departmentForm.name || !departmentForm.coordinator_name || !departmentForm.coordinator_email) {
      setFormError('Please fill department name, coordinator name, and coordinator email.');
      return;
    }

    try {
      setIsSubmitting(true);
      await fetchWithSession('/api/department/create', { method: 'POST', body: JSON.stringify(departmentForm) });
      setDepartmentForm({ name: '', coordinator_name: '', coordinator_email: '', coordinator_mobile: '' });
      setShowDepartmentForm(false);
      await loadAll();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Unable to create department.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function editDepartment(row: Department) {
    const name = prompt('Department name', row.name) ?? row.name;
    try {
      setError(null);
      await fetchWithSession('/api/department/update', { method: 'PUT', body: JSON.stringify({ id: row.id, name }) });
      await loadAll();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update department.');
    }
  }

  async function deleteDepartment(id: string) {
    try {
      setError(null);
      await fetchWithSession(`/api/department/delete?id=${id}`, { method: 'DELETE' });
      await loadAll();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete department.');
    }
  }

  async function removeIndustry(linkId: string) {
    try {
      setError(null);
      await fetchWithSession(`/api/college/industries?link_id=${linkId}`, { method: 'DELETE' });
      await loadAll();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to remove Internship Provider Organization (IPO).');
    }
  }

  async function decideApplication(id: string, action: 'accept' | 'reject') {
    try {
      setError(null);
      await fetchWithSession(`/api/college/applications/${id}/${action}`, { method: 'POST' });
      await loadAll();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Unable to ${action} application.`);
    }
  }

  async function viewIpoProfile(industryId: string) {
    try {
      const response = await fetchWithSession(`/api/ipo/${industryId}`);
      setIpoDetails(response.data ?? null);
    } catch {
      setIpoDetails(null);
    }
  }

  return (
    <RoleDashboardShell allowedRoles={['COLLEGE', 'COLLEGE_ADMIN', 'COLLEGE_COORDINATOR']} title="College Dashboard" subtitle="Departments, Internship Provider Organizations (IPOs), applications, and allocations are fully connected to D1.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] p-4 text-rose-200">{error}</Card> : null}

          <Card className="rounded-[28px] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Department Module</h2>
              <Button onClick={() => setShowDepartmentForm((value) => !value)}>{showDepartmentForm ? 'Close Form' : 'Create Department'}</Button>
            </div>
          </Card>

          {showDepartmentForm ? (
            <Card className="rounded-[28px] p-5">
              <h3 className="mb-4 text-lg font-semibold text-white">Create Department</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Department name" value={departmentForm.name} onChange={(event) => setDepartmentForm((prev) => ({ ...prev, name: event.target.value }))} />
                <Input placeholder="Department coordinator name" value={departmentForm.coordinator_name} onChange={(event) => setDepartmentForm((prev) => ({ ...prev, coordinator_name: event.target.value }))} />
                <Input placeholder="Department coordinator email" type="email" value={departmentForm.coordinator_email} onChange={(event) => setDepartmentForm((prev) => ({ ...prev, coordinator_email: event.target.value }))} />
                <Input placeholder="Mobile number" value={departmentForm.coordinator_mobile} onChange={(event) => setDepartmentForm((prev) => ({ ...prev, coordinator_mobile: event.target.value }))} />
              </div>
              {formError ? <p className="mt-3 text-sm text-rose-300">{formError}</p> : null}
              <div className="mt-4">
                <Button disabled={isSubmitting} onClick={addDepartment}>{isSubmitting ? 'Submitting...' : 'Submit'}</Button>
              </div>
            </Card>
          ) : null}

          <DataTable title="Departments" rows={departments} columns={[{ key: 'name', label: 'Department' }, { key: 'coordinator_name', label: 'Coordinator' }, { key: 'coordinator_email', label: 'Email' }, { key: 'coordinator_mobile', label: 'Mobile' }, { key: 'is_first_login', label: 'First Login' }, { key: 'is_active', label: 'Active' }]} actions={(row) => <div className="space-x-2"><Button variant="secondary" onClick={() => editDepartment(row)}>Edit</Button><Button variant="secondary" onClick={() => deleteDepartment(row.id)}>Delete</Button></div>} />

          <DataTable title="Linked Internship Provider Organizations (IPOs)" rows={industries.map((r) => ({ ...r, id: r.link_id }))} columns={[{ key: 'name', label: 'IPO' }, { key: 'email', label: 'Email' }, { key: 'business_activity', label: 'Business' }, { key: 'status', label: 'Status' }]} actions={(row) => <div className="space-x-2"><Button variant="secondary" onClick={() => viewIpoProfile((row as any).industry_id)}>View Profile</Button><Button variant="secondary" onClick={() => removeIndustry(row.id)}>Remove</Button></div>} />

          {ipoDetails ? (
            <Card className="rounded-[28px] p-5">
              <h2 className="text-xl font-semibold text-white">{ipoDetails.name}</h2>
              <p className="mt-2 text-sm text-slate-300">Address: {ipoDetails.company_address || '-'}</p>
              <p className="text-sm text-slate-300">Contact: {ipoDetails.contact_number || '-'}</p>
              <p className="text-sm text-slate-300">Email: {ipoDetails.email || '-'}</p>
              <p className="text-sm text-slate-300">Registration No: {ipoDetails.registration_number || '-'}</p>
              <p className="text-sm text-slate-300">Registration Year: {ipoDetails.registration_year || '-'}</p>
            </Card>
          ) : null}

          <DataTable
            title="Internal Applications"
            rows={internalApps}
            columns={[{ key: 'student_name', label: 'Student' }, { key: 'student_email', label: 'Email' }, { key: 'internship_title', label: 'Internship' }, { key: 'status', label: 'Status' }, { key: 'created_at', label: 'Applied At' }]}
            actions={(row) => <div className="space-x-2"><Button variant="secondary" onClick={() => decideApplication(row.id, 'accept')}>Accept</Button><Button variant="secondary" onClick={() => decideApplication(row.id, 'reject')}>Reject</Button></div>}
          />

          <DataTable
            title="External Applications"
            rows={externalApps}
            columns={[{ key: 'student_name', label: 'Student' }, { key: 'student_email', label: 'Email' }, { key: 'internship_title', label: 'Internship' }, { key: 'status', label: 'Status' }, { key: 'created_at', label: 'Applied At' }]}
            actions={(row) => <div className="space-x-2"><Button variant="secondary" onClick={() => decideApplication(row.id, 'accept')}>Accept</Button><Button variant="secondary" onClick={() => decideApplication(row.id, 'reject')}>Reject</Button></div>}
          />
        </>
      )}
    </RoleDashboardShell>
  );
}
