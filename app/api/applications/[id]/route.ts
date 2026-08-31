import { getOwnedApplication } from '@/lib/server/application-data';
import { errorResponse } from '@/lib/server/errors';
import { getOwner } from '@/lib/server/session';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const owner = await getOwner(request);
    return Response.json(await getOwnedApplication(id, owner.ownerHash));
  } catch (error) {
    return errorResponse(error);
  }
}
