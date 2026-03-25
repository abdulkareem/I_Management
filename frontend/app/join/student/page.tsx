'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/api';

type College = { id: string; collegeName: string };
type Department = { id: string; name: string; collegeId: string };
type Course = { id: string; name: string; departmentId: string };

const programmes = ['BSc', 'BA', 'MSc'];

export default function StudentJoinPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [collegeId, setCollegeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  useEffect(() => {
    apiRequest<College[]>('/api/colleges')
      .then((response) => setColleges(response.data))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load colleges.'));
  }, []);

  useEffect(() => {
    if (!collegeId) {
      setDepartments([]);
      setDepartmentId('');
      return;
    }

    apiRequest<Department[]>(`/api/departments?collegeId=${encodeURIComponent(collegeId)}`)
      .then((response) => setDepartments(response.data))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load departments.'));
  }, [collegeId]);

  useEffect(() => {
    if (!departmentId) {
      setCourses([]);
      return;
    }

    apiRequest<Course[]>(`/api/courses?departmentId=${encodeURIComponent(departmentId)}`)
      .then((response) => setCourses(response.data))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load courses.'));
  }, [departmentId]);

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
      await apiRequest<{ success: boolean }>('/api/student/register', {
        method: 'POST',
        body: JSON.stringify({
          studentName: form.get('studentName'),
          email: form.get('email'),
          password: form.get('password'),
          universityRegNumber: form.get('universityRegNumber'),
          programme: form.get('programme'),
          collegeId: form.get('collegeId'),
          departmentId: form.get('departmentId'),
          courseId: form.get('courseId'),
        }),
      });
      router.push('/login');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create student account.');
    } finally {
      setLoading(false);
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
          <div className="space-y-2"><label htmlFor="studentName">Student Name</label><input id="studentName" name="studentName" required /></div>
          <div className="space-y-2"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
          <div className="space-y-2"><label htmlFor="universityRegNumber">University Reg Number</label><input id="universityRegNumber" name="universityRegNumber" required /></div>
          <div className="space-y-2">
            <label htmlFor="programme">Programme</label>
            <select id="programme" name="programme" required defaultValue="">
              <option value="" disabled>Select programme</option>
              {programmes.map((programme) => <option key={programme} value={programme}>{programme}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="collegeId">College</label>
            <select id="collegeId" name="collegeId" required value={collegeId} onChange={(event) => setCollegeId(event.target.value)}>
              <option value="" disabled>Select college</option>
              {colleges.map((college) => <option key={college.id} value={college.id}>{college.collegeName}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="departmentId">Department</label>
            <select
              id="departmentId"
              name="departmentId"
              required
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              disabled={!collegeId}
            >
              <option value="" disabled>Select department</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="courseId">Course</label>
            <select id="courseId" name="courseId" required disabled={!departmentId}>
              <option value="" disabled>Select course</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </select>
          </div>
          <div className="space-y-2"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required /></div>
          <div className="space-y-2"><label htmlFor="confirmPassword">Confirm Password</label><input id="confirmPassword" name="confirmPassword" type="password" required /></div>
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="md:col-span-2" disabled={loading}>{loading ? 'Creating account...' : 'Create student account'}</Button>
        </form>
      </Card>
    </main>
  );
}
