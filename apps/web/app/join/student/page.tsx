'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { register } from '@/lib/auth';

export default function StudentJoinPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [existingUser, setExistingUser] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setExistingUser(false);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    if (form.get('password') !== form.get('confirmPassword')) {
      setError('Password and confirm password must match.');
      setLoading(false);
      return;
    }
    try {
      await register('STUDENT', {
        email: form.get('email'),
        password: form.get('password'),
        name: form.get('name'),
      });
      router.push('/login');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to create student account.';
      setError(message);
      setExistingUser(message.includes('exists'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-3xl font-semibold text-white">Join as Student</h1>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2"><label htmlFor="name">Name</label><input id="name" name="name" required /></div>
          <div className="space-y-2"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
          <div className="space-y-2"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required /></div>
          <div className="space-y-2"><label htmlFor="confirmPassword">Confirm Password</label><input id="confirmPassword" name="confirmPassword" type="password" required /></div>
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          {existingUser ? <Link href="/login" className="md:col-span-2 text-cyan-100">Already registered? Login.</Link> : null}
          <Button className="md:col-span-2" disabled={loading}>{loading ? 'Creating account...' : 'Create student account'}</Button>
        </form>
      </Card>
    </main>
  );
}
