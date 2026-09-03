import { getDb } from '@/db';
import { ensureDatabase } from '@/db/init';
import { applications, documents } from '@/db/schema';
import { documentFromForm } from '@/lib/documents';
import { AppError, errorResponse } from '@/lib/server/errors';
import { getLatestOwnedApplication } from '@/lib/server/application-data';
import { getOwner, withOwnerCookie } from '@/lib/server/session';
import { runApplicationAnalysis } from '@/lib/server/run-application-analysis';

export async function GET(request: Request) {
  try {
    const owner = await getOwner(request);
    const application = await getLatestOwnedApplication(owner.ownerHash);
    return withOwnerCookie(Response.json({ application }), owner.token, owner.isNew);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let owner: Awaited<ReturnType<typeof getOwner>> | null = null;
  let applicationId: string | null = null;
  try {
    const form = await request.formData().catch(() => { throw new AppError(400, 'Submit documents as form data.', 'INVALID_FORM'); });
    const [jd, resume] = await Promise.all([documentFromForm(form, 'jd'), documentFromForm(form, 'resume')]);
    owner = await getOwner(request);
    await ensureDatabase();
    const db = getDb();
    const now = Date.now();
    applicationId = crypto.randomUUID();
    await db.insert(applications).values({ id: applicationId, ownerHash: owner.ownerHash, status: 'ROLE_ANALYSIS', createdAt: now, updatedAt: now });
    await db.insert(documents).values([
      { id: crypto.randomUUID(), applicationId, kind: 'job_description', sourceType: jd.sourceType, originalName: jd.originalName, mimeType: jd.mimeType, charCount: jd.text.length, normalizedText: jd.text, createdAt: now },
      { id: crypto.randomUUID(), applicationId, kind: 'resume', sourceType: resume.sourceType, originalName: resume.originalName, mimeType: resume.mimeType, charCount: resume.text.length, normalizedText: resume.text, createdAt: now },
    ]);
    const { role, candidate, jobFit } = await runApplicationAnalysis(applicationId);
    return withOwnerCookie(Response.json({ applicationId, role, candidate, jobFit }, { status: 201 }), owner.token, owner.isNew);
  } catch (error) {
    if (owner && applicationId && error instanceof AppError && [429, 502, 503].includes(error.status)) {
      return withOwnerCookie(Response.json({ applicationId, error: error.message, code: error.code, retryable: true }, { status: error.status }), owner.token, owner.isNew);
    }
    return errorResponse(error);
  }
}
