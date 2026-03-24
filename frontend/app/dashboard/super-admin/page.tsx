'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession } from '@/lib/auth';

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchWithSession('/super-admin/dashboard').then((res) => setData(res.data)).catch(() => setData(null));
  }, []);

  return (
    <RoleDashboardShell title="Super Admin Dashboard" subtitle="Review colleges, industries, and platform analytics.">
      {() => (
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-[28px] p-5">Colleges: {data?.colleges?.length ?? 0}</Card>
          <Card className="rounded-[28px] p-5">Industries: {data?.industries?.length ?? 0}</Card>
          <Card className="rounded-[28px] p-5">Applications: {data?.analytics?.totalApplications ?? 0}</Card>
        </section>
      )}
    </RoleDashboardShell>
  );
}
