'use client';

import { Card } from '@/components/ui/card';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';

export default function DepartmentDashboardPage() {
  return (
    <RoleDashboardShell title="Department Dashboard" subtitle="Create internship projects, review applications, and manage students.">
      {() => (
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-[28px] p-5">Internships</Card>
          <Card className="rounded-[28px] p-5">Applications</Card>
          <Card className="rounded-[28px] p-5">Students</Card>
        </section>
      )}
    </RoleDashboardShell>
  );
}
