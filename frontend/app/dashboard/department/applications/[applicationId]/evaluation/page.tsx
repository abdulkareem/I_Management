import EvaluationClient from './evaluation-client';

type PageProps = {
  params: Promise<{ applicationId: string }>;
};


export default async function Page({ params }: PageProps) {
  const { applicationId } = await params;
  return <EvaluationClient applicationId={applicationId} />;
}

export function generateStaticParams() {
  return [];
}
