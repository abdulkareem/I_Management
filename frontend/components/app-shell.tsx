'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Building2, LayoutDashboard, LogOut, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { clearSession, fetchWithSession, loadSession, type SessionState } from '@/lib/auth';

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: (state: { session: SessionState | null; summary: SummaryData | null }) => React.ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<SessionState | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const current = loadSession();
    setSession(current);
    if (!current) {
      router.replace('/login');
      return;
    }
    fetchWithSession<SummaryData>('/dashboard/summary')
      .then((response) => setSummary(response.data))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load dashboard.'));
  }, [router]);

  function logout() {
    clearSession();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-slate-950/30">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_1fr] lg:px-10">
        <Card className="flex flex-col gap-8 rounded-[32px] p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">Prism Workspace</p>
            <h1 className="mt-3 text-2xl font-semibold text-white">{session?.tenant.name ?? 'Loading tenant…'}</h1>
            <p className="mt-2 text-sm text-slate-400">{session?.tenant.slug ?? 'Resolving slug...'}</p>
          </div>
          <nav className="grid gap-2 text-sm text-slate-300">
            {[
              ['/dashboard', 'Dashboard', LayoutDashboard],
              ['/profile', 'Profile', Settings],
              ['/admin', 'Admin panel', Building2],
              ['/admin/users', 'Users', Users],
              ['/notifications', 'Notifications', Bell],
            ].map(([href, label, Icon]) => {
              const LucideIcon = Icon as typeof LayoutDashboard;
              return (
                <Link key={href} href={href} className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 transition hover:border-white/10 hover:bg-white/5">
                  <LucideIcon className="h-4 w-4 text-cyan-300" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">{session?.user.name}</p>
            <p className="mt-1">{session?.user.email}</p>
            <p className="mt-1 text-cyan-300">{session?.user.role}</p>
            <Button className="mt-4 w-full" variant="secondary" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Logout</Button>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="rounded-[32px] p-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Application area</p>
                <h2 className="mt-3 text-4xl font-semibold text-white">{title}</h2>
                <p className="mt-3 max-w-3xl text-slate-300">This workspace is tenant-scoped end-to-end, backed by Prisma, and protected with verification-aware authentication and persisted sessions.</p>
              </div>
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </div>
          </Card>
          {children({ session, summary })}
        </div>
      </div>
    </div>
  );
}

export interface SummaryData {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: 'FREE' | 'PRO';
    status: 'ACTIVE' | 'SUSPENDED';
  };
  stats: {
    totalUsers: number;
    adminCount: number;
    staffCount: number;
    endUserCount: number;
    notifications: number;
    unreadNotifications: number;
  };
  latestUsers: Array<{ id: string; name: string; email: string; role: string; createdAt: string }>;
  recentAuditLogs: Array<{ id: string; action: string; description: string; createdAt: string }>;
}
