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
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [selectedInternshipId, setSelectedInternshipId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<PublicInternship[]>('/internships/public')
      .then((response) => {
        setInternships(response.data);
        setSelectedCollegeId(response.data[0]?.collegeId ?? '');
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load internships.'));
  }, []);

  const colleges = useMemo(() => Array.from(new Map(internships.map((i) => [i.collegeId, i.collegeName])).entries()).map(([id, name]) => ({ id, name })), [internships]);
  const filteredInternships = useMemo(() => internships.filter((internship) => internship.collegeId === selectedCollegeId), [internships, selectedCollegeId]);

  useEffect(() => {
    setSelectedInternshipId(filteredInternships[0]?.id ?? '');
  }, [selectedCollegeId, filteredInternships]);

  const selectedInternship = useMemo(() => internships.find((internship) => internship.id === selectedInternshipId), [internships, selectedInternshipId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(false);
    setError(null);
    const form = new FormData(event.currentTarget);

    if (form.get('password') !== form.get('confirmPassword')) {
      setError('Password and confirm password must match.');
      return;
    }

    try {
      await apiRequest('/external/apply', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.get('fullName'),
          email: form.get('email'),
          phone: form.get('phone'),
          whatsapp: form.get('whatsapp'),
          college: colleges.find((college) => college.id === String(form.get('collegeName')))?.name ?? '',
          university: form.get('university'),
          regNumber: form.get('regNumber'),
          department: form.get('department'),
          internshipId: form.get('internshipId'),
          password: form.get('password'),
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
        <h1 className="text-3xl font-semibold text-slate-900">External Student Application</h1>
        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2"><label htmlFor="fullName">Full Name</label><input id="fullName" name="fullName" required /></div>
          <div className="space-y-2"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
          <div className="space-y-2"><label htmlFor="phone">Phone</label><input id="phone" name="phone" required /></div>
          <div className="space-y-2"><label htmlFor="whatsapp">WhatsApp</label><input id="whatsapp" name="whatsapp" required /></div>
          <div className="space-y-2">
            <label htmlFor="collegeName">College</label>
            <select id="collegeName" name="collegeName" value={selectedCollegeId} onChange={(event) => setSelectedCollegeId(event.target.value)} required>
              {colleges.map((college) => <option key={college.id} value={college.id}>{college.name}</option>)}
            </select>
          </div>
          <div className="space-y-2"><label htmlFor="university">University</label><input id="university" name="university" required /></div>
          <div className="space-y-2"><label htmlFor="regNumber">Registration Number</label><input id="regNumber" name="regNumber" required /></div>
          <div className="space-y-2"><label htmlFor="department">Department</label><input id="department" name="department" required /></div>
          <div className="space-y-2">
            <label htmlFor="internshipId">Internship</label>
            <select id="internshipId" name="internshipId" value={selectedInternshipId} onChange={(event) => setSelectedInternshipId(event.target.value)} required>
              {filteredInternships.map((internship) => (
                <option key={internship.id} value={internship.id}>{internship.title} — {internship.departmentName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2"><label htmlFor="password">Password</label><input id="password" name="password" type="password" minLength={8} required /></div>
          <div className="space-y-2"><label htmlFor="confirmPassword">Confirm Password</label><input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required /></div>
          {selectedInternship ? <p className="md:col-span-2 text-sm text-slate-600">{selectedInternship.description}</p> : null}
          {submitted ? <p className="md:col-span-2 rounded-[18px] bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">Application submitted successfully.</p> : null}
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="md:col-span-2">Submit application</Button>
        </form>
      </Card>
    </main>
  );
}
