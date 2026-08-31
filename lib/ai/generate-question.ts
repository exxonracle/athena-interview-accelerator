import { interviewQuestionSchema, type CandidateAnalysis, type InterviewLevel, type JobFit, type RoleAnalysis } from './schemas';
import { structuredResponse } from './client';

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
    SCREENING: 'Test motivation, resume ownership, communication, relevant experience, goals, and basic role understanding.',
    COMPETENCY: 'Test job-specific technical and behavioural competencies through applied scenarios, decisions, and project evidence.',
    DEEP_DIVE: 'Challenge vague answers, probe metrics and ownership, test trade-offs and edge cases, introduce realistic constraints, and pursue inconsistencies.',
  };
  return structuredResponse(
    'interview_question',
    interviewQuestionSchema,
    `You are Athena, a demanding but fair human-like interviewer. Generate exactly one concise question. It must be grounded in supplied role or resume evidence. ${levelGuidance[input.level]} Use the latest evaluation to decide whether a direct follow-up is more valuable than a new competency. Never repeat a topic unless intentionally deepening it. Never reveal scoring, expected evidence, or internal evaluation. At difficulty ${input.difficulty}/5, calibrate complexity without becoming obscure.`,
    `LEVEL: ${input.level}\nDIFFICULTY: ${input.difficulty}/5\nCOVERED: ${JSON.stringify(input.coverage)}\nROLE: ${JSON.stringify(input.role)}\nCANDIDATE: ${JSON.stringify(input.candidate)}\nJOB FIT: ${JSON.stringify(input.fit)}\nJOB DESCRIPTION: ${input.jobDescription}\nRESUME: ${input.resume}\nHISTORY: ${JSON.stringify(input.history.slice(-8))}`,
  );
}
