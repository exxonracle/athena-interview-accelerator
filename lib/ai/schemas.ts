import { z } from 'zod';

const list = z.array(z.string().min(1)).max(20);
const evidenceItem = z.object({
  name: z.string().min(1),
  importance: z.enum(['critical', 'high', 'medium', 'low']),
  evidenceRequired: z.string().min(1),
});

export const roleAnalysisSchema = z.object({
  roleTitle: z.string().min(1),
  summary: z.string().min(1),
  responsibilities: list,
  requiredSkills: z.array(evidenceItem).max(20),
  preferredSkills: z.array(evidenceItem).max(20),
  technicalCompetencies: list,
  behavioralCompetencies: list,
  experienceExpectations: list,
  keywords: list,
  concepts: list,
  qualifications: list,
});

export const requirementMatchSchema = z.object({
  requirement: z.string().min(1),
  category: z.enum([
    'requiredSkills',
    'preferredSkills',
    'relevantExperience',
    'technicalCompetencies',
    'behavioralCompetencies',
    'qualifications',
  ]),
  status: z.enum(['strong', 'partial', 'missing']),
  evidence: z.string().min(1),
});

export const candidateAnalysisSchema = z.object({
  candidateName: z.string().nullable(),
  headline: z.string().min(1),
  keySkills: list,
  relevantExperience: z.array(z.object({
    title: z.string(),
    organization: z.string(),
    summary: z.string(),
    relevance: z.string(),
  })).max(12),
  projects: z.array(z.object({
    name: z.string(),
    summary: z.string(),
    relevance: z.string(),
  })).max(12),
  achievements: list,
  strengths: list,
  missingSkills: list,
  weakAreas: list,
  claimsToVerify: list,
  preparationAreas: list,
  requirementMatches: z.array(requirementMatchSchema).max(80),
});

export const fitCategorySchema = z.object({
  key: requirementMatchSchema.shape.category,
  label: z.string(),
  weight: z.number().min(0).max(1),
  score: z.number().min(0).max(100),
  contribution: z.number().min(0).max(100),
});

export const jobFitSchema = z.object({
  overallScore: z.number().min(0).max(100),
  label: z.enum(['Strong match', 'Good match', 'Developing match', 'Low match']),
  categories: z.array(fitCategorySchema),
  strongMatches: list,
  partialMatches: list,
  missingAreas: list,
  explanation: z.string(),
});

export const interviewLevelSchema = z.enum(['SCREENING', 'COMPETENCY', 'DEEP_DIVE']);

export const interviewQuestionSchema = z.object({
  question: z.string().min(10),
  competencyKeys: z.array(z.string().min(1)).min(1).max(4),
  primaryTopic: z.string().min(1),
  intent: z.string().min(1),
  expectedEvidence: z.array(z.string()).max(6),
  isFollowUp: z.boolean(),
});

const score = z.number().min(0).max(100);
export const answerEvaluationSchema = z.object({
  relevance: score,
  correctness: score,
  technicalDepth: score,
  reasoning: score,
  clarity: score,
  communication: score,
  completeness: score,
  confidence: score,
  roleAlignment: score,
  behavioralEvidence: score,
  strengths: list,
  weaknesses: list,
  detectedClaims: list,
  inconsistencies: list,
  suggestedFollowUp: z.string(),
  difficultyAdjustment: z.enum(['decrease', 'maintain', 'increase']),
  competencyEvidence: z.array(z.object({
    competency: z.string(),
    score,
    evidence: z.string(),
  })).max(6),
  assessment: z.string(),
  whatWasGood: z.string(),
  whatCouldBeBetter: z.string(),
  idealDirection: z.string(),
});

export const reportNarrativeSchema = z.object({
  summary: z.string(),
  demonstratedStrengths: z.array(z.object({ title: z.string(), evidence: z.string() })).max(10),
  evidencedWeaknesses: z.array(z.object({ title: z.string(), evidence: z.string() })).max(10),
  preparationGaps: z.array(z.object({
    priority: z.number().int().min(1).max(10),
    title: z.string(),
    reason: z.string(),
    reviewTopics: z.array(z.string()).max(10),
    action: z.string(),
  })).max(8),
  nextActions: z.array(z.string()).max(8),
});

export type RoleAnalysis = z.infer<typeof roleAnalysisSchema>;
export type CandidateAnalysis = z.infer<typeof candidateAnalysisSchema>;
export type JobFit = z.infer<typeof jobFitSchema>;
export type InterviewLevel = z.infer<typeof interviewLevelSchema>;
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;
export type AnswerEvaluation = z.infer<typeof answerEvaluationSchema>;
export type ReportNarrative = z.infer<typeof reportNarrativeSchema>;
