import { reportNarrativeSchema, type CandidateAnalysis, type JobFit, type RoleAnalysis } from './schemas';
import { getGroqConfig, structuredResponse } from './client';
import { compactInterviewContext } from './interview-context';

export function generateReportNarrative(input: {
  jobDescription: string;
  resume: string;
  role: RoleAnalysis;
  candidate: CandidateAnalysis;
  fit: JobFit;
  questions: Array<{ question: string; answer: string; evaluation: unknown }>;
}) {
  return structuredResponse(
    'interview_report',
    reportNarrativeSchema,
    `You are Athena's interview coach. Produce specific, actionable feedback grounded only in the supplied job fit and interview evidence. Do not invent weaknesses or strengths. Rank preparation gaps by role criticality and demonstrated interview weakness. Each action should be practical before a real interview.`,
    `EVIDENCE CONTEXT: ${JSON.stringify(compactInterviewContext(input))}\nINTERVIEW EVIDENCE: ${JSON.stringify(input.questions.slice(-3))}`,
    { model: getGroqConfig().interviewModel, fallbackModel: getGroqConfig().textModel, maxOutputTokens: 2_400 },
  );
}
