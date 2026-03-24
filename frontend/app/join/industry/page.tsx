'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { register } from '@/lib/auth';

export default function IndustryJoinPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await register('INDUSTRY', {
        name: form.get('companyName'),
        registrationDetails: form.get('description'),
        emblemUrl: form.get('emblem') || undefined,
        owner: {
          name: form.get('name'),
          email: form.get('email'),
          password: form.get('password'),
        },
      });
      router.push('/login');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to register industry profile.');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-white">Join as Industry</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">Publish internships quickly, accept applications, generate offer letters, and mark attendance without extra admin burden.</p>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2"><label htmlFor="name">Contact name</label><input id="name" name="name" required /></div>
          <div className="space-y-2"><label htmlFor="email">Work email</label><input id="email" name="email" type="email" required /></div>
          <div className="space-y-2"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required /></div>
          <div className="space-y-2"><label htmlFor="companyName">Industry name</label><input id="companyName" name="companyName" required /></div>
          <div className="space-y-2 md:col-span-2"><label htmlFor="description">About your internships</label><textarea id="description" name="description" rows={4} required /></div>
          <div className="space-y-2 md:col-span-2"><label htmlFor="emblem">Emblem URL</label><input id="emblem" name="emblem" type="url" placeholder="https://..." /></div>
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="md:col-span-2">Create industry profile</Button>
        </form>
      </Card>
    </main>
  );
}
