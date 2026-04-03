'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/api';

type IPOType = { id: string; name: string };

export default function IPOJoinPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [types, setTypes] = useState<IPOType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiRequest<IPOType[]>('/api/ipo-types')
      .then((response) => setTypes(response.data))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load ipo categories.'));
  }, []);

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
      await apiRequest<{ success: boolean }>('/api/ipo/register', {
        method: 'POST',
        body: JSON.stringify({
          companyName: form.get('companyName'),
          email: form.get('email'),
          password: form.get('password'),
          businessActivity: form.get('businessActivity'),
          ipoTypeId: form.get('ipoTypeId'),
        }),
      });
      router.push('/login');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to register ipo profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-cyan-700 hover:text-cyan-800">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Join as IPO (IPO)</h1>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2"><label htmlFor="companyName">Company Name</label><input id="companyName" name="companyName" required /></div>
          <div className="space-y-2"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
          <div className="space-y-2 md:col-span-2"><label htmlFor="businessActivity">Activity</label><textarea id="businessActivity" name="businessActivity" required rows={4} /></div>
          <div className="space-y-2">
            <label htmlFor="ipoTypeId">Type of IPO (IPO)</label>
            <select id="ipoTypeId" name="ipoTypeId" required defaultValue="">
              <option value="" disabled>Select ipo type</option>
              {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
          </div>
          <div className="space-y-2"><label htmlFor="password">Password</label><input id="password" name="password" type="password" minLength={8} required /></div>
          <div className="space-y-2"><label htmlFor="confirmPassword">Confirm Password</label><input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required /></div>
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="md:col-span-2" disabled={loading}>{loading ? 'Creating profile...' : 'Create IPO profile'}</Button>
        </form>
      </Card>
    </main>
  );
}
