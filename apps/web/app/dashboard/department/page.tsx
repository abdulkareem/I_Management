'use client';

import { Card } from '@/components/ui/card';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';

export default function DepartmentDashboardPage() {
  return (
    <RoleDashboardShell allowedRoles={['DEPARTMENT_COORDINATOR', 'COORDINATOR']} title="Department Dashboard" subtitle="Coordinate approvals, monitor student progress, and review department-level reports.">
      {() => (
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-[28px] p-5">Approvals</Card>
          <Card className="rounded-[28px] p-5">Monitor Students</Card>
          <Card className="rounded-[28px] p-5">Reports</Card>
        </section>
      )}
    </RoleDashboardShell>
  );
}
