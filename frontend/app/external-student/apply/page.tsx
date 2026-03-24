'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

interface CollegeCatalog {
  colleges: Array<{ id: string; name: string; departments: Array<{ id: string; name: string }> }>;
}

export default function ExternalStudentApplyPage() {
  const [catalog, setCatalog] = useState<CollegeCatalog['colleges']>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<CollegeCatalog>('/catalog/colleges')
      .then((response) => {
        setCatalog(response.data.colleges);
        setSelectedCollegeId(response.data.colleges[0]?.id ?? '');
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load colleges.'));
  }, []);

  const selectedCollege = catalog.find((college) => college.id === selectedCollegeId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setError(null);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-white">External Student Internship Application</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Apply for internship opportunities offered by departments in registered colleges.
        </p>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2"><label htmlFor="name">Full name</label><input id="name" name="name" required /></div>
          <div className="space-y-2"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
          <div className="space-y-2"><label htmlFor="phone">Phone</label><input id="phone" name="phone" required /></div>
          <div className="space-y-2"><label htmlFor="college">Registered college</label>
            <select id="college" value={selectedCollegeId} onChange={(event) => setSelectedCollegeId(event.target.value)} required>
              {catalog.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}
            </select>
          </div>
          <div className="space-y-2"><label htmlFor="department">Department offering internship</label>
            <select id="department" required>
              {selectedCollege?.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </div>
          <div className="space-y-2"><label htmlFor="interest">Internship interest</label><input id="interest" name="interest" placeholder="UI/UX, Web Development, Data Analysis..." required /></div>
          <div className="space-y-2 md:col-span-2"><label htmlFor="note">Why should we consider you?</label><textarea id="note" rows={4} required /></div>
          {submitted ? <p className="md:col-span-2 rounded-[18px] bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">Application submitted. The selected college/department coordinator will contact you by email.</p> : null}
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="md:col-span-2">Submit application</Button>
        </form>
      </Card>
    </main>
  );
}
