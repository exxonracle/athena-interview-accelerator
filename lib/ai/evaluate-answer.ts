import { answerEvaluationSchema, type CandidateAnalysis, type InterviewLevel, type RoleAnalysis } from './schemas';
import { structuredResponse } from './client';

export function evaluateAnswer(input: {
  role: RoleAnalysis;
  candidate: CandidateAnalysis;
  level: InterviewLevel;
  difficulty: number;
  question: string;
  expectedEvidence: string[];
  answer: string;
  priorHistory: Array<{ question: string; answer: string }>;
}) {
  return structuredResponse(
    'answer_evaluation',
    answerEvaluationSchema,
    `You are Athena's interview assessor. Score only what the answer demonstrates, from 0 to 100. Do not reward resume claims that the answer fails to support. Correctness must reflect the role and question; confidence means evidence-based command of the answer, not vocal bravado. Identify specific strengths and gaps, detect contradictions with prior answers or supplied resume analysis, and give a concrete ideal direction. Difficulty should increase for strong, well-supported answers, decrease to isolate fundamentals after weak answers, otherwise remain.`,
    `LEVEL: ${input.level}\nDIFFICULTY: ${input.difficulty}/5\nROLE: ${JSON.stringify(input.role)}\nCANDIDATE ANALYSIS: ${JSON.stringify(input.candidate)}\nQUESTION: ${input.question}\nEXPECTED EVIDENCE: ${JSON.stringify(input.expectedEvidence)}\nANSWER: ${input.answer}\nPRIOR EXCHANGES: ${JSON.stringify(input.priorHistory.slice(-6))}`,
  );
}
