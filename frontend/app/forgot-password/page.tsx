'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { forgotPassword, forgotUserId, resetPassword } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await forgotPassword(identifier);
      setMessage('OTP sent to your registered email.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send OTP');
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await resetPassword(identifier, otp, newPassword);
      setMessage('Password reset successful.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to reset password');
    }
  }

  async function handleForgotUserId() {
    try {
      const value = identifier.includes('@') ? { universityRegNo: identifier } : { phone: identifier, universityRegNo: identifier };
      const response = await forgotUserId(value);
      setMessage(`Your user ID: ${response.data.maskedEmail}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to recover user ID');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-white">Recover account</h1>

        <form className="mt-6 space-y-3" onSubmit={handleSendOtp}>
          <input placeholder="Email / Phone / Reg No" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
          <Button className="w-full">Send OTP</Button>
        </form>

        <form className="mt-4 space-y-3" onSubmit={handleReset}>
          <input placeholder="OTP" value={otp} onChange={(event) => setOtp(event.target.value)} required />
          <input type="password" placeholder="New Password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          <Button className="w-full">Reset Password</Button>
        </form>

        <Button className="mt-4 w-full" onClick={handleForgotUserId}>Forgot User ID</Button>
        {message ? <p className="mt-3 rounded-[18px] bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">{message}</p> : null}
        <Link href="/login" className="mt-4 block text-sm text-cyan-200">Back to login</Link>
      </Card>
    </main>
  );
}
