'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { register } from '@/lib/auth';
import { apiRequest } from '@/lib/api';

type IndustryType = { id: string; name: string };

export default function IndustryJoinPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [types, setTypes] = useState<IndustryType[]>([]);

  useEffect(() => {
    apiRequest<IndustryType[]>('/industry-type/list')
      .then((response) => setTypes(response.data))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load industry categories.'));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    if (form.get('password') !== form.get('confirmPassword')) {
      setError('Password and confirm password must match.');
      return;
    }
    try {
      await register('INDUSTRY', {
        name: form.get('industryName'),
        internshipSupervisorName: form.get('supervisorName'),
        email: form.get('email'),
        password: form.get('password'),
        registrationNumber: form.get('registrationNumber'),
        registrationYear: form.get('registrationYear'),
        industryType: form.get('industryType'),
      });
      router.push('/login');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to register industry profile.');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-3xl font-semibold text-white">Industry Registration</h1>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2"><label htmlFor="industryName">Industry Name</label><input id="industryName" name="industryName" required /></div>
          <div className="space-y-2"><label htmlFor="supervisorName">Internship Supervisor Name</label><input id="supervisorName" name="supervisorName" required /></div>
          <div className="space-y-2"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
          <div className="space-y-2">
            <label htmlFor="industryType">Industry Type</label>
            <select id="industryType" name="industryType" required>
              {types.map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}
            </select>
          </div>
          <div className="space-y-2"><label htmlFor="registrationNumber">Registration Number</label><input id="registrationNumber" name="registrationNumber" required /></div>
          <div className="space-y-2"><label htmlFor="registrationYear">Registration Year</label><input id="registrationYear" name="registrationYear" required /></div>
          <div className="space-y-2"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required /></div>
          <div className="space-y-2"><label htmlFor="confirmPassword">Confirm Password</label><input id="confirmPassword" name="confirmPassword" type="password" required /></div>
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="md:col-span-2">Create industry profile</Button>
        </form>
      </Card>
    </main>
  );
}
