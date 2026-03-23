'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { dashboardPathFor, register } from '@/lib/auth';

export default function CollegeJoinPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await register('COLLEGE_COORDINATOR', {
        email: form.get('email'),
        password: form.get('password'),
        name: form.get('name'),
        collegeName: form.get('collegeName'),
        emblem: form.get('emblem') || undefined,
        address: form.get('address'),
        departments: String(form.get('departments') ?? '').split(',').map((value) => value.trim()).filter(Boolean),
      });
      router.push(dashboardPathFor(response.data.user.role));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to register college.');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-white">Register College</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">Create a single college profile, manage departments, and approve MoUs with one-tap actions.</p>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2"><label htmlFor="name">Coordinator name</label><input id="name" name="name" required /></div>
          <div className="space-y-2"><label htmlFor="email">Coordinator email</label><input id="email" name="email" type="email" required /></div>
          <div className="space-y-2"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required /></div>
          <div className="space-y-2"><label htmlFor="collegeName">College name</label><input id="collegeName" name="collegeName" required /></div>
          <div className="space-y-2"><label htmlFor="emblem">Emblem URL</label><input id="emblem" name="emblem" type="url" placeholder="https://..." /></div>
          <div className="space-y-2 md:col-span-2"><label htmlFor="departments">Departments</label><input id="departments" name="departments" placeholder="Computer Science, Commerce, Mechanical Engineering" required /></div>
          <div className="space-y-2 md:col-span-2"><label htmlFor="address">Campus address</label><textarea id="address" name="address" rows={3} required /></div>
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="md:col-span-2">Create college workspace</Button>
        </form>
      </Card>
    </main>
  );
}
