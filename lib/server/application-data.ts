import { and, asc, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { analyses, answerEvaluations, applications, documents, interviewAnswers, interviewQuestions, interviewReports, interviewSessions } from '@/db/schema';
import { ensureDatabase } from '@/db/init';
import type { AnswerEvaluation, CandidateAnalysis, JobFit, RoleAnalysis } from '@/lib/ai/schemas';
import { AppError } from './errors';

export async function getOwnedApplication(id: string, ownerHash: string) {
  await ensureDatabase();
  const db = getDb();
  const [application] = await db.select().from(applications).where(and(eq(applications.id, id), eq(applications.ownerHash, ownerHash))).limit(1);
  if (!application) throw new AppError(404, 'This Athena application was not found.', 'NOT_FOUND');
  const docs = await db.select().from(documents).where(eq(documents.applicationId, id));
  const [analysis] = await db.select().from(analyses).where(eq(analyses.applicationId, id)).limit(1);
  const [session] = await db.select().from(interviewSessions).where(eq(interviewSessions.applicationId, id)).limit(1);
  let questions: Array<Record<string, unknown>> = [];
  let report: Record<string, unknown> | null = null;
  if (session) {
    const rows = await db.select({ question: interviewQuestions, answer: interviewAnswers, evaluation: answerEvaluations })
      .from(interviewQuestions)
      .leftJoin(interviewAnswers, eq(interviewAnswers.questionId, interviewQuestions.id))
      .leftJoin(answerEvaluations, eq(answerEvaluations.answerId, interviewAnswers.id))
      .where(eq(interviewQuestions.sessionId, session.id))
      .orderBy(asc(interviewQuestions.sequence));
    questions = rows.map((row) => ({
      ...row.question,
      competencyKeys: JSON.parse(row.question.competencyKeysJson),
      expectedEvidence: JSON.parse(row.question.expectedEvidenceJson),
      answer: row.answer,
      evaluation: row.evaluation ? JSON.parse(row.evaluation.evaluationJson) as AnswerEvaluation : null,
    }));
    const [storedReport] = await db.select().from(interviewReports).where(eq(interviewReports.sessionId, session.id)).limit(1);
    if (storedReport) report = { ...storedReport, competencies: JSON.parse(storedReport.competencyJson), narrative: JSON.parse(storedReport.narrativeJson) };
  }
  return {
    application,
    documents: Object.fromEntries(docs.map((doc) => [doc.kind, doc])),
    analysis: analysis ? {
      role: JSON.parse(analysis.roleJson) as RoleAnalysis,
      candidate: JSON.parse(analysis.candidateJson) as CandidateAnalysis,
      jobFit: JSON.parse(analysis.jobFitJson) as JobFit,
    } : null,
    interview: session ? { ...session, coverage: JSON.parse(session.coverageJson), questions } : null,
    report,
  };
}

export async function getLatestOwnedApplication(ownerHash: string) {
  await ensureDatabase();
  const [application] = await getDb().select().from(applications).where(eq(applications.ownerHash, ownerHash)).orderBy(desc(applications.updatedAt)).limit(1);
  return application ?? null;
}
