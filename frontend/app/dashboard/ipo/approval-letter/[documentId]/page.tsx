'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { fetchWithSession } from '@/lib/auth';

export default function ApprovalLetterPreviewPage() {
  const params = useParams<{ documentId: string }>();
  const [html, setHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.documentId) return;
    fetchWithSession<{ html: string }>(`/api/documents/${params.documentId}/preview`)
      .then((res) => setHtml(res.data?.html ?? ''))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to preview approval letter.'));
  }, [params.documentId]);

  if (error) {
    return <Card className="m-6 rounded-[24px] p-4 text-rose-800">{error}</Card>;
  }

  if (!html) {
    return <Card className="m-6 rounded-[24px] p-4">Loading approval letter preview...</Card>;
  }

  return <iframe title="Approval Letter Preview" className="h-screen w-full" srcDoc={html} />;
}
