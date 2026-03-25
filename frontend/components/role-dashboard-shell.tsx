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
  EXTERNAL_STUDENT: 'Student space',
  INDUSTRY: 'Industry space',
  COLLEGE: 'College space',
  COLLEGE_ADMIN: 'College space',
  COORDINATOR: 'Department space',
  DEPARTMENT_COORDINATOR: 'Department space',
  COLLEGE_COORDINATOR: 'College space',
};

const roleIcon: Record<Role, typeof GraduationCap> = {
  ADMIN: ShieldCheck,
  SUPER_ADMIN: ShieldCheck,
  STUDENT: GraduationCap,
  EXTERNAL_STUDENT: GraduationCap,
  INDUSTRY: BriefcaseBusiness,
  COLLEGE: Building2,
  COLLEGE_ADMIN: Building2,
  COORDINATOR: Building2,
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
    return <div className="flex min-h-screen items-center justify-center text-slate-300">Loading your internship space…</div>;
  }

  const Icon = roleIcon[session.user.role];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <Card className="rounded-[32px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-[22px] bg-cyan-400/10 p-3 text-cyan-300"><Icon className="h-6 w-6" /></div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">{roleLabel[session.user.role]}</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={dashboardPathFor(session.user.role)} className={`rounded-full px-4 py-2 text-sm ${pathname === dashboardPathFor(session.user.role) ? 'bg-white text-slate-950' : 'border border-white/10 text-white'}`}>
              Dashboard
            </Link>
            <Link href="/login" className="rounded-full border border-white/10 px-4 py-2 text-sm text-white">Switch account</Link>
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
