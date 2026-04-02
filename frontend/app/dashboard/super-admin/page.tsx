'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';
import { DASHBOARD_POLL_INTERVAL_MS } from '@/lib/config';

type KPI = {
  totalColleges: number;
  totalIPOs?: number;
  totalIndustries?: number;
  totalDepartments: number;
  totalInternships: number;
  pendingApprovals: number;
  activeInternships: number;
};

type College = { id: string; name: string; coordinator: string; email: string; status: string };
type IPO = { id: string; name: string; email: string; status: string; ipo_type_name?: string; ipo_subtype_name?: string };
type Department = { id: string; name: string; coordinator: string; email: string; college_id: string; college_name: string };
type IPOType = { id: string; name: string };
type IPOSubtype = { id: string; name: string; ipo_type_id: string };
type LogEntry = { id: string; action: string; entity: string; entity_id: string; performed_by: string; timestamp: string };

export default function SuperAdminDashboardPage() {
  const [metrics, setMetrics] = useState<KPI | null>(null);
  const [colleges, setColleges] = useState<College[]>([]);
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [ipoTypes, setIPOTypes] = useState<IPOType[]>([]);
  const [ipoSubtypes, setIPOSubtypes] = useState<IPOSubtype[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [departmentCollegeFilter, setDepartmentCollegeFilter] = useState('all');
  const [newTypeName, setNewTypeName] = useState('');
  const [newSubtypeNames, setNewSubtypeNames] = useState<string[]>(['']);
  const [selectedType, setSelectedType] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setError(null);
    try {
      const [metricsRes, collegeRes, ipoRes, departmentRes, typeRes, subtypeRes, logsRes] = await Promise.all([
        fetchWithSession<KPI>('/api/dashboard/metrics'),
        fetchWithSession<College[]>('/api/colleges'),
        fetchWithSession<IPO[]>('/api/ipos'),
        fetchWithSession<Department[]>('/api/departments'),
        fetchWithSession<IPOType[]>('/api/ipo-types'),
        fetchWithSession<IPOSubtype[]>('/api/ipo-subtypes'),
        fetchWithSession<LogEntry[]>('/api/logs'),
      ]);
      setMetrics(metricsRes.data);
      setColleges(collegeRes.data);
      setIPOs(ipoRes.data);
      setDepartments(departmentRes.data);
      setIPOTypes(typeRes.data);
      setIPOSubtypes(subtypeRes.data);
      setLogs(logsRes.data);
      if (!selectedType && typeRes.data.length > 0) setSelectedType(typeRes.data[0].id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard');
    }
  }, [selectedType]);

  useEffect(() => {
    void loadDashboard();
    const intervalId = window.setInterval(() => {
      void loadDashboard();
    }, DASHBOARD_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [loadDashboard]);

  const matchesSearch = (row: Record<string, unknown>) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase());

  const visibleColleges = useMemo(() => colleges.filter(matchesSearch), [colleges, search]);
  const visibleIPOs = useMemo(() => ipos.filter(matchesSearch), [ipos, search]);
  const visibleDepartments = useMemo(
    () => departments.filter((row) => (departmentCollegeFilter === 'all' || row.college_id === departmentCollegeFilter) && matchesSearch(row as unknown as Record<string, unknown>)),
    [departments, departmentCollegeFilter, search],
  );

  const exportRows = (name: string, rows: unknown[]) => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
    XLSX.writeFile(workbook, `${name}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const updateStatus = async (entity: 'colleges' | 'ipos', id: string, action: 'approve' | 'reject') => {
    await fetchWithSession(`/api/${entity}/${id}/${action}`, { method: 'PATCH' });
    await loadDashboard();
  };

  const deleteEntity = async (entity: 'colleges' | 'ipos', id: string) => {
    await fetchWithSession(`/api/${entity}/${id}`, { method: 'DELETE' });
    await loadDashboard();
  };

  const createType = async () => {
    if (!newTypeName.trim()) return;
    await fetchWithSession('/api/ipo-types', { method: 'POST', body: JSON.stringify({ name: newTypeName }) });
    setNewTypeName('');
    await loadDashboard();
  };

  const createSubtypes = async () => {
    const names = newSubtypeNames.map((name) => name.trim()).filter(Boolean);
    if (!names.length || !selectedType) return;
    await Promise.all(names.map((name) => fetchWithSession('/api/ipo-subtypes', {
      method: 'POST',
      body: JSON.stringify({ name, ipo_type_id: selectedType }),
    })));
    setNewSubtypeNames(['']);
    await loadDashboard();
  };

  return (
    <RoleDashboardShell allowedRoles={['SUPER_ADMIN', 'ADMIN']} title="Super Admin Control Center" subtitle="Audit-ready control panel for approvals, hierarchy management, and governance.">
      {() => (
        <div className="space-y-6 text-slate-900">
          {error ? <Card className="p-4 text-rose-700">{error}</Card> : null}

          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[
              ['Total Colleges', metrics?.totalColleges ?? 0],
              ['Total IPOs', metrics?.totalIPOs ?? metrics?.totalIndustries ?? 0],
              ['Total Departments', metrics?.totalDepartments ?? 0],
              ['Total Internships', metrics?.totalInternships ?? 0],
              ['Pending Approvals', metrics?.pendingApprovals ?? 0],
              ['Active Internships', metrics?.activeInternships ?? 0],
            ].map(([label, value]) => (
              <Card key={String(label)} className="p-4">
                <p className="text-xs font-medium uppercase text-slate-600">{label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
              </Card>
            ))}
          </div>

          <Card className="p-4">
            <h3 className="font-semibold">Alerts</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
              <li>{(metrics?.pendingApprovals ?? 0) > 0 ? `${metrics?.pendingApprovals ?? 0} entities are awaiting approval.` : 'No pending approvals.'}</li>
              <li>{(metrics?.activeInternships ?? 0) === 0 ? 'Warning: No active internships currently visible.' : 'Internship engine is running normally.'}</li>
            </ul>
          </Card>

          <Card className="space-y-3 p-4">
            <h3 className="font-semibold">Global Search & Filters</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search colleges, ipos, departments..." />
              <select className="rounded-xl border border-slate-300 bg-white px-3 py-2" value={departmentCollegeFilter} onChange={(event) => setDepartmentCollegeFilter(event.target.value)}>
                <option value="all">All colleges (departments)</option>
                {colleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}
              </select>
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <h3 className="font-semibold">IPO Type & Subtype Management</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={newTypeName} onChange={(event) => setNewTypeName(event.target.value)} placeholder="New ipo type" />
              <Button onClick={createType}>Create IPO Type</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <select className="rounded-xl border border-slate-300 bg-white px-3 py-2" value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
                {ipoTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
              </select>
              <div className="space-y-2 md:col-span-2">
                {newSubtypeNames.map((name, index) => (
                  <div key={`subtype-input-${index}`} className="flex items-center gap-2">
                    <Input value={name} onChange={(event) => setNewSubtypeNames((prev) => prev.map((item, i) => (i === index ? event.target.value : item)))} placeholder={`Subtype ${index + 1}`} />
                    {newSubtypeNames.length > 1 ? <Button variant="secondary" onClick={() => setNewSubtypeNames((prev) => prev.filter((_, i) => i !== index))}>Remove</Button> : null}
                  </div>
                ))}
                <Button variant="secondary" onClick={() => setNewSubtypeNames((prev) => [...prev, ''])}>Add More</Button>
              </div>
              <Button onClick={createSubtypes}>Save Subtypes</Button>
            </div>
            <div className="space-y-2 text-sm">
              {ipoTypes.map((type) => (
                <div key={type.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{type.name}</p>
                    <Button variant="secondary" onClick={async () => { await fetchWithSession(`/api/ipo-types/${type.id}`, { method: 'DELETE' }); await loadDashboard(); }}>Delete Type</Button>
                  </div>
                  <div className="mt-2 ml-4 space-y-2">
                    {ipoSubtypes.filter((sub) => sub.ipo_type_id === type.id).map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between">
                        <span>↳ {sub.name}</span>
                        <Button variant="secondary" onClick={async () => { await fetchWithSession(`/api/ipo-subtypes/${sub.id}`, { method: 'DELETE' }); await loadDashboard(); }}>Delete</Button>
                      </div>
                    ))}
                    {ipoSubtypes.filter((sub) => sub.ipo_type_id === type.id).length === 0 ? <p className="text-slate-500">No subtypes registered.</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <EntityTable title="College Management" rows={visibleColleges} onExport={() => exportRows('colleges', visibleColleges)} renderActions={(row) => (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => updateStatus('colleges', row.id, 'approve')}>Approve</Button>
              <Button variant="secondary" onClick={() => updateStatus('colleges', row.id, 'reject')}>Reject</Button>
              <Button variant="secondary" onClick={() => deleteEntity('colleges', row.id)}>Delete</Button>
            </div>
          )} />

          <EntityTable title="IPO Management" rows={visibleIPOs} onExport={() => exportRows('ipos', visibleIPOs)} renderActions={(row) => (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => updateStatus('ipos', row.id, 'approve')}>Approve</Button>
              <Button variant="secondary" onClick={() => updateStatus('ipos', row.id, 'reject')}>Reject</Button>
              <Button variant="secondary" onClick={() => deleteEntity('ipos', row.id)}>Delete</Button>
            </div>
          )} />

          <EntityTable title="Department Management" rows={visibleDepartments} onExport={() => exportRows('departments', visibleDepartments)} />
          <EntityTable title="Audit Logs" rows={logs.slice(0, 100)} onExport={() => exportRows('logs', logs)} />
        </div>
      )}
    </RoleDashboardShell>
  );
}

function EntityTable<T extends { id: string }>({ title, rows, renderActions, onExport }: { title: string; rows: T[]; renderActions?: (row: T) => ReactNode; onExport: () => void }) {
  const columns = rows.length > 0 ? Object.keys(rows[0]).filter((key) => key !== 'id') : [];
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Button variant="secondary" onClick={onExport}>Export Excel</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              {columns.map((key) => <th key={key} className="px-3 py-2 capitalize">{key.replaceAll('_', ' ')}</th>)}
              {renderActions ? <th className="px-3 py-2">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                {columns.map((key) => <td key={key} className="px-3 py-2 text-slate-800">{String((row as Record<string, unknown>)[key] ?? '-')}</td>)}
                {renderActions ? <td className="px-3 py-2">{renderActions(row)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
