'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWithSession, loadSession } from '@/lib/auth';
import type { DepartmentDashboard } from '@/lib/types';

type Industry = { id: string; name: string };
type OutcomeType = 'PO' | 'PSO';
type OutcomeOption = { id: string; type: OutcomeType; value: string };

export default function DepartmentDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DepartmentDashboard | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeOption[]>([]);
  const [outcomeForm, setOutcomeForm] = useState<{ type: OutcomeType; value: string }>({ type: 'PO', value: '' });
  const [removeOutcomeId, setRemoveOutcomeId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [internshipsRes, applicationsRes, requestsRes, industriesRes, outcomesRes] = await Promise.all([
      fetchWithSession<DepartmentDashboard['internships']>('/api/department/internships'),
      fetchWithSession<DepartmentDashboard['applications']>('/api/department/applications'),
      fetchWithSession<DepartmentDashboard['industryRequests']>('/api/department/industry-requests'),
      fetchWithSession<Industry[]>('/api/department/industries'),
      fetchWithSession<OutcomeOption[]>('/api/department/po-pso'),
    ]);

    setDashboard({
      internships: internshipsRes.data,
      applications: applicationsRes.data,
      industryRequests: requestsRes.data,
    });
    setIndustries((industriesRes.data ?? []).map((item: any) => ({ id: item.id, name: item.name })));
    setOutcomes((outcomesRes.data ?? []).map((item: any) => ({ id: item.id, type: item.type, value: item.value })));
  }

  useEffect(() => {
    const session = loadSession();
    if (session?.mustChangePassword) {
      router.replace('/dashboard/department/change-password');
      return;
    }

    load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard'));
  }, [router]);

  const metrics = useMemo(() => ({
    internships: dashboard?.internships.length ?? 0,
    pendingApplications: dashboard?.applications.filter((item) => item.status === 'pending').length ?? 0,
    acceptedApplications: dashboard?.applications.filter((item) => item.status === 'accepted').length ?? 0,
    industryIdeas: dashboard?.industryRequests.length ?? 0,
  }), [dashboard]);

  async function createInternship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);

    try {
      await fetchWithSession('/api/department/internships', {
        method: 'POST',
        body: JSON.stringify({
          title: form.get('title'),
          description: form.get('description'),
          isPaid: form.get('isPaid') === 'on',
          fee: form.get('fee') || null,
          isExternal: true,
        }),
      });
      event.currentTarget.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to create internship');
    }
  }

  async function acceptApplication(id: string) {
    setError(null);
    try {
      await fetchWithSession(`/api/department/applications/${id}/accept`, { method: 'POST' });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to accept application');
    }
  }

  async function rejectApplication(id: string) {
    setError(null);
    try {
      await fetchWithSession(`/api/department/applications/${id}/reject`, { method: 'POST' });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to reject application');
    }
  }

  async function createIndustryRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);

    try {
      await fetchWithSession('/api/industry-requests', {
        method: 'POST',
        body: JSON.stringify({
          industryId: form.get('industryId'),
          internshipTitle: form.get('internshipTitle'),
          description: form.get('description'),
          mappedPo: form.get('mappedPo'),
          mappedPso: form.get('mappedPso'),
        }),
      });
      event.currentTarget.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to create industry request');
    }
  }

  const poOptions = useMemo(() => outcomes.filter((item) => item.type === 'PO'), [outcomes]);
  const psoOptions = useMemo(() => outcomes.filter((item) => item.type === 'PSO'), [outcomes]);

  async function addOutcomeOption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!outcomeForm.value.trim()) return;
    setError(null);
    try {
      await fetchWithSession('/api/department/po-pso', {
        method: 'POST',
        body: JSON.stringify({ type: outcomeForm.type, value: outcomeForm.value.trim() }),
      });
      setOutcomeForm((prev) => ({ ...prev, value: '' }));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to add PO/PSO option');
    }
  }

  async function removeOutcomeOption() {
    if (!removeOutcomeId) return;
    setError(null);
    try {
      await fetchWithSession(`/api/department/po-pso/${removeOutcomeId}`, { method: 'DELETE' });
      setRemoveOutcomeId('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to remove PO/PSO option');
    }
  }

  return (
    <RoleDashboardShell allowedRoles={['DEPARTMENT_COORDINATOR', 'COORDINATOR']} title="Department Dashboard" subtitle="Manage external internships, applications, industry collaboration, and student mapping.">
      {() => (
        <>
          {error ? <Card className="rounded-[20px] p-4 text-rose-200">{error}</Card> : null}

          <section className="grid gap-4 md:grid-cols-4">
            <Card className="rounded-[20px] p-4">Internships: {metrics.internships}</Card>
            <Card className="rounded-[20px] p-4">Pending: {metrics.pendingApplications}</Card>
            <Card className="rounded-[20px] p-4">Accepted: {metrics.acceptedApplications}</Card>
            <Card className="rounded-[20px] p-4">Industry Ideas: {metrics.industryIdeas}</Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-[20px] p-5">
              <h2 className="mb-3 text-xl font-semibold">Create External Internship</h2>
              <form className="grid gap-3" onSubmit={createInternship}>
                <input name="title" placeholder="Internship title" required />
                <textarea name="description" placeholder="Description" required />
                <label className="text-sm"><input type="checkbox" name="isPaid" className="mr-2" />Paid Internship</label>
                <input name="fee" type="number" min={0} placeholder="Fee (if paid)" />
                <Button>Create Internship</Button>
              </form>
            </Card>

            <Card className="rounded-[20px] p-5">
              <h2 className="mb-3 text-xl font-semibold">Suggest Industry Internship Idea</h2>
              <form className="grid gap-3" onSubmit={createIndustryRequest}>
                <select name="industryId" required>
                  <option value="">Select industry</option>
                  {industries.map((industry) => <option key={industry.id} value={industry.id}>{industry.name}</option>)}
                </select>
                <input name="internshipTitle" placeholder="Internship title" required />
                <textarea name="description" placeholder="Idea description" required />
                <select name="mappedPo" defaultValue="">
                  <option value="">Mapped PO</option>
                  {poOptions.map((item) => <option key={item.id} value={item.value}>{item.value}</option>)}
                </select>
                <select name="mappedPso" defaultValue="">
                  <option value="">Mapped PSO</option>
                  {psoOptions.map((item) => <option key={item.id} value={item.value}>{item.value}</option>)}
                </select>
                <Button>Submit Idea</Button>
              </form>
            </Card>
          </section>

          <Card className="rounded-[20px] p-5">
            <h2 className="mb-3 text-xl font-semibold">PO / PSO Menu</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              <form className="grid gap-2" onSubmit={addOutcomeOption}>
                <p className="text-sm text-slate-300">Add PO/PSO option for dropdown mapping.</p>
                <select value={outcomeForm.type} onChange={(event) => setOutcomeForm((prev) => ({ ...prev, type: event.target.value as OutcomeType }))}>
                  <option value="PO">PO</option>
                  <option value="PSO">PSO</option>
                </select>
                <input placeholder="Enter PO/PSO value" value={outcomeForm.value} onChange={(event) => setOutcomeForm((prev) => ({ ...prev, value: event.target.value }))} />
                <Button>Add Menu Option</Button>
              </form>
              <div className="grid gap-2">
                <p className="text-sm text-slate-300">Remove PO/PSO option.</p>
                <select value={removeOutcomeId} onChange={(event) => setRemoveOutcomeId(event.target.value)}>
                  <option value="">Select PO / PSO</option>
                  {outcomes.map((item) => <option key={item.id} value={item.id}>{item.type}: {item.value}</option>)}
                </select>
                <Button variant="secondary" onClick={removeOutcomeOption} disabled={!removeOutcomeId}>Remove Selected</Button>
              </div>
            </div>
          </Card>

          <Card className="rounded-[20px] p-5">
            <h2 className="mb-3 text-xl font-semibold">External Student Applications</h2>
            <div className="space-y-3">
              {dashboard?.applications?.length ? dashboard.applications.map((app) => (
                <div key={app.id} className="rounded-xl border border-white/10 p-3">
                  <p className="font-medium">{app.student_name} • {app.internship_title}</p>
                  <p className="text-xs text-slate-300">{app.student_email} • {app.status.toUpperCase()}</p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="secondary" onClick={() => acceptApplication(app.id)} disabled={app.status === 'accepted'}>Accept</Button>
                    <Button variant="secondary" onClick={() => rejectApplication(app.id)} disabled={app.status === 'rejected'}>Reject</Button>
                  </div>
                </div>
              )) : <p className="text-slate-300">No external applications found.</p>}
            </div>
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-[20px] p-5">
              <h2 className="mb-3 text-xl font-semibold">Internship Listings</h2>
              {dashboard?.internships?.length ? dashboard.internships.map((item) => (
                <div key={item.id} className="border-t border-white/10 py-2">
                  <p>{item.title} <span className="text-xs text-slate-300">({item.status})</span></p>
                  <p className="text-xs text-slate-400">{item.is_paid ? `Paid • ₹${item.fee ?? 0}` : 'Free'} • {item.is_external ? 'External' : 'Internal'}</p>
                </div>
              )) : <p className="text-slate-300">No internships yet.</p>}
            </Card>

            <Card className="rounded-[20px] p-5">
              <h2 className="mb-3 text-xl font-semibold">Suggested Internship Ideas</h2>
              {dashboard?.industryRequests?.length ? dashboard.industryRequests.map((item) => (
                <div key={item.id} className="border-t border-white/10 py-2">
                  <p>{item.internship_title} • {item.industry_name}</p>
                  <p className="text-xs text-slate-300">PO: {item.mapped_po || '-'} • PSO: {item.mapped_pso || '-'} • {item.status}</p>
                </div>
              )) : <p className="text-slate-300">No ideas submitted yet.</p>}
            </Card>
          </section>
        </>
      )}
    </RoleDashboardShell>
  );
}
