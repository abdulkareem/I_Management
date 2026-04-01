import FeedbackClient from './feedback-client';

type PageProps = {
  params: Promise<{ applicationId: string }>;
};


export default async function Page({ params }: PageProps) {
  const { applicationId } = await params;
  return <FeedbackClient applicationId={applicationId} />;
}

export function generateStaticParams() {
  return [];
}
