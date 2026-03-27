'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardPathFor, loadSession } from '@/lib/auth';

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    router.replace(dashboardPathFor(session.user.role));
  }, [router]);

  return <div className="flex min-h-screen items-center justify-center text-slate-900">Redirecting...</div>;
}
