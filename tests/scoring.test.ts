import { describe, expect, it } from 'vitest';
import type { AnswerEvaluation, CandidateAnalysis } from '@/lib/ai/schemas';
import { calculateInterviewScores, calculateJobFit, calculateReadiness } from '@/lib/scoring';

const candidate: CandidateAnalysis = {
  candidateName: 'Test Candidate', headline: 'Engineer', keySkills: [], relevantExperience: [], projects: [], achievements: [], strengths: [], missingSkills: [], weakAreas: [], claimsToVerify: [], preparationAreas: [],
  requirementMatches: [
    { requirement: 'TypeScript', category: 'requiredSkills', status: 'strong', evidence: 'Built APIs' },
    { requirement: 'Cloud', category: 'requiredSkills', status: 'partial', evidence: 'Coursework only' },
    { requirement: 'System design', category: 'technicalCompetencies', status: 'missing', evidence: 'Not demonstrated' },
    { requirement: 'Production delivery', category: 'relevantExperience', status: 'strong', evidence: 'Shipped product' },
    { requirement: 'Mentoring', category: 'preferredSkills', status: 'strong', evidence: 'Mentored interns' },
    { requirement: 'Collaboration', category: 'behavioralCompetencies', status: 'strong', evidence: 'Cross-team work' },
    { requirement: 'Degree', category: 'qualifications', status: 'strong', evidence: 'B.Tech' },
  ],
};

const evaluation = (score: number): AnswerEvaluation => ({
  relevance: score, correctness: score, technicalDepth: score, reasoning: score, clarity: score, communication: score, completeness: score, confidence: score, roleAlignment: score, behavioralEvidence: score,
  strengths: [], weaknesses: [], detectedClaims: [], inconsistencies: [], suggestedFollowUp: 'Continue', difficultyAdjustment: 'maintain', competencyEvidence: [], assessment: 'Assessment', whatWasGood: 'Evidence', whatCouldBeBetter: 'Detail', idealDirection: 'More evidence',
});

describe('Athena scoring', () => {
  it('calculates weighted job fit from evidence statuses', () => {
    const result = calculateJobFit(candidate);
    expect(result.overallScore).toBe(73);
    expect(result.strongMatches).toContain('TypeScript');
    expect(result.missingAreas).toEqual(['System design']);
  });

  it('weights deep-dive evidence more heavily', () => {
    const result = calculateInterviewScores([
      { level: 'SCREENING', evaluation: evaluation(90) },
      { level: 'DEEP_DIVE', evaluation: evaluation(50) },
    ]);
    expect(result.overallScore).toBe(66);
  });

  it('applies bounded critical-gap penalties to readiness', () => {
    expect(calculateReadiness(80, 80, 2)).toEqual({ score: 70, label: 'Interview Ready', gapPenalty: 10 });
    expect(calculateReadiness(20, 20, 10).gapPenalty).toBe(15);
  });
});
