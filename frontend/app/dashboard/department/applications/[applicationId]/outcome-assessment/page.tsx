import OutcomeAssessmentClient from './outcome-assessment-client';

type PageProps = {
  params: Promise<{ applicationId: string }>;
};


export default async function Page({ params }: PageProps) {
  const { applicationId } = await params;
  return <OutcomeAssessmentClient applicationId={applicationId} />;
}

export function generateStaticParams() {
  return [];
}
