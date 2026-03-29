import DocumentsClient from './documents-client';

type PageProps = {
  params: Promise<{ applicationId: string }>;
};

export function generateStaticParams() {
  return [{ applicationId: 'placeholder' }];
}

export default async function Page({ params }: PageProps) {
  const { applicationId } = await params;
  return <DocumentsClient applicationId={applicationId} />;
}
