import FeedbackViewer from './viewer';

export default async function Page({ params }: { params: Promise<{ studentId: string; internshipId: string }> }) {
  const { studentId, internshipId } = await params;
  return <FeedbackViewer studentId={studentId} internshipId={internshipId} />;
}
