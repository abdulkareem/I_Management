'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { register } from '@/lib/auth';

export default function CollegeJoinPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await register('COLLEGE_ADMIN', {
        collegeName: form.get('collegeName'),
        address: form.get('address'),
        email: form.get('email'),
        phone: form.get('phone'),
        university: form.get('university'),
        loginEmail: form.get('loginEmail'),
        password: form.get('password'),
      });
      router.push('/login');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to register college.');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="text-3xl font-semibold text-white">Register College</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">Your account will be created with status PENDING_APPROVAL until reviewed by super admin.</p>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2"><label htmlFor="collegeName">College Name</label><input id="collegeName" name="collegeName" required /></div>
          <div className="space-y-2"><label htmlFor="address">Address</label><input id="address" name="address" required /></div>
          <div className="space-y-2"><label htmlFor="email">College Email</label><input id="email" name="email" type="email" required /></div>
          <div className="space-y-2"><label htmlFor="phone">Phone</label><input id="phone" name="phone" required /></div>
          <div className="space-y-2"><label htmlFor="university">University</label><input id="university" name="university" required /></div>
          <div className="space-y-2"><label htmlFor="loginEmail">Login Username (Email)</label><input id="loginEmail" name="loginEmail" type="email" required /></div>
          <div className="space-y-2 md:col-span-2"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required /></div>
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="md:col-span-2">Submit for approval</Button>
        </form>
      </Card>
    </main>
  );
}
