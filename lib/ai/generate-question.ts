import { interviewQuestionSchema, type CandidateAnalysis, type InterviewLevel, type JobFit, type RoleAnalysis } from './schemas';
import { getGroqConfig, structuredResponse } from './client';
import { compactInterviewContext } from './interview-context';
import { approachableQuestionStyle } from './question-style';

export type InterviewHistoryItem = {
  question: string;
  answer?: string;
  assessment?: string;
  weaknesses?: string[];
  suggestedFollowUp?: string;
};

export function generateQuestion(input: {
  jobDescription: string;
  resume: string;
  role: RoleAnalysis;
  candidate: CandidateAnalysis;
  fit: JobFit;
  level: InterviewLevel;
  difficulty: number;
  coverage: string[];
  history: InterviewHistoryItem[];
}) {
  const levelGuidance: Record<InterviewLevel, string> = {
    SCREENING: 'Ask about motivation, resume ownership, relevant experience, or basic role understanding.',
    COMPETENCY: 'Ask for one practical example that tests an important job-specific competency.',
    DEEP_DIVE: 'Probe one important detail, reason, metric, or trade-off from the candidate evidence.',
  };
  return structuredResponse(
    'interview_question',
    interviewQuestionSchema,
    `You are Athena, a supportive and fair human-like interviewer. Generate exactly one personalized question grounded in the supplied role or resume evidence. ${levelGuidance[input.level]} ${approachableQuestionStyle} Use the latest evaluation to decide whether a direct follow-up is more useful than a new competency. Never repeat a topic unless intentionally deepening it. Never reveal scoring, expected evidence, or internal evaluation. At difficulty ${input.difficulty}/5, keep the complexity accessible for an early-career candidate.`,
    `LEVEL: ${input.level}\nDIFFICULTY: ${input.difficulty}/5\nCOVERED: ${JSON.stringify(input.coverage)}\nEVIDENCE CONTEXT: ${JSON.stringify(compactInterviewContext(input))}\nHISTORY: ${JSON.stringify(input.history.slice(-3))}`,
    { model: getGroqConfig().interviewModel, fallbackModel: getGroqConfig().textModel, maxOutputTokens: 1_200 },
  );
}
