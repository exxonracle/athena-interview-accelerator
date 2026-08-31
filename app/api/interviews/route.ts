import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { ensureDatabase } from '@/db/init';
import { applications, interviewQuestions, interviewSessions } from '@/db/schema';
import { generateQuestion } from '@/lib/ai/generate-question';
import type { InterviewLevel } from '@/lib/ai/schemas';
import { getOwnedApplication } from '@/lib/server/application-data';
import { AppError, errorResponse } from '@/lib/server/errors';
import { getOwner } from '@/lib/server/session';

export async function POST(request: Request) {
  try {
    const { applicationId } = await request.json() as { applicationId?: string };
    if (!applicationId) throw new AppError(400, 'Application ID is required.');
    const owner = await getOwner(request);
    const data = await getOwnedApplication(applicationId, owner.ownerHash);
    if (!data.analysis) throw new AppError(409, 'Complete role and candidate analysis before starting the interview.');
    if (data.interview) return Response.json({ sessionId: data.interview.id, resumed: true });
    const jd = data.documents.job_description?.normalizedText;
    const resume = data.documents.resume?.normalizedText;
    if (!jd || !resume) throw new AppError(409, 'The source documents are unavailable.');
    const level: InterviewLevel = 'SCREENING';
    const difficulty = 1;
    const generated = await generateQuestion({ jobDescription: jd, resume, role: data.analysis.role, candidate: data.analysis.candidate, fit: data.analysis.jobFit, level, difficulty, coverage: [], history: [] });
    await ensureDatabase();
    const db = getDb();
    const now = Date.now();
    const sessionId = crypto.randomUUID();
    await db.insert(interviewSessions).values({ id: sessionId, applicationId, state: 'SCREENING', currentLevel: level, difficulty, coverageJson: '[]', questionCount: 1, startedAt: now, updatedAt: now });
    await db.insert(interviewQuestions).values({
      id: crypto.randomUUID(), sessionId, sequence: 1, level, difficulty, question: generated.question,
      competencyKeysJson: JSON.stringify(generated.competencyKeys), primaryTopic: generated.primaryTopic, intent: generated.intent,
      expectedEvidenceJson: JSON.stringify(generated.expectedEvidence), isFollowUp: generated.isFollowUp, createdAt: now,
    });
    await db.update(applications).set({ status: 'SCREENING', updatedAt: now }).where(eq(applications.id, applicationId));
    return Response.json({ sessionId, question: generated }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
