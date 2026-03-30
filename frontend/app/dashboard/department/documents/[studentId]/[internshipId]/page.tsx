import DocumentsViewer from './viewer';

export default async function Page({ params }: { params: Promise<{ studentId: string; internshipId: string }> }) {
  const { studentId, internshipId } = await params;
  return <DocumentsViewer studentId={studentId} internshipId={internshipId} />;
}
