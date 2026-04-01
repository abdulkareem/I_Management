'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import OutcomeAssessmentClient from './outcome-assessment-client';

function PageClient() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('id') ?? '';
  return <OutcomeAssessmentClient applicationId={applicationId} />;
}

export default function Page() {
  return <Suspense fallback={null}><PageClient /></Suspense>;
}
