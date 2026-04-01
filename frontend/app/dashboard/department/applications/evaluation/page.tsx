'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EvaluationClient from './evaluation-client';

function PageClient() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('id') ?? '';
  return <EvaluationClient applicationId={applicationId} />;
}

export default function Page() {
  return <Suspense fallback={null}><PageClient /></Suspense>;
}
