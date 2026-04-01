'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ApprovalLetterClient from './approval-letter-client';

function PageClient() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get('id') ?? '';
  return <ApprovalLetterClient documentId={documentId} />;
}

export default function ApprovalLetterPreviewPage() {
  return <Suspense fallback={null}><PageClient /></Suspense>;
}
