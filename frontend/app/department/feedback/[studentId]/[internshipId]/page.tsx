import FeedbackViewer from '@/app/dashboard/department/feedback/[studentId]/[internshipId]/viewer';

type PageProps = {
  params: Promise<{ studentId: string; internshipId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { studentId, internshipId } = await params;
  return <FeedbackViewer studentId={studentId} internshipId={internshipId} />;
}
