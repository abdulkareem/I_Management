'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DocumentsClient from './documents-client';

function PageClient() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('id') ?? '';
  return <DocumentsClient applicationId={applicationId} />;
}

export default function Page() {
  return <Suspense fallback={null}><PageClient /></Suspense>;
}
