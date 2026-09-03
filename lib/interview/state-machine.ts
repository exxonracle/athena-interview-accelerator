import type { AnswerEvaluation, InterviewLevel } from '@/lib/ai/schemas';

export const INTERVIEW_STATES = ['SETUP', 'ROLE_ANALYSIS', 'CANDIDATE_ANALYSIS', 'READY', 'SCREENING', 'COMPETENCY', 'DEEP_DIVE', 'EVALUATING', 'COMPLETED'] as const;
export type InterviewState = (typeof INTERVIEW_STATES)[number];
export const QUESTIONS_PER_LEVEL = 1;
export const TOTAL_INTERVIEW_QUESTIONS = 3;

const transitions: Record<InterviewState, InterviewState[]> = {
  SETUP: ['ROLE_ANALYSIS'],
  ROLE_ANALYSIS: ['CANDIDATE_ANALYSIS'],
  CANDIDATE_ANALYSIS: ['READY'],
  READY: ['SCREENING'],
  SCREENING: ['COMPETENCY'],
  COMPETENCY: ['DEEP_DIVE'],
  DEEP_DIVE: ['EVALUATING'],
  EVALUATING: ['COMPLETED'],
  COMPLETED: [],
};

export function assertTransition(from: InterviewState, to: InterviewState) {
  if (!transitions[from].includes(to)) throw new Error(`Invalid interview transition: ${from} → ${to}`);
}

export function stateForLevel(level: InterviewLevel): InterviewState {
  return level;
}

export function nextLevel(level: InterviewLevel): InterviewLevel | null {
  return level === 'SCREENING' ? 'COMPETENCY' : level === 'COMPETENCY' ? 'DEEP_DIVE' : null;
}

export function adjustDifficulty(current: number, evaluation: AnswerEvaluation, level: InterviewLevel) {
  const bounds: Record<InterviewLevel, [number, number]> = { SCREENING: [1, 3], COMPETENCY: [2, 4], DEEP_DIVE: [3, 5] };
  const delta = evaluation.difficultyAdjustment === 'increase' ? 1 : evaluation.difficultyAdjustment === 'decrease' ? -1 : 0;
  return Math.max(bounds[level][0], Math.min(bounds[level][1], current + delta));
}

export function shouldAdvanceLevel(levelQuestionCount: number) {
  return levelQuestionCount >= QUESTIONS_PER_LEVEL;
}
