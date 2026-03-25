'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { RoleDashboardShell } from '@/components/role-dashboard-shell';
import { fetchWithSession, loadSession } from '@/lib/auth';

type DepartmentDashboardData = {
  programs: Array<{ id: string; name: string }>;
  internships: Array<{ id: string; title: string; description: string; created_at: string }>;
  students: Array<{ id: string; name: string; email: string; phone: string; program_name: string }>;
};

export default function DepartmentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DepartmentDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (session?.mustChangePassword) {
      router.replace('/dashboard/department/change-password');
      return;
    }

    fetchWithSession<DepartmentDashboardData>('/department/dashboard')
      .then((response) => {
        console.log('API response:', response.data);
        setData(response.data);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.'));
  }, [router]);

  return (
    <RoleDashboardShell allowedRoles={['DEPARTMENT_COORDINATOR', 'COORDINATOR']} title="Department Dashboard" subtitle="Programs, internships, and students are loaded live from D1.">
      {() => (
        <>
          {error ? <Card className="rounded-[28px] p-4 text-rose-200">{error}</Card> : null}
          {!data ? <Card className="rounded-[28px] p-4">Loading department data...</Card> : null}

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-[28px] p-5">Programs: {data?.programs.length ?? 0}</Card>
            <Card className="rounded-[28px] p-5">Internships: {data?.internships.length ?? 0}</Card>
            <Card className="rounded-[28px] p-5">Students: {data?.students.length ?? 0}</Card>
          </section>

          <Card className="rounded-[28px] p-5">
            <h2 className="mb-2 text-xl">Students</h2>
            {data?.students.length ? data.students.map((student) => (
              <div key={student.id} className="border-t border-white/10 py-2">
                {student.name} ({student.email}) - {student.program_name}
              </div>
            )) : <p className="text-slate-300">No data found</p>}
          </Card>
        </>
      )}
    </RoleDashboardShell>
  );
}
