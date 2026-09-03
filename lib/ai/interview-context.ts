import type { CandidateAnalysis, JobFit, RoleAnalysis } from './schemas';

const take = <T>(items: T[], limit: number) => items.slice(0, limit);

export function compactInterviewContext(input: {
  jobDescription: string;
  resume: string;
  role: RoleAnalysis;
  candidate: CandidateAnalysis;
  fit: JobFit;
}) {
  return {
    jobDescriptionExcerpt: input.jobDescription.slice(0, 2_500),
    resumeExcerpt: input.resume.slice(0, 2_500),
    role: {
      roleTitle: input.role.roleTitle,
      summary: input.role.summary,
      responsibilities: take(input.role.responsibilities, 6),
      requiredSkills: take(input.role.requiredSkills, 8),
      preferredSkills: take(input.role.preferredSkills, 4),
      technicalCompetencies: take(input.role.technicalCompetencies, 6),
      behavioralCompetencies: take(input.role.behavioralCompetencies, 5),
      experienceExpectations: take(input.role.experienceExpectations, 4),
      qualifications: take(input.role.qualifications, 4),
    },
    candidate: {
      candidateName: input.candidate.candidateName,
      headline: input.candidate.headline,
      keySkills: take(input.candidate.keySkills, 10),
      relevantExperience: take(input.candidate.relevantExperience, 4),
      projects: take(input.candidate.projects, 4),
      achievements: take(input.candidate.achievements, 6),
      strengths: take(input.candidate.strengths, 6),
      missingSkills: take(input.candidate.missingSkills, 6),
      weakAreas: take(input.candidate.weakAreas, 6),
      claimsToVerify: take(input.candidate.claimsToVerify, 6),
      preparationAreas: take(input.candidate.preparationAreas, 6),
    },
    fit: {
      overallScore: input.fit.overallScore,
      label: input.fit.label,
      strongMatches: take(input.fit.strongMatches, 8),
      partialMatches: take(input.fit.partialMatches, 8),
      missingAreas: take(input.fit.missingAreas, 8),
    },
  };
}
