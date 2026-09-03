import { getOwnedApplication } from '@/lib/server/application-data';
import { AppError, errorResponse } from '@/lib/server/errors';
import { getOwner } from '@/lib/server/session';
import { runApplicationAnalysis } from '@/lib/server/run-application-analysis';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const owner = await getOwner(request);
    const data = await getOwnedApplication(id, owner.ownerHash);
    if (data.analysis || data.interview) throw new AppError(409, 'This application has already finished analysis.', 'ANALYSIS_ALREADY_COMPLETE');
    const { role, candidate, jobFit } = await runApplicationAnalysis(id);
    return Response.json({ applicationId: id, role, candidate, jobFit });
  } catch (error) {
    return errorResponse(error);
  }
}
