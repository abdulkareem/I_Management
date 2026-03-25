'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { sendAdminOtp } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendAdminOtp(email);
      router.push(`/login/admin/otp?email=${encodeURIComponent(email.trim())}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to send OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-white">Super Admin Login</h1>
        <form className="mt-6 space-y-3" onSubmit={handleSendOtp}>
          <input type="email" placeholder="Super admin email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Button className="w-full" disabled={loading}>{loading ? 'Please wait...' : 'Send OTP'}</Button>
        </form>
        {error ? <p className="mt-3 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        <Link href="/login" className="mt-4 block text-sm text-cyan-200">Back to login</Link>
      </Card>
    </main>
  );
}
