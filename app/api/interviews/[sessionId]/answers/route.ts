import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { ensureDatabase } from '@/db/init';
import { analyses, answerEvaluations, applications, documents, interviewAnswers, interviewQuestions, interviewReports, interviewSessions } from '@/db/schema';
import { evaluateAnswer, evaluateAnswerAndGenerateQuestion } from '@/lib/ai/evaluate-answer';
import { generateReportNarrative } from '@/lib/ai/generate-report';
import type { AnswerEvaluation, CandidateAnalysis, InterviewLevel, JobFit, RoleAnalysis } from '@/lib/ai/schemas';
import { adjustDifficulty, nextLevel, shouldAdvanceLevel } from '@/lib/interview/state-machine';
import { calculateInterviewScores, calculateReadiness } from '@/lib/scoring';
import { AppError, errorResponse } from '@/lib/server/errors';
import { getOwner } from '@/lib/server/session';

const bodySchema = z.object({
  questionId: z.string().min(1),
  transcript: z.string().trim().min(1).max(12_000),
  clientSubmissionId: z.string().min(8).max(100),
  inputMode: z.enum(['voice', 'typed']),
  durationMs: z.number().int().min(0).max(900_000).nullable().optional(),
});

const fillers = /\b(um+|uh+|like|you know|sort of|kind of|basically|actually)\b/gi;
const composite = (evaluation: AnswerEvaluation) => Math.round((evaluation.relevance + evaluation.correctness + evaluation.technicalDepth + evaluation.reasoning + evaluation.clarity + evaluation.completeness) / 6);

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await context.params;
    const body = bodySchema.parse(await request.json());
    const owner = await getOwner(request);
    await ensureDatabase();
    const db = getDb();
    const [sessionRow] = await db.select({ session: interviewSessions, application: applications })
      .from(interviewSessions).innerJoin(applications, eq(applications.id, interviewSessions.applicationId))
      .where(and(eq(interviewSessions.id, sessionId), eq(applications.ownerHash, owner.ownerHash))).limit(1);
    if (!sessionRow) throw new AppError(404, 'This interview session was not found.');
    if (sessionRow.session.state === 'COMPLETED') return Response.json({ completed: true, applicationId: sessionRow.application.id });
    const [duplicate] = await db.select().from(interviewAnswers).where(eq(interviewAnswers.clientSubmissionId, body.clientSubmissionId)).limit(1);
    if (duplicate) return Response.json({ duplicate: true, applicationId: sessionRow.application.id });
    const [question] = await db.select().from(interviewQuestions).where(and(eq(interviewQuestions.id, body.questionId), eq(interviewQuestions.sessionId, sessionId))).limit(1);
    if (!question) throw new AppError(404, 'The active question was not found.');
    const [alreadyAnswered] = await db.select().from(interviewAnswers).where(eq(interviewAnswers.questionId, question.id)).limit(1);
    if (alreadyAnswered) throw new AppError(409, 'This answer was already submitted.', 'DUPLICATE_ANSWER');
    const [analysis] = await db.select().from(analyses).where(eq(analyses.applicationId, sessionRow.application.id)).limit(1);
    const docs = await db.select().from(documents).where(eq(documents.applicationId, sessionRow.application.id));
    if (!analysis) throw new AppError(409, 'Interview analysis context is missing.');
    const role = JSON.parse(analysis.roleJson) as RoleAnalysis;
    const candidate = JSON.parse(analysis.candidateJson) as CandidateAnalysis;
    const fit = JSON.parse(analysis.jobFitJson) as JobFit;
    const jd = docs.find((doc) => doc.kind === 'job_description')?.normalizedText ?? '';
    const resume = docs.find((doc) => doc.kind === 'resume')?.normalizedText ?? '';
    const historyRows = await db.select({ question: interviewQuestions, answer: interviewAnswers, evaluation: answerEvaluations })
      .from(interviewQuestions)
      .leftJoin(interviewAnswers, eq(interviewAnswers.questionId, interviewQuestions.id))
      .leftJoin(answerEvaluations, eq(answerEvaluations.answerId, interviewAnswers.id))
      .where(eq(interviewQuestions.sessionId, sessionId)).orderBy(asc(interviewQuestions.sequence));
    const level = sessionRow.session.currentLevel as InterviewLevel;
    const priorHistory = historyRows.map((row) => ({
      question: row.question.question,
      answer: row.answer?.transcript ?? '',
      evaluation: row.evaluation ? (() => {
        const item = JSON.parse(row.evaluation.evaluationJson) as AnswerEvaluation;
        return { assessment: item.assessment, strengths: item.strengths, weaknesses: item.weaknesses, suggestedFollowUp: item.suggestedFollowUp };
      })() : undefined,
    }));
    const competencyKeys = JSON.parse(question.competencyKeysJson) as string[];
    const coverage = Array.from(new Set([...(JSON.parse(sessionRow.session.coverageJson) as string[]), ...competencyKeys]));
    const levelQuestionCount = historyRows.filter((row) => row.question.level === level).length;
    const advance = shouldAdvanceLevel(levelQuestionCount);
    const followingLevel = advance ? nextLevel(level) : level;
    const answerId = crypto.randomUUID();
    const now = Date.now();
    const answerContext = {
      jobDescription: jd,
      resume,
      role,
      candidate,
      fit,
      level,
      difficulty: question.difficulty,
      question: question.question,
      expectedEvidence: JSON.parse(question.expectedEvidenceJson) as string[],
      answer: body.transcript,
      priorHistory: priorHistory.filter((item) => item.answer),
    };

    if (!followingLevel) {
      const reportEvidence = historyRows.filter((row) => row.answer && row.evaluation).map((row) => ({ question: row.question.question, answer: row.answer!.transcript, evaluation: JSON.parse(row.evaluation!.evaluationJson) }));
      reportEvidence.push({ question: question.question, answer: body.transcript, evaluation: null });
      const [evaluation, narrative] = await Promise.all([
        evaluateAnswer(answerContext),
        generateReportNarrative({ jobDescription: jd, resume, role, candidate, fit, questions: reportEvidence }),
      ]);
      const storedItems = historyRows.filter((row) => row.answer && row.evaluation).map((row) => ({ level: row.question.level as InterviewLevel, evaluation: JSON.parse(row.evaluation!.evaluationJson) as AnswerEvaluation }));
      storedItems.push({ level, evaluation });
      const scores = calculateInterviewScores(storedItems);
      const criticalNames = new Set(role.requiredSkills.filter((skill) => skill.importance === 'critical').map((skill) => skill.name.toLowerCase()));
      const criticalMissing = fit.missingAreas.filter((item) => criticalNames.has(item.toLowerCase())).length;
      const readiness = calculateReadiness(scores.overallScore, fit.overallScore, criticalMissing);
      await db.insert(interviewAnswers).values({ id: answerId, questionId: question.id, clientSubmissionId: body.clientSubmissionId, transcript: body.transcript, inputMode: body.inputMode, durationMs: body.durationMs ?? null, wordCount: body.transcript.trim().split(/\s+/).length, fillerCount: body.transcript.match(fillers)?.length ?? 0, submittedAt: now });
      await db.insert(answerEvaluations).values({ id: crypto.randomUUID(), answerId, evaluationJson: JSON.stringify(evaluation), compositeScore: composite(evaluation), createdAt: now });
      await db.insert(interviewReports).values({ id: crypto.randomUUID(), sessionId, overallScore: scores.overallScore, readinessScore: readiness.score, readinessLabel: readiness.label, competencyJson: JSON.stringify(scores.competencies), narrativeJson: JSON.stringify(narrative), createdAt: now });
      await db.update(interviewSessions).set({ state: 'COMPLETED', coverageJson: JSON.stringify(coverage), completedAt: now, updatedAt: now }).where(eq(interviewSessions.id, sessionId));
      await db.update(applications).set({ status: 'COMPLETED', updatedAt: now }).where(eq(applications.id, sessionRow.application.id));
      return Response.json({ completed: true, applicationId: sessionRow.application.id, evaluationSummary: evaluation.assessment });
    }

    const turn = await evaluateAnswerAndGenerateQuestion({ ...answerContext, nextLevel: followingLevel, coverage });
    const evaluation = turn.evaluation;
    const generated = turn.nextQuestion;
    const baseDifficulty = followingLevel === 'COMPETENCY' ? 2 : 3;
    const updatedDifficulty = adjustDifficulty(baseDifficulty, evaluation, followingLevel);
    await db.insert(interviewAnswers).values({ id: answerId, questionId: question.id, clientSubmissionId: body.clientSubmissionId, transcript: body.transcript, inputMode: body.inputMode, durationMs: body.durationMs ?? null, wordCount: body.transcript.trim().split(/\s+/).length, fillerCount: body.transcript.match(fillers)?.length ?? 0, submittedAt: now });
    await db.insert(answerEvaluations).values({ id: crypto.randomUUID(), answerId, evaluationJson: JSON.stringify(evaluation), compositeScore: composite(evaluation), createdAt: now });
    const nextSequence = sessionRow.session.questionCount + 1;
    const nextQuestionId = crypto.randomUUID();
    await db.insert(interviewQuestions).values({ id: nextQuestionId, sessionId, sequence: nextSequence, level: followingLevel, difficulty: updatedDifficulty, question: generated.question, competencyKeysJson: JSON.stringify(generated.competencyKeys), primaryTopic: generated.primaryTopic, intent: generated.intent, expectedEvidenceJson: JSON.stringify(generated.expectedEvidence), isFollowUp: generated.isFollowUp, createdAt: now });
    await db.update(interviewSessions).set({ state: followingLevel, currentLevel: followingLevel, difficulty: updatedDifficulty, coverageJson: JSON.stringify(coverage), questionCount: nextSequence, updatedAt: now }).where(eq(interviewSessions.id, sessionId));
    await db.update(applications).set({ status: followingLevel, updatedAt: now }).where(eq(applications.id, sessionRow.application.id));
    return Response.json({ completed: false, nextQuestion: { id: nextQuestionId, ...generated, sequence: nextSequence, level: followingLevel, difficulty: updatedDifficulty }, evaluationSummary: evaluation.assessment });
  } catch (error) {
    return errorResponse(error);
  }
}
