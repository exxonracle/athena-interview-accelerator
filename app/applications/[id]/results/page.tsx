import { ResultsDashboard } from '@/components/results-dashboard';

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultsDashboard applicationId={id} />;
}
