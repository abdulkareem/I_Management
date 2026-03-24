'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { register } from '@/lib/auth';

export default function CollegeJoinPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState([{ name: '', coordinatorName: '', coordinatorEmail: '', coordinatorPhone: '' }]);
  const [embelmBinary, setEmbelmBinary] = useState<string | undefined>();

  async function handleEmbelmUpload(file: File | null) {
    if (!file) {
      setEmbelmBinary(undefined);
      return;
    }

    if (file.size < 10 * 1024 || file.size > 200 * 1024) {
      setError('Embelm image size must be between 10 KB and 200 KB.');
      return;
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error('Unable to read embelm image.'));
          return;
        }
        const [, data] = result.split(',');
        resolve(data ?? '');
      };
      reader.onerror = () => reject(new Error('Unable to read embelm image.'));
      reader.readAsDataURL(file);
    });
    setError(null);
    setEmbelmBinary(base64);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await register('COLLEGE', {
        collegeName: form.get('collegeName'),
        emblemBinary: embelmBinary,
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
          <div className="space-y-2">
            <label htmlFor="embelm">Embelm</label>
            <input
              id="embelm"
              name="embelm"
              type="file"
              accept="image/*"
              onChange={(event) => handleEmbelmUpload(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-slate-400">Upload image from 10 KB to 200 KB. It will be saved in the database.</p>
          </div>
          <Card className="space-y-2 rounded-[24px] p-4 md:col-span-2">
            <label className="text-sm uppercase tracking-[0.2em] text-cyan-200">Add Department</label>
            <p className="text-sm text-slate-300">
              Departments + Coordinators (coordinator password is automatically generated and sent to the coordinator email).
            </p>
            <div className="space-y-3">
              {departments.map((department, index) => (
                <div key={index} className="grid gap-2 rounded-[18px] border border-white/10 p-3 md:grid-cols-2">
                  <input placeholder="Department name" value={department.name} required onChange={(event) => setDepartments((prev) => prev.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} />
                  <input placeholder="Coordinator name" value={department.coordinatorName} required onChange={(event) => setDepartments((prev) => prev.map((item, i) => i === index ? { ...item, coordinatorName: event.target.value } : item))} />
                  <input type="email" placeholder="Coordinator email" value={department.coordinatorEmail} required onChange={(event) => setDepartments((prev) => prev.map((item, i) => i === index ? { ...item, coordinatorEmail: event.target.value } : item))} />
                  <input className="md:col-span-2" placeholder="Coordinator phone" value={department.coordinatorPhone} required onChange={(event) => setDepartments((prev) => prev.map((item, i) => i === index ? { ...item, coordinatorPhone: event.target.value } : item))} />
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={() => setDepartments((prev) => [...prev, { name: '', coordinatorName: '', coordinatorEmail: '', coordinatorPhone: '' }])}>Add More Department</Button>
            </div>
          </Card>
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="md:col-span-2">Create college workspace</Button>
        </form>
      </Card>
    </main>
  );
}
