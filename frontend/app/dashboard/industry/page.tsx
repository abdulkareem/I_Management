'use client';

import { useEffect, useState } from 'react';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchWithSession } from '@/lib/auth';

type Internship = { id: string; title: string; description: string; status: string; vacancy?: number | null; stipend_amount?: number | null; fee_amount?: number | null; duration_hours?: number | null };

export default function IndustryDashboardPage() {
  const [received, setReceived] = useState<Internship[]>([]);
  const [published, setPublished] = useState<Internship[]>([]);
  const [form, setForm] = useState<Record<string, { vacancy: string; stipendAmount: string; feeAmount: string; durationHours: string }>>({});
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetchWithSession<{ receivedInternships: Internship[]; publishedInternships: Internship[] }>('/api/dashboard/industry/overview');
    setReceived(res.data?.receivedInternships ?? []);
    setPublished(res.data?.publishedInternships ?? []);
  };

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : 'Load failed')); }, []);

  async function publish(item: Internship) {
    const draft = form[item.id] ?? { vacancy: String(item.vacancy ?? 1), stipendAmount: String(item.stipend_amount ?? ''), feeAmount: String(item.fee_amount ?? ''), durationHours: String(item.duration_hours ?? '') };
    await fetchWithSession('/api/internship/publish', {
      method: 'POST',
      body: JSON.stringify({ internshipId: item.id, vacancy: Number(draft.vacancy || 0), stipendAmount: Number(draft.stipendAmount || 0) || null, feeAmount: Number(draft.feeAmount || 0) || null, durationHours: Number(draft.durationHours || 0) || null }),
    });
    await load();
  }

  return (
    <RoleDashboardShell allowedRoles={['INDUSTRY']} title="Industry Dashboard" subtitle="Review requests, set details, publish internships.">
      {() => (
        <div className="space-y-4">
          {error ? <Card className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</Card> : null}
          <Card className="rounded-2xl p-4"><h2 className="font-semibold">Received Internships</h2>
            <div className="mt-3 space-y-3">{received.map((item) => {
              const draft = form[item.id] ?? { vacancy: String(item.vacancy ?? 1), stipendAmount: String(item.stipend_amount ?? ''), feeAmount: String(item.fee_amount ?? ''), durationHours: String(item.duration_hours ?? '') };
              return <div key={item.id} className="rounded-xl border p-3"><p className="font-medium">{item.title}</p><p className="text-sm text-slate-600">{item.description}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-4">
                  <Input type="number" min={1} value={draft.vacancy} onChange={(e) => setForm((prev) => ({ ...prev, [item.id]: { ...draft, vacancy: e.target.value } }))} placeholder="Vacancy" />
                  <Input type="number" min={0} value={draft.stipendAmount} onChange={(e) => setForm((prev) => ({ ...prev, [item.id]: { ...draft, stipendAmount: e.target.value } }))} placeholder="Stipend" />
                  <Input type="number" min={0} value={draft.feeAmount} onChange={(e) => setForm((prev) => ({ ...prev, [item.id]: { ...draft, feeAmount: e.target.value } }))} placeholder="Fee" />
                  <Input type="number" min={1} value={draft.durationHours} onChange={(e) => setForm((prev) => ({ ...prev, [item.id]: { ...draft, durationHours: e.target.value } }))} placeholder="Duration Hours" />
                </div>
                <Button className="mt-3" onClick={() => publish(item)}>Publish</Button>
              </div>;})}{received.length===0?<p className="text-sm text-slate-500">No internships received.</p>:null}</div></Card>
          <Card className="rounded-2xl p-4"><h2 className="font-semibold">Published Internships</h2><p className="text-sm text-slate-600 mt-2">{published.length} published internships.</p></Card>
        </div>
      )}
    </RoleDashboardShell>
  );
}
