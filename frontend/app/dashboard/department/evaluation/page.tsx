'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EvaluationEntry from './viewer';

function PageClient() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId') ?? '';
  const internshipId = searchParams.get('internshipId') ?? '';
  return <EvaluationEntry studentId={studentId} internshipId={internshipId} />;
}

export default function Page() {
  return <Suspense fallback={null}><PageClient /></Suspense>;
}
