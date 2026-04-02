'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/api';
import { loginWithPassword } from '@/lib/auth';

type College = { id: string; collegeName: string };
type Department = { id: string; name: string; collegeId: string };
type Program = { id: string; name: string; departmentId: string };
const OTHER_COLLEGE_VALUE = '__college_not_in_list__';

export default function StudentJoinPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [collegeId, setCollegeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [programId, setProgramId] = useState('');
  const [customCollegeName, setCustomCollegeName] = useState('');
  const [customDepartmentName, setCustomDepartmentName] = useState('');
  const [customProgramName, setCustomProgramName] = useState('');
  const [sex, setSex] = useState<'MALE' | 'FEMALE'>('MALE');
  const isCollegeNotInList = collegeId === OTHER_COLLEGE_VALUE;

  useEffect(() => {
    apiRequest<College[]>('/api/colleges')
      .then((response) => setColleges(response.data))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load colleges.'));
  }, []);

  useEffect(() => {
    if (!collegeId) {
      setDepartments([]);
      setDepartmentId('');
      setProgramId('');
      setPrograms([]);
      return;
    }
    if (collegeId === OTHER_COLLEGE_VALUE) {
      setDepartments([]);
      setDepartmentId('');
      setProgramId('');
      setPrograms([]);
      return;
    }

    apiRequest<Department[]>(`/api/departments?collegeId=${encodeURIComponent(collegeId)}`)
      .then((response) => setDepartments(response.data))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load departments.'));
  }, [collegeId]);

  useEffect(() => {
    if (!isCollegeNotInList) {
      setCustomCollegeName('');
      setCustomDepartmentName('');
      setCustomProgramName('');
    }
  }, [isCollegeNotInList]);

  useEffect(() => {
    if (!departmentId) {
      setPrograms([]);
      setProgramId('');
      return;
    }

    apiRequest<Program[]>(`/api/programs?departmentId=${encodeURIComponent(departmentId)}`)
      .then((response) => setPrograms(response.data))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load programmes.'));
  }, [departmentId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const getField = (key: string) => String(form.get(key) ?? '').trim();
    if (form.get('password') !== form.get('confirmPassword')) {
      setError('Password and confirm password must match.');
      setLoading(false);
      return;
    }

    try {
      const studentName = getField('studentName');
      const email = getField('email');
      const password = getField('password');
      const universityRegNumber = getField('universityRegNumber');
      const selectedCollegeId = getField('collegeId');
      const selectedDepartmentId = getField('departmentId');
      const selectedProgramId = getField('programId');
      const enteredCustomCollegeName = getField('customCollegeName');
      const enteredCustomDepartmentName = getField('customDepartmentName');
      const enteredCustomProgramName = getField('customProgramName');

      await apiRequest<{ success: boolean }>('/api/student/register', {
        method: 'POST',
        body: JSON.stringify({
          name: studentName,
          studentName,
          email,
          password,
          universityRegNumber,
          collegeId: isCollegeNotInList ? null : selectedCollegeId || null,
          departmentId: isCollegeNotInList ? null : selectedDepartmentId || null,
          programId: isCollegeNotInList ? null : selectedProgramId || null,
          customCollegeName: isCollegeNotInList ? enteredCustomCollegeName || null : null,
          customDepartmentName: isCollegeNotInList ? enteredCustomDepartmentName || null : null,
          customProgramName: isCollegeNotInList ? enteredCustomProgramName || null : null,
          sex,
        }),
      });
      await loginWithPassword(email, password);
      router.push('/dashboard/student');
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
            <label htmlFor="sex">Sex</label>
            <select id="sex" name="sex" value={sex} onChange={(event) => setSex(event.target.value as 'MALE' | 'FEMALE')} required>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="collegeId">Your College</label>
            <select id="collegeId" name="collegeId" required value={collegeId} onChange={(event) => setCollegeId(event.target.value)}>
              <option value="" disabled>Select college</option>
              {colleges.map((college) => <option key={college.id} value={college.id}>{college.collegeName}</option>)}
              <option value={OTHER_COLLEGE_VALUE}>My college is not in the list</option>
            </select>
          </div>
          {isCollegeNotInList ? (
            <>
              <div className="space-y-2">
                <label htmlFor="customCollegeName">College Name</label>
                <input
                  id="customCollegeName"
                  name="customCollegeName"
                  required
                  value={customCollegeName}
                  onChange={(event) => setCustomCollegeName(event.target.value)}
                  placeholder="Enter your college name"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="customDepartmentName">Department</label>
                <input
                  id="customDepartmentName"
                  name="customDepartmentName"
                  required
                  value={customDepartmentName}
                  onChange={(event) => setCustomDepartmentName(event.target.value)}
                  placeholder="Enter your department"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="customProgramName">Programme</label>
                <input
                  id="customProgramName"
                  name="customProgramName"
                  required
                  value={customProgramName}
                  onChange={(event) => setCustomProgramName(event.target.value)}
                  placeholder="Enter your programme"
                />
              </div>
            </>
          ) : (
            <>
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
                <label htmlFor="programId">Programme</label>
                <select id="programId" name="programId" required value={programId} onChange={(event) => setProgramId(event.target.value)} disabled={!departmentId}>
                  <option value="" disabled>Select programme</option>
                  {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="space-y-2"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required /></div>
          <div className="space-y-2"><label htmlFor="confirmPassword">Confirm Password</label><input id="confirmPassword" name="confirmPassword" type="password" required /></div>
          {error ? <p className="md:col-span-2 rounded-[18px] bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <Button className="md:col-span-2" disabled={loading}>{loading ? 'Creating account...' : 'Create student account'}</Button>
        </form>
      </Card>
    </main>
  );
}
