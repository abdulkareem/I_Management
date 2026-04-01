'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import IpoFeedbackFormPage from './feedback-client';

function PageClient() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('id') ?? '';
  return <IpoFeedbackFormPage applicationId={applicationId} />;
}

export default function Page() {
  return <Suspense fallback={null}><PageClient /></Suspense>;
}
