import EvaluationEntry from './viewer';

type PageProps = {
  params: Promise<{ studentId: string; internshipId: string }>;
};

export function generateStaticParams() {
  return [{ studentId: 'placeholder', internshipId: 'placeholder' }];
}

export default async function Page({ params }: PageProps) {
  const { studentId, internshipId } = await params;
  return <EvaluationEntry studentId={studentId} internshipId={internshipId} />;
}
