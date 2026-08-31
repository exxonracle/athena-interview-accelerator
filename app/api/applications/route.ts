import { getDb } from '@/db';
import { eq } from 'drizzle-orm';
import { ensureDatabase } from '@/db/init';
import { analyses, applications, documents } from '@/db/schema';
import { analyseCandidate } from '@/lib/ai/analyse-candidate';
import { analyseRole } from '@/lib/ai/analyse-role';
import { documentFromForm } from '@/lib/documents';
import { calculateJobFit } from '@/lib/scoring';
import { AppError, errorResponse } from '@/lib/server/errors';
import { getLatestOwnedApplication } from '@/lib/server/application-data';
import { getOwner, withOwnerCookie } from '@/lib/server/session';

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
  try {
    const form = await request.formData().catch(() => { throw new AppError(400, 'Submit documents as form data.', 'INVALID_FORM'); });
    const [jd, resume] = await Promise.all([documentFromForm(form, 'jd'), documentFromForm(form, 'resume')]);
    const owner = await getOwner(request);
    await ensureDatabase();
    const db = getDb();
    const now = Date.now();
    const applicationId = crypto.randomUUID();
    await db.insert(applications).values({ id: applicationId, ownerHash: owner.ownerHash, status: 'ROLE_ANALYSIS', createdAt: now, updatedAt: now });
    await db.insert(documents).values([
      { id: crypto.randomUUID(), applicationId, kind: 'job_description', sourceType: jd.sourceType, originalName: jd.originalName, mimeType: jd.mimeType, charCount: jd.text.length, normalizedText: jd.text, createdAt: now },
      { id: crypto.randomUUID(), applicationId, kind: 'resume', sourceType: resume.sourceType, originalName: resume.originalName, mimeType: resume.mimeType, charCount: resume.text.length, normalizedText: resume.text, createdAt: now },
    ]);
    const role = await analyseRole(jd.text);
    await db.update(applications).set({ status: 'CANDIDATE_ANALYSIS', roleTitle: role.roleTitle, updatedAt: Date.now() }).where(eq(applications.id, applicationId));
    const candidate = await analyseCandidate(resume.text, jd.text, role);
    const jobFit = calculateJobFit(candidate);
    await db.insert(analyses).values({
      id: crypto.randomUUID(), applicationId, roleJson: JSON.stringify(role), candidateJson: JSON.stringify(candidate), jobFitJson: JSON.stringify(jobFit), createdAt: now, updatedAt: Date.now(),
    });
    await db.update(applications).set({ status: 'READY', candidateName: candidate.candidateName, updatedAt: Date.now() }).where(eq(applications.id, applicationId));
    return withOwnerCookie(Response.json({ applicationId, role, candidate, jobFit }, { status: 201 }), owner.token, owner.isNew);
  } catch (error) {
    return errorResponse(error);
  }
}
