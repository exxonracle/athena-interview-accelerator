import {
  answerTurnSchema,
  answerEvaluationSchema,
  type CandidateAnalysis,
  type InterviewLevel,
  type JobFit,
  type RoleAnalysis,
} from './schemas';
import { getGroqConfig, structuredResponse } from './client';
import { compactInterviewContext } from './interview-context';

type AnswerTurnInput = {
  role: RoleAnalysis;
  candidate: CandidateAnalysis;
  fit: JobFit;
  jobDescription: string;
  resume: string;
  level: InterviewLevel;
  difficulty: number;
  question: string;
  expectedEvidence: string[];
  answer: string;
  priorHistory: Array<{ question: string; answer: string; evaluation?: unknown }>;
};

const evaluationRules = `Score only what the answer demonstrates, from 0 to 100. Do not reward resume claims the answer fails to support. Correctness must reflect the role and question; confidence means evidence-based command, not vocal bravado. Identify specific strengths and gaps, contradictions, and a concrete ideal direction.`;

function turnEvidence(input: AnswerTurnInput) {
  return {
    current: {
      level: input.level,
      difficulty: input.difficulty,
      question: input.question,
      expectedEvidence: input.expectedEvidence,
      answer: input.answer,
    },
    context: compactInterviewContext(input),
    priorExchanges: input.priorHistory.slice(-2),
  };
}

export function evaluateAnswerAndGenerateQuestion(input: AnswerTurnInput & { nextLevel: InterviewLevel; coverage: string[] }) {
  return structuredResponse(
    'answer_turn',
    answerTurnSchema,
    `You are Athena's interview assessor and interviewer. First evaluate the current answer. ${evaluationRules} Set difficultyAdjustment from answer quality. Then generate exactly one concise ${input.nextLevel} question grounded in the evidence. Adapt it to the evaluation you just produced: increase technical depth or trade-offs after a strong answer; test fundamentals or clarify the gap after a weak answer. Because this compact interview has one question per level, the next question should maximize uncovered evidence. Do not reveal scoring or internal evaluation.`,
    `NEXT LEVEL: ${input.nextLevel}\nCOVERED: ${JSON.stringify(input.coverage)}\nTURN EVIDENCE: ${JSON.stringify(turnEvidence(input))}`,
    { model: getGroqConfig().interviewModel },
  );
}

export function evaluateAnswer(input: AnswerTurnInput) {
  return structuredResponse(
    'answer_evaluation',
    answerEvaluationSchema,
    `You are Athena's interview assessor. ${evaluationRules} Use the prior exchanges to detect contradictions and progression. Return every required evaluation field.`,
    `TURN EVIDENCE: ${JSON.stringify(turnEvidence(input))}`,
    { model: getGroqConfig().textModel },
  );
}
