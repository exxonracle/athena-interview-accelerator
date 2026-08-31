import type { AnswerEvaluation, CandidateAnalysis, JobFit } from '@/lib/ai/schemas';

export const JOB_FIT_WEIGHTS = {
  requiredSkills: 0.3,
  technicalCompetencies: 0.2,
  relevantExperience: 0.2,
  preferredSkills: 0.1,
  behavioralCompetencies: 0.1,
  qualifications: 0.1,
} as const;

const labels: Record<keyof typeof JOB_FIT_WEIGHTS, string> = {
  requiredSkills: 'Required skills',
  technicalCompetencies: 'Technical competencies',
  relevantExperience: 'Relevant experience',
  preferredSkills: 'Preferred skills',
  behavioralCompetencies: 'Behavioural competencies',
  qualifications: 'Qualifications',
};

export function calculateJobFit(candidate: CandidateAnalysis): JobFit {
  const categories = Object.entries(JOB_FIT_WEIGHTS).map(([key, weight]) => {
    const matches = candidate.requirementMatches.filter((item) => item.category === key);
    const points = matches.reduce((sum, item) => sum + (item.status === 'strong' ? 1 : item.status === 'partial' ? 0.5 : 0), 0);
    const categoryScore = matches.length ? Math.round((points / matches.length) * 100) : 0;
    return {
      key: key as keyof typeof JOB_FIT_WEIGHTS,
      label: labels[key as keyof typeof JOB_FIT_WEIGHTS],
      weight,
      score: categoryScore,
      contribution: Math.round(categoryScore * weight * 10) / 10,
    };
  });
  const overallScore = Math.round(categories.reduce((sum, item) => sum + item.contribution, 0));
  const label: JobFit['label'] = overallScore >= 85 ? 'Strong match' : overallScore >= 70 ? 'Good match' : overallScore >= 50 ? 'Developing match' : 'Low match';
  const strongMatches = candidate.requirementMatches.filter((item) => item.status === 'strong').map((item) => item.requirement);
  const partialMatches = candidate.requirementMatches.filter((item) => item.status === 'partial').map((item) => item.requirement);
  const missingAreas = candidate.requirementMatches.filter((item) => item.status === 'missing').map((item) => item.requirement);
  return {
    overallScore,
    label,
    categories,
    strongMatches,
    partialMatches,
    missingAreas,
    explanation: `${label}: ${overallScore}% weighted alignment, with strongest evidence across ${strongMatches.slice(0, 3).join(', ') || 'the reviewed criteria'}.`,
  };
}

export type StoredEvaluation = { evaluation: AnswerEvaluation; level: 'SCREENING' | 'COMPETENCY' | 'DEEP_DIVE' };

export function calculateInterviewScores(items: StoredEvaluation[]) {
  if (!items.length) {
    return { overallScore: 0, competencies: {}, readinessScore: 0 };
  }
  const levelWeight = { SCREENING: 0.8, COMPETENCY: 1, DEEP_DIVE: 1.2 };
  const weighted = (selector: (evaluation: AnswerEvaluation) => number) => {
    const totalWeight = items.reduce((sum, item) => sum + levelWeight[item.level], 0);
    return Math.round(items.reduce((sum, item) => sum + selector(item.evaluation) * levelWeight[item.level], 0) / totalWeight);
  };
  const competencies = {
    roleFit: weighted((e) => (e.relevance + e.roleAlignment) / 2),
    technicalKnowledge: weighted((e) => (e.correctness + e.technicalDepth) / 2),
    problemSolving: weighted((e) => e.reasoning),
    communication: weighted((e) => (e.clarity + e.communication) / 2),
    confidence: weighted((e) => e.confidence),
    depthOfUnderstanding: weighted((e) => (e.technicalDepth + e.completeness) / 2),
    behavioralFit: weighted((e) => e.behavioralEvidence),
  };
  const overallScore = Math.round(
    competencies.technicalKnowledge * 0.25 +
      competencies.problemSolving * 0.2 +
      competencies.roleFit * 0.15 +
      competencies.communication * 0.15 +
      competencies.depthOfUnderstanding * 0.1 +
      competencies.behavioralFit * 0.1 +
      competencies.confidence * 0.05,
  );
  return { overallScore, competencies };
}

export function calculateReadiness(interviewScore: number, jobFitScore: number, criticalMissingCount: number) {
  const gapPenalty = Math.min(15, criticalMissingCount * 5);
  const score = Math.max(0, Math.min(100, Math.round(interviewScore * 0.65 + jobFitScore * 0.35 - gapPenalty)));
  const label = score >= 85 ? 'Strong Candidate' : score >= 70 ? 'Interview Ready' : score >= 50 ? 'Needs Preparation' : 'Not Ready';
  return { score, label, gapPenalty };
}
