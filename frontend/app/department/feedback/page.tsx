'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import FeedbackViewer from '@/app/dashboard/department/feedback/viewer';

function PageClient() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId') ?? '';
  const internshipId = searchParams.get('internshipId') ?? '';
  return <FeedbackViewer studentId={studentId} internshipId={internshipId} />;
}

export default function Page() {
  return <Suspense fallback={null}><PageClient /></Suspense>;
}
