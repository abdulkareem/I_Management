'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { register } from '@/lib/auth';

export default function CollegeJoinPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState([{ name: '', coordinatorName: '', coordinatorEmail: '', coordinatorPassword: '', coordinatorPhone: '' }]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await register('COLLEGE', {
        collegeName: form.get('collegeName'),
        emblemUrl: form.get('emblem') || undefined,
        createdBy: {
          name: form.get('name'),
          email: form.get('email'),
          password: form.get('password'),
        },
        departments: departments.map((department) => ({
          name: department.name,
          coordinator: {
            name: department.coordinatorName,
            email: department.coordinatorEmail,
            password: department.coordinatorPassword,
            phone: department.coordinatorPhone,
          },
        })),
      });
      router.push('/login');
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
          <div className="space-y-2 md:col-span-2">
            <label>Departments + Coordinators</label>
            <div className="space-y-3">
              {departments.map((department, index) => (
                <div key={index} className="grid gap-2 rounded-[18px] border border-white/10 p-3 md:grid-cols-2">
                  <input placeholder="Department name" value={department.name} required onChange={(event) => setDepartments((prev) => prev.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} />
                  <input placeholder="Coordinator name" value={department.coordinatorName} required onChange={(event) => setDepartments((prev) => prev.map((item, i) => i === index ? { ...item, coordinatorName: event.target.value } : item))} />
                  <input type="email" placeholder="Coordinator email" value={department.coordinatorEmail} required onChange={(event) => setDepartments((prev) => prev.map((item, i) => i === index ? { ...item, coordinatorEmail: event.target.value } : item))} />
                  <input type="password" placeholder="Coordinator password" value={department.coordinatorPassword} required onChange={(event) => setDepartments((prev) => prev.map((item, i) => i === index ? { ...item, coordinatorPassword: event.target.value } : item))} />
                  <input className="md:col-span-2" placeholder="Coordinator phone" value={department.coordinatorPhone} required onChange={(event) => setDepartments((prev) => prev.map((item, i) => i === index ? { ...item, coordinatorPhone: event.target.value } : item))} />
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={() => setDepartments((prev) => [...prev, { name: '', coordinatorName: '', coordinatorEmail: '', coordinatorPassword: '', coordinatorPhone: '' }])}>Add More Department</Button>
            </div>
          </div>
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="md:col-span-2">Create college workspace</Button>
        </form>
      </Card>
    </main>
  );
}
