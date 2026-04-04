'use client';

import { useEffect, useState } from 'react';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { DataTable } from '@/components/data-table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchWithSession } from '@/lib/auth';

type CollegeIpoRow = {
  id: string;
  ipo_id: string;
  ipo_name: string;
  status: string;
  requested_at?: string | null;
  decided_at?: string | null;
  rejection_reason?: string | null;
  active_internships: number;
  engagement_count: number;
};

export default function Page() {
  const [rows, setRows] = useState<CollegeIpoRow[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function load() {
    const response = await fetchWithSession<CollegeIpoRow[]>('/api/college/ipos');
    setRows(response.data ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function decide(ipoId: string, action: 'approve' | 'reject') {
    try {
      setLoadingId(`${ipoId}:${action}`);
      await fetchWithSession(`/api/college/ipos/${ipoId}/${action}`, { method: 'PATCH' });
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <RoleDashboardShell
      allowedRoles={['COLLEGE_COORDINATOR']}
      title="IPO Partnership (IPO)"
      subtitle="Approve IPO requests before they can post internships for your college."
    >
      {() => (
        <Card className="rounded-[24px] p-4">
          <DataTable
            title="IPO Partnerships"
            rows={rows as any}
            columns={[
              { key: 'ipo_name', label: 'IPO' },
              { key: 'status', label: 'Status' },
              { key: 'active_internships', label: 'Active Internships' },
              { key: 'engagement_count', label: 'Engagement' },
            ] as any}
            actions={(row: CollegeIpoRow) => (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-600">
                  {row.status?.toLowerCase() === 'rejected'
                    ? (row.rejection_reason || 'Rejected by college coordinator')
                    : row.status?.toLowerCase() === 'pending'
                      ? 'Waiting for college approval.'
                      : 'Approved for internship postings.'}
                </p>
                {row.status?.toLowerCase() === 'pending' ? (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => void decide(row.ipo_id, 'approve')}
                      disabled={loadingId === `${row.ipo_id}:approve`}
                    >
                      {loadingId === `${row.ipo_id}:approve` ? 'Approving...' : 'Approve'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => void decide(row.ipo_id, 'reject')}
                      disabled={loadingId === `${row.ipo_id}:reject`}
                    >
                      {loadingId === `${row.ipo_id}:reject` ? 'Rejecting...' : 'Reject'}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          />
        </Card>
      )}
    </RoleDashboardShell>
  );
}
