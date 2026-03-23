'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { dashboardPathFor, register } from '@/lib/auth';
import { apiRequest } from '@/lib/api';

interface CollegeCatalog {
  colleges: Array<{ id: string; name: string; departments: Array<{ id: string; name: string }> }>;
}

export default function StudentJoinPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<CollegeCatalog['colleges']>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

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
    const form = new FormData(event.currentTarget);
    try {
      const response = await register('STUDENT', {
        email: form.get('email'),
        password: form.get('password'),
        name: form.get('name'),
        collegeId: form.get('collegeId'),
        departmentId: form.get('departmentId'),
        universityRegNo: form.get('universityRegNo'),
        dob: new Date(String(form.get('dob'))).toISOString(),
        whatsapp: form.get('whatsapp'),
        address: form.get('address'),
      });
      router.push(dashboardPathFor(response.data.user.role));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create student account.');
    }
  }

  const selectedCollege = useMemo(() => catalog.find((college) => college.id === selectedCollegeId) ?? catalog[0], [catalog, selectedCollegeId]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-white">Join as Student</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">Tell us who you are once. Then the platform shows approved internships only, ready for one-click application.</p>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2"><label htmlFor="name">Full name</label><input id="name" name="name" required /></div>
          <div className="space-y-2"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
          <div className="space-y-2"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required /></div>
          <div className="space-y-2"><label htmlFor="universityRegNo">University register no.</label><input id="universityRegNo" name="universityRegNo" required /></div>
          <div className="space-y-2"><label htmlFor="dob">Date of birth</label><input id="dob" name="dob" type="date" required /></div>
          <div className="space-y-2"><label htmlFor="whatsapp">WhatsApp number</label><input id="whatsapp" name="whatsapp" required /></div>
          <div className="space-y-2"><label htmlFor="collegeId">College</label><select id="collegeId" name="collegeId" value={selectedCollegeId} onChange={(event) => setSelectedCollegeId(event.target.value)} required>{catalog.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}</select></div>
          <div className="space-y-2"><label htmlFor="departmentId">Department</label><select id="departmentId" name="departmentId" required>{(selectedCollege?.departments ?? []).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div>
          <div className="space-y-2 md:col-span-2"><label htmlFor="address">Address</label><textarea id="address" name="address" rows={3} required /></div>
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="md:col-span-2">Create student account</Button>
        </form>
      </Card>
    </main>
  );
}
