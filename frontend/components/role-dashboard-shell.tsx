'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Role, SessionProfile } from '@/lib/types';
import { Building2, BriefcaseBusiness, GraduationCap, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { clearSession, dashboardPathFor, loadSession } from '@/lib/auth';

const roleLabel: Record<Role, string> = {
  ADMIN: 'Admin space',
  SUPER_ADMIN: 'Super Admin',
  STUDENT: 'Student space',
  IPO: 'IPO space',
  DEPARTMENT_COORDINATOR: 'Department space',
  COLLEGE_COORDINATOR: 'College space',
};

const roleIcon: Record<Role, typeof GraduationCap> = {
  ADMIN: ShieldCheck,
  SUPER_ADMIN: ShieldCheck,
  STUDENT: GraduationCap,
  IPO: BriefcaseBusiness,
  DEPARTMENT_COORDINATOR: Building2,
  COLLEGE_COORDINATOR: Building2,
};

export function RoleDashboardShell({
  title,
  subtitle,
  allowedRoles,
  children,
}: {
  title: string;
  subtitle: string;
  allowedRoles: Role[];
  children: (session: SessionProfile) => ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionProfile | null>(null);

  useEffect(() => {
    const current = loadSession();
    if (!current) {
      router.replace('/login');
      return;
    }

    if (!allowedRoles.includes(current.user.role)) {
      router.replace(dashboardPathFor(current.user.role));
      return;
    }

    setSession(current);
  }, [allowedRoles, router]);

  if (!session) {
    return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading your internship space…</div>;
  }

  const Icon = roleIcon[session.user.role];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <Card className="rounded-[32px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-[22px] bg-indigo-100 p-3 text-indigo-700"><Icon className="h-6 w-6" /></div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-indigo-700">{roleLabel[session.user.role]}</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={dashboardPathFor(session.user.role)} className={`rounded-full px-4 py-2 text-sm ${pathname === dashboardPathFor(session.user.role) ? 'bg-indigo-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
              Dashboard
            </Link>
            <Link href="/login" className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Switch account</Link>
            <Button variant="secondary" onClick={() => { clearSession(); router.push('/'); }}>
              <LogOut className="mr-2 h-4 w-4" />Logout
            </Button>
          </div>
        </div>
      </Card>
      {children(session)}
    </main>
  );
}
