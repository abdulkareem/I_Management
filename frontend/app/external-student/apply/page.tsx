'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

type PublicInternship = {
  id: string;
  title: string;
  description: string;
  departmentId: string;
  departmentName: string;
  collegeId: string;
  collegeName: string;
};

export default function ExternalStudentApplyPage() {
  const [internships, setInternships] = useState<PublicInternship[]>([]);
  const [selectedInternshipId, setSelectedInternshipId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<PublicInternship[]>('/internships/public')
      .then((response) => {
        setInternships(response.data);
        setSelectedInternshipId(response.data[0]?.id ?? '');
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load internships.'));
  }, []);

  const selectedInternship = useMemo(
    () => internships.find((internship) => internship.id === selectedInternshipId),
    [internships, selectedInternshipId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(false);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      await apiRequest('/apply', {
        method: 'POST',
        body: JSON.stringify({
          studentName: form.get('name'),
          email: form.get('email'),
          phone: form.get('phone'),
          internshipId: form.get('internshipId'),
        }),
      });
      setSubmitted(true);
      event.currentTarget.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to submit application.');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full rounded-[32px] p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-white">External Student Internship Application</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">Apply to department-created internship projects.</p>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2"><label htmlFor="name">Full name</label><input id="name" name="name" required /></div>
          <div className="space-y-2"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
          <div className="space-y-2"><label htmlFor="phone">Phone</label><input id="phone" name="phone" required /></div>
          <div className="space-y-2">
            <label htmlFor="internshipId">Internship Interest</label>
            <select id="internshipId" name="internshipId" value={selectedInternshipId} onChange={(event) => setSelectedInternshipId(event.target.value)} required>
              {internships.map((internship) => (
                <option key={internship.id} value={internship.id}>{internship.title} — {internship.departmentName}</option>
              ))}
            </select>
          </div>
          {selectedInternship ? (
            <p className="md:col-span-2 text-sm text-slate-300">
              {selectedInternship.collegeName} / {selectedInternship.departmentName}: {selectedInternship.description}
            </p>
          ) : null}
          {submitted ? <p className="md:col-span-2 rounded-[18px] bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">Application submitted successfully.</p> : null}
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="md:col-span-2">Submit application</Button>
        </form>
      </Card>
    </main>
  );
}
