'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { register } from '@/lib/auth';
import { apiRequest } from '@/lib/api';

interface CollegeCatalog {
  colleges: Array<{ id: string; name: string }>;
}

export default function StudentJoinPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<CollegeCatalog['colleges']>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [existingUser, setExistingUser] = useState(false);

  useEffect(() => {
    apiRequest<CollegeCatalog>('/catalog/colleges')
      .then((response) => {
        setCatalog(response.data.colleges);
        setSelectedCollegeId(response.data.colleges[0]?.id ?? '');
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load colleges.'));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setExistingUser(false);
    const form = new FormData(event.currentTarget);
    if (form.get('password') !== form.get('confirmPassword')) {
      setError('Password and confirm password must match.');
      return;
    }
    try {
      await register('STUDENT', {
        email: form.get('email'),
        password: form.get('password'),
        name: form.get('name'),
        phone: form.get('phone'),
        universityRegNo: form.get('universityRegNo'),
        collegeId: form.get('collegeId'),
      });
      router.push('/login');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to create student account.';
      setError(message);
      setExistingUser(message.includes('User already registered'));
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-3xl font-semibold text-white">Join as Student</h1>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2"><label htmlFor="name">Name</label><input id="name" name="name" required /></div>
          <div className="space-y-2"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
          <div className="space-y-2"><label htmlFor="phone">Phone</label><input id="phone" name="phone" required /></div>
          <div className="space-y-2"><label htmlFor="universityRegNo">University Register Number</label><input id="universityRegNo" name="universityRegNo" required /></div>
          <div className="space-y-2"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required /></div>
          <div className="space-y-2"><label htmlFor="confirmPassword">Confirm Password</label><input id="confirmPassword" name="confirmPassword" type="password" required /></div>
          <div className="space-y-2"><label htmlFor="collegeId">College</label><select id="collegeId" name="collegeId" value={selectedCollegeId} onChange={(event) => setSelectedCollegeId(event.target.value)} required>{catalog.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}</select></div>
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          {existingUser ? (
            <div className="md:col-span-2 grid gap-2 text-sm text-cyan-100">
              <p>You are already registered.</p>
              <div className="flex gap-2">
                <Link href="/forgot-password" className="rounded-[14px] border border-white/15 px-3 py-2">Reset Password</Link>
                <Link href="/forgot-password" className="rounded-[14px] border border-white/15 px-3 py-2">Forgot User ID</Link>
              </div>
            </div>
          ) : null}
          <Button className="md:col-span-2">Create student account</Button>
        </form>
      </Card>
    </main>
  );
}
