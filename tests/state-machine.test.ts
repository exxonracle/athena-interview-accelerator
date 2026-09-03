import { describe, expect, it } from 'vitest';
import type { AnswerEvaluation } from '@/lib/ai/schemas';
import { adjustDifficulty, assertTransition, nextLevel, shouldAdvanceLevel, TOTAL_INTERVIEW_QUESTIONS } from '@/lib/interview/state-machine';

const evaluation = { difficultyAdjustment: 'increase' } as AnswerEvaluation;

describe('interview state machine', () => {
  it('allows only defined transitions', () => {
    expect(() => assertTransition('READY', 'SCREENING')).not.toThrow();
    expect(() => assertTransition('READY', 'DEEP_DIVE')).toThrow(/Invalid interview transition/);
  });

  it('moves through all three levels', () => {
    expect(nextLevel('SCREENING')).toBe('COMPETENCY');
    expect(nextLevel('COMPETENCY')).toBe('DEEP_DIVE');
    expect(nextLevel('DEEP_DIVE')).toBeNull();
  });

  it('advances after one question in each of the three levels', () => {
    expect(shouldAdvanceLevel(0)).toBe(false);
    expect(shouldAdvanceLevel(1)).toBe(true);
    expect(TOTAL_INTERVIEW_QUESTIONS).toBe(3);
  });

  it('bounds difficulty by interview level', () => {
    expect(adjustDifficulty(2, evaluation, 'SCREENING')).toBe(2);
    expect(adjustDifficulty(1, evaluation, 'COMPETENCY')).toBe(2);
    expect(adjustDifficulty(4, evaluation, 'DEEP_DIVE')).toBe(4);
  });
});
