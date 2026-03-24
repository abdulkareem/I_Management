'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { beginLogin, dashboardPathFor, loginWithPassword, verifyOtp } from '@/lib/auth';
import { apiRequest } from '@/lib/api';

const SUPER_ADMIN_EMAIL = 'abdulkareem@psmocollege.ac.in';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetOtpSent, setResetOtpSent] = useState(false);

  async function handleEmailStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await beginLogin(email);
      if (response.data.requiresOtp || response.data.requiresPassword) {
        setShowPassword(true);
      }
      if (response.data.requiresOtp) {
        setError('OTP sent to your email. Enter the code to continue.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to continue login.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = email === SUPER_ADMIN_EMAIL ? await verifyOtp(email, password) : await loginWithPassword(email, password);
      router.push(dashboardPathFor(response.data.user.role));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Login failed.';
      setError(message);
      if (message.includes('3 attempts')) {
        setShowReset(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const response = await apiRequest<{ emailExists: boolean; otpSent?: boolean; passwordUpdated?: boolean }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('resetEmail'),
          otp: form.get('otp') || undefined,
          newPassword: form.get('newPassword') || undefined,
        }),
      });

      if (!response.data.emailExists) {
        setError('Email not found. Please register.');
        return;
      }

      if (response.data.otpSent) {
        setResetOtpSent(true);
      }

      if (response.data.passwordUpdated) {
        setShowReset(false);
        setResetOtpSent(false);
        setError('Password reset successful. Please login.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Reset failed.');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Welcome back</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Continue your internship journey</h1>

        {!showPassword ? (
          <form className="mt-6 space-y-4" onSubmit={handleEmailStep}>
            <div className="space-y-2">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" placeholder="you@example.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <Button className="w-full" disabled={loading}>{loading ? 'Processing…' : 'Continue'}</Button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handlePasswordStep}>
            <div className="space-y-2">
              <label htmlFor="password">{email === SUPER_ADMIN_EMAIL ? 'OTP' : 'Password'}</label>
              <input id="password" name="password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <Button className="w-full" disabled={loading}>{loading ? 'Signing in…' : 'Login'}</Button>
          </form>
        )}

        {error ? <p className="mt-3 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

        {showReset ? (
          <form className="mt-4 space-y-3 rounded-[18px] border border-white/10 p-4" onSubmit={handleReset}>
            <p className="text-sm text-slate-300">Reset Password</p>
            <input name="resetEmail" type="email" placeholder="Email" required defaultValue={email} />
            {resetOtpSent ? <input name="otp" placeholder="Enter OTP" required /> : null}
            {resetOtpSent ? <input name="newPassword" type="password" placeholder="New password" required /> : null}
            <Button className="w-full">{resetOtpSent ? 'Update Password' : 'Send OTP'}</Button>
          </form>
        ) : null}

        <div className="mt-6 grid gap-3 text-sm text-slate-300">
          <Link href="/join/student" className="rounded-[18px] border border-white/10 px-4 py-3">New student? Join here</Link>
          <Link href="/join/college" className="rounded-[18px] border border-white/10 px-4 py-3">Register a college</Link>
          <Link href="/join/industry" className="rounded-[18px] border border-white/10 px-4 py-3">Join as industry</Link>
        </div>
      </Card>
    </main>
  );
}
