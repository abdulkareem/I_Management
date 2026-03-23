'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MarketingShell } from '@/components/marketing-shell';
import { Card } from '@/components/ui/card';
import { verifyEmail } from '@/lib/auth';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [message, setMessage] = useState('Open the verification link from your email to activate the account.');

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then((response) => setMessage(response.message))
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Verification failed.'));
  }, [token]);

  return (
    <MarketingShell>
      <Card className="mx-auto max-w-2xl rounded-[34px] p-10 text-center">
        <h1 className="text-4xl font-semibold text-white">Email verification</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">{message}</p>
        <Link href="/login" className="mt-8 inline-flex rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Return to login</Link>
      </Card>
    </MarketingShell>
  );
}
