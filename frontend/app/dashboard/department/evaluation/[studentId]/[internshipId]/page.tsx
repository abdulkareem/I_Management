import EvaluationEntry from './viewer';

export default async function Page({ params }: { params: Promise<{ studentId: string; internshipId: string }> }) {
  const { studentId, internshipId } = await params;
  return <EvaluationEntry studentId={studentId} internshipId={internshipId} />;
}
