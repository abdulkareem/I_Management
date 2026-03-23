'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { dashboardPathFor, login } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await login({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      });
      router.push(dashboardPathFor(response.data.user.role));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Welcome back</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Continue your internship journey</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">One login for students, colleges, and industries. Fast, mobile-friendly, and ready to install as an app.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>
          <div className="space-y-2">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" placeholder="••••••••" required />
          </div>
          {error ? <p className="rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="w-full" disabled={loading}>{loading ? 'Signing in…' : 'Login'}</Button>
        </form>
        <div className="mt-6 grid gap-3 text-sm text-slate-300">
          <Link href="/join/student" className="rounded-[18px] border border-white/10 px-4 py-3">New student? Join here</Link>
          <Link href="/join/college" className="rounded-[18px] border border-white/10 px-4 py-3">Register a college</Link>
          <Link href="/join/industry" className="rounded-[18px] border border-white/10 px-4 py-3">Join as industry</Link>
        </div>
      </Card>
    </main>
  );
}
