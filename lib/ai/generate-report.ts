import { reportNarrativeSchema, type CandidateAnalysis, type JobFit, type RoleAnalysis } from './schemas';
import { structuredResponse } from './client';

export function generateReportNarrative(input: {
  role: RoleAnalysis;
  candidate: CandidateAnalysis;
  fit: JobFit;
  questions: Array<{ question: string; answer: string; evaluation: unknown }>;
  scores: unknown;
}) {
  return structuredResponse(
    'interview_report',
    reportNarrativeSchema,
    `You are Athena's interview coach. Produce specific, actionable feedback grounded only in the supplied job fit and interview evidence. Do not invent weaknesses or strengths. Rank preparation gaps by role criticality and demonstrated interview weakness. Each action should be practical before a real interview.`,
    `ROLE: ${JSON.stringify(input.role)}\nCANDIDATE: ${JSON.stringify(input.candidate)}\nJOB FIT: ${JSON.stringify(input.fit)}\nSCORES: ${JSON.stringify(input.scores)}\nINTERVIEW EVIDENCE: ${JSON.stringify(input.questions)}`,
  );
}
