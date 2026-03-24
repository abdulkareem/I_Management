'use client';

import { Card } from '@/components/ui/card';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';

export default function ExternalStudentDashboardPage() {
  return (
    <RoleDashboardShell title="External Student Dashboard" subtitle="Apply and track your internship applications.">
      {() => (
        <Card className="rounded-[32px] p-6 text-slate-300">
          Use the public internship listings to submit and monitor applications.
        </Card>
      )}
    </RoleDashboardShell>
  );
}
