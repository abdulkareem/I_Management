'use client';

import { useEffect, useState } from 'react';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { DepartmentDashboardSystem } from '@/components/department-dashboard-system';
import { fetchWithSession } from '@/lib/auth';

type DepartmentProfile = { id: string };

export default function DepartmentDashboardPage() {
  const [departmentId, setDepartmentId] = useState<string>('');

  useEffect(() => {
    fetchWithSession<DepartmentProfile>('/api/department/profile')
      .then((res) => setDepartmentId(res.data?.id ?? ''))
      .catch(() => setDepartmentId(''));
  }, []);

  return (
    <RoleDashboardShell
      allowedRoles={['DEPARTMENT_COORDINATOR']}
      title="Department"
      subtitle="Programme and internship management"
    >
      {() => <DepartmentDashboardSystem departmentId={departmentId} />}
    </RoleDashboardShell>
  );
}
