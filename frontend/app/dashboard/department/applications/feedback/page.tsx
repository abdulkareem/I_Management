'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import FeedbackClient from './feedback-client';

function PageClient() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('id') ?? '';
  return <FeedbackClient applicationId={applicationId} />;
}

export default function Page() {
  return <Suspense fallback={null}><PageClient /></Suspense>;
}
