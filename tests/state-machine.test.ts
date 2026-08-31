import { describe, expect, it } from 'vitest';
import type { AnswerEvaluation } from '@/lib/ai/schemas';
import { adjustDifficulty, assertTransition, nextLevel, shouldAdvanceLevel } from '@/lib/interview/state-machine';

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

  it('uses minimum, coverage, and maximum question rules', () => {
    expect(shouldAdvanceLevel(2, ['communication'], ['communication'])).toBe(false);
    expect(shouldAdvanceLevel(3, ['communication', 'motivation'], ['communication', 'motivation'])).toBe(true);
    expect(shouldAdvanceLevel(4, [], ['system design'])).toBe(true);
  });

  it('bounds difficulty by interview level', () => {
    expect(adjustDifficulty(3, evaluation, 'SCREENING')).toBe(3);
    expect(adjustDifficulty(4, evaluation, 'DEEP_DIVE')).toBe(5);
  });
});
