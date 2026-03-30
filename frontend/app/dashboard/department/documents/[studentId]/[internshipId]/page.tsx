import DocumentsViewer from './viewer';

type PageProps = {
  params: Promise<{ studentId: string; internshipId: string }>;
};

export function generateStaticParams() {
  return [{ studentId: 'placeholder', internshipId: 'placeholder' }];
}

export default async function Page({ params }: PageProps) {
  const { studentId, internshipId } = await params;
  return <DocumentsViewer studentId={studentId} internshipId={internshipId} />;
}
