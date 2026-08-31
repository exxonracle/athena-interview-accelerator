import { InterviewRoom } from '@/components/interview-room';

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InterviewRoom applicationId={id} />;
}
