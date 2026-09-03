import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { analyses, applications, documents } from '@/db/schema';
import { analyseCandidate } from '@/lib/ai/analyse-candidate';
import { analyseRole } from '@/lib/ai/analyse-role';
import { calculateJobFit } from '@/lib/scoring';
import { AppError } from './errors';

/** Reuses persisted source documents so a recoverable AI failure never requires another upload. */
export async function runApplicationAnalysis(applicationId: string) {
  const db = getDb();
  const docs = await db.select().from(documents).where(eq(documents.applicationId, applicationId));
  const jd = docs.find((doc) => doc.kind === 'job_description')?.normalizedText;
  const resume = docs.find((doc) => doc.kind === 'resume')?.normalizedText;
  if (!jd || !resume) throw new AppError(409, 'Athena cannot retry because the source documents are unavailable.', 'DOCUMENTS_UNAVAILABLE');

  await db.update(applications).set({ status: 'ROLE_ANALYSIS', updatedAt: Date.now() }).where(eq(applications.id, applicationId));
  const role = await analyseRole(jd);
  await db.update(applications).set({ status: 'CANDIDATE_ANALYSIS', roleTitle: role.roleTitle, updatedAt: Date.now() }).where(eq(applications.id, applicationId));
  const candidate = await analyseCandidate(resume, jd, role);
  const jobFit = calculateJobFit(candidate);
  const now = Date.now();
  const [existing] = await db.select({ id: analyses.id }).from(analyses).where(eq(analyses.applicationId, applicationId)).limit(1);
  const values = { roleJson: JSON.stringify(role), candidateJson: JSON.stringify(candidate), jobFitJson: JSON.stringify(jobFit), updatedAt: now };
  if (existing) await db.update(analyses).set(values).where(eq(analyses.id, existing.id));
  else await db.insert(analyses).values({ id: crypto.randomUUID(), applicationId, ...values, createdAt: now });
  await db.update(applications).set({ status: 'READY', candidateName: candidate.candidateName, updatedAt: now }).where(eq(applications.id, applicationId));
  return { role, candidate, jobFit };
}
