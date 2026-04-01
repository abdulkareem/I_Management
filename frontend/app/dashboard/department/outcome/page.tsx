'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import OutcomeViewer from './viewer';

function PageClient() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId') ?? '';
  const internshipId = searchParams.get('internshipId') ?? '';
  return <OutcomeViewer studentId={studentId} internshipId={internshipId} />;
}

export default function Page() {
  return <Suspense fallback={null}><PageClient /></Suspense>;
}
