import ApprovalLetterClient from './approval-letter-client';

type PageProps = {
  params: Promise<{ documentId: string }>;
};

export default async function ApprovalLetterPreviewPage({ params }: PageProps) {
  const { documentId } = await params;
  return <ApprovalLetterClient documentId={documentId} />;
}

export function generateStaticParams() {
  return [];
}
