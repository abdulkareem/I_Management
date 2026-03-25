'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { verifyAdminOtp } from '@/lib/auth';

function AdminOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(() => (searchParams.get('email') ?? '').trim(), [searchParams]);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyAdminOtp(email, otp);
      router.push('/superadmin/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to verify OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full rounded-[32px] p-6 sm:p-8">
      <h1 className="text-3xl font-semibold text-white">Enter OTP</h1>
      <p className="mt-2 text-sm text-slate-300">OTP sent to: {email || 'missing email'}</p>
      <form className="mt-6 space-y-3" onSubmit={handleVerifyOtp}>
        <input
          placeholder="6-digit OTP"
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          inputMode="numeric"
          pattern="[0-9]{6}"
        />
        <Button className="w-full" disabled={loading || !email}>{loading ? 'Please wait...' : 'Verify OTP'}</Button>
      </form>
      {error ? <p className="mt-3 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
      <Link href="/login/admin" className="mt-4 block text-sm text-cyan-200">Back to email step</Link>
    </Card>
  );
}

export default function AdminOtpPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <Suspense fallback={<Card className="w-full rounded-[32px] p-6 sm:p-8">Loading...</Card>}>
        <AdminOtpForm />
      </Suspense>
    </main>
  );
}
