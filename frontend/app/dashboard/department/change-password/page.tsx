'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchWithSession, loadSession, saveSession } from '@/lib/auth';

export default function DepartmentChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (!session || session.user.role !== 'DEPARTMENT_COORDINATOR') {
      router.replace('/login');
      return;
    }

    if (!session.mustChangePassword) {
      router.replace('/dashboard/department');
    }
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await fetchWithSession('/api/department/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });

      const session = loadSession();
      if (session) saveSession({ ...session, mustChangePassword: false });

      setMessage('Password changed successfully. Redirecting to dashboard...');
      setTimeout(() => router.replace('/dashboard/department'), 800);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to change password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Department Security</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Change your temporary password</h1>
        <p className="mt-2 text-sm text-slate-700">This is required once before continuing to the department dashboard.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label htmlFor="currentPassword">Current password</label>
            <input id="currentPassword" type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label htmlFor="newPassword">New password</label>
            <input id="newPassword" type="password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </div>
          <Button className="w-full" disabled={loading}>{loading ? 'Saving…' : 'Update password'}</Button>
        </form>

        {message ? <p className="mt-3 rounded-[18px] bg-emerald-400/10 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
        {error ? <p className="mt-3 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
      </Card>
    </main>
  );
}
