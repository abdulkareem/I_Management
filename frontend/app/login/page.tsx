'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { dashboardPathFor, loginWithPassword } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await loginWithPassword(email, password);
      if (response.data.user.role === 'DEPARTMENT_COORDINATOR' && response.data.mustChangePassword) {
        router.push('/dashboard/department/change-password');
        return;
      }
      router.push(dashboardPathFor(response.data.user.role));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Login failed.';
      if (message.toLowerCase().includes('register')) {
        router.push('/join/student');
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Welcome back</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Continue your internship journey</h1>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="you@example.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <Button className="w-full" disabled={loading}>{loading ? 'Signing in…' : 'Login'}</Button>
        </form>

        {error ? <p className="mt-3 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

        <div className="mt-6 grid gap-3 text-sm text-slate-300">
          <Link href="/login/admin" className="rounded-[18px] border border-white/10 px-4 py-3">Admin OTP login</Link>
          <Link href="/join/student" className="rounded-[18px] border border-white/10 px-4 py-3">New user? Register</Link>
        </div>
      </Card>
    </main>
  );
}
