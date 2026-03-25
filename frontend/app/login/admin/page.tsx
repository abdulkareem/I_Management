'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { dashboardPathFor, sendAdminOtp, verifyAdminOtp } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await sendAdminOtp(email);
      setOtpSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to send OTP');
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const response = await verifyAdminOtp(email, otp);
      router.push(dashboardPathFor(response.data.user.role));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to verify OTP');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-white">Admin OTP Login</h1>
        <form className="mt-6 space-y-3" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
          <input type="email" placeholder="Admin email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          {otpSent ? <input placeholder="OTP" value={otp} onChange={(event) => setOtp(event.target.value)} required /> : null}
          <Button className="w-full">{otpSent ? 'Verify OTP' : 'Send OTP'}</Button>
        </form>
        {error ? <p className="mt-3 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        <Link href="/login" className="mt-4 block text-sm text-cyan-200">Back to login</Link>
      </Card>
    </main>
  );
}
