'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function CollegeJoinPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    if (form.get('password') !== form.get('confirmPassword')) {
      setError('Password and confirm password must match.');
      setLoading(false);
      return;
    }

    try {
      const formData = {
        collegeName: form.get('collegeName'),
        address: form.get('address'),
        university: form.get('university'),
        mobile: form.get('mobile'),
        coordinatorName: form.get('coordinatorName'),
        email: form.get('email'),
        password: form.get('password'),
      };

      console.log('API URL:', process.env.NEXT_PUBLIC_API_BASE_URL);

      if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
        throw new Error('NEXT_PUBLIC_API_BASE_URL is undefined. Configure it in Cloudflare Pages and redeploy.');
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/college/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const text = await res.text();
      console.log('Raw response:', text);

      const data = text ? (JSON.parse(text) as { message?: string }) : {};

      if (!res.ok) {
        console.error('Backend error:', data);
        throw new Error(data.message || 'Unknown error');
      }

      console.log('Success:', data);
      router.push('/login');
    } catch (err) {
      console.error('Frontend error:', err);
      setError(err instanceof Error ? err.message : 'Unable to register college.');
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
        <h1 className="text-3xl font-semibold text-white">College Registration</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">Your account will be created with status PENDING until reviewed by super admin.</p>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2"><label htmlFor="collegeName">College Name</label><input id="collegeName" name="collegeName" required /></div>
          <div className="space-y-2"><label htmlFor="address">Address</label><input id="address" name="address" required /></div>
          <div className="space-y-2"><label htmlFor="university">University</label><input id="university" name="university" required /></div>
          <div className="space-y-2"><label htmlFor="mobile">Mobile</label><input id="mobile" name="mobile" required /></div>
          <div className="space-y-2"><label htmlFor="coordinatorName">Coordinator Name</label><input id="coordinatorName" name="coordinatorName" required /></div>
          <div className="space-y-2"><label htmlFor="email">Coordinator Email</label><input id="email" name="email" type="email" required /></div>
          <div className="space-y-2"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required /></div>
          <div className="space-y-2"><label htmlFor="confirmPassword">Confirm Password</label><input id="confirmPassword" name="confirmPassword" type="password" required /></div>
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="md:col-span-2" disabled={loading}>{loading ? 'Submitting...' : 'Submit for approval'}</Button>
        </form>
      </Card>
    </main>
  );
}
