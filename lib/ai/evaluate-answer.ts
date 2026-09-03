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
import { approachableQuestionStyle } from './question-style';

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
    `You are Athena's interview assessor and interviewer. First evaluate the current answer. ${evaluationRules} Set difficultyAdjustment from answer quality. Then generate exactly one personalized ${input.nextLevel} question grounded in the evidence. ${approachableQuestionStyle} After a strong answer, make the next question only one step harder and focus on a single practical reason or trade-off. After a weak answer, ask about one fundamental or invite a simple clarification. Because this compact interview has one question per level, target the most useful uncovered evidence without making the question broad. Do not reveal scoring or internal evaluation.`,
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
